"use client";
import Link from "next/link";

interface Report {
  id: number; reportText: string; site: string; reporterRole: string;
  reportedAt: string; status: string; riskLevel: string | null;
  hazardCategory: string | null; justification: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AlertsClient({ reports }: { reports: Report[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
          Active alerts
        </h1>
        {reports.length > 0 && (
          <span
            className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide"
            style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", border: "1px solid rgba(220,38,38,0.15)" }}
          >
            {reports.length} urgent
          </span>
        )}
      </div>
      {reports.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-lg text-[var(--color-ink-muted)]">No stale high-risk alerts. All caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const hoursAgo = Math.round(
              (Date.now() - new Date(r.reportedAt).getTime()) / (1000 * 60 * 60)
            );
            return (
              <div
                key={r.id}
                className="rounded-xl p-5 transition-all duration-200 hover:shadow-md group"
                style={{
                  background: "var(--color-surface-raised)",
                  borderLeft: "3px solid var(--color-danger)",
                  border: "1px solid var(--color-border)",
                  borderLeftWidth: "3px",
                  borderLeftColor: "var(--color-danger)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase"
                        style={{ background: "var(--color-danger-light)", color: "var(--color-danger)" }}
                      >
                        HIGH RISK
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase"
                        style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                        {hoursAgo}h overdue
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                      {r.site} <span className="text-[var(--color-ink-faint)]">&mdash;</span> {r.hazardCategory}
                    </h3>
                    <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{r.reportText}</p>
                    {r.justification && (
                      <p className="text-sm text-[var(--color-ink-faint)] italic mt-1.5">{r.justification}</p>
                    )}
                    <p className="text-xs text-[var(--color-ink-faint)] mt-2.5" suppressHydrationWarning>
                      Reported by {r.reporterRole} on {formatDate(r.reportedAt)}
                    </p>
                  </div>
                  <Link
                    href={"/reports/" + r.id}
                    className="ml-2 px-4 py-2 text-sm font-medium text-white rounded-lg whitespace-nowrap transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
                    style={{ background: "var(--color-accent)" }}
                  >
                    Review
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
