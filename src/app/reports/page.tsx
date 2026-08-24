import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.safetyReport.findMany({
    orderBy: [{ riskLevel: "asc" }, { reportedAt: "desc" }],
  });

  // Sort by risk level priority (high first)
  const sorted = [...reports].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const aVal = a.riskLevel ? (order[a.riskLevel] ?? 3) : 3;
    const bVal = b.riskLevel ? (order[b.riskLevel] ?? 3) : 3;
    if (aVal !== bVal) return aVal - bVal;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });
  // Get ALL unique sites for the dropdown (not filtered by org)
  const siteRows = await prisma.safetyReport.findMany({
    select: { site: true },
    distinct: ["site"],
    orderBy: { site: "asc" },
  });
  const sites = siteRows.map((r) => r.site);

  return <ReportsClient reports={JSON.parse(JSON.stringify(sorted))} sites={sites} />;
}
