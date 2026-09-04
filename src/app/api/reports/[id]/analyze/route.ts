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
  classifyReport,
  normalizeAnalysis,
  deriveOpsRisk,
  extractKeyPhrases,
  TASK_EXTRACTION_PROMPT,
  type AnalysisResult,
  type ExtractedTask,
} from "@/lib/helpers";
import {
  detectActivityContext,
  getApplicableRegulations,
} from "@/lib/regulatory-kb";

const SAFETY_PROMPT = `You are a workplace safety analyst for a construction/industrial safety system. Your job is to detect early warning signs of potential serious injury or fatality (SIF) from near-miss and unsafe-condition reports.

CRITICAL: When in doubt between risk levels, ALWAYS choose the HIGHER level. Under-classifying a safety hazard is far more dangerous than over-classifying it. A missed high-risk report can lead to injury or death.

You must produce TWO independent assessments:
1. INCIDENT SEVERITY - How serious was the actual reported outcome/event?
2. SIF POTENTIAL - Could this situation realistically have resulted in a Serious Injury or Fatality?

IMPORTANT: These are INDEPENDENT assessments. A near miss with no injury can have Low Incident Severity but High SIF Potential. Do NOT automatically equate them.

NEGATION RULE - read carefully:
- "no fire occurred", "no leak", "nothing happened", "no one was hurt", "no injuries reported" mean the EVENT DID NOT HAPPEN.
- Assign LOW incident severity to such near misses / unsafe conditions. Do NOT rate severity high just because the words fire/leak/explosion appear after "no" or "not". Let the SIF POTENTIAL assessment carry the danger instead.

Given the report below, respond with ONLY valid JSON in this exact format, no extra text:

{
  "incident_severity": "low" | "medium" | "high",
  "hazard_category": "<one of: Fall Hazard, Structural, Electrical, Chemical Exposure, Hot Work / Uncontrolled Ignition Source near Hydrocarbon Release, Fire/Explosion, Equipment Failure, Vehicle/Traffic, Confined Space, Procedural Gap>",
  "justification": "<2-3 SHORT sentences in plain easy language explaining the risk level - write for a field worker, no jargon>",
  "key_phrases": ["<exact substring from the report text that influenced the rating>", ...],
  "sif_potential": "SIF-Unlikely" | "SIF-Potential" | "SIF-High Potential" | "SIF-Critical / Hi-Po",
  "sif_reasoning": "<1-2 SHORT sentences in plain language explaining the SIF potential>",
  "sif_confidence": <number 0.0-1.0>
}

Rules for key_phrases:
- List 2-5 exact substrings that appear verbatim in the original report text
- These are the specific words/phrases that directly drove the classification
- Use the exact wording from the report, preserving original capitalization
- Do not paraphrase or invent phrases that are not in the text

INCIDENT SEVERITY classification (how serious was the actual outcome):

"high" - Assign when the actual outcome was serious:
- Any report mentioning injury, hospitalization, unconsciousness, bleeding, fracture, amputation
- Fire/explosion that caused actual damage or injury
- Collapse that caused actual harm
- Any actual serious physical harm occurred

"medium" - Assign when the actual outcome was moderate:
- Minor injuries (cuts, bruises, first aid cases)
- PPE violations that were caught but no injury
- Damaged equipment with no injury
- Slip/trip with minor consequence
- Blocked exits, procedural gaps that were identified

"low" - Assign when the actual outcome was minor or non-existent:
- Near misses with no injury
- Purely administrative or documentation issues
- Cosmetic damage with no safety impact
- Minor housekeeping issues
- Suggestions for improvement

SIF POTENTIAL classification (could this have caused serious injury/fatality?):

"SIF-Critical / Hi-Po" - Assign when:
- Actual serious injury or fatality occurred
- Situation had extremely high likelihood of SIF without intervention
- Multiple SIF precursors present simultaneously

"SIF-High Potential" - Assign when:
- Near-miss with credible SIF pathway (almost fell from height, almost hit by vehicle, etc.)
- Missing critical safety controls on high-energy hazards
- Unprotected exposure to lethal hazards (live electrical, confined space, fall from height)
- The situation COULD realistic have resulted in death or serious injury

"SIF-Potential" - Assign when:
- Some SIF precursors present but partially mitigated
- Hazard exists but safety controls were partially in place
- Lower energy level but still credible SIF pathway

"SIF-Unlikely" - Assign when:
- No credible pathway to serious injury or fatality
- Only minor or procedural issues
- All safety controls in place
- Low-energy hazards with no realistic SIF pathway

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
      analysis = normalizeAnalysis(extractJson<AnalysisResult>(text), report.reportText);
    } catch {
      analysis = classifyReport(report.reportText);
      usedFallback = true;
    }
  } else {
    analysis = classifyReport(report.reportText);
    usedFallback = true;
  }

  // Operational priority: severity (risk) drives SLA, but a low-severity
  // SIF-critical near miss must still be handled fast (tasks + short SLA).
  const opsRisk = deriveOpsRisk(analysis);
  const slaDeadline = getSLADeadline(opsRisk);

  // Save key phrases as JSON string - use Gemini output or fallback extraction
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
      sifPotential: analysis.sif_potential,
      sifReasoning: analysis.sif_reasoning,
      sifConfidence: analysis.sif_confidence ?? null,
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

  // Send SMS alert for high-risk reports OR high SIF potential - configurable escalation
  const shouldEscalate =
    analysis.risk_level === "high" ||
    analysis.sif_potential === "SIF-High Potential" ||
    analysis.sif_potential === "SIF-Critical / Hi-Po";
  let smsSent = false;
  let smsRecipients: string[] = [];
  if (shouldEscalate) {
    const textbeeApiKey = process.env.TEXTBEE_API_KEY;
    if (textbeeApiKey) {
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
      if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
        phoneNumbers.push(process.env.SAFETY_OFFICER_PHONE);
        smsRecipients = ["Safety Officer"];
      }
      if (phoneNumbers.length > 0) {
        try {
          const { Textbee } = await import("@textbee/sdk");
          const textbee = new Textbee({ apiKey: textbeeApiKey });
          const smsMessage = `🚨 HIGH RISK ALERT: ${report.site} - ${analysis.hazard_category}. ${analysis.justification}${analysis.sif_potential !== "SIF-Unlikely" ? ` [SIF: ${analysis.sif_potential}]` : ""}`;
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
    opsRisk,
    analysis.hazard_category,
    apiKey,
    slaDeadline
  );

  // Auto-create compliance mappings from knowledge base (clear old ones first
  // so re-analysis does not accumulate duplicate mappings)
  await prisma.complianceMapping.deleteMany({ where: { reportId: id } });
  const activities = detectActivityContext(report.reportText);
  const regulations = getApplicableRegulations([analysis.hazard_category], activities);
  const dbRefs = await prisma.complianceReference.findMany({
    where: { hazardCategory: analysis.hazard_category },
  });

  let complianceCount = 0;
  for (const reg of regulations) {
    await prisma.complianceMapping.create({
      data: {
        reportId: id,
        aiActivityContext: activities.join(", "),
        aiExplanation: `Applicable based on ${analysis.hazard_category} hazard in ${activities.join("/")} context. Requirements: ${reg.requirements.slice(0, 2).join("; ")}.`,
        aiRecommendedControl: reg.requirements[0] || "Implement standard controls for this hazard category.",
        disclaimerShown: true,
      },
    });
    complianceCount++;
  }

  for (const ref of dbRefs) {
    await prisma.complianceMapping.create({
      data: {
        reportId: id,
        referenceId: ref.id,
        aiActivityContext: activities.join(", "),
        aiExplanation: `${ref.regulationName} ${ref.sectionReference} applies to ${analysis.hazard_category} hazards. ${ref.description}`,
        aiRecommendedControl: ref.description,
        disclaimerShown: true,
      },
    });
    complianceCount++;
  }

  if (complianceCount > 0) {
    await prisma.auditLog.create({
      data: {
        reportId: id,
        action: "compliance_mapped",
        performedBy: usedFallback ? "Fallback Classifier" : "Groq AI",
        details: `Auto-mapped ${complianceCount} regulatory reference(s) for ${analysis.hazard_category}`,
      },
    });
  }

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
