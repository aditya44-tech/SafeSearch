"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RiskBadge from "@/components/RiskBadge";
import StatusBadge from "@/components/StatusBadge";

interface Report {
  id: string; reportText: string; site: string; reporterRole: string;
  reportedAt: string; status: string; riskLevel: string | null;
  hazardCategory: string | null; justification: string | null; analyzedAt: string | null;
}

export default function ReportDetailClient({ report }: { report: Report }) {
  const [status, setStatus] = useState(report.status);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch("/api/reports/" + report.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { setStatus(newStatus); router.refresh(); }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/reports/" + report.id + "/analyze", { method: "POST" });
      if (res.ok) { const data = await res.json(); setAnalysisResult(data); router.refresh(); }
    } finally { setAnalyzing(false); }
  };

  return (
    <div>
      <Link href="/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200"
        style={{ color: "var(--color-ink-muted)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to reports
      </Link>

      <div className="rounded-xl p-6" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)] mb-2">
              Report details
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap">
              <RiskBadge level={report.riskLevel} />
              <StatusBadge status={status} />
              {report.hazardCategory && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium"
                  style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                  {report.hazardCategory}
                </span>
              )}
            </div>
          </div>
          <div>
            {report.status === "pending" && !report.riskLevel && (
              <button onClick={handleAnalyze} disabled={analyzing}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}>
                {analyzing ? "Analyzing..." : "Run AI analysis"}
              </button>
            )}
          </div>
        </div>

        {analysisResult && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--color-accent-light)", border: "1px solid rgba(15,118,110,0.15)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-accent)" }}>Analysis complete</h3>
            <p className="text-sm" style={{ color: "var(--color-accent)" }}>{analysisResult.justification}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 mb-6">
          {[
            { label: "Site", value: report.site },
            { label: "Reporter role", value: report.reporterRole },
            { label: "Reported at", value: new Date(report.reportedAt).toLocaleString() },
          ].map((field) => (
            <div key={field.label}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-ink-muted)" }}>{field.label}</h3>
              <p className="text-sm text-[var(--color-ink)]">{field.value}</p>
            </div>
          ))}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-ink-muted)" }}>Status</h3>
            <select value={status} onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none transition-all duration-200 focus:ring-2"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
              <option value="pending">Pending</option>
              <option value="analyzed">Analyzed</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Report text</h3>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed rounded-lg p-4" style={{ background: "var(--color-surface-sunken)" }}>{report.reportText}</p>
        </div>

        {report.justification && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>AI justification</h3>
            <p className="text-sm italic leading-relaxed rounded-lg p-4" style={{ background: "var(--color-warning-light)", color: "var(--color-ink)" }}>{report.justification}</p>
          </div>
        )}
      </div>
    </div>
  );
}
