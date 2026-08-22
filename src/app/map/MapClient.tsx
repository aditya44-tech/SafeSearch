"use client";
import { useState } from "react";

interface Report {
  id: string; site: string; riskLevel: string | null; hazardCategory: string | null;
  status: string; reportedAt: string; reportText: string; justification: string | null;
  reporterRole: string; humanOverrideRiskLevel: string | null;
}

interface SiteData {
  site: string; total: number; high: number; medium: number; low: number;
  pending: number; riskScore: number; reports: Report[];
}

export default function MapClient({ siteData }: { siteData: SiteData[] }) {
  const [selected, setSelected] = useState<SiteData | null>(null);
  const maxScore = Math.max(...siteData.map((s) => s.riskScore), 1);

  function getRiskColor(score: number) {
    const ratio = score / maxScore;
    if (ratio > 0.6) return { bg: "#fef2f2", border: "#dc2626", text: "#dc2626", shadow: "rgba(220,38,38,0.12)" };
    if (ratio > 0.3) return { bg: "#fffbeb", border: "#d97706", text: "#d97706", shadow: "rgba(217,119,6,0.12)" };
    return { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a", shadow: "rgba(22,163,74,0.12)" };
  }

  function getRiskSize(score: number) {
    const ratio = score / maxScore;
    // Scale from 100px to 180px based on risk score
    const size = 100 + ratio * 80;
    return size;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
          Site risk map
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Visual overview of risk concentration across all sites. Click a site to see recent reports.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-xs text-[var(--color-ink-muted)]">
        <span className="font-medium">Risk level:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#dc2626" }} /> High</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#d97706" }} /> Medium</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#16a34a" }} /> Low</span>
        <span className="ml-2 text-[var(--color-ink-faint)]">Size = risk concentration</span>
      </div>

      {/* Heatmap Grid */}
      <div className="rounded-xl p-8" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <div className="flex flex-wrap gap-5 justify-center items-end min-h-[320px]">
          {siteData.map((s) => {
            const color = getRiskColor(s.riskScore);
            const size = getRiskSize(s.riskScore);
            const isSelected = selected?.site === s.site;
            return (
              <button
                key={s.site}
                onClick={() => setSelected(isSelected ? null : s)}
                className="flex flex-col items-center justify-center rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
                style={{
                  width: size,
                  height: size,
                  background: color.bg,
                  border: `2px solid ${color.border}`,
                  boxShadow: isSelected ? `0 0 0 3px ${color.border}` : `0 2px 8px ${color.shadow}`,
                  transform: isSelected ? "scale(1.08)" : undefined,
                }}
              >
                <span className="text-[11px] font-semibold leading-tight text-center px-2" style={{ color: color.text }}>
                  {s.site}
                </span>
                <span className="text-[22px] font-heading font-bold mt-0.5" style={{ color: color.text, fontVariantNumeric: "tabular-nums" }}>
                  {s.total}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: color.text, opacity: 0.7 }}>
                  reports
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Site Detail */}
      {selected && (
        <div className="mt-6 rounded-xl p-6" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-heading font-semibold text-[var(--color-ink)]">{selected.site}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-ink-muted)]">
                <span>{selected.total} total reports</span>
                <span style={{ color: "var(--color-danger)" }}>{selected.high} high</span>
                <span style={{ color: "var(--color-warning)" }}>{selected.medium} medium</span>
                <span style={{ color: "var(--color-safe)" }}>{selected.low} low</span>
                <span>{selected.pending} pending action</span>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selected.reports.map((r) => (
              <a
                key={r.id}
                href={"/reports/" + r.id}
                className="block rounded-lg p-3 transition-all duration-200 hover:shadow-sm"
                style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RiskDot level={r.humanOverrideRiskLevel || r.riskLevel} />
                  <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                    {r.hazardCategory || "Uncategorized"}
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-faint)] ml-auto">
                    {new Date(r.reportedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink)]" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {r.reportText}
                </p>
                {r.justification && (
                  <p className="text-xs text-[var(--color-ink-faint)] italic mt-1">{r.justification}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskDot({ level }: { level: string | null }) {
  const color = level === "high" ? "#dc2626" : level === "medium" ? "#d97706" : level === "low" ? "#16a34a" : "#9e9e9e";
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />;
}
