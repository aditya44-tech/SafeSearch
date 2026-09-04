"use client";
import { useState } from "react";
import Link from "next/link";
import { getDeptIcon, formatDateIST } from "@/lib/helpers";

interface DeptTask {
  id: number; reportId: number; title: string; description: string | null;
  assignedTo: string; status: string; priority: string; dueDate: string | null;
  createdAt: string;
  report: {
    id: number; site: string; riskLevel: string | null; hazardCategory: string | null;
    reportText: string; status: string; slaDeadline: string | null;
  };
}

interface Dept {
  name: string; icon: string; categories: string[];
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: "#fef2f2", text: "#dc2626", border: "rgba(220,38,38,0.2)" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "rgba(234,88,12,0.2)" },
  normal: { bg: "#f0f9ff", text: "#0284c7", border: "rgba(2,132,199,0.2)" },
  low: { bg: "#f0fdf4", text: "#16a34a", border: "rgba(22,163,74,0.2)" },
};

const COLUMN_META: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--color-warning)" },
  in_progress: { label: "In Progress", color: "var(--color-accent)" },
  done: { label: "Done", color: "var(--color-safe)" },
};

export default function DepartmentClient({ dept, tasks }: { dept: Dept; tasks: DeptTask[] }) {
  const [taskList, setTaskList] = useState(tasks);

  const openCount = taskList.filter((t) => t.status === "open").length;
  const inProgressCount = taskList.filter((t) => t.status === "in_progress").length;
  const doneCount = taskList.filter((t) => t.status === "done").length;
  const overdueCount = taskList.filter(
    (t) => t.status !== "done" && t.status !== "cancelled" && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    const res = await fetch("/api/tasks/" + taskId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, performedBy: dept.name }),
    });
    if (res.ok) {
      setTaskList(taskList.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    }
  };

  return (
    <div>
      <Link href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200"
        style={{ color: "var(--color-ink-muted)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Admin
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl" aria-hidden>{dept.icon || getDeptIcon(dept.name)}</span>
            <h1 className="text-2xl sm:text-[28px] font-heading font-bold tracking-tight text-[var(--color-ink)]">
              {dept.name}
            </h1>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Corrective tasks assigned to this department
          </p>
          {dept.categories.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {dept.categories.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link href="/reports"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg whitespace-nowrap transition-all duration-200 hover:opacity-90 active:scale-[0.97] self-start sm:self-auto"
          style={{ background: "var(--color-accent)" }}>
          All reports
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Open tasks", value: openCount, color: "var(--color-warning)" },
          { label: "In progress", value: inProgressCount, color: "var(--color-accent)" },
          { label: "Done", value: doneCount, color: "var(--color-safe)" },
          { label: "Overdue", value: overdueCount, color: "var(--color-danger)" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl p-3 sm:p-4"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
            <p className="text-[10px] sm:text-xs font-medium tracking-wide uppercase text-[var(--color-ink-muted)] mb-1">{card.label}</p>
            <p className="text-xl sm:text-[28px] font-heading font-bold leading-none"
              style={{ color: card.color, fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Task board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(COLUMN_META).map(([status, meta]) => {
          const colTasks = taskList.filter((t) => t.status === status);
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                  <h3 className="text-sm font-heading font-semibold text-[var(--color-ink)]">{meta.label}</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "var(--color-surface-sunken)", color: "var(--color-ink-muted)" }}>
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {colTasks.map((task) => {
                  const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
                  const nextStatus = status === "open" ? "in_progress" : status === "in_progress" ? "done" : null;
                  const nextLabel = status === "open" ? "Start work" : status === "in_progress" ? "Mark done" : null;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && status !== "done";
                  return (
                    <div key={task.id} className="rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                      style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", opacity: status === "done" ? 0.7 : 1 }}>
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
                      <h4 className="text-sm font-medium text-[var(--color-ink)] mb-1"
                        style={{ textDecoration: status === "done" ? "line-through" : "none" }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-[var(--color-ink-muted)] mb-2 leading-relaxed">{task.description}</p>
                      )}
                      <Link href={"/reports/" + task.report.id}
                        className="block text-[11px] font-medium mb-1.5 hover:underline"
                        style={{ color: "var(--color-accent)" }}>
                        {task.report.site} — {task.report.hazardCategory || "Uncategorized"}
                      </Link>
                      {task.dueDate && (
                        <p className="text-[10px] mb-3" style={{ color: isOverdue ? "var(--color-danger)" : "var(--color-ink-faint)", fontWeight: isOverdue ? 600 : 400 }}>
                          {isOverdue ? "OVERDUE · " : "Due "}{formatDateIST(task.dueDate)}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        {nextStatus && (
                          <button onClick={() => handleStatusChange(task.id, nextStatus)}
                            className="flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 hover:opacity-80"
                            style={{ background: meta.color, color: "white" }}>
                            {nextLabel}
                          </button>
                        )}
                        <Link href={"/reports/" + task.report.id}
                          className="px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                          style={{ color: "var(--color-ink-muted)", border: "1px solid var(--color-border)" }}>
                          View report
                        </Link>
                        {status !== "done" && (
                          <button onClick={() => handleStatusChange(task.id, "cancelled")}
                            className="px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 hover:bg-[var(--color-surface-sunken)]"
                            style={{ color: "var(--color-ink-faint)", border: "1px solid var(--color-border)" }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="rounded-xl p-6 text-center"
                    style={{ background: "var(--color-surface-sunken)", border: "1px dashed var(--color-border)" }}>
                    <p className="text-xs text-[var(--color-ink-faint)]">No {meta.label.toLowerCase()} tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
