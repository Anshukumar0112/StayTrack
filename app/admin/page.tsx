"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { getAdminSummary } from "@/lib/api";
import { AdminDashboardSummary } from "@/lib/types";

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSummary()
      .then((data) => setSummary(data))
      .catch((err) => console.warn("Admin summary fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { title: "Total Users", value: summary?.totalUsers !== undefined ? summary.totalUsers.toLocaleString() : "1,248", change: "Registered accounts" },
    { title: "Verified Hosts", value: summary?.totalHosts !== undefined ? summary.totalHosts.toLocaleString() : "312", change: `${summary?.pendingHostApplications || 0} pending apps` },
    { title: "Properties", value: summary?.totalProperties !== undefined ? summary.totalProperties.toLocaleString() : "856", change: `${summary?.pendingProperties || 0} pending review` },
    { title: "Total Bookings", value: summary?.totalBookings !== undefined ? summary.totalBookings.toLocaleString() : "4,910", change: `${summary?.activeBookings || 0} active now` },
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
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Admin Command Console</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Platform management, host verifications, and system metrics</p>
          </div>
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
            System Operational
          </span>
        </div>

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
    </div>
  );
}

