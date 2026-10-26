"use client";

import type { Booking } from "@/types/booking";
import { getBookingStatus, getBookingAmount } from "@/types/booking";
import { formatCurrency } from "@/lib/utils";
import { WalletIcon } from "@/components/ui/Icons";

interface HostEarningsChartProps {
  bookings: Booking[];
  loading: boolean;
}

function buildMonthlyData(bookings: Booking[]) {
  const now = new Date();
  const months: { label: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      amount: 0,
    });
  }

  bookings
    .filter((b) => getBookingStatus(b) === "confirmed")
    .forEach((b) => {
      const dateStr = b.startDate || (b as any).createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const diffMonths =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        months[5 - diffMonths].amount += getBookingAmount(b);
      }
    });

  return months;
}

export default function HostEarningsChart({ bookings, loading }: HostEarningsChartProps) {
  const data = buildMonthlyData(bookings);
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const totalConfirmed = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
              Earnings Overview
            </h2>
          </div>
          <p className="text-[11px] text-muted mt-0.5">Confirmed reservation revenues</p>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-light text-primary px-2 py-0.5 rounded-full">
          Last 6 Mos
        </span>
      </div>

      {/* Confirmed Amount Spotlight */}
      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
            Total Confirmed
          </span>
          <span className="text-2xl font-black text-foreground">
            {formatCurrency(totalConfirmed)}
          </span>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <WalletIcon className="w-4 h-4 stroke-[2]" />
        </div>
      </div>

      {/* CSS Flexbox Bar Chart */}
      {loading ? (
        <div className="h-32 flex items-end gap-2 px-1">
          {[30, 60, 25, 75, 45, 65].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-surface-muted animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-end gap-2.5 h-36 px-1 pt-4" aria-label="Monthly earnings chart">
          {data.map((month, i) => {
            const heightPct = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
            const isEmpty = month.amount === 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isEmpty
                      ? "bg-border/60"
                      : "bg-primary hover:bg-primary-hover shadow-2xs"
                  }`}
                  style={{ height: isEmpty ? "4px" : `${Math.max(heightPct, 8)}%` }}
                  title={`${month.label}: ${formatCurrency(month.amount)}`}
                />
                <span className="text-[10px] text-muted font-bold">{month.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {totalConfirmed === 0 && !loading && (
        <p className="text-[11px] text-muted text-center pt-1 border-t border-border/50">
          Revenue is added here immediately when guest bookings are confirmed.
        </p>
      )}
    </div>
  );
}
