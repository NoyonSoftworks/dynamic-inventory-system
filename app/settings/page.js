"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import Link from "next/link";

const ROLES = ["admin", "operator", "viewer"];

export default function SettingsPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [bizName, setBizName] = useState("");
  const [bizSaving, setBizSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [inviting, setInviting] = useState(false);

  const [toast, setToast] = useState(null);

  // sync businessName from context into local state for editing
  useEffect(() => {
    if (businessName) {
      queueMicrotask(() => setBizName(businessName));
    }
  }, [businessName]);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── fetch team members ──────────────────────────────────
  const loadTeam = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (!error && data) setUsers(data);
    setUsersLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    async function fetchTeam() {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });

      if (active) {
        if (!error && data) setUsers(data);
        setUsersLoading(false);
      }
    }
    fetchTeam();
    return () => {
      active = false;
    };
  }, [businessId]);

  // ── save business name ──────────────────────────────────
  async function handleSaveName(e) {
    e.preventDefault();
    if (!bizName.trim() || !businessId) return;
    setBizSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ name: bizName.trim() })
      .eq("id", businessId);

    setBizSaving(false);
    if (error) {
      setToast({ type: "error", message: "Failed to update business name." });
    } else {
      setToast({ type: "success", message: "Business name updated!" });
    }
  }

  // ── change user role ────────────────────────────────────
  async function handleRoleChange(userId, email, newRole) {
    const originalUsers = [...users];
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setUsers(originalUsers);
      setToast({ type: "error", message: `Failed to update ${email}.` });
    } else {
      setToast({ type: "success", message: `${email} → ${newRole.toUpperCase()}` });
    }
  }

  // ── remove team member ──────────────────────────────────
  async function handleRemove(userId, email) {
    if (!confirm(`Remove ${email} from your team?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", userId);

    if (error) {
      setToast({ type: "error", message: `Failed to remove ${email}.` });
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setToast({ type: "success", message: `${email} removed from team.` });
    }
  }

  // ── invite / add staff ──────────────────────────────────
  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !businessId) return;
    setInviting(true);

    // Check if user already exists in this business
    const exists = users.find(
      (u) => u.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (exists) {
      setToast({ type: "error", message: "This email is already on your team." });
      setInviting(false);
      return;
    }

    // Pre-insert the user into user_roles. When they sign up,
    // the DB trigger will link their auth.uid to this row.
    const { error } = await supabase.from("user_roles").insert({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      business_id: businessId,
    });

    setInviting(false);
    if (error) {
      setToast({
        type: "error",
        message: error.message.includes("duplicate")
          ? "This email is already registered."
          : `Failed to add staff: ${error.message}`,
      });
    } else {
      setToast({
        type: "success",
        message: "Staff added! Tell them to sign up with this email or use Google Login.",
      });
      setInviteEmail("");
      setInviteRole("operator");
      loadTeam();
    }
  }

  // ── loading state ───────────────────────────────────────
  if (ctxLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Spinner size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Business &amp; Team Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your workspace, team members, and access permissions.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            ← Dashboard
          </Link>
        </div>

        {/* toast */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? "✓" : "✗"} {toast.message}
          </div>
        )}

        {/* ── business name card ─────────────────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🏢 Business Profile
          </h2>
          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. My Awesome Store"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={bizSaving || !bizName.trim()}
              className="self-end rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {bizSaving ? "Saving…" : "Save Name"}
            </button>
          </form>
          <p className="text-xs text-gray-400">
            Business ID: <code className="font-mono">{businessId}</code>
          </p>
        </div>

        {/* ── pre-register staff card ──────────────────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            👥 Add Staff Member (Pre-Registration)
          </h2>
          <p className="text-sm text-gray-500">
            Pre-register staff members here. No SMTP setup required! Simply enter their email and
            assign a role. Once added, tell them to sign up or log in with Google using this email,
            and they will automatically be linked to your business workspace.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {inviting ? "Adding…" : "+ Add Staff"}
            </button>
          </form>
        </div>

        {/* ── team table ─────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              👥 Team Members ({users.length})
            </h2>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                      Joined Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      } hover:bg-indigo-50/30 transition`}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {u.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, u.email, e.target.value)
                          }
                          className={`block w-full max-w-[140px] rounded-lg border-0 py-2 pl-3 pr-8 text-sm font-semibold capitalize ring-1 ring-inset focus:ring-2 focus:ring-inset cursor-pointer ${
                            u.role === "admin"
                              ? "bg-purple-50 text-purple-700 ring-purple-600/30 focus:ring-purple-600"
                              : u.role === "operator"
                              ? "bg-blue-50 text-blue-700 ring-blue-600/30 focus:ring-blue-600"
                              : "bg-gray-50 text-gray-700 ring-gray-600/30 focus:ring-gray-600"
                          }`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleRemove(u.id, u.email)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
