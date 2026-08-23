"use client";

interface SiteRow {
  site: string;
  totalReports: number;
  highRiskCount: number;
  resolvedCount: number;
  escalationScore: number;
  estimatedInjuriesPrevented: number;
}

interface Props {
  totalHighRisk: number;
  resolvedHighRisk: number;
  resolvedMediumRisk: number;
  estimatedInjuriesPrevented: number;
  siteBreakdown: SiteRow[];
  totalReports: number;
}

const SCORE_COLOR = (score: number) => {
  if (score > 40) return { bg: "var(--color-danger-light)", text: "var(--color-danger)" };
  if (score >= 20) return { bg: "var(--color-warning-light)", text: "var(--color-warning)" };
  return { bg: "var(--color-safe-light)", text: "var(--color-safe)" };
};

export default function ImpactClient({
  totalHighRisk,
  resolvedHighRisk,
  resolvedMediumRisk,
  estimatedInjuriesPrevented,
  siteBreakdown,
  totalReports,
}: Props) {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
          Impact calculator
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Estimated injuries prevented through proactive near-miss reporting
        </p>
      </div>

      {/* Heinrich's Law Explanation */}
      <div
        className="rounded-xl p-5 mb-6 sm:mb-8"
        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)]">
            Heinrich&apos;s Law
          </h2>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
          >
            Safety Science
          </span>
        </div>
        <p className="text-sm text-[var(--color-ink)] leading-relaxed mb-3">
          For every serious injury, there are approximately <strong>300 near-misses</strong> that preceded it.
          High-risk near-misses — the ones your team reports and you address — are the strongest early warning
          signs. Resolving them before they escalate is how serious injuries get prevented.
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
          Our estimate uses a conservative ratio: roughly <strong>1 serious injury prevented per 8 high-risk
          near-misses resolved</strong>. This accounts for the fact that not every high-risk report would have
          resulted in an injury, and that other factors contribute to incident prevention.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div
          className="rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium tracking-wide uppercase text-[var(--color-ink-muted)] mb-2">
            Total reports
          </p>
          <p
            className="text-[32px] font-heading font-bold leading-none"
            style={{ color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}
          >
            {totalReports}
          </p>
        </div>
        <div
          className="rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--color-danger-light)", border: "1px solid rgba(220,38,38,0.15)" }}
        >
          <p className="text-xs font-medium tracking-wide uppercase mb-2" style={{ color: "var(--color-danger)" }}>
            High-risk resolved
          </p>
          <p
            className="text-[32px] font-heading font-bold leading-none"
            style={{ color: "var(--color-danger)", fontVariantNumeric: "tabular-nums" }}
          >
            {resolvedHighRisk}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-danger)" }}>
            of {totalHighRisk} total high-risk
          </p>
        </div>
        <div
          className="rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--color-warning-light)", border: "1px solid rgba(217,119,6,0.15)" }}
        >
          <p className="text-xs font-medium tracking-wide uppercase mb-2" style={{ color: "var(--color-warning)" }}>
            Medium-risk resolved
          </p>
          <p
            className="text-[32px] font-heading font-bold leading-none"
            style={{ color: "var(--color-warning)", fontVariantNumeric: "tabular-nums" }}
          >
            {resolvedMediumRisk}
          </p>
        </div>
        <div
          className="rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--color-safe-light)", border: "1px solid rgba(22,163,74,0.15)" }}
        >
          <p className="text-xs font-medium tracking-wide uppercase mb-2" style={{ color: "var(--color-safe)" }}>
            Estimated injuries prevented
          </p>
          <p
            className="text-[32px] font-heading font-bold leading-none"
            style={{ color: "var(--color-safe)", fontVariantNumeric: "tabular-nums" }}
          >
            {estimatedInjuriesPrevented}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-ink-muted)" }}>
            based on near-miss-to-injury ratio
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-lg p-3 mb-6 sm:mb-8 text-xs leading-relaxed"
        style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}
      >
        <strong>Disclaimer:</strong> Estimate based on general industry near-miss-to-injury ratios (Heinrich&apos;s Law), for illustrative purposes only.
        Actual injury prevention depends on many additional factors including training, equipment maintenance, and safety culture.
        These numbers should not be used as guaranteed statistics for regulatory or insurance purposes.
      </div>

      {/* Site Breakdown */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="text-sm font-heading font-semibold text-[var(--color-ink)] mb-1">
          Impact by site
        </h2>
        <p className="text-xs text-[var(--color-ink-muted)] mb-4">
          Ranked by escalation score — higher score means more high-risk activity
        </p>

        {siteBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No analyzed reports yet.</p>
        ) : (
          <div className="space-y-2">
            {siteBreakdown.map((site, i) => {
              const color = SCORE_COLOR(site.escalationScore);
              return (
                <div
                  key={site.site}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 px-3.5 rounded-lg"
                  style={{ background: "var(--color-surface-sunken)" }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-medium text-[var(--color-ink-muted)] w-5 text-center">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-ink)] truncate">{site.site}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[var(--color-ink-muted)]">
                      <strong className="text-[var(--color-ink)]">{site.totalReports}</strong> reports
                    </span>
                    <span>
                      <strong style={{ color: "var(--color-danger)" }}>{site.highRiskCount}</strong>{" "}
                      <span className="text-[var(--color-ink-muted)]">high</span>
                    </span>
                    <span>
                      <strong style={{ color: "var(--color-safe)" }}>{site.resolvedCount}</strong>{" "}
                      <span className="text-[var(--color-ink-muted)]">resolved</span>
                    </span>
                    <span
                      className="font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: color.bg, color: color.text }}
                    >
                      Score {site.escalationScore}
                    </span>
                    {site.estimatedInjuriesPrevented > 0 && (
                      <span
                        className="font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: "var(--color-safe-light)", color: "var(--color-safe)" }}
                      >
                        ~{site.estimatedInjuriesPrevented} prevented
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
