"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import {
  listAdminHostApplications,
  approveHostApplication,
  rejectHostApplication,
  verifyHostPaymentAccount,
  listAdminUsers,
  suspendAdminHost,
  banAdminHost,
  reactivateAdminHost,
  pauseHostSubscription,
  resumeHostSubscription,
} from "@/lib/api";
import { HostApplication } from "@/types/host";
import { User } from "@/types/user";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminHostsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [hostUsers, setHostUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<"pending" | "active" | "suspended" | "banned" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchHostData = () => {
    if (!isAdmin) return;
    setLoading(true);

    if (filter === "pending" || filter === "rejected") {
      listAdminHostApplications({
        verificationStatus: filter,
        page: 1,
        pageSize: 50,
      })
        .then((res) => {
          const appList = res?.applications || res?.content || res?.data || (Array.isArray(res) ? res : []);
          setApplications(Array.isArray(appList) ? appList : []);
          setHostUsers([]);
        })
        .catch((err) => console.warn("Fetch host applications error:", err))
        .finally(() => setLoading(false));
    } else if (filter === "active" || filter === "suspended" || filter === "banned") {
      listAdminUsers({
        role: "host",
        status: filter === "active" ? "active" : filter === "suspended" ? "suspended" : "banned",
        page: 1,
        pageSize: 50,
      })
        .then((res) => {
          const userList = res?.users || res?.content || res?.data || (Array.isArray(res) ? res : []);
          setHostUsers(Array.isArray(userList) ? userList : []);
          setApplications([]);
        })
        .catch((err) => console.warn("Fetch host users error:", err))
        .finally(() => setLoading(false));
    } else {
      // All filter: fetch both host applications and host users
      Promise.all([
        listAdminHostApplications({ page: 1, pageSize: 50 }).catch(() => ({ applications: [] })),
        listAdminUsers({ role: "host", page: 1, pageSize: 50 }).catch(() => ({ users: [] })),
      ]).then(([appsRes, usersRes]) => {
        const appList = appsRes?.applications || appsRes?.content || appsRes?.data || [];
        const userList = usersRes?.users || usersRes?.content || usersRes?.data || [];
        setApplications(Array.isArray(appList) ? appList : []);
        setHostUsers(Array.isArray(userList) ? userList : []);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHostData();
    }
  }, [filter, isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleApprove = async (appId: string) => {
    try {
      setActionLoadingId(appId);
      await approveHostApplication(appId, "Approved by Administrator");
      alert("Host application approved successfully!");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to approve application: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      setActionLoadingId(appId);
      await rejectHostApplication(appId, reason);
      alert("Host application rejected.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to reject application: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspendHost = async (hostId: string) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;
    try {
      setActionLoadingId(hostId);
      await suspendAdminHost(hostId, reason);
      alert("Host account suspended.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to suspend host: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBanHost = async (hostId: string) => {
    const reason = prompt("Enter ban reason:");
    if (!reason) return;
    try {
      setActionLoadingId(hostId);
      await banAdminHost(hostId, reason);
      alert("Host account banned.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to ban host: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivateHost = async (hostId: string) => {
    try {
      setActionLoadingId(hostId);
      await reactivateAdminHost(hostId);
      alert("Host account reactivated.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to reactivate host: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePauseSubscription = async (hostId: string) => {
    try {
      setActionLoadingId(hostId);
      await pauseHostSubscription(hostId);
      alert("Host subscription paused.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to pause subscription: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeSubscription = async (hostId: string) => {
    try {
      setActionLoadingId(hostId);
      await resumeHostSubscription(hostId);
      alert("Host subscription resumed.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to resume subscription: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyRoutePaymentAccount = async (hostId: string) => {
    try {
      setActionLoadingId(hostId);
      await verifyHostPaymentAccount(hostId);
      alert("Razorpay Route Payment Account verified successfully!");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to verify payment account: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const tabs: Array<"pending" | "active" | "suspended" | "banned" | "rejected" | "all"> = [
    "pending",
    "active",
    "suspended",
    "banned",
    "rejected",
    "all",
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Host Account Lifecycle & Verification</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage host applications, account statuses (Active/Suspended/Banned), and subscriptions
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                filter === tab ? "bg-black text-white" : "text-zinc-600 hover:text-black"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="border border-zinc-200">
        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading host records...</div>
        ) : (filter === "pending" || filter === "rejected" || (filter === "all" && applications.length > 0)) && applications.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {applications.map((app) => {
              const targetId = app.id || app.applicationId || app.userId;
              return (
                <div key={targetId} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">Application</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          app.verificationStatus === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : app.verificationStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900 animate-pulse"
                        }`}
                      >
                        {app.verificationStatus || "Pending"}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">User ID: {app.userId}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-950">
                      {app.applicantName || app.fullName || app.email || "Applicant"}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      📧 {app.email || "N/A"} • 📞 {app.phone || "N/A"} • 🏷️ {app.hostType ? app.hostType.toUpperCase() : "PROPERTY OWNER"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {app.verificationStatus === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(targetId)}
                          disabled={actionLoadingId === targetId}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ✓ Approve Host
                        </button>
                        <button
                          onClick={() => handleReject(targetId)}
                          disabled={actionLoadingId === targetId}
                          className="rounded-xl border border-zinc-300 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleVerifyRoutePaymentAccount(app.userId)}
                      disabled={actionLoadingId === app.userId}
                      className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      💳 Verify Razorpay Route
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hostUsers.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {hostUsers.map((u) => (
              <div key={u.uid} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">Host Account</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        u.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : u.status === "suspended"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u.status || "active"}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">UID: {u.uid}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-950">{u.name || u.phone || "Host User"}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    📧 {u.email || "N/A"} • 📞 {u.phone || "N/A"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/properties?search=${encodeURIComponent(u.uid)}`}
                    className="rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold text-xs px-3 py-2 transition-all"
                  >
                    🏠 View Properties
                  </Link>

                  {u.status === "active" ? (
                    <>
                      <button
                        onClick={() => handlePauseSubscription(u.uid)}
                        disabled={actionLoadingId === u.uid}
                        className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ⏸ Pause Subscription
                      </button>
                      <button
                        onClick={() => handleSuspendHost(u.uid)}
                        disabled={actionLoadingId === u.uid}
                        className="rounded-xl border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✋ Suspend
                      </button>
                      <button
                        onClick={() => handleBanHost(u.uid)}
                        disabled={actionLoadingId === u.uid}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        🚫 Ban
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleResumeSubscription(u.uid)}
                        disabled={actionLoadingId === u.uid}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ▶ Resume Subscription
                      </button>
                      <button
                        onClick={() => handleReactivateHost(u.uid)}
                        disabled={actionLoadingId === u.uid}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✓ Reactivate Host
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-semibold text-zinc-400">
            No host records found matching status filter "{filter}".
          </div>
        )}
      </GlassCard>
    </main>
  );
}
