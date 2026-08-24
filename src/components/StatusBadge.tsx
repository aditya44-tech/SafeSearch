const styles: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "var(--color-warning-light)", text: "var(--color-warning)", border: "rgba(217, 119, 6, 0.12)" },
  analyzed: { bg: "var(--color-accent-light)", text: "var(--color-accent)", border: "rgba(15, 118, 110, 0.12)" },
  acknowledged: { bg: "#faf5ff", text: "#7c3aed", border: "rgba(124, 58, 237, 0.12)" },
  resolved: { bg: "var(--color-surface-sunken)", text: "var(--color-ink-muted)", border: "var(--color-border)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = styles[status] || styles.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium tracking-wide transition-colors duration-200"
      style={{ background: s.bg, color: s.text, border: "1px solid " + s.border }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
