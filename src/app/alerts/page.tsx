import { prisma } from "@/lib/prisma";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const alerts = await prisma.safetyReport.findMany({
    where: {
      riskLevel: "high",
      status: { in: ["pending", "acknowledged"] },
      reportedAt: { lt: cutoff },
    },
    orderBy: { reportedAt: "asc" },
  });
  return <AlertsClient reports={JSON.parse(JSON.stringify(alerts))} />;
}
