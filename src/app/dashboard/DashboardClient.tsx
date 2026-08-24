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
}

interface Anomaly {
  site: string; thisWeekCount: number; historicalAvg: number;
  thisWeekHigh: number; historicalHighAvg: number;
  status: string; message: string;
}

interface ComplianceSummary {
  category: string;
  count: number;
  regulations: string[];
}

const CLASSIFICATION_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Critical: { bg: "var(--color-danger-light)", text: "var(--color-danger)", border: "rgba(220,38,38,0.15)", label: "Critical" },
  Elevated: { bg: "var(--color-warning-light)", text: "var(--color-warning)", border: "rgba(217,119,6,0.15)", label: "Elevated" },
  Normal: { bg: "var(--color-safe-light)", text: "var(--color-safe)", border: "rgba(22,163,74,0.15)", label: "Normal" },
};

export default function DashboardClient({ categoryData, timeData, recurringSites, stats }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [escalation, setEscalation] = useState<EscalationSite[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary[]>([]);
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
      .then((d) => setComplianceSummary(d || []))
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

      {/* Compliance Summary */}
      {complianceSummary.length > 0 && (
        <div className="mb-6 sm:mb-8 rounded-xl p-5" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-1">
            Regulatory compliance flags
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            Active hazard categories and their applicable regulations
          </p>
          <div className="space-y-2">
            {complianceSummary.map((item) => (
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
        </div>
      )}

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
