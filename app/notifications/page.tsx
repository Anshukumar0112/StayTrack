"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import NotificationItem from "@/components/notifications/NotificationItem";
import { CheckIcon, BellIcon, FilterIcon } from "@/components/ui/Icons";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/api";
import { Notification, getNotificationId } from "@/types/booking";
import { getNotificationCategory, NotificationCategory } from "@/lib/notifications";
import { useUser } from "@/hooks/useUser";

export default function NotificationsPage() {
  const { user: userProfile } = useUser();
  const isHost = userProfile?.role === "host";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>("all");

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
        prev.map((n) => (getNotificationId(n) === id ? { ...n, read: true } : n))
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

  // Filter notifications based on tab (all vs unread) and category
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Tab Filter
      if (activeTab === "unread" && n.read) {
        return false;
      }
      // 2. Category Filter
      if (selectedCategory !== "all") {
        const cat = getNotificationCategory(n);
        if (cat !== selectedCategory) return false;
      }
      return true;
    });
  }, [notifications, activeTab, selectedCategory]);

  const categories: { key: NotificationCategory; label: string }[] = [
    { key: "all", label: "All Types" },
    { key: "booking", label: "Bookings" },
    { key: "message", label: "Messages" },
    { key: "payment", label: "Payments" },
    { key: "property", label: "Properties" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 w-full flex-1">
        {/* 1. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/20 tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
              Stay updates, booking requests, messages, and account alerts.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2 text-xs font-bold text-foreground shadow-2xs transition-all cursor-pointer self-start sm:self-center"
            >
              <CheckIcon className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* 2. FILTER & MANAGEMENT CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-2xl border border-border/80 shadow-2xs mb-6">
          {/* Main Status Tabs: All vs Unread */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "unread"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map(({ key, label }) => {
              const active = selectedCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-foreground text-background"
                      : "bg-[#F8FAFC] text-muted hover:text-foreground hover:bg-[#EDF2F7]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. NOTIFICATION LIST */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-muted">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((n, idx) => {
              const notifId = getNotificationId(n);
              const key = notifId ? `${notifId}-${idx}` : `full-notif-${idx}`;
              return (
                <NotificationItem
                  key={key}
                  notification={n}
                  isHost={isHost}
                  variant="full"
                  onMarkRead={handleMarkRead}
                />
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-border/80 p-12 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] text-muted border border-border/80 flex items-center justify-center mx-auto mb-3">
                <BellIcon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {activeTab === "unread" ? "No unread notifications" : "No notifications found"}
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                {activeTab === "unread"
                  ? "You have reviewed all your alerts. Switch to 'All' to browse previous notifications."
                  : "We'll let you know when there are updates regarding your bookings, payments, or messages."}
              </p>
              {(activeTab !== "all" || selectedCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setSelectedCategory("all");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary-light transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
