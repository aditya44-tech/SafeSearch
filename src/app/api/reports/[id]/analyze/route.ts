import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  callGroq,
  extractJson,
  getSLADeadline,
  recalculateSiteScore,
  semanticHash,
  textSimilarity,
  autoAssignDept,
  fallbackTaskExtraction,
  extractKeyPhrases,
  TASK_EXTRACTION_PROMPT,
  type AnalysisResult,
  type ExtractedTask,
} from "@/lib/helpers";

const SAFETY_PROMPT = `You are a workplace safety analyst reviewing near-miss and unsafe-condition reports to detect early warning signs of a potential serious injury or fatality (SIF).

Given the report below, respond with ONLY valid JSON in this exact format, no extra text:

{
  "risk_level": "high" | "medium" | "low",
  "hazard_category": "<short category, e.g. Fall Hazard, Electrical, Equipment Failure, Chemical Exposure, Vehicle/Traffic, Structural, Procedural Gap>",
  "justification": "<one sentence explaining why this risk level was assigned>",
  "key_phrases": ["<exact substring from the report text that influenced the risk rating>", ...]
}

Rules for key_phrases:
- List 2-5 exact substrings that appear verbatim in the original report text
- These are the specific words/phrases that directly drove the risk classification
- Use the exact wording from the report, preserving original capitalization
- Do not paraphrase or invent phrases that are not in the text

Guidance:
- "high" = credible path to serious injury or death if unaddressed
- "medium" = real hazard but lower severity or already partially mitigated
- "low" = minor/procedural issue unlikely to cause serious harm

Report:
Site: {{site}}
Reporter role: {{reporterRole}}
Report text: "{{reportText}}"`;

function buildPrompt(report: { site: string; reporterRole: string | null; reportText: string }) {
  return SAFETY_PROMPT
    .replace("{{site}}", report.site)
    .replace("{{reporterRole}}", report.reporterRole || "Anonymous")
    .replace("{{reportText}}", report.reportText);
}

function buildTaskPrompt(report: {
  site: string; reportText: string; riskLevel: string; hazardCategory: string;
}) {
  return TASK_EXTRACTION_PROMPT
    .replace("{{site}}", report.site)
    .replace("{{riskLevel}}", report.riskLevel)
    .replace("{{hazardCategory}}", report.hazardCategory)
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

async function clusterReport(reportId: number, reportText: string): Promise<string | null> {
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

async function extractAndCreateTasks(
  reportId: number,
  reportText: string,
  site: string,
  riskLevel: string,
  hazardCategory: string,
  apiKey: string | undefined,
  slaDeadline: Date
): Promise<ExtractedTask[]> {
  // Skip task extraction for low-risk reports
  if (riskLevel === "low") return [];

  let extractedTasks: ExtractedTask[];
  let usedFallback = false;

  if (apiKey) {
    try {
      const text = await callGroq(
        buildTaskPrompt({ site, reportText, riskLevel, hazardCategory }),
        apiKey,
        { temperature: 0.2, maxOutputTokens: 800, responseFormat: { type: "json_object" } }
      );
      extractedTasks = extractJson<ExtractedTask[]>(text);
      // Validate the array
      if (!Array.isArray(extractedTasks) || extractedTasks.length === 0) {
        throw new Error("Empty or invalid task array");
      }
    } catch {
      extractedTasks = fallbackTaskExtraction(reportText, riskLevel, hazardCategory);
      usedFallback = true;
    }
  } else {
    extractedTasks = fallbackTaskExtraction(reportText, riskLevel, hazardCategory);
    usedFallback = true;
  }

  // Create tasks in database
  const department = autoAssignDept(hazardCategory);
  const createdTasks: ExtractedTask[] = [];

  for (const task of extractedTasks.slice(0, 3)) {
    // Cap at 3 tasks
    const title = task.title?.slice(0, 80) || "Investigate hazard";
    const description = task.description || "";
    const priority = task.priority || (riskLevel === "high" ? "high" : "normal");

    await prisma.task.create({
      data: {
        reportId,
        title,
        description: description || null,
        assignedTo: department,
        priority,
        dueDate: slaDeadline,
      },
    });

    createdTasks.push({ title, description, priority });
  }

  // Log task creation
  if (createdTasks.length > 0) {
    await prisma.auditLog.create({
      data: {
        reportId,
        action: "tasks_auto_generated",
        performedBy: usedFallback ? "Fallback Task Generator" : "Groq AI",
        details: `Auto-generated ${createdTasks.length} task(s) for ${department}: ${createdTasks.map((t) => t.title).join("; ")}`,
      },
    });
  }

  return createdTasks;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let analysis: AnalysisResult;
  let usedFallback = false;
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const text = await callGroq(buildPrompt(report), apiKey, {
        temperature: 0.1,
        maxOutputTokens: 500,
        responseFormat: { type: "json_object" },
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

  // Save key phrases as JSON string — use Gemini output or fallback extraction
  const rawPhrases = analysis.key_phrases && Array.isArray(analysis.key_phrases) && analysis.key_phrases.length > 0
    ? analysis.key_phrases.slice(0, 5)
    : extractKeyPhrases(report.reportText);
  const keyPhrases = JSON.stringify(rawPhrases);

  const updated = await prisma.safetyReport.update({
    where: { id },
    data: {
      riskLevel: analysis.risk_level as "high" | "medium" | "low",
      hazardCategory: analysis.hazard_category,
      justification: analysis.justification,
      status: "analyzed",
      analyzedAt: new Date(),
      slaDeadline,
      keyPhrases,
    },
  });

  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "report_analyzed",        performedBy: usedFallback ? "Fallback Classifier" : "Groq AI",
      details: `Classified as ${analysis.risk_level} risk (${analysis.hazard_category}). SLA: ${slaDeadline.toISOString()}`,
    },
  });

  await recalculateSiteScore(prisma, report.site);
  const clusterId = await clusterReport(id, report.reportText);

  // Send SMS alert for high-risk reports — category-based recipients, fallback to SAFETY_OFFICER_PHONE
  let smsSent = false;
  let smsRecipients: string[] = [];
  if (analysis.risk_level === "high") {
    const textbeeApiKey = process.env.TEXTBEE_API_KEY;
    if (textbeeApiKey) {
      const categoryRecipients = analysis.hazard_category
        ? await prisma.smsRecipient.findMany({
            where: { hazardCategory: analysis.hazard_category, isActive: true },
          })
        : [];
      const phoneNumbers = categoryRecipients.map((r) => r.phone);
      smsRecipients = categoryRecipients.map((r) => r.name || r.hazardCategory);
      if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
        phoneNumbers.push(process.env.SAFETY_OFFICER_PHONE);
        smsRecipients = ["Safety Officer"];
      }
      if (phoneNumbers.length > 0) {
        try {
          const { Textbee } = await import("@textbee/sdk");
          const textbee = new Textbee({ apiKey: textbeeApiKey });
          const smsMessage = `🚨 HIGH RISK ALERT: ${report.site} — ${analysis.hazard_category}. ${analysis.justification}`;
          await textbee.sendSms({
            recipients: phoneNumbers,
            message: smsMessage,
          });
          smsSent = true;
          await prisma.safetyReport.update({
            where: { id },
            data: { smsSentAt: new Date() },
          });
          await prisma.auditLog.create({
            data: {
              reportId: id,
              action: "sms_alert_sent",
              performedBy: "System",
              details: `SMS alert sent to ${smsRecipients.join(", ")}`,
            },
          });
        } catch (e) {
          console.error("SMS send failed:", e);
          await prisma.auditLog.create({
            data: {
              reportId: id,
              action: "sms_alert_failed",
              performedBy: "System",
              details: `SMS failed: ${e instanceof Error ? e.message : "unknown error"}`,
            },
          });
        }
      }
    }
  }

  // Auto-generate tasks for medium/high risk
  const generatedTasks = await extractAndCreateTasks(
    id,
    report.reportText,
    report.site,
    analysis.risk_level,
    analysis.hazard_category,
    apiKey,
    slaDeadline
  );

  return NextResponse.json({
    ...updated,
    analysis,
    usedFallback,
    clusterId,
    generatedTasks,
    smsSent,
    smsRecipients,
  });
}
