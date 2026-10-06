"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { getUnreadNotificationsCount, getNotifications, markAllNotificationsAsRead } from "@/lib/api";
import { Notification } from "@/types/booking";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();
  
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (!firebaseUser) return;
    getUnreadNotificationsCount()
      .then((res) => setUnreadCount(res?.count || 0))
      .catch(() => setUnreadCount(0));
  }, [firebaseUser]);

  const toggleNotifications = () => {
    if (!showNotifDrawer && firebaseUser) {
      getNotifications(10)
        .then((data) => setNotifications(data || []))
        .catch(() => setNotifications([]));
    }
    setShowNotifDrawer(!showNotifDrawer);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const role = userProfile?.role || "customer";

  let myBookingsPath = "/trips";
  let listPropertyPath = "/host/application";
  let listPropertyLabel = "List Your Property";

  if (!firebaseUser) {
    myBookingsPath = "/auth?mode=login&returnTo=/trips";
    listPropertyPath = "/auth?mode=login&returnTo=/host/application";
  } else if (role === "host") {
    listPropertyPath = "/host";
    listPropertyLabel = "Host Dashboard";
  } else if (role === "admin") {
    listPropertyPath = "/admin";
    listPropertyLabel = "Admin Portal";
  }

  const navItems = [
    { name: "Explore", path: "/" },
    { name: "Stays", path: "/properties" },
    { name: "My Bookings", path: myBookingsPath },
    ...(firebaseUser ? [{ name: "Chat", path: "/chat", icon: "/icons/chat-bubble.png" }] : []),
    { name: listPropertyLabel, path: listPropertyPath },
  ];

  return (
    <header className="glass-nav sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="StayTrack"
            className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && !item.path.startsWith("/auth") && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-text hover:bg-primary-light/60 hover:text-primary-dark"
                }`}
              >
                {item.icon && <img src={item.icon} alt="" className="w-4 h-4 object-contain" />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Action Controls */}
        <div className="flex items-center gap-3 relative">
          {firebaseUser && (
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 rounded-xl border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition-all relative cursor-pointer flex items-center justify-center"
                title="Notifications"
                aria-label="Notifications"
              >
                <img src="/icons/bell.png" alt="" className="w-5 h-5 object-contain" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer */}
              {showNotifDrawer && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[90vw] rounded-2xl bg-white shadow-2xl border border-zinc-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Notifications
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifDrawer(false)}
                        className="text-[11px] font-bold text-black hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <div
                          key={notif.id || `hdr-notif-${idx}`}
                          className={`p-2.5 rounded-xl text-xs transition-colors ${
                            notif.read ? "bg-zinc-50 text-zinc-600" : "bg-emerald-50 text-emerald-950 font-semibold border-l-2 border-emerald-500"
                          }`}
                        >
                          <div className="font-bold">{notif.title}</div>
                          <div className="text-[11px] mt-0.5">{notif.body}</div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-zinc-400 font-medium">
                        No recent notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {firebaseUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text hover:border-primary transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : (firebaseUser.phoneNumber ? firebaseUser.phoneNumber.slice(-2) : "U")}
                </div>
                <span className="hidden sm:inline">
                  {userProfile?.name || firebaseUser.phoneNumber || "Profile"}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text hover:bg-background transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href={pathname && pathname !== "/" ? `/auth?mode=login&returnTo=${encodeURIComponent(pathname)}` : "/auth?mode=login"}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-dark transition-all shadow-sm"
            >
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
