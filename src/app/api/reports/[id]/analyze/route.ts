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

interface AnalysisResult {
  risk_level: string;
  hazard_category: string;
  justification: string;
}

function buildPrompt(report: { site: string; reporterRole: string; reportText: string }) {
  return SAFETY_PROMPT
    .replace("{{site}}", report.site)
    .replace("{{reporterRole}}", report.reporterRole)
    .replace("{{reportText}}", report.reportText);
}

function extractJson(text: string): AnalysisResult {
  let cleaned = text.trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (cleaned.startsWith(fence)) {
    const firstNewline = cleaned.indexOf(String.fromCharCode(10));
    cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf(fence);
    if (lastFence > -1) cleaned = cleaned.slice(0, lastFence);
    cleaned = cleaned.trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as AnalysisResult;
}

function fallbackAnalysis(reportText: string): AnalysisResult {
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

function getSLADeadline(riskLevel: string): Date {
  const now = new Date();
  if (riskLevel === "high") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (riskLevel === "medium") return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

async function callGemini(prompt: string, apiKey: string): Promise<AnalysisResult> {
  const lastErr = new Error("All models failed");
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
      if (!response.ok) { lastErr.message = `${model}: ${response.status}`; continue; }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastErr.message = `${model}: empty response`; continue; }
      return extractJson(text);
    } catch (e) {
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

  let analysis: AnalysisResult;
  let usedFallback = false;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      analysis = await callGemini(buildPrompt(report), apiKey);
    } catch {
      analysis = fallbackAnalysis(report.reportText);
      usedFallback = true;
    }
  } else {
    analysis = fallbackAnalysis(report.reportText);
    usedFallback = true;
  }

  const slaDeadline = getSLADeadline(analysis.risk_level);

  const updated = await prisma.safetyReport.update({
    where: { id },
    data: {
      riskLevel: analysis.risk_level as "high" | "medium" | "low",
      hazardCategory: analysis.hazard_category,
      justification: analysis.justification,
      status: "analyzed",
      analyzedAt: new Date(),
      slaDeadline,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "report_analyzed",
      performedBy: usedFallback ? "Fallback Classifier" : "Gemini AI",
      details: `Classified as ${analysis.risk_level} risk (${analysis.hazard_category}). SLA: ${slaDeadline.toISOString()}`,
    },
  });

  // Recalculate site score
  await recalculateSiteScore(report.site);

  // Run clustering
  const clusterId = await clusterReport(id, report.reportText, report.site);

  return NextResponse.json({ ...updated, analysis, usedFallback, clusterId });
}

function semanticHash(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("fall") || t.includes("height") || t.includes("scaffold") || t.includes("edge") || t.includes("guardrail")) return "fall_heights";
  if (t.includes("electrical") || t.includes("wire") || t.includes("circuit") || t.includes("shock")) return "electrical";
  if (t.includes("chemical") || t.includes("fume") || t.includes("spill") || t.includes("ventilation") || t.includes("toxic")) return "chemical";
  if (t.includes("vehicle") || t.includes("forklift") || t.includes("crane") || t.includes("traffic")) return "vehicle";
  if (t.includes("equipment") || t.includes("machine") || t.includes("guard") || t.includes("broken")) return "equipment";
  return "general";
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function textSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) { if (tokensB.has(t)) intersection++; }
  return intersection / Math.max(tokensA.size, tokensB.size);
}

async function clusterReport(reportId: string, reportText: string, _site: string): Promise<string | null> {
  const hash = semanticHash(reportText);
  const allReports = await prisma.safetyReport.findMany({
    where: { id: { not: reportId }, riskLevel: { not: null } },
    select: { id: true, reportText: true, clusterId: true },
  });
  const similar = allReports.filter((r) => {
    if (semanticHash(r.reportText) !== hash) return false;
    return textSimilarity(reportText, r.reportText) >= 0.25;
  });
  if (similar.length === 0) {
    const cid = `cluster_${hash}_${Date.now()}`;
    await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId: cid } });
    return cid;
  }
  const cid = similar.find((r) => r.clusterId)?.clusterId || `cluster_${hash}_${Date.now()}`;
  await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId: cid } });
  return cid;
}

async function recalculateSiteScore(site: string) {
  const reports = await prisma.safetyReport.findMany({
    where: { site },
    select: { riskLevel: true, status: true, reportedAt: true, updatedAt: true },
  });

  const total = reports.length;
  const high = reports.filter((r) => r.riskLevel === "high").length;
  const resolved = reports.filter((r) => r.status === "resolved");
  const resolutionTimes = resolved.map(
    (r) => (new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) / (1000 * 60 * 60)
  );
  const avgResolution = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;
  const highPenalty = high * 15;
  const speedBonus = avgResolution > 0 ? Math.max(0, 30 - avgResolution / 2) : 0;
  const score = Math.max(0, Math.min(100, 100 - highPenalty + speedBonus));

  await prisma.siteScore.upsert({
    where: { site },
    update: {
      totalReports: total, highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
    create: {
      site, totalReports: total, highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
  });
}
