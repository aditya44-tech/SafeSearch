import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/helpers";

const QUERY_PROMPT = `You are a safety data assistant. You will be given a user's question and a JSON summary of safety reports (site, date, risk level, hazard category, status). Answer the question using ONLY the data provided — do not make up information. If the data doesn't contain enough information to answer, say so clearly. Keep your answer to 2-3 sentences, plain language, no jargon.

User question: {{userQuestion}}
Report data: {{reportDataSummary}}`;

export async function POST(request: NextRequest) {
  const { question } = await request.json();
  if (!question) return NextResponse.json({ error: "No question provided" }, { status: 400 });

  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
    take: 200,
    select: {
      site: true, reportedAt: true, riskLevel: true,
      hazardCategory: true, status: true, reporterRole: true,
    },
  });

  const reportDataSummary = JSON.stringify(
    reports.map((r) => ({
      site: r.site,
      date: new Date(r.reportedAt).toISOString().split("T")[0],
      risk: r.riskLevel || "unanalyzed",
      category: r.hazardCategory || "unknown",
      status: r.status,
      role: r.reporterRole,
    })),
    null,
    0
  );

  const prompt = QUERY_PROMPT
    .replace("{{userQuestion}}", question)
    .replace("{{reportDataSummary}}", reportDataSummary);

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const answer = await callGemini(prompt, apiKey, {
        temperature: 0.3,
        maxOutputTokens: 500,
      });
      return NextResponse.json({ answer });
    } catch {
      // Fall through to basic answer
    }
  }

  // Fallback: basic data-driven answer
  const q = question.toLowerCase();
  let answer = "Based on the available data:\n";

  if (q.includes("electrical")) {
    const electrical = reports.filter((r) => r.hazardCategory?.toLowerCase().includes("electrical"));
    if (electrical.length) {
      const sites = [...new Set(electrical.map((r) => r.site))];
      answer += `${electrical.length} electrical hazard reports found at: ${sites.join(", ")}.`;
    } else {
      answer += "No electrical hazard reports found in the current data.";
    }
  } else if (q.includes("high risk") || q.includes("high-risk")) {
    const high = reports.filter((r) => r.riskLevel === "high");
    const unresolved = high.filter((r) => r.status === "pending" || r.status === "acknowledged");
    answer += `${high.length} total high-risk reports. ${unresolved.length} still require action.`;
  } else if (q.includes("common") || q.includes("most")) {
    const catMap: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.hazardCategory) catMap[r.hazardCategory] = (catMap[r.hazardCategory] || 0) + 1;
    });
    const top = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    answer += `Most common categories: ${top.map(([k, v]) => `${k} (${v})`).join(", ")}.`;
  } else {
    answer += `There are ${reports.length} reports in the system across ${[...new Set(reports.map((r) => r.site))].length} sites.`;
  }

  return NextResponse.json({ answer });
}
