const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  high: {
    bg: "var(--color-danger-light)",
    text: "var(--color-danger)",
    dot: "var(--color-danger)",
    border: "rgba(220, 38, 38, 0.15)",
  },
  medium: {
    bg: "var(--color-warning-light)",
    text: "var(--color-warning)",
    dot: "var(--color-warning)",
    border: "rgba(217, 119, 6, 0.15)",
  },
  low: {
    bg: "var(--color-safe-light)",
    text: "var(--color-safe)",
    dot: "var(--color-safe)",
    border: "rgba(22, 163, 74, 0.15)",
  },
};

export default function RiskBadge({ level }: { level: string | null }) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide" style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-ink-faint)" }} />
        Unanalyzed
      </span>
    );
  }
  const c = colorMap[level] || colorMap.low;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-colors duration-200"
      style={{ background: c.bg, color: c.text, border: "1px solid " + c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}
