"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { listAdminUsers, updateAdminUserStatus, updateAdminUserRole } from "@/lib/api";
import { User } from "@/types/user";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminUsersPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = () => {
    if (!isAdmin) return;
    setLoading(true);
    listAdminUsers({
      role: roleFilter !== "all" ? roleFilter : undefined,
      search: searchTerm.trim() ? searchTerm : undefined,
      page: 1,
      pageSize: 30,
    })
      .then((res) => {
        if (res && Array.isArray(res.content)) {
          setUsers(res.content);
        } else if (Array.isArray(res)) {
          setUsers(res);
        } else {
          setUsers([]);
        }
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
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";
    try {
      setActionLoadingId(userId);
      await updateAdminUserStatus(userId, newStatus);
      alert(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      setActionLoadingId(userId);
      await updateAdminUserRole(userId, newRole);
      alert(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

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
              {users.map((u) => (
                <div key={u.uid} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">{u.role || "customer"}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        u.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {u.status || "active"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-950">{u.name || u.phone || "Registered User"}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">UID: {u.uid} • Email: {u.email || "N/A"}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={u.role || "customer"}
                      onChange={(e) => handleChangeRole(u.uid, e.target.value)}
                      disabled={actionLoadingId === u.uid}
                      className="glass-input px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                    >
                      <option value="customer">Customer</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button
                      onClick={() => handleToggleStatus(u.uid, u.status)}
                      disabled={actionLoadingId === u.uid}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        u.status === "inactive"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border border-zinc-300 hover:bg-red-50 text-red-700"
                      }`}
                    >
                      {u.status === "inactive" ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400">
              No users found matching filter.
            </div>
          )}
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
