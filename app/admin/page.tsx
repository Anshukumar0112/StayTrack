"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { getAdminSummary } from "@/lib/api";
import { AdminDashboardSummary } from "@/types/host";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { signOutUser } from "@/lib/auth";

export default function AdminPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getAdminSummary()
      .then((data) => setSummary(data))
      .catch((err) => console.warn("Admin summary fetch notice:", err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network errors
    }
    await signOutUser();
    window.location.href = "/admin/login";
  };

  const stats = [
    { title: "Total Users", value: summary?.totalUsers !== undefined ? summary.totalUsers.toLocaleString() : "—", change: "Registered accounts" },
    { title: "Verified Hosts", value: summary?.totalHosts !== undefined ? summary.totalHosts.toLocaleString() : "—", change: `${summary?.pendingHostApplications || 0} pending apps` },
    { title: "Properties", value: summary?.totalProperties !== undefined ? summary.totalProperties.toLocaleString() : "—", change: `${summary?.pendingProperties || 0} pending review` },
    { title: "Total Bookings", value: summary?.totalBookings !== undefined ? summary.totalBookings.toLocaleString() : "—", change: `${summary?.activeBookings || 0} active now` },
  ];

  const adminLinks = [
    { name: "Users", path: "/admin/users", icon: "👥" },
    { name: "Hosts", path: "/admin/hosts", icon: "🏠" },
    { name: "Properties", path: "/admin/properties", icon: "🏢" },
    { name: "Bookings", path: "/admin/bookings", icon: "📅" },
    { name: "Payments", path: "/admin/payments", icon: "💳" },
    { name: "Subscriptions", path: "/admin/subscriptions", icon: "⭐" },
    { name: "Reviews", path: "/admin/reviews", icon: "💬" },
    { name: "Reports", path: "/admin/reports", icon: "⚠️" },
    { name: "Settings", path: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                ADMIN CONSOLE
              </span>
            </div>
            <h1 className="text-3xl font-black text-zinc-950">Admin Command Console</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Platform management, host verifications, and system metrics</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
              System Operational
            </span>
            <button
              onClick={handleAdminLogout}
              className="rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-800 transition-all cursor-pointer shadow-xs"
            >
              🔒 Admin Sign Out
            </button>
          </div>
        </div>

        {/* Real-time Pending Host Verification Alert Notification */}
        {summary && summary.pendingHostApplications > 0 && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between flex-wrap gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🔔</span>
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Host Verification Notification
                </h3>
                <p className="text-xs text-amber-800 font-semibold mt-0.5">
                  {summary.pendingHostApplications === 1
                    ? "1 pending host verification request waiting for review."
                    : `${summary.pendingHostApplications} pending host verification requests waiting for review.`}
                </p>
              </div>
            </div>
            <Link
              href="/admin/hosts"
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 shadow-sm transition-all"
            >
              Review Pending Applications ({summary.pendingHostApplications}) →
            </Link>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <ClayCard key={i} className="border border-zinc-200">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">{s.title}</span>
              <h3 className="text-3xl font-black mt-2 text-zinc-950">{loading ? "..." : s.value}</h3>
              <p className="text-[11px] text-zinc-500 font-semibold mt-1">{s.change}</p>
            </ClayCard>
          ))}
        </div>

        {/* Quick Admin Modules Navigation Grid */}
        <h2 className="text-xl font-bold text-zinc-950 mb-4">Management Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {adminLinks.map((mod) => (
            <Link key={mod.path} href={mod.path}>
              <GlassCard hoverEffect className="text-center p-5 border border-zinc-200 group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{mod.icon}</div>
                <h4 className="text-xs font-bold text-zinc-900 group-hover:text-black transition-colors">
                  {mod.name}
                </h4>
              </GlassCard>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
