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
  fallbackAnalysis,
  TASK_EXTRACTION_PROMPT,
  type AnalysisResult,
  type ExtractedTask,
} from "@/lib/helpers";

// â”€â”€ Classification prompt (same as analyze route) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SAFETY_PROMPT = `You are a workplace safety analyst for a construction/industrial safety system. Your job is to detect early warning signs of potential serious injury or fatality (SIF) from near-miss and unsafe-condition reports.

CRITICAL: When in doubt between risk levels, ALWAYS choose the HIGHER level. Under-classifying a safety hazard is far more dangerous than over-classifying it. A missed high-risk report can lead to injury or death.

Given the report below, respond with ONLY valid JSON in this exact format, no extra text:

{
  "risk_level": "high" | "medium" | "low",
  "hazard_category": "<short category, e.g. Fall Hazard, Electrical, Equipment Failure, Chemical Exposure, Vehicle/Traffic, Structural, Fire/Explosion, Procedural Gap>",
  "justification": "<one sentence explaining why this risk level was assigned>",
  "key_phrases": ["<exact substring from the report text that influenced the risk rating>", ...]
}

Rules for key_phrases:
- List 2-5 exact substrings that appear verbatim in the original report text
- These are the specific words/phrases that directly drove the risk classification
- Use the exact wording from the report, preserving original capitalization
- Do not paraphrase or invent phrases that are not in the text

Risk classification guidance:

"high" - Assign when ANY of these apply:
- Any fall hazard (unguarded edges, working at height, scaffold issues, no harness, excavation, trench)
- Any electrical hazard (exposed wiring, live electrical, short circuit, overloaded circuits, shock risk)
- Any fire/explosion risk (smoke, flammable materials, gas leak, burn risk)
- Any chemical hazard (toxic fumes, gas leak, chemical spill, confined space, asbestos)
- Any vehicle/machinery hazard (forklift near pedestrian, struck-by risk, crane operations, heavy equipment)
- Any collapse or structural failure risk
- Any near-miss involving potential serious injury (almost fell, almost hit, close call, near miss)
- Missing critical safety guards or barriers on dangerous equipment
- Any report mentioning injury, hospitalization, unconsciousness, bleeding, or fracture
- Reports from construction sites with words like dangerous, unsafe, hazard, risk, emergency

"medium" - Assign when:
- PPE violations (not wearing hard hat, safety glasses, gloves, harness)
- Damaged but not immediately dangerous equipment
- Slip/trip hazards, wet floors, poor lighting
- Minor injuries (cuts, bruises, first aid cases)
- Blocked exits or obstructed pathways
- Procedural shortcuts or training gaps
- Expired or missing safety labels

"low" - Assign ONLY when:
- Purely administrative or documentation issues
- Cosmetic damage with no safety impact
- Minor housekeeping issues
- Suggestions for improvement with no immediate hazard

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

async function generateTasks(
  reportId: number, reportText: string, site: string,
  riskLevel: string, hazardCategory: string, apiKey: string | undefined,
  slaDeadline: Date
): Promise<ExtractedTask[]> {
  if (riskLevel === "low") return [];

  let tasks: ExtractedTask[];
  let usedFallback = false;

  if (apiKey) {
    try {
      const text = await callGroq(buildTaskPrompt({ site, reportText, riskLevel, hazardCategory }), apiKey, {
        temperature: 0.2, maxOutputTokens: 800, responseFormat: { type: "json_object" },
      });
      tasks = extractJson<ExtractedTask[]>(text);
      if (!Array.isArray(tasks) || tasks.length === 0) throw new Error("Empty");
    } catch {
      tasks = fallbackTaskExtraction(reportText, riskLevel, hazardCategory);
      usedFallback = true;
    }
  } else {
    tasks = fallbackTaskExtraction(reportText, riskLevel, hazardCategory);
    usedFallback = true;
  }

  const department = autoAssignDept(hazardCategory);
  const created: ExtractedTask[] = [];

  for (const task of tasks.slice(0, 3)) {
    const title = task.title?.slice(0, 80) || "Investigate hazard";
    const description = task.description || "";
    const priority = task.priority || (riskLevel === "high" ? "high" : "normal");
    await prisma.task.create({
      data: { reportId, title, description: description || null, assignedTo: department, priority, dueDate: slaDeadline },
    });
    created.push({ title, description, priority });
  }

  if (created.length > 0) {
    await prisma.auditLog.create({
      data: {
        reportId, action: "tasks_auto_generated",
        performedBy: usedFallback ? "Fallback Task Generator" : "Groq AI",
        details: `Auto-generated ${created.length} task(s) for ${department}: ${created.map((t) => t.title).join("; ")}`,
      },
    });
  }
  return created;
}

// â”€â”€ Main POST handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(request: NextRequest) {
  const body = await request.json();

  // 1. Create the report
  const report = await prisma.safetyReport.create({
    data: {
      reportText: body.reportText,
      site: body.site,
      reporterRole: body.isAnonymous ? null : (body.reporterRole || "Field Worker"),
      isAnonymous: body.isAnonymous || false,
    },
  });

  // 2. Auto-analyze with AI (don't await - fire and let the response go back fast,
  //    then finish analysis in background)
  const analysisPromise = (async () => {
    const apiKey = process.env.GROQ_API_KEY;
    let analysis: AnalysisResult;
    let usedFallback = false;

    if (apiKey) {
      try {
        const text = await callGroq(buildPrompt(report), apiKey, {
          temperature: 0.1, maxOutputTokens: 500, responseFormat: { type: "json_object" },
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
    const rawPhrases = analysis.key_phrases && Array.isArray(analysis.key_phrases) && analysis.key_phrases.length > 0
      ? analysis.key_phrases.slice(0, 5)
      : extractKeyPhrases(report.reportText);
    const keyPhrases = JSON.stringify(rawPhrases);

    // Update report with analysis results
    await prisma.safetyReport.update({
      where: { id: report.id },
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
        reportId: report.id, action: "report_analyzed",
        performedBy: usedFallback ? "Fallback Classifier" : "Groq AI",
        details: `Classified as ${analysis.risk_level} risk (${analysis.hazard_category}). SLA: ${slaDeadline.toISOString()}`,
      },
    });

    await recalculateSiteScore(prisma, report.site);
    await clusterReport(report.id, report.reportText);

    // 3. Auto-generate tasks for medium/high risk
    const generatedTasks = await generateTasks(
      report.id, report.reportText, report.site,
      analysis.risk_level, analysis.hazard_category, apiKey, slaDeadline
    );

    // 4. Send SMS for high risk - category-based recipients, fallback to SAFETY_OFFICER_PHONE
    let smsSent = false;
    let smsRecipients: string[] = [];
    if (analysis.risk_level === "high") {
      const textbeeApiKey = process.env.TEXTBEE_API_KEY;
      if (textbeeApiKey) {
        // Look up category-specific + "All Categories" recipients
        const categoryRecipients = await prisma.smsRecipient.findMany({
          where: {
            isActive: true,
            OR: [
              { hazardCategory: analysis.hazard_category },
              { hazardCategory: "All Categories" },
            ],
          },
        });
        const phoneNumbers = categoryRecipients.map((r) => r.phone);
        smsRecipients = categoryRecipients.map((r) => r.name || r.hazardCategory);
        // Fallback to env SAFETY_OFFICER_PHONE if no category-specific recipients exist
        if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
          phoneNumbers.push(process.env.SAFETY_OFFICER_PHONE);
          smsRecipients = ["Safety Officer"];
        }
        if (phoneNumbers.length > 0) {
          try {
            const { Textbee } = await import("@textbee/sdk");
            const textbee = new Textbee({ apiKey: textbeeApiKey });
            await textbee.sendSms({
              recipients: phoneNumbers,
              message: `🚨 HIGH RISK ALERT: ${report.site} - ${analysis.hazard_category}. ${analysis.justification}`,
            });
            smsSent = true;
            await prisma.safetyReport.update({ where: { id: report.id }, data: { smsSentAt: new Date() } });
            await prisma.auditLog.create({
              data: { reportId: report.id, action: "sms_alert_sent", performedBy: "System", details: `SMS alert sent to ${smsRecipients.join(", ")}` },
            });
          } catch (e) {
            console.error("SMS send failed:", e);
            await prisma.auditLog.create({
              data: { reportId: report.id, action: "sms_alert_failed", performedBy: "System", details: `SMS failed: ${e instanceof Error ? e.message : "unknown"}` },
            });
          }
        }
      }
    }

    return { analysis, usedFallback, generatedTasks, smsSent, smsRecipients };
  })();

  // Fire-and-forget: analysis runs in background, report returns immediately
  analysisPromise.catch((e) => console.error("Auto-analysis failed:", e));

  return NextResponse.json(report, { status: 201 });
}

export async function GET() {
  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
  });
  return NextResponse.json(reports);
}
