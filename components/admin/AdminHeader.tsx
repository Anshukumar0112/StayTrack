"use client";

import Link from "next/link";
import { signOutUser } from "@/lib/auth";

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

function MenuIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function LogOutIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function AdminHeader({ onToggleMobileSidebar }: AdminHeaderProps) {
  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network errors
    }
    await signOutUser();
    window.location.href = "/admin/login";
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 text-white border-b border-zinc-800 shadow-md overflow-x-hidden select-none">
      <div className="mx-auto max-w-full px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Mobile Menu Trigger + Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Toggle Navigation Sidebar"
              >
                <MenuIcon />
              </button>
            )}

            <Link href="/admin" className="flex items-center gap-2 font-black text-lg text-white hover:opacity-90 transition">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-black text-sm font-black shadow-xs">
                👑
              </span>
              <span>
                StayTrack <span className="text-emerald-400 font-semibold text-xs tracking-wider uppercase ml-1">ADMIN CONSOLE</span>
              </span>
            </Link>
          </div>

          {/* Right: Actions (Session badge, Public site, Sign Out) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[11px] font-bold text-emerald-400">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
              Admin Session Active
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>

            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
