"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import { listAdminHostApplications, approveHostApplication, rejectHostApplication, verifyHostPaymentAccount } from "@/lib/api";
import { HostApplication } from "@/lib/types";

export default function AdminHostsPage() {
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchApps = () => {
    setLoading(true);
    listAdminHostApplications({
      verificationStatus: filter !== "all" ? filter : undefined,
      page: 1,
      pageSize: 30,
    })
      .then((res) => {
        if (res && Array.isArray(res.content)) {
          setApplications(res.content);
        } else if (Array.isArray(res)) {
          setApplications(res);
        } else {
          setApplications([]);
        }
      })
      .catch((err) => console.warn("Fetch admin host apps error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApps();
  }, [filter]);

  const handleApprove = async (appId: string) => {
    try {
      setActionLoadingId(appId);
      await approveHostApplication(appId, "Approved by Admin");
      alert("Host application approved successfully!");
      fetchApps();
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
      fetchApps();
    } catch (err: any) {
      alert("Failed to reject application: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyRoutePaymentAccount = async (hostId: string) => {
    try {
      setActionLoadingId(hostId);
      await verifyHostPaymentAccount(hostId);
      alert("Razorpay Route Payment Account verified successfully! Host can now receive payouts.");
      fetchApps();
    } catch (err: any) {
      alert("Failed to verify payment account: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Host Verification & Payout Accounts</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Review onboarding applications and verify Razorpay Route linked payout accounts</p>
          </div>

          <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
            {["pending", "approved", "rejected", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                  filter === status ? "bg-black text-white" : "text-zinc-600 hover:text-black"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="border border-zinc-200">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading host applications...</div>
          ) : applications.length > 0 ? (
            <div className="divide-y divide-zinc-200">
              {applications.map((app) => (
                <div key={app.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        app.verificationStatus === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.verificationStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900 animate-pulse"
                      }`}>
                        {app.verificationStatus || "Pending"}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">User ID: {app.userId}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-950">{app.fullName || app.email}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      📧 {app.email} • 📞 {app.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {app.verificationStatus === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={actionLoadingId === app.id}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          ✓ Approve Host
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={actionLoadingId === app.id}
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
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400">
              No host applications found with status "{filter}".
            </div>
          )}
        </GlassCard>
      </main>

      <Footer />
    </div>
  );
}

