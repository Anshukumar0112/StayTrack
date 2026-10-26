"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  Building2Icon,
  CalendarDaysIcon,
  ClockIcon,
  MessageCircleIcon,
  WalletIcon,
  ShieldCheckIcon,
  StarIcon,
  SettingsIcon,
  PlusIcon,
  CloseIcon,
  MenuIcon,
} from "@/components/ui/Icons";

export interface HostSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/host", icon: HomeIcon, exact: true },
  { label: "My Properties", href: "/host/properties", icon: Building2Icon, exact: false },
  { label: "Booking Requests", href: "/host/bookings", icon: CalendarDaysIcon, exact: false },
  { label: "Calendar", href: "/host/calendar", icon: ClockIcon, exact: false },
  { label: "Messages", href: "/host/messages", icon: MessageCircleIcon, exact: false },
  { label: "Earnings & Payouts", href: "/host/earnings", icon: WalletIcon, exact: false },
  { label: "Subscription Plan", href: "/host/subscription", icon: ShieldCheckIcon, exact: false },
  { label: "Reviews", href: "/host/reviews", icon: StarIcon, exact: false },
  { label: "Settings", href: "/host/settings", icon: SettingsIcon, exact: false },
];

export default function HostSidebar({
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  onToggleSidebar,
}: HostSidebarProps) {
  const pathname = usePathname();

  // Trap body scroll and add Escape key listener when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseMobile();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen, onCloseMobile]);

  // Determine active item including nested routes like /host/properties/new and /host/bookings/[id]
  const isItemActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    if (href === "/host") return pathname === "/host";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full select-none overflow-hidden">
      {/* 1. TOP HEADER / BRANDING + HAMBURGER TOGGLE */}
      <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-border/80 flex-shrink-0">
        <Link
          href="/host"
          onClick={isMobile ? onCloseMobile : undefined}
          className="flex items-center gap-2 group cursor-pointer focus-ring rounded-lg p-0.5"
          aria-label="StayTrack Host Dashboard"
        >
          <Image
            src="/logo.png"
            alt="StayTrack"
            width={124}
            height={32}
            priority
            className="h-7 w-auto object-contain"
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-light px-1.5 py-0.5 rounded">
            Host
          </span>
        </Link>

        {/* Desktop Hamburger Toggle Button at Sidebar Upper-Right Corner */}
        {!isMobile && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            aria-expanded={!collapsed}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#334155] flex items-center justify-center transition-all cursor-pointer focus-ring shrink-0"
          >
            <MenuIcon className="w-5 h-5 text-[#334155] stroke-[2.2]" />
          </button>
        )}

        {/* Mobile Drawer Close Button */}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            title="Close navigation drawer"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION LIST (Scrolls internally if items exceed available height) */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, exact }) => {
          const active = isItemActive(href, exact);
          return (
            <Link
              key={href + label}
              href={href}
              onClick={isMobile ? onCloseMobile : undefined}
              className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all relative ${
                active
                  ? "bg-primary-light/80 text-primary font-bold shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary before:rounded-r"
                  : "text-muted hover:bg-surface-muted hover:text-foreground font-semibold"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  active
                    ? "text-primary stroke-[2.2]"
                    : "text-muted group-hover:text-foreground stroke-[1.8]"
                }`}
              />
              <span className="truncate flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3. QUICK ACTION CTA */}
      <div className="p-3 border-t border-border/80 flex-shrink-0">
        <Link
          href="/host/properties/new"
          onClick={isMobile ? onCloseMobile : undefined}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-3.5 py-2.5 transition-colors shadow-2xs focus-ring"
        >
          <PlusIcon className="w-4 h-4 shrink-0" />
          <span>List a Property</span>
        </Link>
      </div>

      {/* 4. BOTTOM HOST ASSURANCE SECTION */}
      <div className="p-3 pt-0 flex-shrink-0 mt-auto">
        <div className="p-3.5 rounded-2xl bg-surface-muted/70 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
            <span>Host Assurance</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Zero middleman fees. Direct guest connection.
          </p>
          <Link
            href="/host/subscription"
            onClick={isMobile ? onCloseMobile : undefined}
            className="text-[11px] font-bold text-primary hover:underline inline-block pt-0.5"
          >
            View Plan Tier →
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar (280px expanded, 0px collapsed / completely hidden) */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-white transition-all duration-300 ease-in-out z-20 sticky top-0 h-screen h-dvh self-start overflow-hidden ${
          collapsed
            ? "w-0 min-w-0 border-r-0 opacity-0 pointer-events-none"
            : "w-[280px] min-w-[280px] border-r border-border opacity-100 shadow-xs"
        }`}
        aria-label="Host navigation"
        aria-hidden={collapsed}
      >
        <div className="w-[280px] h-full flex flex-col flex-shrink-0">
          {navContent(false)}
        </div>
      </aside>

      {/* Mobile Slide-Out Navigation Drawer with Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Host navigation drawer"
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-floating z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
