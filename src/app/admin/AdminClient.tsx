"use client";
import { useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, autoAssignDept, getDeptIcon } from "@/lib/helpers";

interface Report {
  id: string; site: string; reporterRole: string; reportText: string;
  status: string; riskLevel: string | null; hazardCategory: string | null;
  justification: string | null; reportedAt: string; slaDeadline: string | null;
}

interface Task {
  id: string; reportId: string; title: string; description: string | null;
  assignedTo: string; status: string; priority: string; dueDate: string | null;
  createdAt: string;
  report: { id: string; site: string; riskLevel: string | null; hazardCategory: string | null; reportText: string };
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: "#fef2f2", text: "#dc2626", border: "rgba(220,38,38,0.2)" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "rgba(234,88,12,0.2)" },
  normal: { bg: "#f0f9ff", text: "#0284c7", border: "rgba(2,132,199,0.2)" },
  low: { bg: "#f0fdf4", text: "#16a34a", border: "rgba(22,163,74,0.2)" },
};

export default function AdminClient({ reports, tasks, stats }: { reports: Report[]; tasks: Task[]; stats: { total: number; pending: number; overdueTasks: number } }) {
  const [tab, setTab] = useState<"board" | "reports">("board");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", priority: "high" });
  const [creating, setCreating] = useState(false);
  const [taskList, setTaskList] = useState(tasks);

  const sites = [...new Set(reports.map((r) => r.site))];
  const depts = [...new Set(taskList.map((t) => t.assignedTo))];

  const filteredReports = reports.filter((r) => {
    if (filterSite !== "all" && r.site !== filterSite) return false;
    if (filterRisk !== "all" && r.riskLevel !== filterRisk) return false;
    return true;
  });

  const boardColumns = ["open", "in_progress", "done"] as const;
  const columnLabels: Record<string, string> = { open: "Open", in_progress: "In Progress", done: "Done" };
  const columnColors: Record<string, string> = { open: "var(--color-warning)", in_progress: "var(--color-accent)", done: "var(--color-safe)" };
  const tasksByStatus = (status: string) => taskList.filter((t) => t.status === status);

  const filteredBoardTasks = (status: string) => {
    const list = tasksByStatus(status);
    if (filterDept === "all") return list;
    return list.filter((t) => t.assignedTo === filterDept);
  };

  const handleCreateTask = async (reportId: string) => {
    if (!taskForm.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, ...taskForm }),
      });
      if (res.ok) {
        const task = await res.json();
        setTaskList([task, ...taskList]);
        setShowCreateTask(null);
        setTaskForm({ title: "", description: "", assignedTo: "", priority: "high" });
      }
    } finally { setCreating(false); }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const res = await fetch("/api/tasks/" + taskId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, performedBy: "Admin" }),
    });
    if (res.ok) {
      setTaskList(taskList.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const openTasks = tasksByStatus("open");
  const inProgressTasks = tasksByStatus("in_progress");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
            Admin center
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Manage reports and assign corrective tasks to departments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total reports", value: stats.total, color: "var(--color-ink)" },
          { label: "Need action", value: stats.pending, color: "var(--color-warning)" },
          { label: "Open tasks", value: openTasks.length, color: "var(--color-warning)" },
          { label: "In progress", value: inProgressTasks.length, color: "var(--color-accent)" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl p-4" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-medium tracking-wide uppercase text-[var(--color-ink-muted)] mb-1">{card.label}</p>
            <p className="text-[28px] font-heading font-bold leading-none" style={{ color: card.color, fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        {([["board", "Task Board"], ["reports", "Reports"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px]"
            style={{
              color: tab === key ? "var(--color-accent)" : "var(--color-ink-muted)",
              borderColor: tab === key ? "var(--color-accent)" : "transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Task Board */}
      {tab === "board" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setFilterDept("all")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{
                background: filterDept === "all" ? "var(--color-accent)" : "var(--color-surface-raised)",
                color: filterDept === "all" ? "white" : "var(--color-ink-muted)",
                border: "1px solid " + (filterDept === "all" ? "var(--color-accent)" : "var(--color-border)"),
              }}>
              All departments
            </button>
            {depts.map((d) => (
              <button key={d} onClick={() => setFilterDept(d)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{
                  background: filterDept === d ? "var(--color-accent)" : "var(--color-surface-raised)",
                  color: filterDept === d ? "white" : "var(--color-ink-muted)",
                  border: "1px solid " + (filterDept === d ? "var(--color-accent)" : "var(--color-border)"),
                }}>
                {getDeptIcon(d)} {d}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {boardColumns.map((status) => {
              const colTasks = filteredBoardTasks(status);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: columnColors[status] }} />
                      <h3 className="text-sm font-heading font-semibold text-[var(--color-ink)]">{columnLabels[status]}</h3>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                      style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)" }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[200px]">
                    {colTasks.map((task) => {
                      const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
                      const nextStatus = status === "open" ? "in_progress" : status === "in_progress" ? "done" : null;
                      const nextLabel = status === "open" ? "Start work" : status === "in_progress" ? "Mark done" : null;
                      return (
                        <div key={task.id} className="rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                              {task.priority}
                            </span>
                            {task.report.riskLevel && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{
                                  background: task.report.riskLevel === "high" ? "var(--color-danger-light)" : task.report.riskLevel === "medium" ? "var(--color-warning-light)" : "var(--color-safe-light)",
                                  color: task.report.riskLevel === "high" ? "var(--color-danger)" : task.report.riskLevel === "medium" ? "var(--color-warning)" : "var(--color-safe)",
                                }}>
                                {task.report.riskLevel}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-[var(--color-ink)] mb-1">{task.title}</h4>
                          <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                            {getDeptIcon(task.assignedTo)} {task.assignedTo}
                          </p>
                          <p className="text-xs text-[var(--color-ink-faint)] mb-1">{task.report.site} — {task.report.hazardCategory || "Uncategorized"}</p>
                          {task.dueDate && (
                            <p className="text-[10px] mb-3" style={{
                              color: new Date(task.dueDate) < new Date() ? "var(--color-danger)" : "var(--color-ink-faint)",
                            }}>
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            {nextStatus && (
                              <button onClick={() => handleStatusChange(task.id, nextStatus)}
                                className="flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 hover:opacity-80"
                                style={{ background: columnColors[nextStatus], color: "white" }}>
                                {nextLabel}
                              </button>
                            )}
                            <Link href={"/reports/" + task.reportId}
                              className="px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                              style={{ color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                              View
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                    {colTasks.length === 0 && (
                      <div className="rounded-xl p-6 text-center" style={{ background: "var(--color-surface-sunken)", border: "1px dashed var(--color-border)" }}>
                        <p className="text-xs text-[var(--color-ink-faint)]">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports Table */}
      {tab === "reports" && (
        <div>
          <div className="flex gap-3 mb-4">
            <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
              <option value="all">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
              <option value="all">All risk levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="text-xs text-[var(--color-ink-faint)] self-center">{filteredReports.length} reports</span>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Risk", "Site", "Category", "Status", "SLA", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-ink-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => {
                  const isOverdue = r.slaDeadline && new Date(r.slaDeadline) < new Date() && r.status !== "resolved";
                  const hasTask = taskList.some((t) => t.reportId === r.id);
                  const autoDept = autoAssignDept(r.hazardCategory);
                  if (showCreateTask === r.id && !taskForm.assignedTo) {
                    setTaskForm((f) => ({ ...f, assignedTo: autoDept }));
                  }
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                          background: r.riskLevel === "high" ? "var(--color-danger-light)" : r.riskLevel === "medium" ? "var(--color-warning-light)" : r.riskLevel === "low" ? "var(--color-safe-light)" : "var(--color-surface-sunken)",
                          color: r.riskLevel === "high" ? "var(--color-danger)" : r.riskLevel === "medium" ? "var(--color-warning)" : r.riskLevel === "low" ? "var(--color-safe)" : "var(--color-ink-faint)",
                        }}>{r.riskLevel || "unanalyzed"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--color-ink)]">{r.site}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-ink-muted)]">{r.hazardCategory || "\u2014"}</td>
                      <td className="px-4 py-3 text-sm" style={{
                        color: r.status === "resolved" ? "var(--color-ink-faint)" : r.status === "acknowledged" ? "#7c3aed" : "var(--color-ink-muted)",
                      }}>{r.status}</td>
                      <td className="px-4 py-3 text-xs" style={{
                        color: isOverdue ? "var(--color-danger)" : "var(--color-ink-faint)",
                        fontWeight: isOverdue ? 600 : 400,
                      }}>
                        {r.slaDeadline ? (isOverdue ? "OVERDUE" : new Date(r.slaDeadline).toLocaleDateString()) : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {showCreateTask === r.id ? (
                          <div className="space-y-2 min-w-[300px]">
                            <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                              placeholder="What needs to be done?" autoFocus
                              className="w-full px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }} />
                            <input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                              placeholder="Details (optional)"
                              className="w-full px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }} />
                            <div className="flex gap-2">
                              <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }}>
                                {DEPARTMENTS.map((d) => <option key={d.name} value={d.name}>{d.icon} {d.name}</option>)}
                              </select>
                              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }}>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-faint)]">
                              <span>Auto-assigned to:</span>
                              <span className="font-medium" style={{ color: "var(--color-accent)" }}>{getDeptIcon(autoDept)} {autoDept}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleCreateTask(r.id)} disabled={creating || !taskForm.title.trim()}
                                className="px-3 py-1 text-[11px] font-medium text-white rounded transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ background: "var(--color-accent)" }}>
                                {creating ? "Creating..." : "Assign"}
                              </button>
                              <button onClick={() => { setShowCreateTask(null); setTaskForm({ title: "", description: "", assignedTo: "", priority: "high" }); }}
                                className="px-3 py-1 text-[11px] font-medium rounded transition-all hover:bg-[var(--color-surface-sunken)]"
                                style={{ color: "var(--color-ink-muted)" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {!hasTask && r.status !== "resolved" && (
                              <button onClick={() => setShowCreateTask(r.id)}
                                className="px-3 py-1 text-[11px] font-medium rounded transition-all duration-200 hover:opacity-80"
                                style={{ background: "var(--color-accent)", color: "white" }}>
                                + Assign
                              </button>
                            )}
                            {hasTask && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                                Task assigned
                              </span>
                            )}
                            <Link href={"/reports/" + r.id}
                              className="text-[11px] font-medium px-2 py-1 rounded transition-all hover:bg-[var(--color-surface-sunken)]"
                              style={{ color: "var(--color-ink-muted)" }}>
                              View
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
