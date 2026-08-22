import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateEscalationScores } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = await prisma.safetyReport.findMany({
    select: { site: true, riskLevel: true, reportedAt: true },
  });

  const scores = calculateEscalationScores(reports);
  return NextResponse.json(scores);
}
