import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDateIST } from "@/lib/helpers";

export async function POST(request: NextRequest) {
  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
  });

  const highReports = reports.filter((r) => r.riskLevel === "high" && r.status !== "resolved");
  const siteMap: Record<string, { total: number; high: number; medium: number; low: number }> = {};
  for (const r of reports) {
    if (!siteMap[r.site]) siteMap[r.site] = { total: 0, high: 0, medium: 0, low: 0 };
    siteMap[r.site].total++;
    if (r.riskLevel === "high") siteMap[r.site].high++;
    else if (r.riskLevel === "medium") siteMap[r.site].medium++;
    else if (r.riskLevel === "low") siteMap[r.site].low++;
  }
  const topSites = Object.entries(siteMap)
    .sort((a, b) => b[1].high - a[1].high)
    .slice(0, 5);

  const now = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 28px; color: #0f766e; border-bottom: 2px solid #e5e3df; padding-bottom: 6px; }
  .subtitle { color: #6b6b6b; font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 20px; margin-bottom: 24px; }
  .stat { padding: 16px; border: 1px solid #e5e3df; border-radius: 8px; min-width: 120px; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b6b; }
  .stat-value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; background: #f0eeeb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b6b; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e3df; }
  .high { color: #dc2626; font-weight: 600; }
  .medium { color: #d97706; font-weight: 600; }
  .low { color: #16a34a; font-weight: 600; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e3df; font-size: 11px; color: #9e9e9e; }
</style></head><body>
  <h1>SafeSignal Report</h1>
  <p class="subtitle">Generated ${now} &mdash; Safety report summary</p>

  <div class="stats">
    <div class="stat"><div class="stat-label">Total Reports</div><div class="stat-value">${reports.length}</div></div>
    <div class="stat"><div class="stat-label">High Risk</div><div class="stat-value high">${reports.filter((r) => r.riskLevel === "high").length}</div></div>
    <div class="stat"><div class="stat-label">Unresolved High</div><div class="stat-value high">${highReports.length}</div></div>
    <div class="stat"><div class="stat-label">Pending Action</div><div class="stat-value medium">${reports.filter((r) => r.status === "pending" || r.status === "acknowledged").length}</div></div>
  </div>

  <h2>Unresolved high-risk items (${highReports.length})</h2>
  ${highReports.length === 0 ? "<p>No unresolved high-risk reports.</p>" : `
  <table>
    <tr><th>Site</th><th>Category</th><th>Reporter</th><th>Date</th><th>Status</th><th>Justification</th></tr>
    ${highReports.map((r) => `<tr>
      <td>${r.site}</td>
      <td>${r.hazardCategory || "—"}</td>
      <td>${r.reporterRole}</td>
      <td>${formatDateIST(r.reportedAt)}</td>
      <td class="high">${r.status}</td>
      <td>${r.justification || "—"}</td>
    </tr>`).join("")}
  </table>`}

  <h2>Top 5 riskiest sites</h2>
  <table>
    <tr><th>Site</th><th>Total</th><th>High</th><th>Medium</th><th>Low</th></tr>
    ${topSites.map(([site, data]) => `<tr>
      <td>${site}</td>
      <td>${data.total}</td>
      <td class="high">${data.high}</td>
      <td class="medium">${data.medium}</td>
      <td class="low">${data.low}</td>
    </tr>`).join("")}
  </table>

  <h2>Risk breakdown</h2>
  <table>
    <tr><th>Risk Level</th><th>Count</th><th>% of Total</th></tr>
    <tr><td class="high">High</td><td>${reports.filter((r) => r.riskLevel === "high").length}</td><td>${Math.round((reports.filter((r) => r.riskLevel === "high").length / Math.max(reports.length, 1)) * 100)}%</td></tr>
    <tr><td class="medium">Medium</td><td>${reports.filter((r) => r.riskLevel === "medium").length}</td><td>${Math.round((reports.filter((r) => r.riskLevel === "medium").length / Math.max(reports.length, 1)) * 100)}%</td></tr>
    <tr><td class="low">Low</td><td>${reports.filter((r) => r.riskLevel === "low").length}</td><td>${Math.round((reports.filter((r) => r.riskLevel === "low").length / Math.max(reports.length, 1)) * 100)}%</td></tr>
  </table>

  <div class="footer">SafeSignal &mdash; Workplace Safety Early Warning System &mdash; Generated ${now}</div>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="sif-watch-report-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}
