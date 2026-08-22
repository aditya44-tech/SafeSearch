import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportDetailClient from "./ReportDetailClient";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const report = await prisma.safetyReport.findUnique({
    where: { id },
    include: {
      auditLogs: { orderBy: { timestamp: "desc" }, take: 20 },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!report) notFound();
  return <ReportDetailClient report={JSON.parse(JSON.stringify(report))} />;
}
