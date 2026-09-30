"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { listAdminUsers, updateAdminUserStatus, updateAdminUserRole, deleteAdminUser } from "@/lib/api";
import { User } from "@/types/user";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAuth } from "@/hooks/useAuth";

export default function AdminUsersPage() {
  const { isAdmin, adminId, loading: guardLoading } = useAdminGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = () => {
    if (!isAdmin) return;
    setLoading(true);
    listAdminUsers({
      role: roleFilter !== "all" ? roleFilter : undefined,
      search: searchTerm.trim() ? searchTerm : undefined,
      page: 1,
      pageSize: 50,
    })
      .then((res) => {
        const userList = res?.users || res?.content || res?.data || (Array.isArray(res) ? res : []);
        setUsers(Array.isArray(userList) ? userList : []);
      })
      .catch((err) => console.warn("Fetch admin users error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [roleFilter, isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    if (adminId && (userId === adminId || userId.toLowerCase() === adminId.toLowerCase())) {
      alert("An admin cannot change their own account status.");
      return;
    }
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";
    try {
      setActionLoadingId(userId);
      await updateAdminUserStatus(userId, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (adminId && (userId === adminId || userId.toLowerCase() === adminId.toLowerCase())) {
      alert("An admin cannot change their own administrative role.");
      return;
    }
    try {
      setActionLoadingId(userId);
      await updateAdminUserRole(userId, newRole);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update role: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const userId = deleteTarget.uid;
    if (adminId && (userId === adminId || userId.toLowerCase() === adminId.toLowerCase())) {
      alert("Your own administrator account cannot be deleted.");
      setDeleteTarget(null);
      return;
    }

    try {
      setActionLoadingId(userId);
      setDeleteTarget(null);
      await deleteAdminUser(userId);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to delete user: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">User Account Management</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Manage user roles, account statuses, and system permissions</p>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
          {["all", "customer", "host", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                roleFilter === r ? "bg-black text-white" : "text-zinc-600 hover:text-black"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-3 max-w-md">
        <input
          type="text"
          placeholder="Search users by UID, phone, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="glass-input flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold"
        />
        <button type="submit" className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
          Search
        </button>
      </form>

      <GlassCard className="border border-zinc-200">
        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading user accounts...</div>
        ) : users.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {users.map((u) => {
              const isSelf = !!adminId && (u.uid === adminId || u.email?.toLowerCase() === adminId.toLowerCase());
              return (
                <div key={u.uid} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">{u.role || "customer"}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          u.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {u.status || "active"}
                      </span>
                      {isSelf && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">
                          YOU (Logged in Admin)
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-zinc-950">{u.name || u.phone || "Registered User"}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">UID: {u.uid} • Email: {u.email || "N/A"}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Role selector */}
                    <select
                      value={u.role || "customer"}
                      onChange={(e) => handleChangeRole(u.uid, e.target.value)}
                      disabled={actionLoadingId === u.uid || isSelf}
                      title={isSelf ? "You cannot change your own administrative role" : "Change user role"}
                      className="glass-input px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer disabled:opacity-50"
                    >
                      <option value="customer">Customer</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(u.uid, u.status)}
                      disabled={actionLoadingId === u.uid || isSelf}
                      title={isSelf ? "You cannot deactivate your own account" : "Toggle account status"}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 ${
                        u.status === "inactive"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border border-zinc-300 hover:bg-red-50 text-red-700"
                      }`}
                    >
                      {u.status === "inactive" ? "Activate" : "Deactivate"}
                    </button>

                    {/* Delete User */}
                    <button
                      onClick={() => setDeleteTarget(u)}
                      disabled={actionLoadingId === u.uid || isSelf}
                      title={isSelf ? "You cannot delete your own account" : "Delete user account"}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-300 hover:bg-red-100 text-red-800 transition cursor-pointer disabled:opacity-50"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-semibold text-zinc-400">
            No users found matching filter.
          </div>
        )}
      </GlassCard>

      {/* Confirmation Modal for User Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-zinc-200 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-zinc-950">Delete User Account?</h3>
            <p className="text-xs text-zinc-600 font-semibold leading-relaxed">
              Are you sure you want to delete user account <strong className="text-zinc-950">{deleteTarget.name || deleteTarget.email || deleteTarget.uid}</strong>?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-800">
              ⚠️ WARNING: This will permanently remove the user and any associated records. This action cannot be undone.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold text-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
