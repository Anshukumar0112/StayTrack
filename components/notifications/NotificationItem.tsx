"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Notification, getNotificationId, getNotificationBody } from "@/types/booking";
import {
  formatNotificationTime,
  getNotificationDestination,
  getNotificationCategory,
} from "@/lib/notifications";
import {
  CalendarDaysIcon,
  MessageCircleIcon,
  WalletIcon,
  Building2Icon,
  ShieldCheckIcon,
  StarIcon,
  BellIcon,
  ChevronRightIcon,
  CheckIcon,
} from "@/components/ui/Icons";

export interface NotificationItemProps {
  notification: Notification;
  isHost?: boolean;
  variant?: "compact" | "full";
  onMarkRead?: (id: string) => void;
  onClosePopover?: () => void;
}

export default function NotificationItem({
  notification,
  isHost = false,
  variant = "compact",
  onMarkRead,
  onClosePopover,
}: NotificationItemProps) {
  const router = useRouter();

  const id = getNotificationId(notification);
  const body = getNotificationBody(notification);
  const timeFormatted = formatNotificationTime(notification.createdAt);
  const destination = getNotificationDestination(notification, isHost);
  const category = getNotificationCategory(notification);
  const isRead = notification.read;

  const handleClick = (e: React.MouseEvent) => {
    // If unread, mark it as read
    if (!isRead && onMarkRead && id) {
      onMarkRead(id);
    }

    // Navigate to destination if available
    if (destination) {
      if (onClosePopover) onClosePopover();
      router.push(destination);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e as any);
    }
  };

  // Render appropriate category icon with StayTrack refined accents
  const renderIcon = () => {
    const iconClass = variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4";

    switch (category) {
      case "booking":
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <CalendarDaysIcon className={iconClass} strokeWidth={2} />
          </div>
        );
      case "message":
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0">
            <MessageCircleIcon className={iconClass} strokeWidth={2} />
          </div>
        );
      case "payment":
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <WalletIcon className={iconClass} strokeWidth={2} />
          </div>
        );
      case "property":
        return (
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
            <Building2Icon className={iconClass} strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-surface-muted text-muted-dark border border-border flex items-center justify-center shrink-0">
            <BellIcon className={iconClass} strokeWidth={2} />
          </div>
        );
    }
  };

  // 1. COMPACT VARIANT (For Popover Dropdowns)
  if (variant === "compact") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          isRead
            ? "bg-white hover:bg-[#F8FAFC]"
            : "bg-primary-soft/35 hover:bg-primary-soft/50"
        }`}
      >
        {/* Category Icon */}
        {renderIcon()}

        {/* Content Column */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4
              className={`text-xs leading-snug truncate ${
                isRead ? "font-semibold text-foreground" : "font-bold text-foreground"
              }`}
            >
              {notification.title}
            </h4>
            <span className="text-[10px] text-muted shrink-0 tabular-nums">
              {timeFormatted}
            </span>
          </div>

          {body && (
            <p className="text-[11px] text-muted-dark line-clamp-1 mt-0.5 leading-relaxed font-normal">
              {body}
            </p>
          )}
        </div>

        {/* Unread Indicator Dot */}
        {!isRead && (
          <div
            className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 self-start shadow-2xs"
            title="Unread"
          />
        )}
      </div>
    );
  }

  // 2. FULL VARIANT (For Full Notifications Page)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        isRead
          ? "bg-white border-border/80 hover:border-primary/30 hover:bg-[#FBFDFB]"
          : "bg-primary-soft/25 border-primary/20 hover:border-primary/40 hover:bg-primary-soft/40 shadow-2xs"
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {/* Category Icon */}
        <div className="mt-0.5 sm:mt-0">{renderIcon()}</div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm leading-tight ${
                isRead ? "font-semibold text-foreground" : "font-bold text-foreground"
              }`}
            >
              {notification.title}
            </h4>
            {!isRead && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-light text-primary border border-primary/20">
                New
              </span>
            )}
            <span className="text-[11px] text-muted capitalize px-2 py-0.5 rounded-md bg-surface-muted/60 border border-border/60">
              {category}
            </span>
          </div>

          {body && (
            <p className="text-xs text-muted-dark leading-relaxed font-normal">
              {body}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-muted">
            <span className="tabular-nums">{timeFormatted}</span>
            {destination && (
              <>
                <span>•</span>
                <span className="text-primary font-semibold group-hover:underline inline-flex items-center gap-0.5">
                  View details <ChevronRightIcon className="w-3 h-3" />
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
        {!isRead && onMarkRead && id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(id);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            title="Mark as read"
          >
            <CheckIcon className="w-3.5 h-3.5 text-primary" />
            <span>Mark read</span>
          </button>
        )}
        {destination && (
          <div className="w-8 h-8 rounded-xl bg-surface-muted/60 group-hover:bg-primary-light group-hover:text-primary text-muted flex items-center justify-center transition-colors">
            <ChevronRightIcon className="w-4 h-4 stroke-[2]" />
          </div>
        )}
      </div>
    </div>
  );
}
