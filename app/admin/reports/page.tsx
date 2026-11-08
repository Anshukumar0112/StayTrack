"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { getAdminSummary, listAdminBookings, getAdminActivities } from "@/lib/api";
import {
  AlertTriangleIcon,
  Building2Icon,
  CheckIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  MessageCircleIcon,
} from "@/components/ui/Icons";

export default function AdminReportsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [summary, setSummary] = useState<any | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      getAdminSummary().catch(() => null),
      listAdminBookings({ status: "cancelled", pageSize: 10 }).catch(() => ({ bookings: [] })),
      getAdminActivities().catch(() => []),
    ])
      .then(([sumRes, bookRes, actRes]) => {
        setSummary(sumRes);
        setDisputes(bookRes?.bookings || bookRes?.content || []);
        setActivities(Array.isArray(actRes) ? actRes.slice(0, 8) : []);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const pendingProps = summary?.pendingProperties ?? 0;
  const pendingApps = summary?.pendingHostApplications ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Platform Health & Issue Audit</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Real-time incident response, pending verification bottlenecks, and booking dispute tracking
        </p>
      </div>

      {/* Actionable Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-5 border border-zinc-200 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Listings</span>
              <span className={`w-2 h-2 rounded-full ${pendingProps > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            </div>
            <p className="text-3xl font-black text-zinc-950 mt-1">{pendingProps}</p>
            <p className="text-xs text-zinc-500 mt-1">Accommodations awaiting verification</p>
          </div>
          <Link
            href="/admin/properties?verificationStatus=pending"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Review Listings</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Host Onboarding</span>
              <span className={`w-2 h-2 rounded-full ${pendingApps > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            </div>
            <p className="text-3xl font-black text-zinc-950 mt-1">{pendingApps}</p>
            <p className="text-xs text-zinc-500 mt-1">Host identity & property applications</p>
          </div>
          <Link
            href="/admin/hosts?filter=pending"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Review Applications</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cancelled Bookings</span>
              <span className={`w-2 h-2 rounded-full ${disputes.length > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
            </div>
            <p className="text-3xl font-black text-zinc-950 mt-1">{disputes.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Disputed or cancelled reservations</p>
          </div>
          <Link
            href="/admin/bookings?status=cancelled"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Audit Disputes</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>
      </div>

      {/* Disputed Bookings Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-extrabold text-zinc-950">Recent Booking Cancellations & Interventions</h2>
          <Link href="/admin/bookings" className="text-xs font-bold text-primary hover:underline">
            View All in Bookings Console →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-zinc-400">Loading audit feed...</div>
        ) : disputes.length === 0 ? (
          <GlassCard className="p-8 text-center border border-zinc-200 space-y-2">
            <CheckIcon className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-800">No unresolved cancellations</p>
            <p className="text-[11px] text-zinc-500">All guest and host reservations are operating normally</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {disputes.map((d) => (
              <GlassCard key={d.bookingId || d.id} className="p-4 border border-zinc-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200 mr-2">
                    #{d.bookingId || d.id}
                  </span>
                  <span className="font-bold text-zinc-900">{d.propertyTitle || "Stay Reservation"}</span>
                  {d.adminCancellationReason && (
                    <p className="text-[11px] text-rose-700 mt-0.5">Reason: {d.adminCancellationReason}</p>
                  )}
                </div>
                <Link
                  href="/admin/bookings"
                  className="px-3 py-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-[11px] font-bold text-zinc-700"
                >
                  Inspect in Console
                </Link>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log Trail */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-zinc-950">Recent Administrator Operations Trail</h2>
        {activities.length === 0 ? (
          <GlassCard className="p-8 text-center border border-zinc-200">
            <p className="text-xs text-zinc-500">No recent administrative activities logged</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {activities.map((a: any) => (
              <GlassCard key={a.id || a.eventId} className="p-3.5 border border-zinc-200 flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                      {a.eventType || "ACTION"}
                    </span>
                    <span className="text-zinc-700 font-medium">{a.description}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Target: {a.targetType} / {a.targetId} • Actor: {a.actorId || "admin"}
                  </p>
                </div>
                {a.createdAt && (
                  <span className="text-[11px] text-zinc-400 font-mono shrink-0">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
