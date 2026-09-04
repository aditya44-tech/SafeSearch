import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  callGroq,
  extractJson,
  getSLADeadline,
  recalculateSiteScore,
  classifyReport,
  normalizeAnalysis,
  deriveOpsRisk,
  extractKeyPhrases,
  type AnalysisResult,
} from "@/lib/helpers";

const SAFETY_PROMPT = `You are a workplace safety analyst for a construction/industrial safety system. Your job is to detect early warning signs of potential serious injury or fatality (SIF) from near-miss and unsafe-condition reports.

CRITICAL: When in doubt between risk levels, ALWAYS choose the HIGHER level. Under-classifying a safety hazard is far more dangerous than over-classifying it. A missed high-risk report can lead to injury or death.

You must produce TWO independent assessments:
1. INCIDENT SEVERITY - How serious was the actual reported outcome/event?
2. SIF POTENTIAL - Could this situation realistically have resulted in a Serious Injury or Fatality?

IMPORTANT: These are INDEPENDENT assessments. A near miss with no injury can have Low Incident Severity but High SIF Potential. Do NOT automatically equate them.

CRITICAL: NEVER raise INCIDENT SEVERITY because the hazard COULD have been serious. If nothing serious actually happened - a near miss, an unsafe condition found during inspection, a PPE violation caught, or a procedural gap identified - severity must be low or medium even if the hazard was potentially lethal. Put that potential danger in SIF POTENTIAL, never in severity.

NEGATION RULE - read carefully:
- "no fire occurred", "no leak", "nothing happened", "no one was hurt", "no injuries reported" mean the EVENT DID NOT HAPPEN.
- Assign LOW incident severity to such near misses / unsafe conditions. Do NOT rate severity high just because the words fire/leak/explosion appear after "no" or "not". Let the SIF POTENTIAL assessment carry the danger instead.

Given the report below, respond with ONLY valid JSON in this exact format, no extra text:

{
  "incident_severity": "low" | "medium" | "high",
  "hazard_category": "<one of: Fall Hazard, Structural, Electrical, Chemical Exposure, Fire/Explosion, Equipment Failure, Vehicle/Traffic, Confined Space, Procedural Gap>",
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
- Collapse that caused caused actual harm
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

export async function POST() {
  // Find all reports that are missing SIF potential
  const reports = await prisma.safetyReport.findMany({
    where: {
      OR: [
        { sifPotential: null },
        { riskLevel: null },
      ],
    },
    orderBy: { reportedAt: "desc" },
  });

  if (reports.length === 0) {
    return NextResponse.json({ message: "All reports already have SIF analysis", processed: 0 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  let processed = 0;
  let failed = 0;
  const results: { id: number; status: string; sifPotential?: string }[] = [];

  for (const report of reports) {
    try {
      let analysis: AnalysisResult;
      let usedFallback = false;

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
      // SIF-critical near miss must still be handled fast.
      const opsRisk = deriveOpsRisk(analysis);
      const slaDeadline = getSLADeadline(opsRisk);
      const rawPhrases =
        analysis.key_phrases &&
        Array.isArray(analysis.key_phrases) &&
        analysis.key_phrases.length > 0
          ? analysis.key_phrases.slice(0, 5)
          : extractKeyPhrases(report.reportText);
      const keyPhrases = JSON.stringify(rawPhrases);

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
          sifPotential: analysis.sif_potential,
          sifReasoning: analysis.sif_reasoning,
          sifConfidence: analysis.sif_confidence ?? null,
        },
      });

      await prisma.auditLog.create({
        data: {
          reportId: report.id,
          action: "report_analyzed",
          performedBy: usedFallback ? "Fallback Classifier" : "Groq AI",
          details: `Batch re-analysis: ${analysis.sif_potential} (${analysis.hazard_category})`,
        },
      });

      await recalculateSiteScore(prisma, report.site);

      processed++;
      results.push({ id: report.id, status: "ok", sifPotential: analysis.sif_potential });
    } catch (e) {
      failed++;
      results.push({ id: report.id, status: "error" });
      console.error(`Re-analysis failed for report ${report.id}:`, e);
    }
  }

  return NextResponse.json({
    message: `Processed ${processed} reports, ${failed} failed`,
    processed,
    failed,
    total: reports.length,
    results,
  });
}
