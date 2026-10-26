"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import HostSidebar from "@/components/host/HostSidebar";
import HostDashboardHeader from "@/components/host/HostDashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  HomeIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

export default function HostAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { user: userProfile, loading: userLoading, error: userError, refetch: refetchUser } = useUser();

  // If user is accessing the host verification application, let it render with its own standalone layout
  const isApplicationRoute = pathname === "/host/application" || pathname === "/host/apply";

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!isApplicationRoute && !authLoading && !firebaseUser) {
      router.replace(`/auth?mode=login&returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isApplicationRoute, authLoading, firebaseUser, pathname, router]);

  if (isApplicationRoute) {
    return <>{children}</>;
  }

  const isRoleVerifying = authLoading || (userLoading && !userProfile);

  // 1. Loading Skeleton State
  if (isRoleVerifying) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F6F8]">
        <div className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
          <div className="w-32 h-6 bg-surface-muted animate-pulse rounded-md" />
          <div className="w-24 h-8 bg-surface-muted animate-pulse rounded-xl" />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-border text-center space-y-4 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl mx-auto" />
            <div className="h-5 w-48 bg-surface-muted rounded mx-auto" />
            <div className="h-3 w-64 bg-surface-muted rounded mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated (while redirecting)
  if (!firebaseUser) {
    return null;
  }

  // 3. Network or Server Verification Error
  if (userError && !userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F6F8]">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-border text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-foreground">Account Verification Unavailable</h1>
            <p className="text-xs text-muted leading-relaxed">
              We could not verify your host permissions with the server. Please check your network connection and try again.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-surface-muted text-foreground transition-colors"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={() => refetchUser()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-2xs transition-colors"
            >
              Retry Sync
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Non-Host Account (Customer / Guest attempting direct navigation to /host)
  const isHostOrAdmin = userProfile?.role === "host" || userProfile?.role === "admin";
  if (!isHostOrAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F6F8]">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-border text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <ShieldCheckIcon className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted bg-[#F4F6F8] px-2.5 py-1 rounded-md">
              Host Verification Required
            </span>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Host Portal Access
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Your account ({userProfile?.email || firebaseUser.email || "Guest"}) is currently registered as a guest. To list accommodations and access the host management suite, please complete your host verification application.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl border border-border bg-white hover:bg-surface-muted text-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              <HomeIcon className="w-3.5 h-3.5 text-muted" />
              <span>Explore Stays</span>
            </Link>
            <Link
              href="/host/application"
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl bg-foreground hover:bg-foreground/90 text-background shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Apply to Host</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authorized Host/Admin -> Render Complete Persistent Shell
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-row bg-[#F4F6F8] w-full max-w-full overflow-x-hidden">
      {/* 1. PERSISTENT FULL-HEIGHT LEFT SIDEBAR */}
      <HostSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* 2. MAIN COLUMN (HEADER + DYNAMIC PAGE CONTENT) */}
      <div className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden w-full max-w-full overflow-x-hidden">
        {/* Top Header */}
        <HostDashboardHeader
          onToggleSidebar={handleToggleSidebar}
          collapsed={collapsed}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 pb-12 md:overflow-y-auto w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
