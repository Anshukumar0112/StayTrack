/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import Link from "next/link";
import { getHostBookings, acceptBooking, rejectBooking } from "@/lib/api";
import { Booking, getBookingId, getBookingStatus, getBookingAmount, getBookingStatusLabel, getBookingStatusBadge } from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  Building2Icon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

type HostFilter = "all" | "requested" | "payment_pending" | "confirmed" | "closed";

export default function HostBookingsPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HostFilter>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBookings = () => {
    if (!firebaseUser) return;
    setLoading(true);
    getHostBookings()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch host bookings:", err);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/bookings", "host");
    } else if (firebaseUser) {
      fetchBookings();
    }
  }, [firebaseUser, authLoading]);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await acceptBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Booking accepted! The guest has been notified to complete payment.",
      });
      fetchBookings();
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to accept booking: " + (err.message || "Please try again"),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!confirm("Are you sure you want to decline this reservation request?")) return;
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await rejectBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Reservation request declined.",
      });
      fetchBookings();
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to decline booking: " + (err.message || "Please try again"),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const st = getBookingStatus(b);
      if (filter === "requested") return st === "requested";
      if (filter === "payment_pending") return st === "accepted" || st === "payment_pending";
      if (filter === "confirmed") return st === "confirmed";
      if (filter === "closed") return st === "rejected" || st === "cancelled" || st === "completed";
      return true;
    });
  }, [bookings, filter]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-8 pb-24 md:py-10 flex-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-foreground border border-border">
                Host Management
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Guest Bookings</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Review guest reservation requests, check-in schedules, and approve stays across your listed properties.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-xl border border-border overflow-x-auto max-w-full">
            {[
              { label: "All Bookings", value: "all" },
              { label: "Needs Approval", value: "requested" },
              { label: "Awaiting Payment", value: "payment_pending" },
              { label: "Confirmed", value: "confirmed" },
              { label: "Past / Declined", value: "closed" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as HostFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filter === tab.value
                    ? "bg-surface text-foreground shadow-2xs border border-border/80"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Banner */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              bannerMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <span>{bannerMessage.text}</span>
            <button
              onClick={() => setBannerMessage(null)}
              className="ml-4 text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bookings List */}
        {authLoading || loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 rounded-2xl bg-surface-muted animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((b, idx) => {
              const id = getBookingId(b);
              const st = getBookingStatus(b);
              const amount = getBookingAmount(b);
              const badge = getBookingStatusBadge(st);
              const isRequested = st === "requested";

              const propertyTitle = b.propertyTitle || `Property #${b.propertyId?.slice(0, 8) || "Listing"}`;
              const guestDisplay = b.guestName || b.userName || "Guest";
              const stayModel = b.bookingType ? b.bookingType.toUpperCase() : "STAY";
              const locationText = [b.area, b.city].filter(Boolean).join(", ") || "Delhi NCR";

              return (
                <div
                  key={id || `host-booking-${idx}`}
                  className="group relative rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-subtle hover:shadow-elevated transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Property Thumbnail & Details */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="h-24 w-full sm:w-28 rounded-xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                      {b.propertyImage ? (
                        <img
                          src={b.propertyImage}
                          alt={propertyTitle}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Building2Icon className="w-10 h-10 text-muted stroke-[1.5]" />
                      )}
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                        {stayModel}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {getBookingStatusLabel(st, "host")}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          Ref: #{id ? id.slice(0, 8) : "—"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground truncate">
                        {propertyTitle}
                      </h3>

                      <div className="flex items-center gap-3 mt-1 text-xs text-foreground/85 font-medium flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>Guest: <strong className="text-foreground">{guestDisplay}</strong></span>
                        </span>
                        {b.contactPhone && (
                          <span className="text-muted inline-flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span>{b.contactPhone}</span>
                          </span>
                        )}
                        <span className="text-muted inline-flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{locationText}</span>
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-muted font-medium flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{b.startDate || "Date tbd"} → {b.endDate || "Date tbd"}</span>
                        </span>
                        {b.startTime && (
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span>{b.startTime} - {b.endTime || "TBD"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Payout & Host Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-muted font-semibold uppercase tracking-wider block">
                        Booking Payout
                      </span>
                      <span className="text-xl font-extrabold text-foreground">
                        ₹{amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRequested && (
                        <>
                          <button
                            onClick={() => handleAccept(id)}
                            disabled={actionLoadingId === id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-subtle cursor-pointer disabled:opacity-50"
                          >
                            {actionLoadingId === id ? "Accepting..." : (
                              <>
                                <CheckIcon className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(id)}
                            disabled={actionLoadingId === id}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      <Link
                        href={`/trips/${id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all shadow-2xs"
                      >
                        <span>Details</span>
                        <ArrowRightIcon className="w-3 h-3 text-muted" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-surface p-8 shadow-2xs">
            <div className="h-14 w-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
              <CalendarDaysIcon className="w-6 h-6 text-muted" />
            </div>
            <h3 className="text-base font-bold text-foreground">No booking requests found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {filter === "all"
                ? "You haven't received any reservation requests for your properties yet."
                : `No bookings found under the "${filter}" filter tab.`}
            </p>
            <Link
              href="/host"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity shadow-subtle"
            >
              <span>Back to Host Dashboard</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
