"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import {
  CalendarDaysIcon,
  CheckIcon,
  CloseIcon,
  ArrowRightIcon,
  UsersIcon,
  Building2Icon,
} from "@/components/ui/Icons";
import type { Booking } from "@/types/booking";
import {
  getBookingId,
  getBookingStatus,
  getBookingAmount,
  getBookingStatusLabel,
} from "@/types/booking";
import { formatCurrency } from "@/lib/utils";
import type { BadgeVariant } from "@/components/ui/Badge";

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3) return dateStr;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function getStatusVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "verified";
    case "requested":
      return "warning";
    case "payment_pending":
    case "accepted":
      return "info";
    case "rejected":
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
}

interface HostRecentBookingsProps {
  bookings: Booking[];
  loading: boolean;
  actionLoadingId: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function HostRecentBookings({
  bookings,
  loading,
  actionLoadingId,
  onAccept,
  onReject,
}: HostRecentBookingsProps) {
  return (
    <div className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Card Header with dot indicator */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">
              Recent Booking Requests ({bookings.length})
            </h2>
            <p className="text-xs text-muted">
              Direct guest reservation requests awaiting review or check-in
            </p>
          </div>
        </div>
        <Link
          href="/host/bookings"
          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>View All Bookings</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted">Loading reservations...</p>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.slice(0, 5).map((b, idx) => {
            const id = getBookingId(b);
            const st = getBookingStatus(b);
            const isRequested = st === "requested";
            const amount = getBookingAmount(b);
            const guestCount = (b as any).guestCount || (b as any).guests || 1;
            const guestName = b.guestName || b.userName || "Guest";

            return (
              <div
                key={id || `booking-${idx}`}
                className="p-4 rounded-2xl bg-[#F8FAFC] border border-border hover:border-border-hover transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                {/* Guest info & reservation details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusVariant(st)} size="sm">
                      {getBookingStatusLabel(st, "host")}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted">#{id.slice(0, 8)}</span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground truncate">
                    {b.propertyTitle || `Property #${b.propertyId}`}
                  </h3>

                  <div className="flex items-center gap-2.5 text-xs text-muted flex-wrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {guestName.charAt(0).toUpperCase()}
                      </span>
                      {guestName}
                    </span>

                    {b.startDate && b.endDate && (
                      <>
                        <span className="text-border">•</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>
                            {formatDateDisplay(b.startDate)} → {formatDateDisplay(b.endDate)}
                          </span>
                        </span>
                      </>
                    )}

                    <span className="text-border">•</span>
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span>{guestCount} {guestCount === 1 ? "Guest" : "Guests"}</span>
                    </span>

                    {amount > 0 && (
                      <>
                        <span className="text-border">•</span>
                        <span className="font-extrabold text-foreground">
                          {formatCurrency(amount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions: Accept, Decline, Details */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/70">
                  {isRequested && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAccept(id)}
                        disabled={actionLoadingId === id}
                        className="rounded-xl bg-success hover:bg-success/90 text-white font-semibold text-xs px-3.5 py-2 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 focus-ring"
                      >
                        {actionLoadingId === id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onReject(id)}
                        disabled={actionLoadingId === id}
                        className="rounded-xl border border-error/30 hover:bg-error-light text-error font-semibold text-xs px-3 py-2 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1 focus-ring"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  <Link
                    href={`/host/bookings/${id}`}
                    className="rounded-xl border border-border bg-white hover:bg-surface-muted text-foreground text-xs font-semibold px-3 py-2 transition-colors shadow-2xs inline-flex items-center gap-1 focus-ring"
                  >
                    <span>View Details</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-border rounded-2xl p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto border border-border">
            <CalendarDaysIcon className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No pending booking requests</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            New reservation requests submitted by direct guests will appear here in real-time.
          </p>
        </div>
      )}
    </div>
  );
}
