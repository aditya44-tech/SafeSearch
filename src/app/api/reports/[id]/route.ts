import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSiteScore } from "@/lib/helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const body = await _request.json();

  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, any> = {};
  if (body.status && body.status !== report.status) {
    updateData.status = body.status;
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(report);
  }

  const updated = await prisma.safetyReport.update({ where: { id }, data: updateData });

  if (updateData.status) {
    await prisma.auditLog.create({
      data: {
        reportId: id,
        action: "status_changed",
        performedBy: body.performedBy || "Current User",
        details: `Status changed from "${report.status}" to "${updateData.status}"`,
      },
    });
    await recalculateSiteScore(prisma, report.site);
  }

  return NextResponse.json(updated);
}
