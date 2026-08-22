"use client";

interface Site {
  site: string; totalReports: number; highRiskCount: number;
  avgResolutionHours: number; scoreValue: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return { bg: "var(--color-safe-light)", text: "var(--color-safe)", border: "rgba(22,163,74,0.15)" };
  if (score >= 50) return { bg: "var(--color-warning-light)", text: "var(--color-warning)", border: "rgba(217,119,6,0.15)" };
  return { bg: "var(--color-danger-light)", text: "var(--color-danger)", border: "rgba(220,38,38,0.15)" };
}

function getMedal(rank: number) {
  if (rank === 0) return { emoji: "\u{1F947}", bg: "#fef3c7" };
  if (rank === 1) return { emoji: "\u{1F948}", bg: "#f1f5f9" };
  if (rank === 2) return { emoji: "\u{1F949}", bg: "#fed7aa" };
  return { emoji: "", bg: "" };
}

export default function ScoreboardClient({ sites }: { sites: Site[] }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
          Safety scoreboard
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Sites ranked by safety score. Fewer high-risk reports and faster resolution = higher score.
        </p>
      </div>

      {/* Score Explanation */}
      <div className="rounded-xl p-4 mb-6 text-xs text-[var(--color-ink-muted)]" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <span className="font-medium text-[var(--color-ink)]">How scores work:</span>{" "}
        Each high-risk report costs 15 points. Faster resolution earns bonus points. Max score is 100.
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          <p className="text-lg text-[var(--color-ink-muted)]">No site scores yet. Analyze some reports to generate scores.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((s, i) => {
            const color = getScoreColor(s.scoreValue);
            const medal = getMedal(i);
            return (
              <div
                key={s.site}
                className="rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-5 transition-all duration-200 hover:shadow-md"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
              >
                {/* Rank */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-heading font-bold flex-shrink-0"
                  style={{ background: medal.bg || "var(--color-surface-sunken)", color: "var(--color-ink)" }}>
                  {medal.emoji || (i + 1)}
                </div>

                {/* Site Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-heading font-semibold text-[var(--color-ink)] truncate">{s.site}</h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    <span>{s.totalReports} reports</span>
                    <span style={{ color: s.highRiskCount > 0 ? "var(--color-danger)" : undefined }}>
                      {s.highRiskCount} high-risk
                    </span>
                    <span>{s.avgResolutionHours}h avg resolution</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Progress bar */}
                  <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-sunken)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.scoreValue}%`, background: color.text }}
                    />
                  </div>
                  <span
                    className="px-3 py-1.5 rounded-lg text-sm font-heading font-bold min-w-[52px] text-center"
                    style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, fontVariantNumeric: "tabular-nums" }}
                  >
                    {s.scoreValue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
