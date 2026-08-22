import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { semanticHash, textSimilarity } from "@/lib/helpers";

const SIMILARITY_THRESHOLD = 0.25;

export async function POST(request: NextRequest) {
  const { reportId } = await request.json();
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const report = await prisma.safetyReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allReports = await prisma.safetyReport.findMany({
    where: { id: { not: reportId }, riskLevel: { not: null } },
    select: { id: true, reportText: true, site: true, clusterId: true, hazardCategory: true },
  });

  const reportHash = semanticHash(report.reportText);
  const similarReports = allReports.filter((r) => {
    if (semanticHash(r.reportText) !== reportHash) return false;
    return textSimilarity(report.reportText, r.reportText) >= SIMILARITY_THRESHOLD;
  });

  if (similarReports.length === 0) {
    const clusterId = `cluster_${reportHash}_${Date.now()}`;
    await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId } });
    return NextResponse.json({ clusterId, members: [reportId], isNew: true });
  }

  let clusterId = similarReports.find((r) => r.clusterId)?.clusterId;
  if (!clusterId) {
    clusterId = `cluster_${reportHash}_${Date.now()}`;
  }

  await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId } });
  const members = [reportId, ...similarReports.map((r) => r.id)];
  return NextResponse.json({ clusterId, members, isNew: false, similarity: "semantic + text" });
}

export async function GET() {
  const reports = await prisma.safetyReport.findMany({
    where: { clusterId: { not: null } },
    select: { id: true, clusterId: true, site: true, riskLevel: true, hazardCategory: true, reportText: true, reportedAt: true },
    orderBy: { reportedAt: "desc" },
  });

  const clusters: Record<string, typeof reports> = {};
  for (const r of reports) {
    if (!r.clusterId) continue;
    if (!clusters[r.clusterId]) clusters[r.clusterId] = [];
    clusters[r.clusterId].push(r);
  }

  return NextResponse.json(clusters);
}
