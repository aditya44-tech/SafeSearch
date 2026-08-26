const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  "SIF-Critical / Hi-Po": {
    bg: "#fef2f2",
    text: "#991b1b",
    dot: "#991b1b",
    border: "rgba(153, 27, 27, 0.2)",
  },
  "SIF-High Potential": {
    bg: "#fff7ed",
    text: "#c2410c",
    dot: "#c2410c",
    border: "rgba(194, 65, 12, 0.2)",
  },
  "SIF-Potential": {
    bg: "#fefce8",
    text: "#a16207",
    dot: "#a16207",
    border: "rgba(161, 98, 7, 0.2)",
  },
  "SIF-Unlikely": {
    bg: "#f0fdf4",
    text: "#166534",
    dot: "#166534",
    border: "rgba(22, 101, 52, 0.15)",
  },
};

const labels: Record<string, string> = {
  "SIF-Critical / Hi-Po": "SIF-Critical",
  "SIF-High Potential": "SIF-High",
  "SIF-Potential": "SIF-Potential",
  "SIF-Unlikely": "SIF-Unlikely",
};

export default function SifBadge({ level }: { level: string | null | undefined }) {
  if (!level) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium tracking-wide"
        style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-ink-faint)" }} />
        No SIF data
      </span>
    );
  }
  const c = colorMap[level] || colorMap["SIF-Unlikely"];
  const label = labels[level] || level;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-colors duration-200"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {label}
    </span>
  );
}
