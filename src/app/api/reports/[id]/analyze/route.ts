import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  callGemini,
  extractJson,
  getSLADeadline,
  recalculateSiteScore,
  semanticHash,
  textSimilarity,
  type AnalysisResult,
} from "@/lib/helpers";

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

function buildPrompt(report: { site: string; reporterRole: string; reportText: string }) {
  return SAFETY_PROMPT
    .replace("{{site}}", report.site)
    .replace("{{reporterRole}}", report.reporterRole)
    .replace("{{reportText}}", report.reportText);
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
      hazard_category:
        text.includes("fall") || text.includes("scaffold") || text.includes("trench") || text.includes("guardrail") || text.includes("harness") ? "Structural" :
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
      hazard_category:
        text.includes("hard hat") || text.includes("wearing") ? "Procedural Gap" :
        text.includes("spill") || text.includes("chemical") || text.includes("ventilation") ? "Chemical Exposure" :
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

async function clusterReport(reportId: string, reportText: string): Promise<string | null> {
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

export async function POST(
  _request: NextRequest,
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
      const text = await callGemini(buildPrompt(report), apiKey, {
        temperature: 0.1,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      });
      analysis = extractJson<AnalysisResult>(text);
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

  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "report_analyzed",
      performedBy: usedFallback ? "Fallback Classifier" : "Gemini AI",
      details: `Classified as ${analysis.risk_level} risk (${analysis.hazard_category}). SLA: ${slaDeadline.toISOString()}`,
    },
  });

  await recalculateSiteScore(prisma, report.site);
  const clusterId = await clusterReport(id, report.reportText);

  return NextResponse.json({ ...updated, analysis, usedFallback, clusterId });
}
