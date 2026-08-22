"use client";
import { useState } from "react";
import Link from "next/link";

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

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TEAM = ["Mike Chen", "Sarah Park", "James Wilson", "Lisa Rodriguez", "Tom Bradley", "Unassigned"];

export default function AdminClient({ reports, tasks, stats }: { reports: Report[]; tasks: Task[]; stats: { total: number; pending: number; overdueTasks: number } }) {
  const [tab, setTab] = useState<"board" | "reports">("board");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "Mike Chen", priority: "high" });
  const [creating, setCreating] = useState(false);
  const [taskList, setTaskList] = useState(tasks);

  const sites = [...new Set(reports.map((r) => r.site))];

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (filterSite !== "all" && r.site !== filterSite) return false;
    if (filterRisk !== "all" && r.riskLevel !== filterRisk) return false;
    return true;
  });

  // Task board columns
  const boardColumns = ["assigned", "in_progress", "completed"] as const;
  const tasksByStatus = (status: string) => taskList.filter((t) => t.status === status);

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
        setTaskForm({ title: "", description: "", assignedTo: "Mike Chen", priority: "high" });
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
      const updated = await res.json();
      setTaskList(taskList.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
            Admin center
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Manage reports and assign corrective tasks
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total reports", value: stats.total, color: "var(--color-ink)" },
          { label: "Need action", value: stats.pending, color: "var(--color-warning)" },
          { label: "Active tasks", value: taskList.filter((t) => t.status !== "completed" && t.status !== "cancelled").length, color: "var(--color-accent)" },
          { label: "Overdue tasks", value: stats.overdueTasks, color: "var(--color-danger)" },
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
        <div className="grid grid-cols-3 gap-4">
          {boardColumns.map((status) => (
            <div key={status}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-heading font-semibold text-[var(--color-ink)]">
                  {STATUS_LABELS[status]}
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)" }}>
                  {tasksByStatus(status).length}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {tasksByStatus(status).map((task) => {
                  const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
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
                      <p className="text-xs text-[var(--color-ink-muted)] mb-2">{task.report.site} — {task.report.hazardCategory || "Uncategorized"}</p>
                      <p className="text-xs text-[var(--color-ink-faint)] mb-3">Assigned to <strong>{task.assignedTo}</strong></p>
                      {task.dueDate && (
                        <p className="text-[10px] mb-3" style={{
                          color: new Date(task.dueDate) < new Date() ? "var(--color-danger)" : "var(--color-ink-faint)",
                        }}>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        {status === "assigned" && (
                          <button onClick={() => handleStatusChange(task.id, "in_progress")}
                            className="flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all duration-200 hover:opacity-80"
                            style={{ background: "var(--color-accent)", color: "white" }}>
                            Start
                          </button>
                        )}
                        {status === "in_progress" && (
                          <button onClick={() => handleStatusChange(task.id, "completed")}
                            className="flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all duration-200 hover:opacity-80"
                            style={{ background: "var(--color-safe)", color: "white" }}>
                            Complete
                          </button>
                        )}
                        {status !== "completed" && (
                          <Link href={"/reports/" + task.reportId}
                            className="px-2 py-1 text-[11px] font-medium rounded-md transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                            style={{ color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
                {tasksByStatus(status).length === 0 && (
                  <div className="rounded-xl p-6 text-center" style={{ background: "var(--color-surface-sunken)", border: "1px dashed var(--color-border)" }}>
                    <p className="text-xs text-[var(--color-ink-faint)]">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports Table */}
      {tab === "reports" && (
        <div>
          {/* Filters */}
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
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                          background: r.riskLevel === "high" ? "var(--color-danger-light)" : r.riskLevel === "medium" ? "var(--color-warning-light)" : r.riskLevel === "low" ? "var(--color-safe-light)" : "var(--color-surface-sunken)",
                          color: r.riskLevel === "high" ? "var(--color-danger)" : r.riskLevel === "medium" ? "var(--color-warning)" : r.riskLevel === "low" ? "var(--color-safe)" : "var(--color-ink-faint)",
                        }}>
                          {r.riskLevel || "unanalyzed"}
                        </span>
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
                          <div className="space-y-2 min-w-[280px]">
                            <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                              placeholder="Task title" autoFocus
                              className="w-full px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }} />
                            <input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                              placeholder="Description (optional)"
                              className="w-full px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }} />
                            <div className="flex gap-2">
                              <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }}>
                                {TEAM.map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="px-2 py-1 text-xs rounded outline-none" style={{ border: "1px solid var(--color-border)" }}>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleCreateTask(r.id)} disabled={creating || !taskForm.title.trim()}
                                className="px-3 py-1 text-[11px] font-medium text-white rounded transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ background: "var(--color-accent)" }}>
                                {creating ? "Creating..." : "Assign"}
                              </button>
                              <button onClick={() => setShowCreateTask(null)}
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
                                + Assign task
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
