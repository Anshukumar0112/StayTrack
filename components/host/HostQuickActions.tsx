"use client";

import Link from "next/link";
import {
  Building2Icon,
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  WalletIcon,
  ShieldCheckIcon,
  MessageCircleIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";

const actionItems = [
  {
    title: "List New Property",
    subtitle: "BNB, PG, Hostel, Hotel, Flat",
    badge: "Instant",
    href: "/host/properties/new",
    icon: PlusIcon,
    iconBg: "bg-primary-light text-primary",
  },
  {
    title: "My Listed Properties",
    subtitle: "Manage inventory & photos",
    badge: "5 Active",
    href: "/host/properties",
    icon: Building2Icon,
    iconBg: "bg-blue-50 text-blue-600",
  },
  {
    title: "Booking Requests",
    subtitle: "Incoming guest reservations",
    badge: "Review",
    href: "/host/bookings",
    icon: CalendarDaysIcon,
    iconBg: "bg-amber-50 text-amber-600",
  },
  {
    title: "StayTrack Calendar",
    subtitle: "Occupancy and check-ins",
    badge: "Real-time",
    href: "/host/calendar",
    icon: ClockIcon,
    iconBg: "bg-purple-50 text-purple-600",
  },
  {
    title: "Direct Guest Messages",
    subtitle: "Chat before check-in",
    badge: "Active",
    href: "/host/messages",
    icon: MessageCircleIcon,
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Earnings & Payouts",
    subtitle: "Direct bank settlements",
    badge: "0% Deduct",
    href: "/host/earnings",
    icon: WalletIcon,
    iconBg: "bg-teal-50 text-teal-600",
  },
  {
    title: "Subscription Tier",
    subtitle: "Listing limit & assurance",
    badge: "Manage",
    href: "/host/subscription",
    icon: ShieldCheckIcon,
    iconBg: "bg-rose-50 text-rose-600",
  },
];

export default function HostQuickActions() {
  return (
    <div className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/70">
        <div>
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
            Host Management Features
          </h2>
          <p className="text-[11px] text-muted">Quick operational shortcuts</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-light text-primary px-2 py-0.5 rounded-full">
          {actionItems.length} Features
        </span>
      </div>

      <div className="space-y-1.5">
        {actionItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] hover:bg-surface-muted/80 border border-border/60 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconBg}`}
                >
                  <IconComponent className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted truncate">{item.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[10px] font-semibold text-muted bg-white border border-border/80 px-2 py-0.5 rounded-md hidden xs:inline-block">
                  {item.badge}
                </span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
