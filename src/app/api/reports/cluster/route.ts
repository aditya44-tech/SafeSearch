import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple TF-IDF-like text similarity using word overlap
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function similarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  return intersection / Math.max(tokensA.size, tokensB.size);
}

// Simple keyword-based semantic grouping
function semanticHash(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("fall") || t.includes("height") || t.includes("scaffold") || t.includes("edge") || t.includes("guardrail")) return "fall_heights";
  if (t.includes("electrical") || t.includes("wire") || t.includes("circuit") || t.includes("shock")) return "electrical";
  if (t.includes("chemical") || t.includes("fume") || t.includes("spill") || t.includes("ventilation") || t.includes("toxic")) return "chemical";
  if (t.includes("vehicle") || t.includes("forklift") || t.includes("crane") || t.includes("traffic") || t.includes("truck")) return "vehicle";
  if (t.includes("equipment") || t.includes("machine") || t.includes("guard") || t.includes("broken") || t.includes("damaged")) return "equipment";
  if (t.includes("confined") || t.includes("trench") || t.includes("excavat")) return "confined_space";
  return "general";
}

export async function POST(request: NextRequest) {
  const { reportId } = await request.json();
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const report = await prisma.safetyReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all other analyzed reports
  const allReports = await prisma.safetyReport.findMany({
    where: {
      id: { not: reportId },
      riskLevel: { not: null },
    },
    select: { id: true, reportText: true, site: true, clusterId: true, hazardCategory: true },
  });

  // Check semantic similarity
  const reportHash = semanticHash(report.reportText);
  const SIMILARITY_THRESHOLD = 0.25;

  const similarReports = allReports.filter((r) => {
    // Same semantic category
    if (semanticHash(r.reportText) !== reportHash) return false;
    // Text similarity above threshold
    return similarity(report.reportText, r.reportText) >= SIMILARITY_THRESHOLD;
  });

  if (similarReports.length === 0) {
    // No clusters found — assign new cluster
    const clusterId = `cluster_${reportHash}_${Date.now()}`;
    await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId } });
    return NextResponse.json({ clusterId, members: [reportId], isNew: true });
  }

  // Use existing clusterId from first match, or create new one
  let clusterId = similarReports.find((r) => r.clusterId)?.clusterId;
  if (!clusterId) {
    clusterId = `cluster_${reportHash}_${Date.now()}`;
  }

  // Assign this report to the cluster
  await prisma.safetyReport.update({ where: { id: reportId }, data: { clusterId } });

  const members = [reportId, ...similarReports.map((r) => r.id)];
  return NextResponse.json({ clusterId, members, isNew: false, similarity: "semantic + text" });
}

export async function GET() {
  // Get all clusters
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
