"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import {
  Building2Icon,
  CalendarDaysIcon,
  ClockIcon,
  WalletIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { formatCurrency } from "@/lib/utils";
import type { Property } from "@/types/property";
import type { Booking } from "@/types/booking";
import { getBookingStatus, getBookingAmount } from "@/types/booking";

interface HostMetricsProps {
  properties: Property[];
  bookings: Booking[];
  loading: boolean;
}

export default function HostMetrics({ properties, bookings, loading }: HostMetricsProps) {
  const activeCount = properties.filter((p) => p.verificationStatus === "approved").length;
  const pendingCount = properties.filter(
    (p) => p.verificationStatus === "pending" || !p.verificationStatus
  ).length;

  const actionableCount = bookings.filter((b) => {
    const st = getBookingStatus(b);
    return st === "requested" || st === "accepted" || st === "payment_pending";
  }).length;

  const confirmedEarnings = bookings
    .filter((b) => getBookingStatus(b) === "confirmed")
    .reduce((sum, b) => sum + getBookingAmount(b), 0);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 min-w-[220px] p-5 rounded-3xl border border-border bg-white shadow-2xs animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "TOTAL LISTINGS",
      value: properties.length.toString(),
      subLabel: `${activeCount} Approved • ${pendingCount} Pending`,
      badgeVariant: "verified" as const,
      icon: Building2Icon,
      iconBg: "bg-primary-light text-primary",
      href: "/host/properties",
    },
    {
      label: "BOOKING REQUESTS",
      value: bookings.length.toString(),
      subLabel: `${actionableCount} Actionable direct requests`,
      badgeVariant: actionableCount > 0 ? ("warning" as const) : ("neutral" as const),
      icon: CalendarDaysIcon,
      iconBg: "bg-amber-50 text-amber-600 border border-amber-200/50",
      href: "/host/bookings",
    },
    {
      label: "PENDING REVIEW",
      value: pendingCount.toString(),
      subLabel: pendingCount > 0 ? "Under verification review" : "All properties approved",
      badgeVariant: pendingCount > 0 ? ("info" as const) : ("neutral" as const),
      icon: ClockIcon,
      iconBg: "bg-blue-50 text-blue-600 border border-blue-200/50",
      href: "/host/properties",
    },
    {
      label: "CONFIRMED EARNINGS",
      value: formatCurrency(confirmedEarnings),
      subLabel: confirmedEarnings > 0 ? "Direct verified guest payouts" : "From confirmed stays",
      badgeVariant: confirmedEarnings > 0 ? ("sage" as const) : ("neutral" as const),
      icon: WalletIcon,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/50",
      href: "/host/earnings",
    },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <Link
            key={c.label}
            href={c.href}
            className="group flex-1 min-w-[220px] p-5 rounded-3xl border border-border bg-white shadow-2xs hover:shadow-subtle hover:border-primary/30 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {c.label}
              </span>
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${c.iconBg}`}
              >
                <IconComponent className="w-4 h-4 stroke-[2]" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {c.value}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border/50">
              <span className="text-[11px] font-medium truncate">{c.subLabel}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
