"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { getAdminSummary, getAdminActivities, clearAdminActivities } from "@/lib/api";
import { AdminDashboardSummary } from "@/types/host";
import { useAdminGuard } from "@/hooks/useAdminGuard";

function UserCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BuildingIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4m-4-8h.01M16 8h.01M12 12h.01M16 12h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}

function AlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function SettingsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

export default function AdminPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchSummary = () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getAdminSummary().catch((err) => {
        console.warn("Admin summary fetch notice:", err);
        setError(err.message || "Unable to load admin summary data.");
        return null;
      }),
      getAdminActivities().catch(() => []),
    ])
      .then(([summaryData, activityData]) => {
        if (summaryData) setSummary(summaryData);
        if (Array.isArray(activityData)) setActivities(activityData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSummary();
    }
  }, [isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleClearActivities = async () => {
    setClearing(true);
    try {
      await clearAdminActivities();
      setActivities([]);
      setShowClearModal(false);
    } catch (err: any) {
      alert("Failed to clear activity log: " + (err.message || "Unknown error"));
    } finally {
      setClearing(false);
    }
  };

  const stats = [
    {
      title: "TOTAL USERS",
      value: loading ? "Loading..." : error ? "—" : summary?.totalUsers !== undefined ? summary.totalUsers.toLocaleString() : "0",
      change: "Registered accounts",
    },
    {
      title: "VERIFIED HOSTS",
      value: loading ? "Loading..." : error ? "—" : (summary?.totalHosts ?? summary?.hosts) !== undefined ? (summary?.totalHosts ?? summary?.hosts ?? 0).toLocaleString() : "0",
      change: error ? "Unable to load" : `${summary?.pendingHostApplications || 0} pending apps`,
    },
    {
      title: "PROPERTIES",
      value: loading ? "Loading..." : error ? "—" : (summary?.totalProperties ?? summary?.activeProperties) !== undefined ? (summary?.totalProperties ?? summary?.activeProperties ?? 0).toLocaleString() : "0",
      change: error ? "Unable to load" : `${summary?.pendingProperties || 0} pending review`,
    },
    {
      title: "TOTAL BOOKINGS",
      value: loading ? "Loading..." : error ? "—" : (summary?.totalBookings ?? 0).toLocaleString(),
      change: error ? "Unable to load" : `${summary?.activeBookings || 0} active now`,
    },
  ];

  const pendingHostAppsCount = summary?.pendingHostApplications || 0;
  const pendingPropsCount = summary?.pendingProperties || 0;
  const hasPendingActions = pendingHostAppsCount > 0 || pendingPropsCount > 0;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 w-full space-y-10">
      {/* Header Title Section */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full">
              ADMIN CONSOLE
            </span>
          </div>
          <h1 className="text-3xl font-black text-zinc-950">Admin Command Console</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Platform management, host verifications, and system metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            System Operational
          </span>
        </div>
      </div>

      {/* Error state banner if API request fails */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-3 text-red-800 font-bold">
            <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
            <span>Unable to load admin summary data from backend. ({error})</span>
          </div>
          <button
            onClick={fetchSummary}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Overview Metric Cards */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">System Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <ClayCard key={i} className="border border-zinc-200 bg-white">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{s.title}</span>
              <h3 className="text-3xl font-black mt-2 text-zinc-950">{s.value}</h3>
              <p className="text-[11px] text-zinc-400 font-semibold mt-1.5">{s.change}</p>
            </ClayCard>
          ))}
        </div>
      </div>

      {/* Section A: Pending Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-950 flex items-center gap-2">
            <span>Pending Actions</span>
            {hasPendingActions && !error && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full">
                {pendingHostAppsCount + pendingPropsCount} Required
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-zinc-400">Loading pending actions...</div>
        ) : error ? (
          <GlassCard className="border border-red-200 p-8 text-center bg-red-50/50 space-y-2">
            <AlertIcon className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-red-950">Unable to Load Pending Actions</h3>
            <p className="text-xs text-red-700 max-w-sm mx-auto">
              Please check your connection to the backend server and click Retry above.
            </p>
          </GlassCard>
        ) : hasPendingActions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pendingHostAppsCount > 0 && (
              <GlassCard className="border border-amber-200 bg-amber-50/60 p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-block px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider rounded-md mb-2">
                      Host Application
                    </div>
                    <h3 className="text-base font-bold text-zinc-950">Host Verification Applications</h3>
                    <p className="text-xs text-amber-800 font-semibold mt-1">
                      {pendingHostAppsCount === 1
                        ? "1 pending host application awaiting verification review."
                        : `${pendingHostAppsCount} pending host applications awaiting verification review.`}
                    </p>
                  </div>
                  <span className="text-2xl animate-bounce">🔔</span>
                </div>
                <div>
                  <Link
                    href="/admin/hosts?filter=pending"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <span>Review Host Applications ({pendingHostAppsCount})</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>
            )}

            {pendingPropsCount > 0 && (
              <GlassCard className="border border-amber-200 bg-amber-50/60 p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-block px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider rounded-md mb-2">
                      Property Verification
                    </div>
                    <h3 className="text-base font-bold text-zinc-950">Property Verification Submissions</h3>
                    <p className="text-xs text-amber-800 font-semibold mt-1">
                      {pendingPropsCount === 1
                        ? "1 property submission awaiting verification review."
                        : `${pendingPropsCount} property submissions awaiting verification review.`}
                    </p>
                  </div>
                  <span className="text-2xl animate-bounce">🏢</span>
                </div>
                <div>
                  <Link
                    href="/admin/properties?verificationStatus=pending"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <span>Review Properties ({pendingPropsCount})</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>
            )}
          </div>
        ) : (
          <GlassCard className="border border-zinc-200 p-8 text-center bg-white space-y-2">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-950">No Pending Actions</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              All host applications and property verification requests are up to date.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Section B: Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-950">Recent Activity</h2>
          {activities.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold transition cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {activities.length > 0 ? (
          <GlassCard className="border border-zinc-200 p-4 bg-white">
            <div className="divide-y divide-zinc-100">
              {activities.map((act) => (
                <div key={act.id || act.eventId} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold shrink-0">
                      ⚡
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{act.description || act.eventType}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">Actor: {act.adminId || act.actorId || "Admin"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
                    {act.createdAt ? new Date(act.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="border border-zinc-200 p-8 text-center bg-white space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              📊
            </div>
            <h3 className="text-sm font-bold text-zinc-950">No Recent Activity</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Live system activity logs and event feeds will automatically display here as new platform events occur.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Section C: Quick Actions */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-black text-zinc-950">Quick Actions</h2>
        <div className="flex items-center flex-wrap gap-3">
          <Link
            href="/admin/hosts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition shadow-xs"
          >
            <UserCheckIcon className="w-4 h-4 text-emerald-600" />
            <span>Review Applications</span>
          </Link>

          <Link
            href="/admin/properties"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition shadow-xs"
          >
            <BuildingIcon className="w-4 h-4 text-indigo-600" />
            <span>Review Properties</span>
          </Link>

          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition shadow-xs"
          >
            <AlertIcon className="w-4 h-4 text-amber-600" />
            <span>View Reports</span>
          </Link>

          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition shadow-xs"
          >
            <SettingsIcon className="w-4 h-4 text-zinc-600" />
            <span>System Settings</span>
          </Link>
        </div>
      </div>

      {/* Clear Recent Activity Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-zinc-200 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-zinc-950">Clear recent activity?</h3>
            <p className="text-xs text-zinc-600 font-semibold leading-relaxed">
              This will permanently remove all activity entries from the admin activity log. This action cannot be undone.
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-800">
              Note: Clearing log entries only removes event history. It does not undo any underlying host, account, or subscription changes.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold text-zinc-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearActivities}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
