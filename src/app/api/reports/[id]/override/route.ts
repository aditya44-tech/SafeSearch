import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { riskLevel, reason, performedBy } = body;

  if (!riskLevel || !reason) {
    return NextResponse.json({ error: "riskLevel and reason required" }, { status: 400 });
  }

  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.safetyReport.update({
    where: { id },
    data: {
      humanOverrideRiskLevel: riskLevel,
      overrideReason: reason,
      overriddenBy: performedBy || "Unknown",
    },
  });

  // Log to audit
  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "risk_overridden",
      performedBy: performedBy || "Unknown",
      details: `Overrode AI assessment from "${report.riskLevel}" to "${riskLevel}". Reason: ${reason}`,
    },
  });

  // Recalculate site score
  await recalculateSiteScore(report.site);

  return NextResponse.json(updated);
}

async function recalculateSiteScore(site: string) {
  const reports = await prisma.safetyReport.findMany({
    where: { site },
    select: { riskLevel: true, status: true, reportedAt: true, updatedAt: true },
  });

  const total = reports.length;
  const high = reports.filter((r) => {
    const effective = r.riskLevel;
    return effective === "high";
  }).length;

  const resolved = reports.filter((r) => r.status === "resolved");
  const resolutionTimes = resolved.map(
    (r) => (new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) / (1000 * 60 * 60)
  );
  const avgResolution = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;

  const highPenalty = high * 15;
  const speedBonus = avgResolution > 0 ? Math.max(0, 30 - avgResolution / 2) : 0;
  const score = Math.max(0, Math.min(100, 100 - highPenalty + speedBonus));

  await prisma.siteScore.upsert({
    where: { site },
    update: {
      totalReports: total,
      highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
    create: {
      site,
      totalReports: total,
      highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
  });
}
