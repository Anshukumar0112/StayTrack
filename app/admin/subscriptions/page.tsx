"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  listAdminSubscriptions,
  pauseHostSubscription,
  resumeHostSubscription,
  grantHostSubscription,
  getSubscriptionSettings,
} from "@/lib/api";
import {
  CrownIcon,
  SearchIcon,
  PauseIcon,
  PlayIcon,
  CheckIcon,
  AlertTriangleIcon,
  CloseIcon,
  Building2Icon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";
import { formatCurrency } from "@/lib/utils";

type SubFilter = "all" | "active" | "paused" | "expired";

const TABS: { key: SubFilter; label: string }[] = [
  { key: "all", label: "All Subscriptions" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "expired", label: "Expired" },
];

export default function AdminSubscriptionsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Grant Subscription Modal
  const [grantModalHost, setGrantModalHost] = useState<any | null>(null);
  const [grantPlan, setGrantPlan] = useState("host_pro");
  const [grantDays, setGrantDays] = useState(365);
  const [grantReason, setGrantReason] = useState("");

  const fetchSubscriptions = () => {
    if (!isAdmin) return;
    setLoading(true);
    listAdminSubscriptions({
      status: filter === "all" ? undefined : filter,
      pageSize: 100,
    })
      .then((res) => {
        const list = res?.subscriptions || res?.content || res?.data || (Array.isArray(res) ? res : []);
        setSubscriptions(Array.isArray(list) ? list : []);
        if (res?.summary) setSummary(res.summary);
      })
      .catch((err) => {
        console.error("Failed to fetch admin subscriptions:", err);
        setSubscriptions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSubscriptions();
    }
  }, [isAdmin, filter]);

  const filteredSubscriptions = useMemo(() => {
    if (!searchQuery.trim()) return subscriptions;
    const q = searchQuery.toLowerCase().trim();
    return subscriptions.filter((s) => {
      const hostId = String(s.hostId || "").toLowerCase();
      const plan = String(s.plan || "").toLowerCase();
      const hostName = String(s.hostName || "").toLowerCase();
      const hostEmail = String(s.hostEmail || "").toLowerCase();
      const status = String(s.status || "").toLowerCase();
      return (
        hostId.includes(q) ||
        plan.includes(q) ||
        hostName.includes(q) ||
        hostEmail.includes(q) ||
        status.includes(q)
      );
    });
  }, [subscriptions, searchQuery]);

  const handlePause = async (hostId: string) => {
    setActionLoadingId(hostId);
    try {
      await pauseHostSubscription(hostId);
      fetchSubscriptions();
    } catch (err: any) {
      alert(`Failed to pause subscription: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResume = async (hostId: string) => {
    setActionLoadingId(hostId);
    try {
      await resumeHostSubscription(hostId);
      fetchSubscriptions();
    } catch (err: any) {
      alert(`Failed to resume subscription: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrant = async () => {
    if (!grantModalHost) return;
    const hostId = grantModalHost.hostId || grantModalHost.id;
    setActionLoadingId(hostId);
    try {
      await grantHostSubscription(hostId, {
        plan: grantPlan,
        durationDays: Number(grantDays),
        reason: grantReason || "Granted by Admin Console",
      });
      setGrantModalHost(null);
      fetchSubscriptions();
    } catch (err: any) {
      alert(`Failed to grant subscription: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const isFreeMode = summary?.subscriptionMode === "free";
  const currentPlan = summary?.currentPlan;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Host Subscriptions Management</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Audit active host subscriptions, track listing quota caps, and override host plan statuses
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="self-start sm:self-auto px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition-colors shadow-2xs"
        >
          ⚙️ Configure Global Pricing & Limits
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Subscriptions</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-zinc-950">{summary?.activeSubscriptions ?? 0}</span>
            <span className="text-xs font-semibold text-zinc-400">/ {summary?.totalSubscriptions ?? 0} total</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5 border border-amber-200 bg-amber-50/20">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Platform Sub Mode</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isFreeMode
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-[#D9A441]/15 text-[#9E6D13] border border-[#D9A441]/30"
              }`}
            >
              {isFreeMode ? "Free Onboarding" : "Paid Subscriptions"}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-medium">
            {isFreeMode ? "Hosts can list free without upfront fees" : "Hosts must subscribe to list"}
          </p>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Standard Monthly Rate</p>
          <p className="text-2xl font-black text-zinc-950 mt-1">
            {formatCurrency(Number(currentPlan?.price || currentPlan?.amount || 0))}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {currentPlan?.billingPeriod || "MONTHLY"} billing
          </p>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Listing Limit Cap</p>
          <p className="text-2xl font-black text-zinc-950 mt-1">
            {currentPlan?.listingPropertyLimit || 10} Properties
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Default per subscribed host</p>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 overflow-x-auto w-full sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filter === tab.key
                  ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search host ID, name, email, plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
          />
        </div>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-zinc-400">Loading subscriptions...</div>
      ) : filteredSubscriptions.length === 0 ? (
        <GlassCard className="p-12 text-center border border-zinc-200 space-y-2">
          <CrownIcon className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No subscriptions found</p>
          <p className="text-xs text-zinc-500">
            {searchQuery
              ? `No host subscriptions match "${searchQuery}"`
              : "No host subscriptions recorded in this category"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredSubscriptions.map((s) => {
            const hostId = s.hostId;
            const subId = s.subscriptionId || s.id;
            const status = String(s.status || "active").toLowerCase();
            const isActive = status === "active";
            const isPaused = status === "paused";

            // Format dates
            let endDateStr = "N/A";
            if (s.endDate) {
              if (s.endDate._seconds) {
                endDateStr = new Date(s.endDate._seconds * 1000).toLocaleDateString();
              } else if (typeof s.endDate === "string") {
                endDateStr = new Date(s.endDate).toLocaleDateString();
              }
            }

            return (
              <GlassCard
                key={subId}
                className="p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                      Host: {hostId}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isPaused
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {status}
                    </span>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D9A441]/10 text-[#9E6D13] border border-[#D9A441]/20">
                      👑 {s.plan || "Host Pro"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-700 pt-1">
                    {s.hostName && <span className="font-bold text-zinc-950">{s.hostName}</span>}
                    {s.hostEmail && <span className="text-zinc-500 font-mono text-[11px]">{s.hostEmail}</span>}
                    <span className="text-zinc-500">
                      Expires: <strong className="text-zinc-800">{endDateStr}</strong>
                    </span>
                  </div>

                  {s.grantReason && (
                    <p className="text-[11px] text-zinc-400 italic">Admin Grant Note: &quot;{s.grantReason}&quot;</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setGrantModalHost(s);
                      setGrantPlan(s.plan || "host_pro");
                      setGrantDays(365);
                      setGrantReason("");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Grant / Extend
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => handlePause(hostId)}
                      disabled={actionLoadingId === hostId}
                      className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === hostId ? "Pausing..." : "Pause"}
                    </button>
                  ) : isPaused ? (
                    <button
                      type="button"
                      onClick={() => handleResume(hostId)}
                      disabled={actionLoadingId === hostId}
                      className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === hostId ? "Resuming..." : "Resume"}
                    </button>
                  ) : null}

                  <Link
                    href={`/admin/hosts?search=${encodeURIComponent(hostId)}`}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors"
                  >
                    Host Profile
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Grant / Extend Modal */}
      {grantModalHost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#D9A441]/10 text-[#D9A441] flex items-center justify-center">
              <CrownIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-950">Grant or Extend Host Subscription</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Manually grant a Pro tier subscription or extend access for host: <strong>{grantModalHost.hostId}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Subscription Tier</label>
                <select
                  value={grantPlan}
                  onChange={(e) => setGrantPlan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="host_pro">Host Pro (Full Features)</option>
                  <option value="host_starter">Host Starter</option>
                  <option value="host_enterprise">Host Enterprise / Agency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Admin Reason / Audit Note</label>
                <textarea
                  rows={2}
                  placeholder="E.g. VIP partner, Promotional extension, Compensation..."
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGrantModalHost(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrant}
                disabled={actionLoadingId !== null}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId !== null ? "Granting..." : "Confirm Grant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
