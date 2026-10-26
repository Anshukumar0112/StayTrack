"use client";

import React from "react";
import Link from "next/link";
import { Notification, getNotificationId } from "@/types/booking";
import NotificationItem from "./NotificationItem";
import { BellIcon, CheckIcon } from "@/components/ui/Icons";

export interface NotificationPopoverProps {
  notifications: Notification[];
  unreadCount: number;
  isHost?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export default function NotificationPopover({
  notifications,
  unreadCount,
  isHost = false,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationPopoverProps) {
  return (
    <div
      role="region"
      aria-label="Notifications Drawer"
      className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-floating border border-border z-50 animate-in fade-in zoom-in-95 overflow-hidden text-left"
    >
      {/* 1. Popover Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full tabular-nums">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              Mark all read
            </button>
          )}
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-[11px] font-semibold text-muted hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
      </div>

      {/* 2. Scrollable Notification List */}
      <div className="max-h-80 sm:max-h-96 overflow-y-auto p-1.5 space-y-0.5">
        {notifications.length > 0 ? (
          notifications.map((n, idx) => {
            const notifId = getNotificationId(n);
            const key = notifId ? `${notifId}-${idx}` : `pop-notif-${idx}`;
            return (
              <NotificationItem
                key={key}
                notification={n}
                isHost={isHost}
                variant="compact"
                onMarkRead={onMarkRead}
                onClosePopover={onClose}
              />
            );
          })
        ) : (
          <div className="py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-surface-muted text-muted border border-border/80 flex items-center justify-center mx-auto mb-2">
              <BellIcon className="w-5 h-5 stroke-[1.8]" />
            </div>
            <p className="text-xs font-bold text-foreground">All caught up</p>
            <p className="text-[11px] text-muted mt-0.5">No notifications right now.</p>
          </div>
        )}
      </div>

      {/* 3. Popover Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border/70 bg-[#FBFDFB] px-3 py-2 text-center">
          <Link
            href="/notifications"
            onClick={onClose}
            className="block text-xs font-bold text-primary hover:text-primary-dark transition-colors py-1"
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
