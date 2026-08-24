import { prisma } from "@/lib/prisma";
import ImpactClient from "./ImpactClient";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const reports = await prisma.safetyReport.findMany({
    where: { riskLevel: { not: null } },
    select: { site: true, riskLevel: true, status: true, reportedAt: true },
  });

  const resolvedHigh = reports.filter(
    (r) => r.riskLevel === "high" && r.status === "resolved"
  ).length;
  const resolvedMedium = reports.filter(
    (r) => r.riskLevel === "medium" && r.status === "resolved"
  ).length;

  // Heinrich's ratio: 1 serious injury per ~300 near-misses
  // High-risk near-misses are more likely to become injuries (ratio ~1:8)
  const estimatedInjuriesPrevented = Math.round(resolvedHigh / 8);

  // Escalation score per site
  const siteMap: Record<string, { high: number; medium: number; low: number; resolved: number }> = {};
  for (const r of reports) {
    if (!siteMap[r.site]) siteMap[r.site] = { high: 0, medium: 0, low: 0, resolved: 0 };
    const s = siteMap[r.site];
    if (r.riskLevel === "high") s.high++;
    else if (r.riskLevel === "medium") s.medium++;
    else s.low++;
    if (r.status === "resolved") s.resolved++;
  }

  const siteBreakdown = Object.entries(siteMap)
    .map(([site, data]) => {
      const score = data.high * 10 + data.medium * 3 + data.low * 1;
      const siteInjuriesPrevented = Math.round(data.resolved / 8);
      return {
        site,
        totalReports: data.high + data.medium + data.low,
        highRiskCount: data.high,
        resolvedCount: data.resolved,
        escalationScore: score,
        estimatedInjuriesPrevented: siteInjuriesPrevented,
      };
    })
    .sort((a, b) => b.escalationScore - a.escalationScore);

  return (
    <ImpactClient
      totalHighRisk={reports.filter((r) => r.riskLevel === "high").length}
      resolvedHighRisk={resolvedHigh}
      resolvedMediumRisk={resolvedMedium}
      estimatedInjuriesPrevented={estimatedInjuriesPrevented}
      siteBreakdown={siteBreakdown}
      totalReports={reports.length}
    />
  );
}
