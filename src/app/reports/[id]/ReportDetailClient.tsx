"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RiskBadge from "@/components/RiskBadge";
import StatusBadge from "@/components/StatusBadge";
import { DEPARTMENTS, autoAssignDept, getDeptIcon } from "@/lib/helpers";

interface ComplianceRef {
  id: number;
  hazardCategory: string;
  regulationName: string;
  sectionReference: string;
  description: string;
}

interface Report {
  id: number; reportText: string; site: string; reporterRole: string | null;
  reportedAt: string; status: string; riskLevel: string | null;
  hazardCategory: string | null; justification: string | null; analyzedAt: string | null;
  photoUrl: string | null; humanOverrideRiskLevel: string | null;
  overrideReason: string | null; overriddenBy: string | null; slaDeadline: string | null;
  keyPhrases?: string | null; isAnonymous?: boolean;
  auditLogs?: { id: number; action: string; performedBy: string; timestamp: string; details: string | null }[];
  tasks?: { id: number; title: string; assignedTo: string; status: string; priority: string; dueDate: string | null; description: string | null }[];
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
  const [tasks, setTasks] = useState(report.tasks || []);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [complianceRefs, setComplianceRefs] = useState<ComplianceRef[]>([]);
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
      formData.append("reportId", String(report.id));
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
            { label: "Reported at", value: report.reportedAt.replace("T", " ").slice(0, 16) },
            { label: "SLA deadline", value: report.slaDeadline ? report.slaDeadline.replace("T", " ").slice(0, 16) : "\u2014" },
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

        {/* Regulatory Compliance Reference */}
        {complianceRefs.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-muted)" }}>
              Regulatory compliance
              <span className="ml-2 text-[9px] font-normal normal-case tracking-normal" style={{ color: "var(--color-ink-faint)" }}>
                ({complianceRefs.length} regulation{complianceRefs.length !== 1 ? "s" : ""} matched from report text)
              </span>
            </h3>
            <div className="space-y-2">
              {complianceRefs.map((ref: any) => (
                <div key={ref.id} className="p-3 rounded-lg" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--color-ink)]">{ref.regulationName}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                      {ref.sectionReference}
                    </span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>
                      {ref.hazardCategory}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{ref.description}</p>
                </div>
              ))}
            </div>
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
                  <span className="text-[var(--color-ink-muted)]" suppressHydrationWarning>{log.timestamp.replace("T", " ").slice(0, 16)}</span>
                  <span className="text-[var(--color-ink)] font-medium">{log.action.replace(/_/g, " ")}</span>
                  <span className="text-[var(--color-ink-faint)]">by {log.performedBy}</span>
                  {log.details && <span className="text-[var(--color-ink-faint)] ml-auto truncate max-w-[200px]">{log.details}</span>}
                </div>
              ))}
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
                        Assigned to <strong>{task.assignedTo}</strong>
                        {task.dueDate && <> • Due {new Date(task.dueDate).toLocaleDateString()}</>}
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
