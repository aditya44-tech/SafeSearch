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
  photoUrl: string | null; humanOverrideRiskLevel: string | null;
  overrideReason: string | null; overriddenBy: string | null; slaDeadline: string | null;
  auditLogs?: { id: string; action: string; performedBy: string; timestamp: string; details: string | null }[];
}

export default function ReportDetailClient({ report }: { report: Report }) {
  const [status, setStatus] = useState(report.status);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState("high");
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoResult, setPhotoResult] = useState<{ consistent: boolean; note: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState("");
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
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        router.refresh();
        if (data.analysis?.risk_level === "high") {
          setToast("Alert sent to Safety Officer");
          setTimeout(() => setToast(""), 4000);
        }
      }
    } finally { setAnalyzing(false); }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports/" + report.id + "/override", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskLevel: overrideLevel, reason: overrideReason, performedBy: "Current User" }),
      });
      if (res.ok) { setShowOverride(false); setOverrideReason(""); router.refresh(); }
    } finally { setSaving(false); }
  };

  const handlePhotoCheck = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("reportId", report.id);
      const res = await fetch("/api/reports/" + report.id + "/photo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPhotoResult(data.analysis);
        router.refresh();
      }
    } finally { setUploadingPhoto(false); }
  };

  const isOverdue = report.slaDeadline && new Date(report.slaDeadline) < new Date() && status !== "resolved";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg animate-slide-in"
          style={{ background: "var(--color-accent)" }}>
          {toast}
        </div>
      )}

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
              {isOverdue && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", border: "1px solid rgba(220,38,38,0.15)" }}>
                  SLA OVERDUE
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === "pending" && !report.riskLevel && (
              <button onClick={handleAnalyze} disabled={analyzing}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}>
                {analyzing ? "Analyzing..." : "Run AI analysis"}
              </button>
            )}
            {report.riskLevel && (
              <button onClick={() => setShowOverride(!showOverride)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-80 active:scale-[0.97]"
                style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                Override risk
              </button>
            )}
          </div>
        </div>

        {/* Analysis result toast */}
        {analysisResult && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--color-accent-light)", border: "1px solid rgba(15,118,110,0.15)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-accent)" }}>Analysis complete</h3>
            <p className="text-sm" style={{ color: "var(--color-accent)" }}>{analysisResult.analysis?.justification || analysisResult.justification}</p>
          </div>
        )}

        {/* AI vs Human Override Comparison */}
        {report.humanOverrideRiskLevel && report.riskLevel && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>
                AI Assessment
              </h4>
              <RiskBadge level={report.riskLevel} />
              <p className="text-xs text-[var(--color-ink-muted)] mt-2 italic">{report.justification}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: "var(--color-warning-light)", border: "1px solid rgba(217,119,6,0.15)" }}>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-warning)" }}>
                Human Override
              </h4>
              <RiskBadge level={report.humanOverrideRiskLevel} />
              <p className="text-xs mt-2" style={{ color: "var(--color-ink)" }}>{report.overrideReason}</p>
              <p className="text-[10px] text-[var(--color-ink-faint)] mt-1">By {report.overriddenBy}</p>
            </div>
          </div>
        )}

        {/* Override Form */}
        {showOverride && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--color-warning-light)", border: "1px solid rgba(217,119,6,0.2)" }}>
            <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-3">Override AI risk level</h4>
            <div className="flex items-center gap-3 mb-3">
              {["high", "medium", "low"].map((level) => (
                <button
                  key={level}
                  onClick={() => setOverrideLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${overrideLevel === level ? "ring-2 ring-offset-1" : ""}`}
                  style={{
                    background: overrideLevel === level ? "var(--color-accent)" : "var(--color-surface)",
                    color: overrideLevel === level ? "white" : "var(--color-ink-muted)",
                    border: "1px solid " + (overrideLevel === level ? "var(--color-accent)" : "var(--color-border)"),
                  }}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why you're overriding this assessment..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-all duration-200 focus:ring-2 resize-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleOverride} disabled={saving || !overrideReason.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--color-warning)" }}>
                {saving ? "Saving..." : "Save override"}
              </button>
              <button onClick={() => setShowOverride(false)}
                className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                style={{ color: "var(--color-ink-muted)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Fields Grid */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          {[
            { label: "Site", value: report.site },
            { label: "Reporter role", value: report.reporterRole },
            { label: "Reported at", value: new Date(report.reportedAt).toLocaleString() },
            { label: "SLA deadline", value: report.slaDeadline ? new Date(report.slaDeadline).toLocaleString() : "—" },
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

        {/* Report Text */}
        <div className="mb-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Report text</h3>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed rounded-lg p-4" style={{ background: "var(--color-surface-sunken)" }}>{report.reportText}</p>
        </div>

        {/* Photo Evidence */}
        {report.photoUrl && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Attached photo</h3>
            <img src={report.photoUrl} alt="Evidence photo" className="rounded-lg max-h-64 border" style={{ borderColor: "var(--color-border)" }} />
          </div>
        )}

        {/* Photo Upload */}
        <div className="mb-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Upload evidence photo</h3>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="text-sm text-[var(--color-ink-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:text-sm file:font-medium file:border-0 file:cursor-pointer"
              style={{ ["--tw-file-bg" as string]: "var(--color-surface-sunken)" } as any}
            />
            <button onClick={handlePhotoCheck} disabled={!photoFile || uploadingPhoto}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--color-accent)" }}>
              {uploadingPhoto ? "Checking..." : "Upload & cross-check"}
            </button>
          </div>
          {photoResult && (
            <div className="mt-3 p-3 rounded-lg text-sm" style={{
              background: photoResult.consistent ? "var(--color-safe-light)" : "var(--color-danger-light)",
              color: photoResult.consistent ? "var(--color-safe)" : "var(--color-danger)",
              border: `1px solid ${photoResult.consistent ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"}`,
            }}>
              <span className="font-semibold">{photoResult.consistent ? "Consistent" : "Inconsistent"}</span>: {photoResult.note}
            </div>
          )}
        </div>

        {/* AI Justification */}
        {report.justification && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>AI justification</h3>
            <p className="text-sm italic leading-relaxed rounded-lg p-4" style={{ background: "var(--color-warning-light)", color: "var(--color-ink)" }}>{report.justification}</p>
          </div>
        )}

        {/* Audit Log */}
        {report.auditLogs && report.auditLogs.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Activity log</h3>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {report.auditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg" style={{ background: "var(--color-surface-sunken)" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                    background: log.action === "risk_overridden" ? "var(--color-warning)" : "var(--color-accent)"
                  }} />
                  <span className="text-[var(--color-ink-muted)]">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="text-[var(--color-ink)] font-medium">{log.action.replace(/_/g, " ")}</span>
                  <span className="text-[var(--color-ink-faint)]">by {log.performedBy}</span>
                  {log.details && <span className="text-[var(--color-ink-faint)] ml-auto truncate max-w-[200px]">{log.details}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
