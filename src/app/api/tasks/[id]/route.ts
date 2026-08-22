import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const body = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, any> = {};
  if (body.status) updateData.status = body.status;
  if (body.assignedTo) updateData.assignedTo = body.assignedTo;
  if (body.priority) updateData.priority = body.priority;
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.dueDate) updateData.dueDate = new Date(body.dueDate);

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      report: { select: { id: true, site: true, riskLevel: true, hazardCategory: true } },
    },
  });

  // Log status changes
  if (body.status && body.status !== task.status) {
    await prisma.auditLog.create({
      data: {
        reportId: task.reportId,
        action: "task_status_changed",
        performedBy: body.performedBy || "System",
        details: `Task "${task.title}" status: ${task.status} → ${body.status}`,
      },
    });
  }

  // If task done and report was acknowledged, auto-resolve
  if (body.status === "done" && task.status !== "done") {
    const report = await prisma.safetyReport.findUnique({ where: { id: task.reportId } });
    if (report && report.status === "acknowledged") {
      // Check if all tasks for this report are completed
      const openTasks = await prisma.task.count({
        where: { reportId: task.reportId, status: { not: "done" }, id: { not: id } },
      });
      if (openTasks === 0) {
        await prisma.safetyReport.update({
          where: { id: task.reportId },
          data: { status: "resolved" },
        });
        await prisma.auditLog.create({
          data: {
            reportId: task.reportId,
            action: "auto_resolved",
            performedBy: "System",
            details: "All tasks completed — report auto-resolved",
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      reportId: task.reportId,
      action: "task_deleted",
      performedBy: "System",
      details: `Task "${task.title}" deleted`,
    },
  });

  return NextResponse.json({ ok: true });
}
