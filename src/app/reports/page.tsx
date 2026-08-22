import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.safetyReport.findMany();
  const sorted = [...reports].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const aVal = a.riskLevel ? (order[a.riskLevel] ?? 3) : 3;
    const bVal = b.riskLevel ? (order[b.riskLevel] ?? 3) : 3;
    if (aVal !== bVal) return aVal - bVal;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });
  return <ReportsClient reports={JSON.parse(JSON.stringify(sorted))} />;
}