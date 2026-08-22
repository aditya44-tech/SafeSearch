import { prisma } from "@/lib/prisma";
import ScoreboardClient from "./ScoreboardClient";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage() {
  const sites = await prisma.siteScore.findMany({
    orderBy: { scoreValue: "desc" },
  });

  // If no SiteScore records exist, compute from reports
  let siteData = sites;

  if (sites.length === 0) {
    const reports = await prisma.safetyReport.findMany({
      select: { site: true, riskLevel: true, status: true, reportedAt: true, updatedAt: true },
    });

    const siteMap: Record<string, { total: number; high: number; resolved: number; resolutionTimes: number[] }> = {};
    for (const r of reports) {
      if (!siteMap[r.site]) siteMap[r.site] = { total: 0, high: 0, resolved: 0, resolutionTimes: [] };
      const s = siteMap[r.site];
      s.total++;
      if (r.riskLevel === "high") s.high++;
      if (r.status === "resolved") {
        s.resolved++;
        s.resolutionTimes.push((new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) / (1000 * 60 * 60));
      }
    }

    siteData = Object.entries(siteMap).map(([site, data]) => {
      const avgResolution = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length
        : 0;
      const highPenalty = data.high * 15;
      const speedBonus = avgResolution > 0 ? Math.max(0, 30 - avgResolution / 2) : 0;
      const score = Math.max(0, Math.min(100, 100 - highPenalty + speedBonus));
      return {
        site,
        totalReports: data.total,
        highRiskCount: data.high,
        avgResolutionHours: Math.round(avgResolution * 10) / 10,
        scoreValue: Math.round(score),
        id: 0, // placeholder, not a real DB id
        updatedAt: new Date(),
      };
    }).sort((a, b) => b.scoreValue - a.scoreValue);
  }

  return <ScoreboardClient sites={siteData} />;
}
