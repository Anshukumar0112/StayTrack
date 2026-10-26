"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/ui/BackButton";
import { getMyPayments, getHostBookings } from "@/lib/api";
import { Booking } from "@/types/booking";
import { CreditCardIcon, CheckCircleIcon, ShieldCheckIcon } from "@/components/ui/Icons";

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
  const totalSettledBookings = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "confirmed").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <BackButton
            fallbackUrl="/host"
            label="Back to Dashboard"
            className="text-xs font-semibold mb-2"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Earnings & Payouts</h1>
          <p className="text-xs text-muted font-medium mt-1">
            Track direct guest payments, settlements, and Razorpay transaction records
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading settlement records...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Settled Earnings</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">₹{totalEarnings.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                <span>100% Direct Payouts</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Completed Stays</span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">{totalSettledBookings}</div>
              <div className="flex items-center gap-1 text-[11px] text-muted font-medium mt-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Confirmed Bookings</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Payout Schedule</span>
              <div className="text-2xl sm:text-3xl font-black text-primary mt-2">Direct</div>
              <div className="flex items-center gap-1 text-[11px] text-muted font-medium mt-1.5">
                <CreditCardIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Automated 24h post check-in</span>
              </div>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 pb-3 border-b border-border">
              Payment & Settlement Ledger ({payments.length})
            </h3>

            {payments.length > 0 ? (
              <div className="divide-y divide-border">
                {payments.map((p, idx) => (
                  <div key={p.id || idx} className="py-3.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-foreground block">{p.description || `Payment #${p.id || idx}`}</span>
                      <span className="text-[11px] text-muted">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : "Confirmed"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-foreground text-sm block">₹{p.amount || 0}</span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">{p.status || "SUCCESS"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-semibold text-muted">
                No payment settlement records found yet. Bookings will generate payouts here once confirmed.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
