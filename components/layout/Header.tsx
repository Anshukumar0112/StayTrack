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

  const navItems = [
    { name: "Stays", path: "/properties" },
    { name: "Explore", path: "/" },
    { name: "My Trips", path: "/trips" },
    { name: "List Your Property", path: role === "host" ? "/host" : "/host/application" },
  ];

  if (role === "host") {
    navItems.push({ name: "Host Dashboard", path: "/host" });
  }

  if (role === "admin") {
    navItems.push({ name: "Admin Portal", path: "/admin" });
  }

  return (
    <header className="glass-nav sticky top-0 z-50 transition-all duration-300 bg-white/85 backdrop-blur-md border-b border-zinc-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-md group-hover:scale-105 transition-transform">
            <span className="text-lg font-black tracking-tight">S</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-zinc-950">
              STAYTRACK
            </span>
            <span className="hidden text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full sm:inline-block">
              ₹0 Brokerage
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-black"
                }`}
              >
                {item.name}
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
                className="p-2 rounded-xl border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition-all relative cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer */}
              {showNotifDrawer && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white shadow-2xl border border-zinc-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
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
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
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
                className="flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:border-black transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-[10px] font-black text-white">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : (firebaseUser.phoneNumber ? firebaseUser.phoneNumber.slice(-2) : "U")}
                </div>
                <span className="hidden sm:inline">
                  {userProfile?.name || firebaseUser.phoneNumber || "Profile"}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
