"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/api";
import { Notification } from "@/types/booking";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    setLoading(true);
    getNotifications(50)
      .then((data) => setNotifications(data || []))
      .catch((err) => console.warn("Failed to fetch notifications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("Mark all read error:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Notifications Inbox</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Stay updates, host messages, and payment verification alerts
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="rounded-xl bg-black text-white px-4 py-2 text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer"
            >
              ✓ Mark All As Read
            </button>
          )}
        </div>

        <GlassCard className="border border-zinc-200 p-6 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-zinc-500">
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {notifications.map((n, idx) => (
                <div
                  key={n.id || `notif-idx-${idx}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`py-4 px-3 rounded-2xl transition-all cursor-pointer flex justify-between items-start gap-4 ${
                    n.read ? "bg-white" : "bg-emerald-50/60 border-l-4 border-emerald-500"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-950">{n.title}</h4>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">{n.body}</p>
                    <span className="text-[10px] text-zinc-400 font-medium block mt-2">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Recently"}
                    </span>
                  </div>

                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(n.id);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400">
              🔔 You have no notifications right now.
            </div>
          )}
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
