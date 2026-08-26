import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  detectActivityContext,
  getApplicableRegulations,
  getBestMatchingRegulation,
} from "@/lib/regulatory-kb";

export const dynamic = "force-dynamic";

export async function POST() {
  // Get all reports that have a hazard category but no compliance mappings yet
  const reports = await prisma.safetyReport.findMany({
    where: {
      hazardCategory: { not: null },
    },
    orderBy: { reportedAt: "desc" },
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const results: { id: number; status: string; mappings?: number }[] = [];

  for (const report of reports) {
    try {
      // Check if this report already has compliance mappings
      const existingMappings = await prisma.complianceMapping.findMany({
        where: { reportId: report.id },
      });

      if (existingMappings.length > 0) {
        skipped++;
        results.push({ id: report.id, status: "skipped", mappings: existingMappings.length });
        continue;
      }

      // Detect activity context from report text
      const activities = detectActivityContext(report.reportText);

      // Get applicable regulations from the knowledge base
      const regulations = getApplicableRegulations(
        [report.hazardCategory!],
        activities
      );

      // Also check the database for additional references
      const dbRefs = await prisma.complianceReference.findMany({
        where: { hazardCategory: report.hazardCategory! },
      });

      // Create mappings for each regulation found
      let mappingCount = 0;

      // Map from knowledge base entries
      for (const reg of regulations) {
        const bestMatch = getBestMatchingRegulation(report.hazardCategory!, activities);

        await prisma.complianceMapping.create({
          data: {
            reportId: report.id,
            aiActivityContext: activities.join(", "),
            aiExplanation: `Applicable based on ${report.hazardCategory} hazard in ${activities.join("/")} context. Requirements: ${reg.requirements.slice(0, 2).join("; ")}.`,
            aiRecommendedControl: reg.requirements[0] || "Implement standard controls for this hazard category.",
            disclaimerShown: true,
          },
        });
        mappingCount++;
      }

      // Map from database references
      for (const ref of dbRefs) {
        await prisma.complianceMapping.create({
          data: {
            reportId: report.id,
            referenceId: ref.id,
            aiActivityContext: activities.join(", "),
            aiExplanation: `${ref.regulationName} ${ref.sectionReference} applies to ${report.hazardCategory} hazards. ${ref.description}`,
            aiRecommendedControl: ref.description,
            disclaimerShown: true,
          },
        });
        mappingCount++;
      }

      // If no mappings were created, create a placeholder with disclaimer
      if (mappingCount === 0) {
        await prisma.complianceMapping.create({
          data: {
            reportId: report.id,
            aiActivityContext: activities.join(", "),
            aiExplanation: "Applicable regulatory reference not verified. Manual review required.",
            aiRecommendedControl: "Consult qualified HSE/compliance personnel for applicable regulations.",
            disclaimerShown: true,
          },
        });
        mappingCount = 1;
      }

      processed++;
      results.push({ id: report.id, status: "ok", mappings: mappingCount });
    } catch (e) {
      failed++;
      results.push({ id: report.id, status: "error" });
      console.error(`Failed to add compliance mapping for report ${report.id}:`, e);
    }
  }

  return NextResponse.json({
    message: `Processed ${processed} reports, ${skipped} skipped (already mapped), ${failed} failed`,
    processed,
    skipped,
    failed,
    total: reports.length,
    results,
  });
}
