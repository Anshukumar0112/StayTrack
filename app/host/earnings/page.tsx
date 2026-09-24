"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import { getMyPayments, getHostBookings } from "@/lib/api";
import { Booking } from "@/types/booking";

export default function HostEarningsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([getMyPayments(), getHostBookings()])
      .then(([payRes, bookRes]) => {
        if (payRes.status === "fulfilled" && Array.isArray(payRes.value)) {
          setPayments(payRes.value);
        }
        if (bookRes.status === "fulfilled" && Array.isArray(bookRes.value)) {
          setBookings(bookRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalEarnings = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalSettledBookings = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">Earnings & Settlements</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Backend-derived settlement information and direct guest payments via Razorpay
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading settlement data...</div>
        ) : (
          <div className="space-y-8">
            {/* Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ClayCard className="p-6 border border-zinc-200">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Total Settled Earnings</span>
                <div className="text-3xl font-black text-zinc-950 mt-2">₹{totalEarnings.toLocaleString()}</div>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">100% Direct Payouts</span>
              </ClayCard>

              <ClayCard className="p-6 border border-zinc-200">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Completed Stays</span>
                <div className="text-3xl font-black text-zinc-950 mt-2">{totalSettledBookings}</div>
                <span className="text-[10px] text-zinc-500 font-medium mt-1 block">Confirmed Bookings</span>
              </ClayCard>

              <ClayCard className="p-6 border border-zinc-200">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Host Payout Terms</span>
                <div className="text-3xl font-black text-emerald-600 mt-2">Direct</div>
                <span className="text-[10px] text-emerald-700 font-extrabold mt-1 block">Verified Payouts</span>
              </ClayCard>
            </div>

            {/* Settlements Table */}
            <GlassCard className="border border-zinc-200 p-6 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-3 border-b border-zinc-200">
                Backend Payment Ledger ({payments.length})
              </h3>

              {payments.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {payments.map((p, idx) => (
                    <div key={p.id || idx} className="py-3.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-950 block">{p.description || `Payment #${p.id || idx}`}</span>
                        <span className="text-[11px] text-zinc-500">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "Confirmed"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-black text-sm block">₹{p.amount || 0}</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">{p.status || "SUCCESS"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-semibold text-zinc-400">
                  No payment settlement records found yet.
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
