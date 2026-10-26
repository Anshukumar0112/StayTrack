"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  BellIcon,
  MessageCircleIcon,
  ChevronDownIcon,
  UserIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  Building2Icon,
  CrownIcon,
  HousePlusIcon,
  LogOutIcon,
  TrendingUpIcon,
} from "@/components/ui/Icons";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const [rawUnreadCount, setRawUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close menus when route changes during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setShowNotifDrawer(false);
    setShowAccountMenu(false);
  }

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Derive unread count from auth state
  const unreadCount = (firebaseUser || userProfile) ? rawUnreadCount : 0;

  // Fetch unread count on login
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

  // Click outside and escape key handling
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

  const role = userProfile?.role || "customer";
  const isHost = Boolean(firebaseUser && role === "host");
  const isAdmin = Boolean(firebaseUser && role === "admin");

  // Destinations & labels
  const guestBookingsHref = firebaseUser ? "/trips" : "/auth?mode=login&returnTo=/trips";
  const hostBookingsHref = "/host/bookings";
  const listPropertyPath = firebaseUser ? "/host/application" : "/auth?mode=login&returnTo=/host/application";

  // Route matching helpers
  const isExplore = pathname === "/";
  const isStays = pathname.startsWith("/properties") || pathname.startsWith("/stays");
  const isGuestBookings = pathname.startsWith("/trips") || pathname.startsWith("/booking");
  const isHostBookings = pathname.startsWith("/host/bookings");

  // Center navigation item:
  // - Normal guest: "My Bookings" -> /trips
  // - Host-enabled account: "Guest Bookings" -> /host/bookings
  const bookingsItem = isHost
    ? {
        name: "Guest Bookings",
        path: hostBookingsHref,
        isActive: isHostBookings,
      }
    : {
        name: "My Bookings",
        path: guestBookingsHref,
        isActive: isGuestBookings,
      };

  const navItems = [
    { name: "Explore", path: "/", isActive: isExplore },
    { name: "Stays", path: "/properties", isActive: isStays },
    bookingsItem,
  ];

  // User display metadata (no raw technical UIDs)
  const displayName =
    userProfile?.name ||
    firebaseUser?.displayName ||
    (firebaseUser?.phoneNumber ? firebaseUser.phoneNumber : "Guest");

  const displayPhone = userProfile?.phone || firebaseUser?.phoneNumber || "";

  const userInitial = userProfile?.name
    ? userProfile.name.charAt(0).toUpperCase()
    : firebaseUser?.displayName
    ? firebaseUser.displayName.charAt(0).toUpperCase()
    : firebaseUser?.phoneNumber
    ? firebaseUser.phoneNumber.slice(-2)
    : "U";

  return (
    <header className="sticky top-0 z-[40] bg-surface/95 backdrop-blur-md border-b border-border transition-colors">
      <div className="stay-container flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] py-3.5">
        {/* ==================================================== */}
        {/* ZONE 1: BRAND LOGO (LEFT)                            */}
        {/* ==================================================== */}
        <div className="flex items-center justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 group select-none focus-ring rounded-lg p-0.5"
            aria-label="StayTrack Home"
          >
            <Image
              src="/logo.png"
              alt="StayTrack"
              width={140}
              height={36}
              priority
              className="h-8 sm:h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </Link>
        </div>

        {/* ==================================================== */}
        {/* ZONE 2: PRIMARY NAVIGATION (CENTER)                  */}
        {/* ==================================================== */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-1.5 lg:gap-3 justify-center"
        >
          {navItems.map((item) => {
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`relative inline-flex items-center justify-center px-4 py-2 rounded-lg text-[15px] transition-colors duration-150 select-none ${
                  item.isActive
                    ? "bg-surface-muted text-foreground shadow-2xs"
                    : "text-foreground/75 hover:text-foreground hover:bg-surface-muted/60"
                }`}
              >
                <span className="inline-flex flex-col items-center justify-center">
                  {/* Visible label */}
                  <span
                    className={`leading-none transition-colors ${
                      item.isActive
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/75"
                    }`}
                  >
                    {item.name}
                  </span>
                  {/* Invisible semibold sizer ensuring identical intrinsic width across states */}
                  <span
                    className="h-0 overflow-hidden invisible font-semibold select-none leading-none"
                    aria-hidden="true"
                  >
                    {item.name}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ==================================================== */}
        {/* ZONE 3: ACTIONS & ACCOUNT (RIGHT)                    */}
        {/* ==================================================== */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5">
          {/* Primary CTA: List Your Property / Host Dashboard */}
          {isHost ? (
            <Link
              href="/host"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-border bg-surface hover:bg-surface-muted text-foreground transition-all shadow-subtle focus-ring"
            >
              <LayoutDashboardIcon className="w-4 h-4 text-primary stroke-[1.8]" />
              <span>Host Dashboard</span>
            </Link>
          ) : isAdmin ? (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-border bg-surface hover:bg-surface-muted text-foreground transition-all shadow-subtle focus-ring"
            >
              <CrownIcon className="w-4 h-4 text-primary stroke-[1.8]" />
              <span>Admin Portal</span>
            </Link>
          ) : (
            <Link
              href={listPropertyPath}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#111716] text-white hover:bg-[#232D2B] transition-all shadow-subtle focus-ring"
            >
              <HousePlusIcon className="w-4 h-4 text-primary-light stroke-[1.8]" />
              <span>List Your Property</span>
            </Link>
          )}

          {/* Notifications Button & Popover */}
          {firebaseUser && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`p-2.5 rounded-lg border text-foreground transition-all relative cursor-pointer flex items-center justify-center shadow-subtle focus-ring ${
                  showNotifDrawer
                    ? "bg-surface-muted border-border-hover"
                    : "bg-surface border-border hover:bg-surface-muted"
                }`}
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={showNotifDrawer}
              >
                <BellIcon className="w-4 h-4 text-foreground/80 stroke-[1.8]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold h-4 min-w-[1rem] px-1 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover Drawer */}
              {showNotifDrawer && (
                <NotificationPopover
                  notifications={notifications}
                  unreadCount={unreadCount}
                  isHost={false}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                  onClose={() => setShowNotifDrawer(false)}
                />
              )}
            </div>
          )}

          {/* User Account Popover OR Guest Login Button */}
          {firebaseUser ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAccountMenu((prev) => !prev);
                  setShowNotifDrawer(false);
                }}
                aria-expanded={showAccountMenu}
                aria-haspopup="menu"
                aria-label="Account menu"
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium text-foreground transition-all cursor-pointer focus-ring ${
                  showAccountMenu
                    ? "border-primary bg-surface-muted shadow-subtle"
                    : "border-border bg-surface hover:bg-surface-muted hover:border-border-hover shadow-2xs"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary-dark">
                  {userInitial}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-[13px] font-medium">
                  {displayName}
                </span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                    showAccountMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Account Popover Menu */}
              {showAccountMenu && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl bg-surface shadow-elevated border border-border p-1.5 z-[50] animate-in fade-in zoom-in-95"
                >
                  {/* User Identity Header */}
                  <div className="px-3 py-2.5 rounded-lg bg-surface-muted/60 mb-1 border border-border/40">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-extrabold text-primary-dark">
                        {userInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {displayName}
                        </p>
                        {displayPhone && (
                          <p className="text-[11px] text-muted truncate">
                            {displayPhone}
                          </p>
                        )}
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-surface text-primary border border-border">
                          {role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <div className="py-0.5 space-y-0.5 text-xs font-medium text-foreground">
                    <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                      Account
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setShowAccountMenu(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      href="/trips"
                      onClick={() => setShowAccountMenu(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <CalendarDaysIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      href="/chat"
                      onClick={() => setShowAccountMenu(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <MessageCircleIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                      <span>Chat Messages</span>
                    </Link>

                    {isHost && (
                      <>
                        <div className="my-1 border-t border-border/60" />
                        <div className="px-3 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                          Host Management
                        </div>
                        <Link
                          href="/host"
                          onClick={() => setShowAccountMenu(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <LayoutDashboardIcon className="w-4 h-4 text-primary stroke-[1.8]" />
                          <span>Host Dashboard</span>
                        </Link>
                        <Link
                          href="/host/properties"
                          onClick={() => setShowAccountMenu(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <Building2Icon className="w-4 h-4 text-muted stroke-[1.8]" />
                          <span>My Properties</span>
                        </Link>
                        <Link
                          href="/host/earnings"
                          onClick={() => setShowAccountMenu(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <TrendingUpIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                          <span>Earnings</span>
                        </Link>
                        <Link
                          href="/host/subscription"
                          onClick={() => setShowAccountMenu(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <CrownIcon className="w-4 h-4 text-muted stroke-[1.8]" />
                          <span>Subscription</span>
                        </Link>
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-border/60" />
                        <div className="px-3 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                          Admin
                        </div>
                        <Link
                          href="/admin"
                          onClick={() => setShowAccountMenu(false)}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <CrownIcon className="w-4 h-4 text-primary stroke-[1.8]" />
                          <span>Admin Portal</span>
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t border-border" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-error hover:bg-error-soft/40 transition-colors text-xs font-semibold cursor-pointer"
                    >
                      <LogOutIcon className="w-4 h-4 stroke-[1.8]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={
                pathname && pathname !== "/"
                  ? `/auth?mode=login&returnTo=${encodeURIComponent(pathname)}`
                  : "/auth?mode=login"
              }
              className="rounded-lg bg-[#111716] hover:bg-[#232D2B] px-4 py-2 text-[13px] font-semibold text-white transition-all shadow-subtle focus-ring cursor-pointer"
            >
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

