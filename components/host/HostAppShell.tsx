"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import HostSidebar from "@/components/host/HostSidebar";
import HostDashboardHeader from "@/components/host/HostDashboardHeader";

export default function HostAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // If user is accessing the host verification application, let it render with its own standalone layout
  const isApplicationRoute = pathname === "/host/application" || pathname === "/host/apply";

  if (isApplicationRoute) {
    return <>{children}</>;
  }

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-row bg-[#F4F6F8] w-full max-w-full overflow-x-hidden">
      {/* 1. PERSISTENT FULL-HEIGHT LEFT SIDEBAR (280px wide expanded, zero-rail completely hidden when collapsed) */}
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

        {/* Dynamic Route Content (Scrolls independently within viewport on desktop) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 pb-12 md:overflow-y-auto w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
