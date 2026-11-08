"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  listAdminBookings,
  listAdminUsers,
  verifyHostPaymentAccount,
} from "@/lib/api";
import {
  CreditCardIcon,
  LockIcon,
  SearchIcon,
  CheckIcon,
  AlertTriangleIcon,
  BankIcon,
  Building2Icon,
} from "@/components/ui/Icons";
import { formatCurrency } from "@/lib/utils";

type LedgerTab = "bookings" | "route_accounts";

export default function AdminPaymentsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<LedgerTab>("bookings");
  const [bookings, setBookings] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verifyingHostId, setVerifyingHostId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [bookingsRes, hostsRes] = await Promise.all([
        listAdminBookings({ pageSize: 100 }).catch(() => ({ bookings: [] })),
        listAdminUsers({ role: "host", pageSize: 100 }).catch(() => ({ users: [] })),
      ]);

      const bList = bookingsRes?.bookings || bookingsRes?.content || bookingsRes?.data || [];
      const hList = hostsRes?.users || hostsRes?.content || hostsRes?.data || [];

      setBookings(Array.isArray(bList) ? bList : []);
      setHosts(Array.isArray(hList) ? hList : []);
    } catch (err) {
      console.error("Failed to load payment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Compute metrics
  const metrics = useMemo(() => {
    let totalGmv = 0;
    let completedPaymentsCount = 0;
    let pendingPaymentsCount = 0;

    bookings.forEach((b) => {
      const amt = Number(b.totalAmount || b.amount || b.totalPrice || 0);
      const payStatus = String(b.paymentStatus || "").toLowerCase();
      if (payStatus === "captured") {
        totalGmv += amt;
        completedPaymentsCount++;
      } else if (payStatus === "pending") {
        pendingPaymentsCount++;
      }
    });

    // 0% platform fee policy by StayTrack (Zero Brokerage)
    const commission = 0;
    const hostTransfers = totalGmv;

    return {
      totalGmv,
      commission,
      hostTransfers,
      completedPaymentsCount,
      pendingPaymentsCount,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((b) => {
      const id = String(b.bookingId || b.id || "").toLowerCase();
      const guest = String(b.customerName || b.customerId || "").toLowerCase();
      const host = String(b.hostId || "").toLowerCase();
      const payStatus = String(b.paymentStatus || "").toLowerCase();
      const propTitle = String(b.propertyTitle || "").toLowerCase();
      return id.includes(q) || guest.includes(q) || host.includes(q) || payStatus.includes(q) || propTitle.includes(q);
    });
  }, [bookings, searchQuery]);

  const filteredHosts = useMemo(() => {
    if (!searchQuery.trim()) return hosts;
    const q = searchQuery.toLowerCase().trim();
    return hosts.filter((h) => {
      const id = String(h.userId || h.id || "").toLowerCase();
      const name = String(h.name || "").toLowerCase();
      const email = String(h.email || "").toLowerCase();
      const acc = String(h.paymentAccount?.linkedAccountId || "").toLowerCase();
      return id.includes(q) || name.includes(q) || email.includes(q) || acc.includes(q);
    });
  }, [hosts, searchQuery]);

  const handleVerifyAccount = async (hostId: string) => {
    setVerifyingHostId(hostId);
    try {
      await verifyHostPaymentAccount(hostId);
      alert("Host Razorpay Route account verified successfully!");
      fetchData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifyingHostId(null);
    }
  };

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Payment Audit & Transfers</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Review transaction ledgers, monitor Razorpay Route settlements, and audit host linked bank account authorizations
        </p>
      </div>

      {/* Security Callout */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs rounded-2xl flex items-center gap-2.5">
        <LockIcon className="w-4 h-4 text-emerald-700 shrink-0" />
        <div>
          <span className="font-extrabold text-emerald-900">Zero Credential Exposure Enforced: </span>
          <span>All payment keys and webhook secrets reside strictly inside the Spring Boot backend server. Client transactions use Razorpay Standard Checkout tokens.</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Gross Transaction Volume</p>
          <p className="text-2xl font-black text-zinc-950 mt-1">{formatCurrency(metrics.totalGmv)}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{metrics.completedPaymentsCount} captured payments</p>
        </GlassCard>

        <GlassCard className="p-5 border border-emerald-200 bg-emerald-50/20">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Zero Brokerage Guarantee</p>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(0)}</p>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">100% of room charges go to hosts</p>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disbursed to Hosts</p>
          <p className="text-2xl font-black text-zinc-950 mt-1">{formatCurrency(metrics.hostTransfers)}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Via Razorpay Route transfers</p>
        </GlassCard>

        <GlassCard className="p-5 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Settlements</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{metrics.pendingPaymentsCount}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Awaiting checkout completion</p>
        </GlassCard>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "bookings"
                ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Booking Payments Ledger ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("route_accounts")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "route_accounts"
                ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Host Route Accounts ({hosts.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === "bookings" ? "Search payments..." : "Search host accounts..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-zinc-400">Loading audit records...</div>
      ) : activeTab === "bookings" ? (
        filteredBookings.length === 0 ? (
          <GlassCard className="p-12 text-center border border-zinc-200 space-y-2">
            <CreditCardIcon className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-bold text-zinc-800">No payment records found</p>
            <p className="text-xs text-zinc-500">No transactions recorded matching the search criteria</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const bookingId = b.bookingId || b.id;
              const payStatus = String(b.paymentStatus || "pending").toLowerCase();
              const isCaptured = payStatus === "captured";
              const amount = Number(b.totalAmount || b.amount || b.totalPrice || 0);

              return (
                <GlassCard
                  key={bookingId}
                  className="p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                        #{bookingId}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isCaptured
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : payStatus === "refunded"
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-300"
                        }`}
                      >
                        {payStatus}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">{b.propertyTitle || "Stay Reservation"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 pt-1">
                      <span>
                        Payer: <strong className="text-zinc-800">{b.customerName || b.customerId || "Guest"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Host Beneficiary: <strong className="text-zinc-800">{b.hostId}</strong>
                      </span>
                      {b.razorpayPaymentId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-zinc-500">
                            RP: {b.razorpayPaymentId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Captured Value</p>
                    <p className="text-base font-black text-zinc-950">{formatCurrency(amount)}</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      ) : (
        /* Host Route Accounts Tab */
        filteredHosts.length === 0 ? (
          <GlassCard className="p-12 text-center border border-zinc-200 space-y-2">
            <BankIcon className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-bold text-zinc-800">No host accounts found</p>
            <p className="text-xs text-zinc-500">No registered hosts match your search</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredHosts.map((h) => {
              const hostId = h.userId || h.id;
              const paymentAcc = h.paymentAccount;
              const hasAccount = Boolean(paymentAcc && paymentAcc.linkedAccountId);
              const isVerified = paymentAcc?.verified === true || paymentAcc?.status === "active";

              return (
                <GlassCard
                  key={hostId}
                  className="p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-zinc-950">{h.name || "Host Partner"}</span>
                      <span className="font-mono text-[11px] text-zinc-500">({h.email || hostId})</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isVerified
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : hasAccount
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        {isVerified ? "Route Verified" : hasAccount ? "Pending Verification" : "Not Linked"}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-600 pt-0.5">
                      {hasAccount ? (
                        <p className="font-mono text-[11px] text-zinc-700">
                          Account: <strong>{paymentAcc.linkedAccountId}</strong>
                          {paymentAcc.productId && ` • Product: ${paymentAcc.productId}`}
                        </p>
                      ) : (
                        <p className="text-zinc-400 italic text-[11px]">Host has not linked a Razorpay Route bank account yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasAccount && !isVerified && (
                      <button
                        type="button"
                        onClick={() => handleVerifyAccount(hostId)}
                        disabled={verifyingHostId === hostId}
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {verifyingHostId === hostId ? "Verifying..." : "Verify with Razorpay"}
                      </button>
                    )}
                    <Link
                      href={`/admin/hosts?search=${encodeURIComponent(hostId)}`}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
