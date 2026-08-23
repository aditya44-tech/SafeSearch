import { prisma } from "@/lib/prisma";
import ScoreboardClient from "./ScoreboardClient";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org ? parseInt(params.org, 10) : undefined;

  // Always compute from live report data to ensure ALL sites are shown
  const reports = await prisma.safetyReport.findMany({
    where: orgId ? { organizationId: orgId } : undefined,
    select: {
      site: true,
      riskLevel: true,
      status: true,
      reportedAt: true,
      updatedAt: true,
    },
  });

  const siteMap: Record<
    string,
    { total: number; high: number; resolutionTimes: number[] }
  > = {};

  for (const r of reports) {
    if (!siteMap[r.site])
      siteMap[r.site] = { total: 0, high: 0, resolutionTimes: [] };
    const s = siteMap[r.site];
    s.total++;
    if (r.riskLevel === "high") s.high++;
    if (r.status === "resolved") {
      s.resolutionTimes.push(
        (new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) /
          (1000 * 60 * 60)
      );
    }
  }

  const siteData = Object.entries(siteMap)
    .map(([site, data]) => {
      const avgResolution =
        data.resolutionTimes.length > 0
          ? data.resolutionTimes.reduce((a, b) => a + b, 0) /
            data.resolutionTimes.length
          : 0;
      const highPenalty = data.high * 15;
      const speedBonus =
        avgResolution > 0 ? Math.max(0, 30 - avgResolution / 2) : 0;
      const score = Math.max(
        0,
        Math.min(100, 100 - highPenalty + speedBonus)
      );
      return {
        site,
        totalReports: data.total,
        highRiskCount: data.high,
        avgResolutionHours: Math.round(avgResolution * 10) / 10,
        scoreValue: Math.round(score),
      };
    })
    .sort((a, b) => b.scoreValue - a.scoreValue);

  return <ScoreboardClient sites={siteData} />;
}
