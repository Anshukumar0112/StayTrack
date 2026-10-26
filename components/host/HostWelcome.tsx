"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { PlusIcon, ShieldCheckIcon, AlertTriangleIcon } from "@/components/ui/Icons";

export interface HostWelcomeProps {
  eligible: boolean;
  ineligibilityReason?: string;
}

export default function HostWelcome({ eligible, ineligibilityReason }: HostWelcomeProps) {
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const hostName =
    userProfile?.name ||
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split("@")[0] : "Host");

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-3xl p-4 sm:p-6 border border-border shadow-2xs">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary-light px-2.5 py-0.5 rounded-md">
            Welcome Back
          </span>
          <span className="text-[11px] sm:text-xs text-muted">
            • {todayStr}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Welcome back, {hostName}
        </h1>

        <p className="text-xs sm:text-sm text-muted">
          Here's what's happening with your properties today.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap pt-2 sm:pt-0">
        <Link
          href="/host/subscription"
          className="rounded-xl border border-border bg-[#F4F6F8] hover:bg-surface-muted text-foreground font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors flex items-center gap-1.5 focus-ring"
        >
          <ShieldCheckIcon className="w-3.5 h-3.5 text-muted shrink-0" />
          <span>Subscription Plan</span>
        </Link>

        {eligible ? (
          <Link
            href="/host/properties/new"
            className="rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors flex items-center gap-1.5 focus-ring"
          >
            <PlusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>List a Property</span>
          </Link>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-warning-light text-warning border border-warning/30 px-3.5 py-2 rounded-xl">
            <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Limit reached: {ineligibilityReason || "Upgrade Plan"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
