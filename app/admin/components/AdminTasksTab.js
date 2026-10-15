"use client";

import { useState, useEffect } from "react";

const ROLES = [
  "Logistics Dispatcher",
  "Security Officer",
  "Support Specialist",
  "DevOps Engineer",
  "Billing Specialist",
];

const CATEGORIES = [
  "LOGISTICS",
  "SECURITY",
  "MERCHANT_SUPPORT",
  "BILLING",
  "SYSTEM_HEALTH",
];

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function AdminTasksTab({ triggerToast }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to_email: "",
    assigned_to_name: "",
    role: "Logistics Dispatcher",
    category: "LOGISTICS",
    priority: "HIGH",
    due_date: "",
  });

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // ── Fetch Tasks ──────────────────────────────────────────────
  async function fetchTasks() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/tasks");
      if (res.ok) {
        const json = await res.json();
        if (json.tasks) {
          setTasks(json.tasks);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch admin tasks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // ── AI Task Generator ────────────────────────────────────────
  async function handleGenerateAiTasks() {
    try {
      setAiLoading(true);
      setShowAiPanel(true);
      const res = await fetch("/api/admin/tasks/ai-suggest", {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.suggestions) {
          setAiSuggestions(json.suggestions);
          triggerToast("success", "AI Logistics Copilot generated 4 operational tasks!");
        }
      }
    } catch (err) {
      triggerToast("error", "Failed to contact AI Copilot.");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Adopt AI Suggestion ──────────────────────────────────────
  async function handleAdoptAiTask(suggestion) {
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          description: `${suggestion.description} (Target: ${suggestion.reason})`,
          assigned_to_email: suggestion.suggested_assignee,
          assigned_to_name: suggestion.suggested_assignee.split("@")[0],
          role: suggestion.role,
          category: suggestion.category,
          priority: suggestion.priority,
        }),
      });

      if (res.ok) {
        triggerToast("success", `Task "${suggestion.title}" dispatched!`);
        setAiSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
        fetchTasks();
      }
    } catch {
      triggerToast("error", "Failed to dispatch AI suggestion.");
    }
  }

  // ── Create Task ──────────────────────────────────────────────
  async function handleCreateTask(e) {
    e.preventDefault();
    if (!formData.title || !formData.assigned_to_email) {
      triggerToast("error", "Title and Assignee email are required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        triggerToast("success", "Operational task dispatched successfully!");
        setShowModal(false);
        setFormData({
          title: "",
          description: "",
          assigned_to_email: "",
          assigned_to_name: "",
          role: "Logistics Dispatcher",
          category: "LOGISTICS",
          priority: "HIGH",
          due_date: "",
        });
        fetchTasks();
      } else {
        const json = await res.json();
        triggerToast("error", json.error || "Failed to create task.");
      }
    } catch {
      triggerToast("error", "Network error creating task.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Update Status ────────────────────────────────────────────
  async function handleUpdateStatus(id, newStatus) {
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        triggerToast("success", `Task updated to ${newStatus}`);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: newStatus,
                  ...(newStatus === "COMPLETED" ? { completed_at: new Date().toISOString() } : {}),
                }
              : t
          )
        );
      }
    } catch {
      triggerToast("error", "Failed to update task.");
    }
  }

  // ── Delete Task ──────────────────────────────────────────────
  async function handleDeleteTask(id, title) {
    if (!confirm(`Purge task "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/tasks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        triggerToast("success", "Task purged.");
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      triggerToast("error", "Failed to delete task.");
    }
  }

  // ── Filtered Tasks ───────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (roleFilter !== "ALL" && t.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || "").toLowerCase().includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      const matchAssignee = (t.assigned_to_email || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    return true;
  });

  // Aggregated Stats
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const criticalCount = tasks.filter((t) => t.priority === "CRITICAL" && t.status !== "COMPLETED").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* ── HEADER & DISPATCH ACTIONS ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Logistics &amp; Operations Command
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Team Task Delegation &amp; Workload Tracker
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Assign critical logistics, security audits, and merchant support operations to sub-admins. Track live progress and prevent operational bottlenecks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateAiTasks}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 btn-tactile transition-all disabled:opacity-50"
          >
            <span>{aiLoading ? "⚡ Analyzing..." : "✨ AI Operations Dispatch"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 btn-tactile transition-all"
          >
            <span>+</span>
            <span>Assign New Task</span>
          </button>

          <button
            type="button"
            onClick={fetchTasks}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            title="Refresh Task List"
          >
            {refreshing ? "…" : "↻"}
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-slate-500">Total Tasks</div>
          <div className="mt-1 text-2xl font-black text-slate-900 font-mono">{totalCount}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Assigned Operations</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-amber-800 font-bold">Pending</div>
          <div className="mt-1 text-2xl font-black text-amber-900 font-mono">{pendingCount}</div>
          <div className="text-[10px] text-amber-700 font-mono mt-0.5">Awaiting Operator</div>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-orange-800 font-bold">In Progress</div>
          <div className="mt-1 text-2xl font-black text-orange-900 font-mono">{inProgressCount}</div>
          <div className="text-[10px] text-orange-700 font-mono mt-0.5">Actively Handled</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-rose-800 font-bold">Critical Priority</div>
          <div className="mt-1 text-2xl font-black text-rose-900 font-mono">{criticalCount}</div>
          <div className="text-[10px] text-rose-700 font-mono mt-0.5">Urgent Attention</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <div className="text-[11px] font-mono uppercase text-emerald-800 font-bold">Completed</div>
          <div className="mt-1 text-2xl font-black text-emerald-900 font-mono">{completedCount}</div>
          <div className="text-[10px] text-emerald-700 font-mono mt-0.5">Resolved &amp; Logged</div>
        </div>
      </div>

      {/* ── AI SMART SUGGESTIONS DRAWER ─────────────────────────── */}
      {showAiPanel && aiSuggestions.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-bold text-slate-900">
                Logistics &amp; Security Recommendations
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                {aiSuggestions.length} Recommendations
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAiPanel(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiSuggestions.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                        item.priority === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : item.priority === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Role: {item.role}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    Why: {item.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-teal-700 font-semibold">
                    Assignee: {item.suggested_assignee}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdoptAiTask(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-500 btn-tactile transition shadow-xs"
                  >
                    <span>⚡ Approve &amp; Dispatch</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTERS & SEARCH BAR ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  statusFilter === s
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:bg-white focus:border-orange-500"
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:bg-white focus:border-orange-500"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, role..."
            className="w-56 sm:w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500"
          />
          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">🔍</span>
        </div>
      </div>

      {/* ── TASK LIST MATRIX ─────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Loading operational task matrix…
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
            <span className="text-3xl block mb-2">📋</span>
            <div className="text-sm font-bold text-slate-900">No tasks match your filters</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Use the "+ Assign New Task" button or trigger "AI Operations Dispatch" to create operational tasks for your team.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            const isInProgress = task.status === "IN_PROGRESS";

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? "bg-slate-50 border-slate-200 opacity-80"
                    : isInProgress
                    ? "bg-white border-orange-300 shadow-xs"
                    : "bg-white border-slate-200 shadow-2xs"
                }`}
              >
                {/* Left info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Priority badge */}
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                        task.priority === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : task.priority === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}
                    >
                      {task.priority}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : task.status === "IN_PROGRESS"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : task.status === "IN_PROGRESS"
                            ? "bg-orange-500 animate-pulse"
                            : "bg-amber-500"
                        }`}
                      />
                      {task.status.replace("_", " ")}
                    </span>

                    {/* Category */}
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      {task.category}
                    </span>

                    {/* Role */}
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-semibold">
                      👤 {task.role}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold text-slate-900 ${
                      isCompleted ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {task.description}
                    </p>
                  )}

                  {/* Assignee & Dates */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
                    <span className="text-slate-700">
                      Assigned to: <strong className="text-orange-700 font-bold">{task.assigned_to_name}</strong> ({task.assigned_to_email})
                    </span>
                    {task.due_date && (
                      <span>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Created: {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {task.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                      className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-600 hover:text-white btn-tactile transition"
                    >
                      ▶ Start Working
                    </button>
                  )}

                  {task.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white btn-tactile transition"
                    >
                      ✓ Mark Completed
                    </button>
                  )}

                  {task.status === "COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                      className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      Reopen
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id, task.title)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                    title="Purge Task"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── ASSIGN TASK MODAL ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-900">
                  Assign Operations Task
                </h3>
                <p className="text-xs text-slate-500">
                  Delegate a logistics, security, or support mission to a sub-admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Audit Steadfast Courier Webhooks"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                  Description / Operational Instructions
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the exact verification steps or troubleshooting needed..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Assignee Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.assigned_to_email}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to_email: e.target.value })
                    }
                    placeholder="support@smartinventory.io"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_to_name}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to_name: e.target.value })
                    }
                    placeholder="e.g. Tariqul Islam"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Operational Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50"
                >
                  {submitting ? "Dispatching…" : "Dispatch Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
