import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get all compliance references
  const refs = await prisma.complianceReference.findMany();

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

  // Map categories to regulations and sum
  const regulationMap: Record<string, { count: number; regulations: string[] }> = {};
  for (const ref of refs) {
    const count = categoryCounts[ref.hazardCategory] || 0;
    if (count > 0) {
      if (!regulationMap[ref.hazardCategory]) {
        regulationMap[ref.hazardCategory] = { count: 0, regulations: [] };
      }
      regulationMap[ref.hazardCategory].count = count;
      regulationMap[ref.hazardCategory].regulations.push(ref.regulationName);
    }
  }

  // Sort by count descending
  const result = Object.entries(regulationMap)
    .map(([category, data]) => ({
      category,
      count: data.count,
      regulations: [...new Set(data.regulations)],
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(result);
}
