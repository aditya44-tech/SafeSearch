"use client";
import React from "react";
import { useState } from "react";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import StatusBadge from "@/components/StatusBadge";

interface Report {
  id: number; reportText: string; site: string; reporterRole: string;
  reportedAt: string; status: string; riskLevel: string | null;
  hazardCategory: string | null; justification: string | null;
  clusterId: string | null; slaDeadline: string | null;
  humanOverrideRiskLevel: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReportsClient({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [sortField, setSortField] = useState<"riskLevel" | "reportedAt">("riskLevel");
  const [creating, setCreating] = useState(false);
  const [newReport, setNewReport] = useState({ reportText: "", site: "", reporterRole: "" });
  const [showClusters, setShowClusters] = useState(false);

  const sorted = [...reports].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (sortField === "riskLevel") {
      const aVal = a.riskLevel ? (order[a.riskLevel] ?? 3) : 3;
      const bVal = b.riskLevel ? (order[b.riskLevel] ?? 3) : 3;
      if (aVal !== bVal) return aVal - bVal;
    }
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      });
      if (res.ok) {
        const report = await res.json();
        setReports([report, ...reports]);
        setNewReport({ reportText: "", site: "", reporterRole: "" });
        setShowNewForm(false);
      }
    } finally { setCreating(false); }
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rIdx = headers.indexOf("reporttext");
    const sIdx = headers.indexOf("site");
    if (rIdx === -1 || sIdx === -1) return;
    const rrIdx = headers.indexOf("reporterrole");
    const newReports: Report[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols[rIdx] && cols[sIdx]) {
        const res = await fetch("/api/reports", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportText: cols[rIdx], site: cols[sIdx], reporterRole: cols[rrIdx] || "Field Worker" }),
        });
        if (res.ok) newReports.push(await res.json());
      }
    }
    setReports([...newReports, ...reports]);
    setShowCSVUpload(false);
  };

  const arrow = sortField === "riskLevel" ? "\u25BC" : "\u25B2";

  return (
    <div>
      {/* Header — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
            Safety reports
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {reports.length} reports across all sites
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowClusters(!showClusters)}
            className="px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 active:scale-[0.97]"
            style={{
              color: showClusters ? "white" : "var(--color-ink-muted)",
              background: showClusters ? "var(--color-accent)" : "var(--color-surface-raised)",
              border: "1px solid " + (showClusters ? "var(--color-accent)" : "var(--color-border)")
            }}>
            Clusters
          </button>
          <button onClick={() => setShowCSVUpload(!showCSVUpload)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.97]"
            style={{ color: "var(--color-ink-muted)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
            Upload CSV
          </button>
          <button onClick={() => setShowNewForm(!showNewForm)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            style={{ background: "var(--color-accent)" }}>
            + New report
          </button>
        </div>
      </div>

      {showCSVUpload && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <p className="text-sm text-[var(--color-ink-muted)] mb-2">Upload CSV: reportText, site, reporterRole</p>
          <input type="file" accept=".csv" onChange={handleCSV} className="block text-sm" />
        </div>
      )}

      {showNewForm && (
        <form onSubmit={handleCreate} className="mb-4 p-5 rounded-xl space-y-3" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <div><label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wide">Site</label>
            <input required value={newReport.site} onChange={(e) => setNewReport({ ...newReport, site: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:ring-2"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }} /></div>
          <div><label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wide">Reporter Role</label>
            <input required value={newReport.reporterRole} onChange={(e) => setNewReport({ ...newReport, reporterRole: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:ring-2"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }} /></div>
          <div><label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wide">Report Text</label>
            <textarea required rows={3} value={newReport.reportText} onChange={(e) => setNewReport({ ...newReport, reportText: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:ring-2 resize-none"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }} /></div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={{ background: "var(--color-accent)" }}>
              {creating ? "Creating..." : "Create report"}
            </button>
            <button type="button" onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.97]"
              style={{ color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table — horizontal scroll on mobile */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th onClick={() => setSortField(sortField === "riskLevel" ? "reportedAt" : "riskLevel")}
                  className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-ink-muted)" }}>
                  Risk {arrow}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>Site</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>Role</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>Category</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>Status</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>SLA</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const isOverdue = r.slaDeadline && new Date(r.slaDeadline) < new Date() && r.status !== "resolved";
                return (
                  <React.Fragment key={r.id}>
                    <tr onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-[var(--color-surface-sunken)]"
                      style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <RiskBadge level={r.humanOverrideRiskLevel || r.riskLevel} />
                          {r.humanOverrideRiskLevel && r.humanOverrideRiskLevel !== r.riskLevel && (
                            <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>override</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
                        {r.site}
                        {r.clusterId && showClusters && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                            clustered
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-[var(--color-ink-muted)]">{r.reporterRole}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-ink-muted)]">{r.hazardCategory || "\u2014"}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs" suppressHydrationWarning
                        style={{
                          color: isOverdue ? "var(--color-danger)" : "var(--color-ink-faint)",
                          fontWeight: isOverdue ? 600 : 400,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                        {r.slaDeadline
                          ? isOverdue
                            ? "OVERDUE"
                            : `Due ${formatDate(r.slaDeadline)}`
                          : "\u2014"}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-[var(--color-ink-faint)]" suppressHydrationWarning style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatDate(r.reportedAt)}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={r.id + "-exp"}><td colSpan={7} className="px-5 py-5" style={{ background: "var(--color-surface-sunken)" }}>
                        <div className="max-w-3xl">
                          <p className="text-sm text-[var(--color-ink)] mb-2 leading-relaxed">
                            <span className="font-semibold">Report:</span> {r.reportText}
                          </p>
                          {r.justification && (
                            <p className="text-sm text-[var(--color-ink-muted)] italic mb-2">
                              <span className="font-semibold not-italic">AI assessment:</span> {r.justification}
                            </p>
                          )}
                          {r.humanOverrideRiskLevel && r.humanOverrideRiskLevel !== r.riskLevel && (
                            <p className="text-sm mb-2" style={{ color: "var(--color-warning)" }}>
                              <span className="font-semibold">Override:</span> Risk changed to {r.humanOverrideRiskLevel} by human reviewer
                            </p>
                          )}
                          <Link href={"/reports/" + r.id}
                            className="inline-flex items-center gap-1 text-sm font-medium transition-colors duration-200"
                            style={{ color: "var(--color-accent)" }}>
                            View full details
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          </Link>
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
