"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUser, cacheUserProfile } from "@/hooks/useUser";
import {
  getUnreadNotificationsCount,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/api";
import { Notification, getNotificationId } from "@/types/booking";
import NotificationPopover from "@/components/notifications/NotificationPopover";
import {
  MenuIcon,
  HomeIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  UserIcon,
  CalendarDaysIcon,
  MessageCircleIcon,
  SettingsIcon,
  LogOutIcon,
  CheckIcon,
} from "@/components/ui/Icons";

export interface HostDashboardHeaderProps {
  onToggleSidebar: () => void;
  collapsed?: boolean;
}

export default function HostDashboardHeader({ onToggleSidebar, collapsed = false }: HostDashboardHeaderProps) {
  const router = useRouter();
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const [rawUnreadCount, setRawUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const unreadCount = (firebaseUser || userProfile) ? rawUnreadCount : 0;

  useEffect(() => {
    if (!firebaseUser && !userProfile) return;
    let isMounted = true;
    getUnreadNotificationsCount()
      .then((res) => {
        if (isMounted) setRawUnreadCount(res?.count || 0);
      })
      .catch(() => {
        if (isMounted) setRawUnreadCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [firebaseUser, userProfile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDrawer(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifDrawer(false);
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleNotifications = () => {
    if (!showNotifDrawer) {
      getNotifications(10)
        .then((data) => setNotifications(data || []))
        .catch(() => setNotifications([]));
    }
    setShowNotifDrawer((prev) => !prev);
    setShowAccountMenu(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setRawUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setRawUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (getNotificationId(n) === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      setShowAccountMenu(false);
      cacheUserProfile(null);
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const displayName =
    userProfile?.name ||
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split("@")[0] : "Host Admin");

  const displayRole =
    userProfile?.role === "host"
      ? "Verified Host"
      : userProfile?.role === "admin"
      ? "System Admin"
      : userProfile?.role
      ? userProfile.role.toUpperCase()
      : "Verified Host";

  const userInitial = userProfile?.name
    ? userProfile.name.charAt(0).toUpperCase()
    : firebaseUser?.displayName
    ? firebaseUser.displayName.charAt(0).toUpperCase()
    : "H";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border transition-colors">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 gap-4">
        {/* LEFT: Sidebar Toggle (Visible on mobile always, and on desktop when sidebar is collapsed) */}
        <div className={`items-center shrink-0 ${collapsed ? "flex" : "flex md:hidden"}`}>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!collapsed}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#334155] flex items-center justify-center transition-all cursor-pointer focus-ring shrink-0"
          >
            <MenuIcon className="w-5 h-5 text-[#334155] stroke-[2.2]" />
          </button>
        </div>

        {/* CENTER: Search Bar */}
        <div className="hidden sm:flex items-center flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings, properties, or guests..."
              className="w-full pl-9 pr-4 py-2 bg-[#F4F6F8] hover:bg-[#EDF2F7] focus:bg-white border border-transparent focus:border-primary/40 rounded-xl text-xs text-foreground placeholder:text-muted transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* RIGHT: Notifications + User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label="View notifications"
              className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer focus-ring"
            >
              <BellIcon className="w-5 h-5 stroke-[1.8]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-2xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifDrawer && (
              <NotificationPopover
                notifications={notifications}
                unreadCount={unreadCount}
                isHost={true}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onClose={() => setShowNotifDrawer(false)}
              />
            )}
          </div>

          {/* Public Homepage Button (Beside Host Profile) */}
          <Link
            href="/"
            aria-label="Go to homepage"
            title="Go to homepage"
            className="w-10 h-10 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#334155] hover:text-primary flex items-center justify-center transition-all cursor-pointer focus-ring shrink-0"
          >
            <HomeIcon className="w-5 h-5 stroke-[2]" />
          </Link>

          {/* Divider */}
          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Host Profile Dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => {
                setShowAccountMenu((prev) => !prev);
                setShowNotifDrawer(false);
              }}
              aria-expanded={showAccountMenu}
              aria-label="Host menu"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-surface-muted transition-colors cursor-pointer focus-ring"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary">
                {userInitial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                  {displayRole}
                </span>
              </div>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 hidden sm:block ${
                  showAccountMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Popover */}
            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-floating border border-border p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2.5 rounded-xl bg-surface-muted/60 mb-1 border border-border/40">
                  <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-muted truncate">
                    {firebaseUser?.email || "Host Account"}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-white text-primary border border-border">
                    {displayRole}
                  </span>
                </div>

                <div className="space-y-0.5 text-xs font-medium text-foreground">
                  <Link
                    href="/profile"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                    <span>Host Profile</span>
                  </Link>

                  <Link
                    href="/host/properties"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <CalendarDaysIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                    <span>My Properties</span>
                  </Link>

                  <Link
                    href="/chat"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <MessageCircleIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                    <span>Guest Messages</span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                    <span>Settings</span>
                  </Link>

                  <div className="pt-1 mt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-error hover:bg-error-light transition-colors text-left font-semibold cursor-pointer"
                    >
                      <LogOutIcon className="w-4 h-4 stroke-[1.8]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
