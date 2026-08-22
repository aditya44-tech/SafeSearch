import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSiteScore } from "@/lib/helpers";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await _request.json();
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

  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "risk_overridden",
      performedBy: performedBy || "Unknown",
      details: `Overrode AI assessment from "${report.riskLevel}" to "${riskLevel}". Reason: ${reason}`,
    },
  });

  await recalculateSiteScore(prisma, report.site);

  return NextResponse.json(updated);
}
