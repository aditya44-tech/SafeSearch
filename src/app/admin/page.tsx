import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
  });

  const tasks = await prisma.task.findMany({
    include: {
      report: {
        select: { id: true, site: true, riskLevel: true, hazardCategory: true, reportText: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Stats
  const pendingReports = reports.filter((r) => r.status === "pending" || r.status === "analyzed").length;
  const overdueTasks = tasks.filter((t) =>
    t.status !== "completed" && t.status !== "cancelled" && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <AdminClient
      reports={JSON.parse(JSON.stringify(reports))}
      tasks={JSON.parse(JSON.stringify(tasks))}
      stats={{ total: reports.length, pending: pendingReports, overdueTasks }}
    />
  );
}
