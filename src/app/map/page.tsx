import { prisma } from "@/lib/prisma";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
    select: {
      id: true, site: true, riskLevel: true, hazardCategory: true,
      status: true, reportedAt: true, reportText: true, justification: true,
      reporterRole: true, humanOverrideRiskLevel: true,
    },
  });

  // Aggregate site data
  const siteMap: Record<string, {
    total: number; high: number; medium: number; low: number;
    pending: number; reports: typeof reports;
  }> = {};

  for (const r of reports) {
    if (!siteMap[r.site]) {
      siteMap[r.site] = { total: 0, high: 0, medium: 0, low: 0, pending: 0, reports: [] };
    }
    const s = siteMap[r.site];
    s.total++;
    s.reports.push(r);
    if (r.riskLevel === "high") s.high++;
    else if (r.riskLevel === "medium") s.medium++;
    else if (r.riskLevel === "low") s.low++;
    if (r.status === "pending" || r.status === "acknowledged") s.pending++;
  }

  const siteData = Object.entries(siteMap).map(([site, data]) => ({
    site,
    ...data,
    riskScore: data.high * 3 + data.medium * 1.5 + data.low * 0.5,
  })).sort((a, b) => b.riskScore - a.riskScore);

  return <MapClient siteData={siteData} />;
}
