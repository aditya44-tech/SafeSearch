import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REGULATORY_KB } from "@/lib/regulatory-kb";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get all DB compliance references
  const dbRefs = await prisma.complianceReference.findMany();

  // Get all reports grouped by hazard category
  const reports = await prisma.safetyReport.findMany({
    where: { hazardCategory: { not: null } },
    select: { hazardCategory: true },
  });

  // Count reports per category
  const categoryCounts: Record<string, number> = {};
  for (const r of reports) {
    const cat = r.hazardCategory!;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Count KB entries per category
  const kbCategoryCounts: Record<string, number> = {};
  for (const entry of REGULATORY_KB) {
    for (const cat of entry.hazardCategories) {
      kbCategoryCounts[cat] = (kbCategoryCounts[cat] || 0) + 1;
    }
  }

  // Merge DB and KB data
  const allFrameworks = new Set<string>();
  for (const ref of dbRefs) allFrameworks.add(ref.framework || ref.regulationName);
  for (const entry of REGULATORY_KB) allFrameworks.add(entry.framework);

  const result = Object.entries(categoryCounts)
    .map(([category, count]) => {
      const dbRegulations = dbRefs
        .filter((r) => r.hazardCategory === category)
        .map((r) => r.framework || r.regulationName);
      const kbRegulations = REGULATORY_KB
        .filter((e) => e.hazardCategories.includes(category))
        .map((e) => e.framework);
      const regulations = [...new Set([...dbRegulations, ...kbRegulations])];
      const verifiedCount = dbRefs.filter((r) => r.hazardCategory === category && r.isVerified).length;

      return {
        category,
        count,
        regulations,
        kbEntries: kbCategoryCounts[category] || 0,
        dbEntries: dbRegulations.length,
        verifiedCount,
      };
    })
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    categories: result,
    totalFrameworks: allFrameworks.size,
    totalKBEntries: REGULATORY_KB.length,
    totalDBEntries: dbRefs.length,
  });
}
