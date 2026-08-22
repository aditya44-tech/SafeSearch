"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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

export default function DashboardClient({ categoryData, timeData, recurringSites, stats }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/reports/anomaly-check")
      .then((r) => r.json())
      .then((d) => setAnomalies(d.anomalies || []))
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
