"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface EscalationSite {
  site: string;
  score: number;
  classification: "Critical" | "Elevated" | "Normal";
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalReports: number;
  explanation: string;
}

interface Props {
  categoryData: { name: string; count: number }[];
  timeData: { date: string; count: number }[];
  recurringSites: [string, number][];
  stats: { totalReports: number; highCount: number; pendingHigh: number };
  sifDistribution: { name: string; count: number }[];
  highSifNearMisses: number;
  sifTimeData: { date: string; count: number }[];
}

interface Anomaly {
  site: string; thisWeekCount: number; historicalAvg: number;
  thisWeekHigh: number; historicalHighAvg: number;
  status: string; message: string;
}

interface ComplianceSummary {
  categories: { category: string; count: number; regulations: string[]; kbEntries: number; dbEntries: number; verifiedCount: number }[];
  totalFrameworks: number;
  totalKBEntries: number;
  totalDBEntries: number;
}

const CLASSIFICATION_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Critical: { bg: "var(--color-danger-light)", text: "var(--color-danger)", border: "rgba(220,38,38,0.15)", label: "Critical" },
  Elevated: { bg: "var(--color-warning-light)", text: "var(--color-warning)", border: "rgba(217,119,6,0.15)", label: "Elevated" },
  Normal: { bg: "var(--color-safe-light)", text: "var(--color-safe)", border: "rgba(22,163,74,0.15)", label: "Normal" },
};

export default function DashboardClient({ categoryData, timeData, recurringSites, stats, sifDistribution, highSifNearMisses, sifTimeData }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [escalation, setEscalation] = useState<EscalationSite[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceSummary | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/reports/anomaly-check")
      .then((r) => r.json())
      .then((d) => setAnomalies(d.anomalies || []))
      .catch(() => {});
    fetch("/api/sites/escalation-scores")
      .then((r) => r.json())
      .then((d) => setEscalation(d || []))
      .catch(() => {});
    fetch("/api/compliance/summary")
      .then((r) => r.json())
      .then((d) => setComplianceData(d))
      .catch(() => {});
  }, []);

  const flaggedSites = anomalies.filter((a) => a.status === "anomaly_detected");

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sif-watch-report.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally { setExporting(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Safety report analytics across all sites
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          {exporting ? "Generating..." : "Export PDF"}
        </button>
      </div>

      {/* Anomaly Detection Banner */}
      {flaggedSites.length > 0 && (
        <div className="mb-6 rounded-xl p-4" style={{ background: "var(--color-danger-light)", border: "1px solid rgba(220,38,38,0.15)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-danger)" }}>
            Anomaly Detected
          </h3>
          <div className="space-y-1.5">
            {flaggedSites.map((a) => (
              <div key={a.site} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-danger)" }} />
                <span className="font-medium" style={{ color: "var(--color-danger)" }}>{a.site}:</span>
                <span style={{ color: "var(--color-ink)" }}>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Total reports", value: stats.totalReports, color: "var(--color-ink)" },
          { label: "High risk", value: stats.highCount, color: "var(--color-danger)" },
          { label: "High SIF near misses", value: highSifNearMisses, color: "#c2410c" },
          { label: "Pending action", value: stats.pendingHigh, color: "var(--color-warning)" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-xs font-medium tracking-wide uppercase text-[var(--color-ink-muted)] mb-2">
              {card.label}
            </p>
            <p className="text-[32px] font-heading font-bold leading-none" style={{ color: card.color, fontVariantNumeric: "tabular-nums" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Escalation Risk by Site (Heinrich's Law) */}
      {escalation.length > 0 && (
        <div className="mb-6 sm:mb-8 rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)]">
              Escalation risk by site
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)" }}>
              Heinrich&apos;s Law
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            Many small hazards precede serious injuries. Higher scores signal greater escalation risk.
          </p>
          <div className="space-y-2">
            {escalation.map((s) => {
              const style = CLASSIFICATION_STYLE[s.classification];
              return (
                <div
                  key={s.site}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2.5 px-3.5 rounded-lg"
                  style={{ background: "var(--color-surface-sunken)" }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                    >
                      {style.label}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-ink)] truncate">{s.site}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
                    <span>{s.highRiskCount > 0 && <span style={{ color: "var(--color-danger)" }}>{s.highRiskCount} high</span>}{s.mediumRiskCount > 0 && <span> {s.mediumRiskCount} med</span>}{s.lowRiskCount > 0 && <span> {s.lowRiskCount} low</span>}</span>
                    <span
                      className="font-heading font-bold text-sm min-w-[36px] text-right"
                      style={{ color: style.text, fontVariantNumeric: "tabular-nums" }}
                    >
                      {s.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regulatory & Safety Standards Mapping */}
      {complianceData && complianceData.categories && complianceData.categories.length > 0 && (
        <div className="mb-6 sm:mb-8 rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)]">
              Regulatory & Safety Standards Mapping
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
              {complianceData.totalKBEntries} KB entries
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            Curated regulatory knowledge base with activity-aware hazard mapping
          </p>
          <div className="space-y-2">
            {complianceData.categories.map((item) => (
              <div key={item.category} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 px-3.5 rounded-lg" style={{ background: "var(--color-surface-sunken)" }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--color-ink)]">{item.category}</span>
                  <span className="text-xs text-[var(--color-ink-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {item.count} report{item.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.regulations.map((reg) => (
                    <span key={reg} className="text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                      {reg}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] text-[var(--color-ink-faint)]">
            Regulatory references are provided as safety/compliance guidance and should be verified by qualified HSE/compliance personnel.
          </p>
        </div>
      )}

      {/* SIF Potential Distribution + SIF Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <div className="rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)]">
              SIF Potential distribution
            </h2>
            <div className="group relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-help"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div className="absolute left-0 top-6 z-10 w-72 p-3 rounded-lg text-xs leading-relaxed shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}>
                AI-assisted assessment of whether each situation could realistically have resulted in a Serious Injury or Fatality. Requires human review.
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            AI-assisted SIF potential assessment across all reports
          </p>
          {sifDistribution.length > 0 ? (
            <div className="space-y-2">
              {sifDistribution.map((item) => {
                const pct = stats.totalReports > 0 ? Math.round((item.count / stats.totalReports) * 100) : 0;
                const sifColor = item.name.includes("Critical") ? "#991b1b" : item.name.includes("High") ? "#c2410c" : item.name.includes("Potential") && !item.name.includes("Unlikely") ? "#a16207" : "#166534";
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--color-ink)] min-w-[110px] truncate">{item.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-sunken)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: sifColor }} />
                    </div>
                    <span className="text-xs font-heading font-bold min-w-[50px] text-right" style={{ color: sifColor, fontVariantNumeric: "tabular-nums" }}>
                      {item.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">No SIF data available yet.</p>
          )}
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-4">
            High-SIF-potential reports (last 30 days)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={sifTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-body)" }}
              />
              <Line type="monotone" dataKey="count" stroke="#c2410c" strokeWidth={2} dot={{ r: 3, fill: "#c2410c" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <div className="rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-4">
            Hazard category frequency
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-body)" }}
              />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-4">
            High-risk reports (last 30 days)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-body)" }}
              />
              <Line type="monotone" dataKey="count" stroke="var(--color-danger)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-danger)" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recurring Sites */}
      <div className="rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-4">
          Recurring high-risk sites
        </h2>
        {recurringSites.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No sites with multiple high-risk reports.</p>
        ) : (
          <div className="space-y-2">
            {recurringSites.map(([site, count]) => (
              <div
                key={site}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-lg transition-colors duration-200"
                style={{ background: "var(--color-danger-light)" }}
              >
                <span className="text-sm font-medium text-[var(--color-ink)]">{site}</span>
                <span className="text-sm font-semibold font-heading" style={{ color: "var(--color-danger)", fontVariantNumeric: "tabular-nums" }}>
                  {count} high-risk
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
