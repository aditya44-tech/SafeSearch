"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RiskBadge from "@/components/RiskBadge";
import SifBadge from "@/components/SifBadge";
import StatusBadge from "@/components/StatusBadge";
import { DEPARTMENTS, autoAssignDept, getDeptIcon, formatDateTimeIST, formatDateIST } from "@/lib/helpers";

interface ComplianceRef {
  id: number | null;
  framework: string;
  standardCode: string;
  title: string;
  hazardCategory: string;
  sectionReference: string;
  description: string;
  applicableActivity?: string;
  source?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  requirements?: string[];
  source_type?: string;
  detectedActivities?: string[];
  detectedCategories?: string[];
}

interface Report {
  id: number; reportText: string; site: string; reporterRole: string | null;
  reportedAt: string; status: string; riskLevel: string | null;
  hazardCategory: string | null; justification: string | null; analyzedAt: string | null;
  photoUrl: string | null; humanOverrideRiskLevel: string | null;
  overrideReason: string | null; overriddenBy: string | null; slaDeadline: string | null;
  keyPhrases?: string | null; isAnonymous?: boolean; smsSentAt?: string | null;
  sifPotential?: string | null; sifReasoning?: string | null; sifConfidence?: number | null;
  auditLogs?: { id: number; action: string; performedBy: string; timestamp: string; details: string | null }[];
  tasks?: { id: number; title: string; assignedTo: string; status: string; priority: string; dueDate: string | null; description: string | null }[];
}

export default function ReportDetailClient({ report }: { report: Report }) {
  const [status, setStatus] = useState(report.status);

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState("high");
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");
  const [tasks, setTasks] = useState(report.tasks || []);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [complianceRefs, setComplianceRefs] = useState<ComplianceRef[]>([]);
  const [expandedRefs, setExpandedRefs] = useState<Set<number | string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "",
    assignedTo: autoAssignDept(report.hazardCategory),
    priority: "high",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams({ text: report.reportText });
    if (report.hazardCategory) params.set("category", report.hazardCategory);
    fetch("/api/compliance?" + params.toString())
      .then((r) => r.json())
      .then((d) => setComplianceRefs(d))
      .catch(() => {});
  }, [report.reportText, report.hazardCategory]);

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch("/api/reports/" + report.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { setStatus(newStatus); router.refresh(); }
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



  // Parse key phrases from JSON string
  const parsedKeyPhrases: string[] = (() => {
    try {
      if (report.keyPhrases) {
        const parsed = JSON.parse(report.keyPhrases);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  })();

  // Highlight key phrases in report text with case-insensitive matching
  const highlightedText = (() => {
    if (parsedKeyPhrases.length === 0) return null;
    const text = report.reportText;
    // Sort phrases by length descending so longer matches replace first
    const sorted = [...parsedKeyPhrases].sort((a, b) => b.length - a.length);
    // Build a single regex for all phrases
    const escaped = sorted.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }
    return parts;
  })();

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const res = await fetch("/api/reports/" + report.id + "/analyze", { method: "POST" });
      if (res.ok) { router.refresh(); }
    } finally { setReanalyzing(false); }
  };

  const isOverdue = report.slaDeadline && new Date(report.slaDeadline) < new Date() && status !== "resolved";

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return;
    setCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, ...taskForm }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([task, ...tasks]);
        setShowTaskForm(false);
        setTaskForm({ title: "", description: "", assignedTo: autoAssignDept(report.hazardCategory), priority: "high" });
        setToast("Task assigned to " + task.assignedTo);
        setTimeout(() => setToast(""), 3000);
      }
    } finally { setCreatingTask(false); }
  };

  const handleTaskStatus = async (taskId: number, newStatus: string) => {
    const res = await fetch("/api/tasks/" + taskId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, performedBy: "Admin" }),
    });
    if (res.ok) {
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)] mb-2">
              Report details
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap">
              <RiskBadge level={report.riskLevel} />
              <SifBadge level={report.sifPotential ?? null} />
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
          <div className="flex items-center gap-2 flex-wrap">
            {!report.riskLevel && (
              <button onClick={handleReanalyze} disabled={reanalyzing}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:opacity-80 active:scale-[0.97] disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}>
                {reanalyzing ? "Analyzing..." : "Analyze with AI"}
              </button>
            )}
            {report.riskLevel && (
              <button onClick={() => setShowOverride(!showOverride)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-80 active:scale-[0.97]"
                style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                Override risk
              </button>
            )}
            <button onClick={async () => {
              if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
              const res = await fetch("/api/reports/" + report.id, { method: "DELETE" });
              if (res.ok) router.push("/reports");
            }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-80 active:scale-[0.97]"
              style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", border: "1px solid rgba(220,38,38,0.15)" }}>
              Delete
            </button>
          </div>
        </div>

        {/* Analysis result toast */}
        {analysisResult && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--color-accent-light)", border: "1px solid rgba(15,118,110,0.15)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-accent)" }}>Analysis complete</h3>
            <p className="text-sm" style={{ color: "var(--color-accent)" }}>{analysisResult.analysis?.justification || analysisResult.justification}</p>
            {analysisResult.smsSent && (
              <div className="mt-2 flex items-center gap-2 text-xs font-medium" style={{ color: "var(--color-safe)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                SMS alert sent to {(analysisResult.smsRecipients && analysisResult.smsRecipients.length > 0) ? analysisResult.smsRecipients.join(", ") : "Safety Officer"}
              </div>
            )}
          </div>
        )}

        {/* Persistent SMS sent indicator */}
        {report.smsSentAt && (() => {
          const smsLog = report.auditLogs?.find((l) => l.action === "sms_alert_sent");
          const recipients = smsLog?.details?.replace("SMS alert sent to ", "") || "Safety Officer";
          return (
            <div className="mb-6 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "var(--color-safe-light)", border: "1px solid rgba(22,163,74,0.15)", color: "var(--color-safe)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span className="font-medium">SMS sent to {recipients}</span>
              <span style={{ color: "var(--color-ink-muted)" }}>{formatDateTimeIST(report.smsSentAt)}</span>
            </div>
          );
        })()}

        {/* AI vs Human Override Comparison */}
        {report.humanOverrideRiskLevel && report.riskLevel && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6">
          {[
            { label: "Site", value: report.site },
            { label: "Reporter role", value: report.isAnonymous ? "\u2728 Anonymous" : (report.reporterRole || "\u2014") },
            { label: "Reported at", value: formatDateTimeIST(report.reportedAt) },
            { label: "SLA deadline", value: report.slaDeadline ? formatDateIST(report.slaDeadline) : "\u2014" },
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
          <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>
            Report text
            {parsedKeyPhrases.length > 0 && (
              <span className="ml-2 text-[9px] font-normal normal-case tracking-normal" style={{ color: "var(--color-warning)" }}>
                ({parsedKeyPhrases.length} key phrase{parsedKeyPhrases.length !== 1 ? "s" : ""} highlighted)
              </span>
            )}
          </h3>
          <div className="text-sm text-[var(--color-ink)] leading-relaxed rounded-lg p-4" style={{ background: "var(--color-surface-sunken)" }}>
            {highlightedText ? (
              <>
                {highlightedText.map((part, i) =>
                  part.highlight ? (
                    <mark key={i} className="px-1 py-0.5 rounded" style={{ background: "var(--color-warning-light)", color: "var(--color-warning)", fontWeight: 500 }}>
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )}
              </>
            ) : (
              report.reportText
            )}
          </div>
        </div>

        {/* Photo Evidence */}
        {report.photoUrl && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Attached photo</h3>
            <img src={report.photoUrl} alt="Evidence photo" className="rounded-lg max-h-64 border" style={{ borderColor: "var(--color-border)" }} />
          </div>
        )}

        {/* AI Justification */}
        {report.justification && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>AI justification</h3>
            <p className="text-sm italic leading-relaxed rounded-lg p-4" style={{ background: "var(--color-warning-light)", color: "var(--color-ink)" }}>{report.justification}</p>
          </div>
        )}

        {/* SIF Potential Assessment */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-muted)" }}>
              SIF Potential
            </h3>
            <div className="group relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-help"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div className="absolute left-0 top-6 z-10 w-72 p-3 rounded-lg text-xs leading-relaxed shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-ink-muted)" }}>
                <strong style={{ color: "var(--color-ink)" }}>Incident Severity</strong> describes how serious the actual reported outcome was.<br/>
                <strong style={{ color: "var(--color-ink)" }}>SIF Potential</strong> describes whether the situation could realistically have resulted in a Serious Injury or Fatality, even if no serious injury occurred.<br/><br/>
                <em style={{ color: "var(--color-ink-faint)", fontSize: "10px" }}>This is an AI-assisted assessment requiring human review.</em>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-3 mb-2">
              <SifBadge level={report.sifPotential ?? null} />
              {report.sifConfidence != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                  Confidence: {Math.round(report.sifConfidence * 100)}%
                </span>
              )}
            </div>
            {report.sifReasoning && (
              <p className="text-sm italic leading-relaxed" style={{ color: "var(--color-ink)" }}>{report.sifReasoning}</p>
            )}
            {!report.sifPotential && (
              <p className="text-xs" style={{ color: "var(--color-ink-faint)", fontStyle: "italic" }}>
                SIF assessment not available. Re-analyze this report to generate a SIF Potential assessment.
              </p>
            )}
          </div>
        </div>

        {/* Regulatory & Safety Standards Mapping */}
        {complianceRefs.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-muted)" }}>
                Regulatory & Safety Standards
                <span className="ml-2 text-[9px] font-normal normal-case tracking-normal" style={{ color: "var(--color-ink-faint)" }}>
                  ({complianceRefs.length} reference{complianceRefs.length !== 1 ? "s" : ""} matched)
                </span>
              </h3>
              <button onClick={() => {
                if (expandAll) {
                  setExpandedRefs(new Set());
                } else {
                  setExpandedRefs(new Set(complianceRefs.map((ref, i) => ref.id || ref.standardCode || i)));
                }
                setExpandAll(!expandAll);
              }} className="text-[10px] font-medium px-2 py-1 rounded transition-all duration-200 hover:opacity-80"
                style={{ color: "var(--color-accent)", background: "var(--color-accent-light)" }}>
                {expandAll ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="space-y-2">
              {complianceRefs.map((ref: any, index: number) => {
                const refKey = ref.id || ref.standardCode || index;
                const isExpanded = expandedRefs.has(refKey) || expandAll;
                return (
                  <div key={refKey} className="rounded-lg overflow-hidden" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
                    {/* Collapsed header - always visible */}
                    <button onClick={() => {
                      const next = new Set(expandedRefs);
                      if (next.has(refKey)) next.delete(refKey);
                      else next.add(refKey);
                      setExpandedRefs(next);
                    }} className="w-full p-3 flex items-center gap-2 text-left transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                      style={{ background: isExpanded ? "var(--color-surface-sunken)" : "transparent" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="flex-shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <span className="text-xs font-semibold text-[var(--color-ink)]">{ref.framework || ref.regulationName}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                        {ref.standardCode || ref.sectionReference}
                      </span>
                      {ref.isVerified && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--color-safe-light)", color: "var(--color-safe)" }}>
                          Verified
                        </span>
                      )}
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded ml-auto" style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>
                        {ref.hazardCategory}
                      </span>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 space-y-2" style={{ borderTop: "1px solid var(--color-border)" }}>
                        {/* Activity Context */}
                        {ref.applicableActivity && (
                          <div className="mt-2">
                            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-faint)" }}>Activity</span>
                            <p className="text-xs font-medium text-[var(--color-ink)] mt-0.5">{ref.applicableActivity}</p>
                          </div>
                        )}

                        {/* Title */}
                        {ref.title && (
                          <div>
                            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-faint)" }}>Title</span>
                            <p className="text-xs text-[var(--color-ink)] mt-0.5">{ref.title}</p>
                          </div>
                        )}

                        {/* Requirements */}
                        {ref.requirements && ref.requirements.length > 0 && (
                          <div>
                            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-faint)" }}>Requirements</span>
                            <ul className="mt-1 space-y-1">
                              {ref.requirements.map((req: string, i: number) => (
                                <li key={i} className="text-xs text-[var(--color-ink-muted)] leading-relaxed flex items-start gap-1.5">
                                  <span className="text-[var(--color-accent)] mt-0.5">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Source */}
                        {ref.source && (
                          <div className="pt-1">
                            <span className="text-[9px] text-[var(--color-ink-faint)]">Source: {ref.source}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="mt-3 p-2 rounded text-[9px] leading-relaxed" style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>
              Regulatory references are provided as safety/compliance guidance and should be verified by the organization's qualified HSE/compliance personnel.
            </div>
          </div>
        )}

        {/* Audit Log */}
        {report.auditLogs && report.auditLogs.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>Activity log</h3>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {report.auditLogs.map((log) => {
                const isSMS = log.action === "sms_alert_sent";
                const smsFailed = log.action === "sms_alert_failed";
                const dotColor = isSMS ? "var(--color-safe)" : smsFailed ? "var(--color-danger)" : log.action === "risk_overridden" ? "var(--color-warning)" : "var(--color-accent)";
                const actionLabel = log.action === "sms_alert_sent" ? "SMS sent" : log.action === "sms_alert_failed" ? "SMS failed" : log.action === "report_analyzed" ? "Analyzed" : log.action === "risk_overridden" ? "Risk overridden" : log.action.replace(/_/g, " ");
                return (
                  <div key={log.id} className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg" style={{ background: "var(--color-surface-sunken)" }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                    <span className="text-[var(--color-ink-muted)] whitespace-nowrap" suppressHydrationWarning>{formatDateTimeIST(log.timestamp)}</span>
                    {isSMS && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-safe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )}
                    {smsFailed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    )}
                    <span className="text-[var(--color-ink)] font-medium">{actionLabel}</span>
                    <span className="text-[var(--color-ink-faint)]">by {log.performedBy}</span>
                    {log.details && <span className="text-[var(--color-ink-muted)] ml-auto truncate max-w-[250px]">{log.details}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-muted)" }}>
              Corrective tasks ({tasks.length})
            </h3>
            {status !== "resolved" && (
              <button onClick={() => setShowTaskForm(!showTaskForm)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ background: "var(--color-accent)", color: "white" }}>
                + Assign task
              </button>
            )}
          </div>

          {/* Task creation form */}
          {showTaskForm && (
            <div className="mb-4 p-4 rounded-lg space-y-2" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title (e.g. Repair guardrail, Install gas detector)"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }} />
              <input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }} />
              <div className="flex gap-2">
                <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm rounded-lg outline-none" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
                  {DEPARTMENTS.map((d) => <option key={d.name} value={d.name}>{getDeptIcon(d.name)} {d.name}</option>)}
                </select>
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg outline-none" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateTask} disabled={creatingTask || !taskForm.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-accent)" }}>
                  {creatingTask ? "Creating..." : "Assign task"}
                </button>
                <button onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-[var(--color-surface-sunken)]"
                  style={{ color: "var(--color-ink-muted)" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Task list */}
          {tasks.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-faint)] py-3">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const priorityColors: Record<string, { bg: string; text: string }> = {
                  urgent: { bg: "var(--color-danger-light)", text: "var(--color-danger)" },
                  high: { bg: "#fff7ed", text: "#ea580c" },
                  normal: { bg: "#f0f9ff", text: "#0284c7" },
                  low: { bg: "var(--color-safe-light)", text: "var(--color-safe)" },
                };
                const pc = priorityColors[task.priority] || priorityColors.normal;
                const isComplete = task.status === "done";
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                    style={{ background: isComplete ? "var(--color-surface-sunken)" : "var(--color-surface-raised)", border: "1px solid var(--color-border)", opacity: isComplete ? 0.7 : 1 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${isComplete ? "line-through" : ""}`} style={{ color: "var(--color-ink)" }}>
                          {task.title}
                        </span>
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.text }}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{
                          background: isComplete ? "var(--color-safe-light)" : task.status === "in_progress" ? "var(--color-warning-light)" : "var(--color-surface-sunken)",
                          color: isComplete ? "var(--color-safe)" : task.status === "in_progress" ? "var(--color-warning)" : "var(--color-ink-faint)",
                        }}>
                          {task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : task.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-faint)]">
                        Assigned to <strong>{task.assignedTo}</strong>                         {task.dueDate && <> • Due {formatDateIST(task.dueDate)}</>}
                      </div>
                      {task.description && <p className="text-xs text-[var(--color-ink-muted)] mt-1">{task.description}</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {task.status === "open" && (
                        <button onClick={() => handleTaskStatus(task.id, "in_progress")}
                          className="px-3 py-1 text-[11px] font-medium rounded-md text-white" style={{ background: "var(--color-accent)" }}>
                          Start work
                        </button>
                      )}
                      {task.status === "in_progress" && (
                        <button onClick={() => handleTaskStatus(task.id, "done")}
                          className="px-3 py-1 text-[11px] font-medium rounded-md text-white" style={{ background: "var(--color-safe)" }}>
                          Mark done
                        </button>
                      )}
                      {!isComplete && (
                        <button onClick={() => handleTaskStatus(task.id, "cancelled")}
                          className="px-3 py-1 text-[11px] font-medium rounded-md" style={{ color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
