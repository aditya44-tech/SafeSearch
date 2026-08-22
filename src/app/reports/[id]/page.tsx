import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportDetailClient from "./ReportDetailClient";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) notFound();
  return <ReportDetailClient report={JSON.parse(JSON.stringify(report))} />;
}
