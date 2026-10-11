"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";

const ROLES = ["admin", "operator", "viewer"];

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    }
    loadUsers();
  }, []);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleRoleChange(userId, email, newRole) {
    const originalUsers = [...users];

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setUsers(originalUsers); // revert on failure
      setToast({
        type: "error",
        message: `Failed to update ${email}'s role.`,
      });
    } else {
      setToast({
        type: "success",
        message: `Updated ${email} to ${newRole.toUpperCase()}`,
      });
    }
  }

  if (loading) {
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
              Team Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage roles and access permissions for your team members.
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

        {/* users table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                    User Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Joined Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Access Role
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
                        className={`block w-full max-w-[160px] rounded-lg border-0 py-2 pl-3 pr-8 text-sm font-semibold capitalize ring-1 ring-inset focus:ring-2 focus:ring-inset sm:leading-6 cursor-pointer ${
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
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
