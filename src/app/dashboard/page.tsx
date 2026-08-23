import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org ? parseInt(params.org, 10) : undefined;
  const where = orgId ? { organizationId: orgId } : {};

  const reports = await prisma.safetyReport.findMany({
    where: { ...where, riskLevel: { not: null } },
  });
  const allReports = await prisma.safetyReport.findMany({ where });

  // Hazard category frequency
  const categoryMap: Record<string, number> = {};
  reports.forEach((r) => {
    const cat = r.hazardCategory || "Unknown";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // High risk over time (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap[d.toISOString().split("T")[0]] = 0;
  }
  reports
    .filter((r) => r.riskLevel === "high")
    .forEach((r) => {
      const date = new Date(r.reportedAt).toISOString().split("T")[0];
      if (dailyMap[date] !== undefined) dailyMap[date]++;
    });
  const timeData = Object.entries(dailyMap).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  // Recurring sites (2+ high-risk)
  const siteMap: Record<string, number> = {};
  reports
    .filter((r) => r.riskLevel === "high")
    .forEach((r) => {
      siteMap[r.site] = (siteMap[r.site] || 0) + 1;
    });
  const recurringSites = Object.entries(siteMap)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  // Summary stats
  const totalReports = allReports.length;
  const highCount = reports.filter((r) => r.riskLevel === "high").length;
  const pendingHigh = allReports.filter(
    (r) => r.riskLevel === "high" && (r.status === "pending" || r.status === "acknowledged")
  ).length;

  return (
    <DashboardClient
      categoryData={categoryData}
      timeData={timeData}
      recurringSites={recurringSites}
      stats={{ totalReports, highCount, pendingHigh }}
    />
  );
}
