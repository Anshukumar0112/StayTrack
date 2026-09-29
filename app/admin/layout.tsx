"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoginPage) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 font-sans text-zinc-900 selection:bg-black selection:text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      <AdminHeader onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <AdminSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-zinc-200 bg-white py-3 text-center text-xs text-zinc-500 font-semibold shrink-0 z-30">
        StayTrack Admin Console • Restricted Platform Access • Internal Systems Only
      </footer>
    </div>
  );
}
