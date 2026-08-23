import { prisma } from "@/lib/prisma";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org ? parseInt(params.org, 10) : undefined;

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const alerts = await prisma.safetyReport.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      riskLevel: "high",
      status: { in: ["pending", "acknowledged"] },
      reportedAt: { lt: cutoff },
    },
    orderBy: { reportedAt: "asc" },
  });
  return <AlertsClient reports={JSON.parse(JSON.stringify(alerts))} />;
}
