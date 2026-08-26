import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import { dateToISTString, nowIST } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const reports = await prisma.safetyReport.findMany({
    where: { riskLevel: { not: null } },
  });
  const allReports = await prisma.safetyReport.findMany();

  // Hazard category frequency
  const categoryMap: Record<string, number> = {};
  reports.forEach((r) => {
    const cat = r.hazardCategory || "Unknown";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // High risk over time (last 30 days) - IST
  const now = nowIST();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap[dateToISTString(d)] = 0;
  }
  reports
    .filter((r) => r.riskLevel === "high")
    .forEach((r) => {
      const date = dateToISTString(new Date(r.reportedAt));
      if (dailyMap[date] !== undefined) dailyMap[date]++;
    });
  const timeData = Object.entries(dailyMap).map(([date, count]) => ({
    date: date.slice(0, 5),
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

  // SIF Potential distribution
  const sifMap: Record<string, number> = {};
  allReports.forEach((r) => {
    const sif = r.sifPotential || "No SIF data";
    sifMap[sif] = (sifMap[sif] || 0) + 1;
  });
  const sifDistribution = Object.entries(sifMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // High-SIF near misses (near-miss reports with high SIF potential but low incident severity)
  const highSifNearMisses = allReports.filter(
    (r) => (r.sifPotential === "SIF-High Potential" || r.sifPotential === "SIF-Critical / Hi-Po") &&
      (r.riskLevel === "low" || r.riskLevel === "medium")
  ).length;

  // SIF trend over time (last 30 days)
  const sifTimeMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    sifTimeMap[dateToISTString(d)] = 0;
  }
  allReports
    .filter((r) => r.sifPotential === "SIF-High Potential" || r.sifPotential === "SIF-Critical / Hi-Po")
    .forEach((r) => {
      const date = dateToISTString(new Date(r.reportedAt));
      if (sifTimeMap[date] !== undefined) sifTimeMap[date]++;
    });
  const sifTimeData = Object.entries(sifTimeMap).map(([date, count]) => ({
    date: date.slice(0, 5),
    count,
  }));

  return (
    <DashboardClient
      categoryData={categoryData}
      timeData={timeData}
      recurringSites={recurringSites}
      stats={{ totalReports, highCount, pendingHigh }}
      sifDistribution={sifDistribution}
      highSifNearMisses={highSifNearMisses}
      sifTimeData={sifTimeData}
    />
  );
}
