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
  unbanAdminHost,
  pauseHostSubscription,
  resumeHostSubscription,
  getHostSubscription,
  grantHostSubscription,
  getSubscriptionSettings,
  deleteAdminHost,
  deleteAdminHostApplication,
} from "@/lib/api";
import { HostApplication } from "@/types/host";
import { User } from "@/types/user";
import { useAdminGuard } from "@/hooks/useAdminGuard";

type TabType = "all" | "active" | "suspended" | "banned" | "rejected" | "pending";

interface UnifiedHostItem {
  id: string;
  userId: string;
  applicationId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  accountStatus: "active" | "suspended" | "banned" | "inactive";
  applicationStatus: "approved" | "pending" | "rejected" | "changes_required";
  subscriptionStatus: "FREE" | "ACTIVE" | "PAUSED" | "EXPIRED" | "NONE";
  hostType?: string;
  isApplicationRecord: boolean;
}

export default function AdminHostsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [filter, setFilter] = useState<TabType>("all");
  const [items, setItems] = useState<UnifiedHostItem[]>([]);
  const [subMode, setSubMode] = useState<"free" | "paid">("paid");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Confirmation Modal state for Account Actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "delete" | "suspend" | "ban" | "reactivate" | "unban" | "pause_sub" | "resume_sub";
    targetId: string;
    isApplication: boolean;
  } | null>(null);

  // Grant Subscription Modal state
  const [grantModal, setGrantModal] = useState<{
    isOpen: boolean;
    hostId: string;
    hostName: string;
    plan: string;
    durationDays: number;
    reason: string;
  } | null>(null);

  const fetchHostData = async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      const [settingsRes, appsRes, usersRes] = await Promise.all([
        getSubscriptionSettings().catch(() => ({ subscriptionMode: "paid" })),
        listAdminHostApplications({ page: 1, pageSize: 100 }).catch(() => ({ applications: [] })),
        listAdminUsers({ role: "host", page: 1, pageSize: 100 }).catch(() => ({ users: [] })),
      ]);

      const currentSubMode = settingsRes?.subscriptionMode === "free" ? "free" : "paid";
      setSubMode(currentSubMode);

      const appList: HostApplication[] = appsRes?.applications || appsRes?.content || appsRes?.data || (Array.isArray(appsRes) ? appsRes : []);
      const userList: User[] = usersRes?.users || usersRes?.content || usersRes?.data || (Array.isArray(usersRes) ? usersRes : []);

      // Fetch subscription status for host users if in paid mode
      const subStatusMap = new Map<string, "FREE" | "ACTIVE" | "PAUSED" | "EXPIRED" | "NONE">();
      if (currentSubMode === "paid" && userList.length > 0) {
        await Promise.all(
          userList.map(async (u) => {
            try {
              const res = await getHostSubscription(u.uid);
              const status = (res?.status || "NONE").toUpperCase();
              subStatusMap.set(u.uid, status as any);
            } catch {
              subStatusMap.set(u.uid, "NONE");
            }
          })
        );
      }

      const unified: UnifiedHostItem[] = [];
      const processedUserIds = new Set<string>();

      // 1. Process Host Users
      userList.forEach((u) => {
        processedUserIds.add(u.uid);
        const matchingApp = appList.find((a) => a.userId === u.uid || a.id === u.uid);
        const hostSubStatus = currentSubMode === "free" ? "FREE" : subStatusMap.get(u.uid) || "NONE";

        unified.push({
          id: u.uid,
          userId: u.uid,
          applicationId: matchingApp?.id || matchingApp?.applicationId,
          name: u.name || matchingApp?.applicantName || u.phone || "Host User",
          email: u.email || matchingApp?.email || "N/A",
          phone: u.phone || matchingApp?.phone || "N/A",
          role: u.role || "host",
          accountStatus: (u.status as any) || "active",
          applicationStatus: (matchingApp?.verificationStatus as any) || "approved",
          subscriptionStatus: hostSubStatus,
          hostType: matchingApp?.hostType,
          isApplicationRecord: false,
        });
      });

      // 2. Process Host Applications that do not have a host user record yet
      appList.forEach((app) => {
        const userId = app.userId || app.id || app.applicationId || "";
        if (userId && !processedUserIds.has(userId)) {
          unified.push({
            id: app.id || app.applicationId || userId,
            userId: userId,
            applicationId: app.id || app.applicationId,
            name: app.applicantName || app.fullName || app.email || "Applicant",
            email: app.email || "N/A",
            phone: app.phone || "N/A",
            role: "customer",
            accountStatus: "active",
            applicationStatus: (app.verificationStatus as any) || "pending",
            subscriptionStatus: currentSubMode === "free" ? "FREE" : "NONE",
            hostType: app.hostType,
            isApplicationRecord: true,
          });
        }
      });

      setItems(unified);
    } catch (err) {
      console.warn("Fetch host data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHostData();
    }
  }, [isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  // Exact Tab Order: All, Active, Suspended, Banned, Rejected, Pending
  const tabs: TabType[] = ["all", "active", "suspended", "banned", "rejected", "pending"];

  // Mutually Exclusive Filtering Semantics
  const filteredItems = items.filter((item) => {
    switch (filter) {
      case "all":
        return true;
      case "active":
        return item.accountStatus === "active" && (item.applicationStatus === "approved" || !item.isApplicationRecord);
      case "suspended":
        return item.accountStatus === "suspended";
      case "banned":
        return item.accountStatus === "banned";
      case "rejected":
        return item.applicationStatus === "rejected";
      case "pending":
        return item.applicationStatus === "pending";
      default:
        return true;
    }
  });

  const handleApprove = async (targetId: string) => {
    try {
      setActionLoadingId(targetId);
      await approveHostApplication(targetId, "Approved by Administrator");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to approve application: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (targetId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      setActionLoadingId(targetId);
      await rejectHostApplication(targetId, reason);
      fetchHostData();
    } catch (err: any) {
      alert("Failed to reject application: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerConfirmAction = async () => {
    if (!confirmModal) return;
    const { actionType, targetId, isApplication } = confirmModal;
    setActionLoadingId(targetId);
    setConfirmModal(null);

    try {
      if (actionType === "delete") {
        if (isApplication) {
          await deleteAdminHostApplication(targetId);
        } else {
          await deleteAdminHost(targetId);
        }
      } else if (actionType === "suspend") {
        const reason = prompt("Enter suspension reason:") || "Suspended by Administrator";
        await suspendAdminHost(targetId, reason);
      } else if (actionType === "ban") {
        const reason = prompt("Enter ban reason:") || "Banned by Administrator";
        await banAdminHost(targetId, reason);
      } else if (actionType === "reactivate") {
        await reactivateAdminHost(targetId);
      } else if (actionType === "unban") {
        await unbanAdminHost(targetId);
      } else if (actionType === "pause_sub") {
        await pauseHostSubscription(targetId);
      } else if (actionType === "resume_sub") {
        await resumeHostSubscription(targetId);
      }
      fetchHostData();
    } catch (err: any) {
      alert("Action failed: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrantSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModal) return;
    setActionLoadingId(grantModal.hostId);
    try {
      await grantHostSubscription(grantModal.hostId, {
        plan: grantModal.plan,
        durationDays: grantModal.durationDays,
        reason: grantModal.reason,
      });
      setGrantModal(null);
      fetchHostData();
    } catch (err: any) {
      alert("Failed to grant subscription: " + (err.message || "Unknown error"));
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
      alert("Failed to verify payment account: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
      {/* Header & Tabs */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Host Account Lifecycle & Verification</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage host applications, account statuses (Active/Suspended/Banned), and subscriptions
          </p>
        </div>

        {/* Tab Order: All | Active | Suspended | Banned | Rejected | Pending */}
        <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl flex-wrap">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                filter === t ? "bg-black text-white" : "text-zinc-600 hover:text-black"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="border border-zinc-200">
        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading hosts data...</div>
        ) : filteredItems.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {filteredItems.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Account Status Badge */}
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        item.accountStatus === "banned"
                          ? "bg-red-100 text-red-900"
                          : item.accountStatus === "suspended"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      ACCOUNT: {item.accountStatus}
                    </span>

                    {/* Host Application Status Badge */}
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        item.applicationStatus === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.applicationStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-900 animate-pulse"
                      }`}
                    >
                      APP: {item.applicationStatus.replace("_", " ")}
                    </span>

                    {/* Subscription Status Badge */}
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        item.subscriptionStatus === "FREE"
                          ? "bg-blue-100 text-blue-800"
                          : item.subscriptionStatus === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.subscriptionStatus === "PAUSED"
                          ? "bg-amber-100 text-amber-900"
                          : item.subscriptionStatus === "EXPIRED"
                          ? "bg-red-100 text-red-800"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      SUB: {item.subscriptionStatus}
                    </span>

                    {item.hostType && (
                      <span className="clay-badge px-2 py-0.5 text-[10px] font-bold uppercase">{item.hostType}</span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    {item.name}
                    {!item.isApplicationRecord && (
                      <span className="text-[10px] text-zinc-400 font-mono">({item.userId})</span>
                    )}
                  </h3>

                  <p className="text-xs text-zinc-500 mt-0.5">
                    📧 {item.email} • 📞 {item.phone}
                  </p>

                  <div className="flex gap-2 mt-2">
                    {!item.isApplicationRecord && (
                      <Link
                        href={`/admin/properties?search=${encodeURIComponent(item.userId)}`}
                        className="text-[11px] font-bold text-zinc-600 hover:text-black underline"
                      >
                        View Properties &rarr;
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Actions for Pending Application */}
                  {item.applicationStatus === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✓ Approve Host
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="rounded-xl border border-zinc-300 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}

                  {/* Subscription Actions for Host in Paid Mode */}
                  {!item.isApplicationRecord && subMode === "paid" && (
                    <>
                      {item.subscriptionStatus === "ACTIVE" ? (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              title: "Pause Host Subscription?",
                              description: `Pause paid subscription for ${item.name}? This modifies subscription state only and does NOT suspend the host account.`,
                              actionType: "pause_sub",
                              targetId: item.userId,
                              isApplication: false,
                            })
                          }
                          disabled={actionLoadingId === item.userId}
                          className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ⏸ Pause Sub
                        </button>
                      ) : item.subscriptionStatus === "PAUSED" ? (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              title: "Resume Host Subscription?",
                              description: `Resume paid subscription for ${item.name}? This modifies subscription state only.`,
                              actionType: "resume_sub",
                              targetId: item.userId,
                              isApplication: false,
                            })
                          }
                          disabled={actionLoadingId === item.userId}
                          className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ▶ Resume Sub
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setGrantModal({
                              isOpen: true,
                              hostId: item.userId,
                              hostName: item.name,
                              plan: "Host Pro",
                              durationDays: 365,
                              reason: "Testing / complimentary access",
                            })
                          }
                          disabled={actionLoadingId === item.userId}
                          className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ⭐ Grant Subscription
                        </button>
                      )}
                    </>
                  )}

                  {/* Actions for Active Host */}
                  {!item.isApplicationRecord && item.accountStatus === "active" && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: "Suspend Host Account?",
                            description: `Are you sure you want to suspend host ${item.name}? They will be temporarily unable to list properties.`,
                            actionType: "suspend",
                            targetId: item.userId,
                            isApplication: false,
                          })
                        }
                        disabled={actionLoadingId === item.userId}
                        className="rounded-xl border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✋ Suspend
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: "Ban Host Account?",
                            description: `Are you sure you want to ban host ${item.name}? This will disable access for this host account.`,
                            actionType: "ban",
                            targetId: item.userId,
                            isApplication: false,
                          })
                        }
                        disabled={actionLoadingId === item.userId}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        🚫 Ban
                      </button>
                    </>
                  )}

                  {/* Actions for Suspended Host */}
                  {!item.isApplicationRecord && item.accountStatus === "suspended" && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: "Reactivate Host Account?",
                            description: `Reactivate host account for ${item.name}?`,
                            actionType: "reactivate",
                            targetId: item.userId,
                            isApplication: false,
                          })
                        }
                        disabled={actionLoadingId === item.userId}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✓ Reactivate
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: "Ban Host Account?",
                            description: `Ban host ${item.name}?`,
                            actionType: "ban",
                            targetId: item.userId,
                            isApplication: false,
                          })
                        }
                        disabled={actionLoadingId === item.userId}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        🚫 Ban
                      </button>
                    </>
                  )}

                  {/* Actions for Banned Host */}
                  {!item.isApplicationRecord && item.accountStatus === "banned" && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: "Unban Host Account?",
                          description: `Unban host account for ${item.name}?`,
                          actionType: "unban",
                          targetId: item.userId,
                          isApplication: false,
                        })
                      }
                      disabled={actionLoadingId === item.userId}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      🔓 Unban Host
                    </button>
                  )}

                  {/* Razorpay Route Payment Account Verification */}
                  {!item.isApplicationRecord && (
                    <button
                      onClick={() => handleVerifyRoutePaymentAccount(item.userId)}
                      disabled={actionLoadingId === item.userId}
                      className="rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      title="Verify Razorpay Route Account"
                    >
                      🏦 Verify Payment Acc
                    </button>
                  )}

                  {/* Deletion Button */}
                  <button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        title: item.isApplicationRecord ? "Delete Host Application?" : "Delete Host Account?",
                        description: `Are you sure you want to delete ${item.name}? This will permanently remove the record.`,
                        actionType: "delete",
                        targetId: item.id,
                        isApplication: item.isApplicationRecord,
                      })
                    }
                    disabled={actionLoadingId === item.id}
                    className="rounded-xl border border-red-300 hover:bg-red-100 text-red-800 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-semibold text-zinc-400">
            No hosts found matching filter "{filter}".
          </div>
        )}
      </GlassCard>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-zinc-950">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-600 font-semibold leading-relaxed">{confirmModal.description}</p>
            {confirmModal.actionType === "delete" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-800">
                ⚠️ WARNING: This action is irreversible.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={triggerConfirmAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
                  confirmModal.actionType === "delete" || confirmModal.actionType === "ban"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-black hover:bg-zinc-800"
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Subscription Modal */}
      {grantModal && grantModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleGrantSubscriptionSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-black text-zinc-950">
              ⭐ Grant Subscription: {grantModal.hostName}
            </h3>
            <p className="text-xs text-zinc-500">
              Grant a complimentary or manual active subscription to this host.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Subscription Plan
                </label>
                <input
                  type="text"
                  value={grantModal.plan}
                  onChange={(e) => setGrantModal({ ...grantModal, plan: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  value={grantModal.durationDays}
                  onChange={(e) => setGrantModal({ ...grantModal, durationDays: parseInt(e.target.value) || 365 })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Administrative Reason
                </label>
                <input
                  type="text"
                  value={grantModal.reason}
                  onChange={(e) => setGrantModal({ ...grantModal, reason: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  placeholder="e.g. Testing / complimentary access"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGrantModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 transition cursor-pointer"
              >
                Grant Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
