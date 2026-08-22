import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SAFETY_PROMPT = `You are a workplace safety analyst reviewing near-miss and unsafe-condition reports to detect early warning signs of a potential serious injury or fatality (SIF).

Given the report below, respond with ONLY valid JSON in this exact format, no extra text:

{
  "risk_level": "high" | "medium" | "low",
  "hazard_category": "<short category, e.g. Fall Hazard, Electrical, Equipment Failure, Chemical Exposure, Vehicle/Traffic, Structural, Procedural Gap>",
  "justification": "<one sentence explaining why this risk level was assigned>"
}

Guidance:
- "high" = credible path to serious injury or death if unaddressed
- "medium" = real hazard but lower severity or already partially mitigated
- "low" = minor/procedural issue unlikely to cause serious harm

Report:
Site: {{site}}
Reporter role: {{reporterRole}}
Report text: "{{reportText}}"`;

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

function buildPrompt(report: { site: string; reporterRole: string; reportText: string }) {
  return SAFETY_PROMPT
    .replace("{{site}}", report.site)
    .replace("{{reporterRole}}", report.reporterRole)
    .replace("{{reportText}}", report.reportText);
}

function extractJson(text: string): Record<string, string> {
  let cleaned = text.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fence = String.fromCharCode(96, 96, 96);
  if (cleaned.startsWith(fence)) {
    const firstNewline = cleaned.indexOf(String.fromCharCode(10));
    cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf(fence);
    if (lastFence > -1) cleaned = cleaned.slice(0, lastFence);
    cleaned = cleaned.trim();
  }

  // Strip leading/trailing non-JSON characters (markdown bullets, etc.)
  // Find first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

function fallbackAnalysis(reportText: string) {
  const text = reportText.toLowerCase();
  if (
    text.includes("fall") || text.includes("unguarded") || text.includes("edge") ||
    text.includes("trench") || text.includes("scaffold") || text.includes("crane") ||
    text.includes("live electrical") || text.includes("exposed wiring") ||
    text.includes("confined space") || text.includes("no guard") ||
    (text.includes("forklift") && text.includes("pedestrian")) ||
    (text.includes("removed") && text.includes("guard")) ||
    (text.includes("almost") && (text.includes("hit") || text.includes("dropped"))) ||
    text.includes("loose") || text.includes("wobbly") || text.includes("harness")
  ) {
    return {
      risk_level: "high",
      hazard_category: text.includes("fall") || text.includes("scaffold") || text.includes("trench") || text.includes("guardrail") || text.includes("harness") ? "Structural" :
        text.includes("electrical") || text.includes("wiring") || text.includes("short circuit") ? "Electrical" :
        text.includes("forklift") || text.includes("vehicle") ? "Vehicle/Traffic" :
        text.includes("confined") || text.includes("chemical") ? "Chemical Exposure" :
        text.includes("crane") || text.includes("equipment") ? "Equipment Failure" : "Structural",
      justification: "Report describes conditions with a credible path to serious injury or death if left unaddressed.",
    };
  }
  if (
    text.includes("not wearing") || text.includes("missing") || text.includes("damaged") ||
    text.includes("spill kit") || text.includes("ventilation") ||
    (text.includes("exit") && text.includes("block"))
  ) {
    return {
      risk_level: "medium",
      hazard_category: text.includes("hard hat") || text.includes("wearing") ? "Procedural Gap" :
        text.includes("spill") || text.includes("chemical") ? "Chemical Exposure" :
        text.includes("ventilation") ? "Chemical Exposure" :
        text.includes("exit") ? "Procedural Gap" : "Equipment Failure",
      justification: "Real hazard exists but is either partially mitigated or lower in severity.",
    };
  }
  return {
    risk_level: "low",
    hazard_category: "Procedural Gap",
    justification: "Minor or procedural issue unlikely to cause serious physical harm.",
  };
}

async function callGemini(prompt: string, apiKey: string): Promise<{ risk_level: string; hazard_category: string; justification: string }> {
  const lastErr = new Error("All models failed");

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`[analyze] Trying model: ${model}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500, responseMimeType: "application/json" },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(`[analyze] ${model} failed (${response.status}):`, data.error?.message || JSON.stringify(data));
        lastErr.message = `${model}: ${response.status}`;
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error(`[analyze] ${model} returned empty text`);
        lastErr.message = `${model}: empty response`;
        continue;
      }

      console.log(`[analyze] ${model} raw output:`, text);

      const parsed = extractJson(text);
      console.log(`[analyze] ${model} parsed:`, JSON.stringify(parsed));
      return parsed;
    } catch (e) {
      console.error(`[analyze] ${model} exception:`, e);
      lastErr.message = `${model}: ${e}`;
    }
  }

  throw lastErr;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let analysis;
  let usedFallback = false;
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("[analyze] API key present:", !!apiKey, "key length:", apiKey?.length);

  if (apiKey) {
    try {
      const prompt = buildPrompt(report);
      console.log("[analyze] Calling Gemini API...");
      analysis = await callGemini(prompt, apiKey);
    } catch (e) {
      console.error("[analyze] All Gemini models failed, using fallback:", e);
      analysis = fallbackAnalysis(report.reportText);
      usedFallback = true;
    }
  } else {
    console.log("[analyze] No API key, using fallback");
    analysis = fallbackAnalysis(report.reportText);
    usedFallback = true;
  }

  const updated = await prisma.safetyReport.update({
    where: { id },
    data: {
      riskLevel: analysis.risk_level,
      hazardCategory: analysis.hazard_category,
      justification: analysis.justification,
      status: "analyzed",
      analyzedAt: new Date(),
    },
  });

  return NextResponse.json({ ...updated, analysis, usedFallback });
}
