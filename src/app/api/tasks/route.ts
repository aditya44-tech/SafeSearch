import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const assignee = url.searchParams.get("assignee");
  const reportId = url.searchParams.get("reportId");

  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (assignee) where.assignedTo = assignee;
  if (reportId) where.reportId = reportId;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      report: {
        select: { id: true, site: true, riskLevel: true, hazardCategory: true, reportText: true, status: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reportId, title, description, assignedTo, priority, dueDate } = body;

  if (!reportId || !title || !assignedTo) {
    return NextResponse.json({ error: "reportId, title, and assignedTo required" }, { status: 400 });
  }

  const report = await prisma.safetyReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      reportId,
      title,
      description: description || null,
      assignedTo,
      priority: priority || "normal",
      dueDate: dueDate ? new Date(dueDate) : report.slaDeadline,
    },
    include: {
      report: { select: { id: true, site: true, riskLevel: true, hazardCategory: true } },
    },
  });

  // Log to audit
  await prisma.auditLog.create({
    data: {
      reportId,
      action: "task_created",
      performedBy: "System",
      details: `Task "${title}" assigned to ${assignedTo} (${priority || "normal"} priority)`,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
