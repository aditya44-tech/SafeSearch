import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Get all reports from last 4 weeks
  const reports = await prisma.safetyReport.findMany({
    where: { reportedAt: { gte: fourWeeksAgo } },
    select: { site: true, riskLevel: true, reportedAt: true, status: true },
  });

  // This week's data
  const thisWeek = reports.filter((r) => r.reportedAt >= oneWeekAgo);
  // Previous 3 weeks (historical)
  const historical = reports.filter((r) => r.reportedAt < oneWeekAgo);

  // Group by site
  const sites = [...new Set(reports.map((r) => r.site))];
  const anomalies: {
    site: string;
    thisWeekCount: number;
    historicalAvg: number;
    thisWeekHigh: number;
    historicalHighAvg: number;
    status: "anomaly_detected" | "normal";
    message: string;
  }[] = [];

  for (const site of sites) {
    const thisWeekReports = thisWeek.filter((r) => r.site === site);
    const historicalReports = historical.filter((r) => r.site === site);

    const thisWeekCount = thisWeekReports.length;
    const thisWeekHigh = thisWeekReports.filter((r) => r.riskLevel === "high").length;

    // Historical is over 3 weeks, so avg per week
    const historicalWeeks = 3;
    const historicalAvg = historicalReports.length / historicalWeeks;
    const historicalHighAvg = historicalReports.filter((r) => r.riskLevel === "high").length / historicalWeeks;

    // Anomaly detection: this week is 2x+ the historical average
    const countThreshold = Math.max(historicalAvg * 2, 3);
    const highThreshold = Math.max(historicalHighAvg * 2, 2);

    const isAnomaly = thisWeekCount >= countThreshold || thisWeekHigh >= highThreshold;

    let message = "";
    if (isAnomaly) {
      if (thisWeekCount >= countThreshold) {
        message = `${thisWeekCount} reports this week (avg: ${historicalAvg.toFixed(1)}/week)`;
      }
      if (thisWeekHigh >= highThreshold) {
        message += message ? `. ${thisWeekHigh} high-risk this week (avg: ${historicalHighAvg.toFixed(1)}/week)` : `${thisWeekHigh} high-risk this week (avg: ${historicalHighAvg.toFixed(1)}/week)`;
      }
    }

    anomalies.push({
      site,
      thisWeekCount,
      historicalAvg: Math.round(historicalAvg * 10) / 10,
      thisWeekHigh,
      historicalHighAvg: Math.round(historicalHighAvg * 10) / 10,
      status: isAnomaly ? "anomaly_detected" : "normal",
      message,
    });
  }

  anomalies.sort((a, b) => {
    if (a.status === "anomaly_detected" && b.status !== "anomaly_detected") return -1;
    if (a.status !== "anomaly_detected" && b.status === "anomaly_detected") return 1;
    return b.thisWeekCount - a.thisWeekCount;
  });

  return NextResponse.json({ anomalies, checkedAt: now.toISOString() });
}

export async function POST(request: NextRequest) {
  // On-demand trigger (same as GET)
  return GET();
}
