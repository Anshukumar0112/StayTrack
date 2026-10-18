"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import Badge, { BadgeVariant } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categories";
import {
  getMyProperties,
  getHostBookings,
  acceptBooking,
  rejectBooking,
  getEligibility,
  getMySubscription,
} from "@/lib/api";
import { Property, getPropertyId } from "@/types/property";
import {
  Booking,
  getBookingId,
  getBookingStatus,
  getBookingAmount,
  getBookingStatusLabel,
} from "@/types/booking";
import {
  Building2Icon,
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckIcon,
  CloseIcon,
  ArrowRightIcon,
  MapPinIcon,
  EditIcon,
  ExternalLinkIcon,
  PlusIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return dateStr;
    }
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function getPropertyPriceDisplay(p: Property): string {
  const price =
    p.dailyPrice ??
    p.pricePerNight ??
    p.monthlyPrice ??
    p.pricePerMonth ??
    p.hourlyPrice ??
    p.pricePerHour ??
    p.price ??
    0;

  const rawType = (p.bookingType || p.stayTypes?.[0] || "").toLowerCase();
  const cat = String(p.propertyType || p.category || "").toUpperCase();

  let period = "/ night";
  if (rawType.includes("month") || (cat === "FLAT" && !p.dailyPrice && !p.pricePerNight) || (cat === "PG" && !p.dailyPrice && !p.pricePerNight)) {
    period = "/ month";
  } else if (rawType.includes("hour")) {
    period = "/ hour";
  }

  return `${formatCurrency(price)} ${period}`;
}

function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "approved":
    case "confirmed":
      return "verified";
    case "requested":
    case "pending":
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

export default function HostDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string }>({ eligible: true });
  const [subscription, setSubscription] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHostData = async () => {
    setLoading(true);
    try {
      const [propsData, bookingsData, eligData, subData] = await Promise.allSettled([
        getMyProperties(),
        getHostBookings(),
        getEligibility(),
        getMySubscription(),
      ]);

      if (propsData.status === "fulfilled" && Array.isArray(propsData.value)) {
        setProperties(propsData.value);
      }
      if (bookingsData.status === "fulfilled" && Array.isArray(bookingsData.value)) {
        setBookings(bookingsData.value);
      }
      if (eligData.status === "fulfilled" && eligData.value) {
        setEligibility(eligData.value);
      }
      if (subData.status === "fulfilled") {
        setSubscription(subData.value);
      }
    } catch (err) {
      console.warn("Host dashboard load warning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
  }, []);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await acceptBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Booking request accepted! The guest has been notified to complete payment.",
      });
      fetchHostData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept booking request.";
      setBannerMessage({ type: "error", text: msg });
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
      fetchHostData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline booking request.";
      setBannerMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const activePropsCount = useMemo(() => {
    return properties.filter((p) => p.verificationStatus === "approved").length;
  }, [properties]);

  const pendingPropsCount = useMemo(() => {
    return properties.filter((p) => p.verificationStatus === "pending" || !p.verificationStatus).length;
  }, [properties]);

  const upcomingBookingsCount = useMemo(() => {
    return bookings.filter((b) => {
      const st = getBookingStatus(b);
      return st === "requested" || st === "accepted" || st === "confirmed" || st === "payment_pending";
    }).length;
  }, [bookings]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-10 flex-1">
        {/* Banner Alert Feedback */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 ${
              bannerMessage.type === "success"
                ? "bg-success-light border-success/25 text-success"
                : "bg-error-light border-error/25 text-error"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {bannerMessage.type === "success" ? (
                <CheckCircleIcon className="w-4 h-4 shrink-0 text-success" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-error" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-muted hover:text-foreground cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Host Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Overview of your listed properties, incoming bookings, and subscription status
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <Link
              href="/host/subscription"
              className="rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors flex items-center gap-1.5 focus-ring"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5 text-muted shrink-0" />
              <span>Subscription Plan</span>
            </Link>

            {eligibility.eligible ? (
              <Link
                href="/host/properties/new"
                className="rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors flex items-center gap-1.5 focus-ring"
              >
                <PlusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>List New Property</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold bg-warning-light text-warning border border-warning/30 px-3.5 py-2 rounded-xl">
                <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Listing limit reached: {eligibility.reason || "Upgrade Plan"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Authoritative Real-Data Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Stat 1: Total Properties */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Listings
              </span>
              <Building2Icon className="w-4 h-4 text-muted" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {loading ? "..." : properties.length}
            </div>
            <div className="pt-1 flex items-center gap-1.5">
              <Badge variant="verified" size="sm">
                {activePropsCount} Approved
              </Badge>
            </div>
          </div>

          {/* Stat 2: Pending Approval */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Pending Review
              </span>
              <ClockIcon className="w-4 h-4 text-muted" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {loading ? "..." : pendingPropsCount}
            </div>
            <div className="pt-1">
              <Badge variant={pendingPropsCount > 0 ? "warning" : "neutral"} size="sm">
                {pendingPropsCount > 0 ? "Admin Review" : "All Verified"}
              </Badge>
            </div>
          </div>

          {/* Stat 3: Active Bookings */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Booking Requests
              </span>
              <CalendarDaysIcon className="w-4 h-4 text-muted" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {loading ? "..." : bookings.length}
            </div>
            <div className="pt-1">
              <Badge variant={upcomingBookingsCount > 0 ? "sage" : "neutral"} size="sm">
                {upcomingBookingsCount} Actionable
              </Badge>
            </div>
          </div>

          {/* Stat 4: Plan Status */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Plan Tier
              </span>
              <CreditCardIcon className="w-4 h-4 text-muted" />
            </div>
            <div className="text-base font-bold text-foreground truncate capitalize">
              {subscription?.planName || subscription?.status || "Active Plan"}
            </div>
            <div className="pt-1">
              <Link
                href="/host/subscription"
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Manage Tier</span>
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column (8 cols): Bookings & Listed Properties */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: Incoming Guest Booking Requests */}
            <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Guest Booking Requests ({bookings.length})
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Review and confirm direct accommodation requests
                  </p>
                </div>
                <Link
                  href="/host/bookings"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>View All Bookings</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted">Loading booking requests...</p>
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b, idx) => {
                    const id = getBookingId(b);
                    const st = getBookingStatus(b);
                    const isRequested = st === "requested";
                    const amount = getBookingAmount(b);

                    return (
                      <div
                        key={id || `host-booking-${idx}`}
                        className="p-4 rounded-2xl bg-surface-muted/60 border border-border hover:border-border-hover transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getStatusBadgeVariant(st)} size="sm">
                              {getBookingStatusLabel(st, "host")}
                            </Badge>
                            <span className="text-[11px] font-mono text-muted">
                              #{id.slice(0, 8)}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-foreground truncate mt-1">
                            {b.propertyTitle || `Property #${b.propertyId}`}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                            <span>Guest: <strong className="text-foreground">{b.guestName || b.userName || "Guest"}</strong></span>
                            {b.startDate && b.endDate && (
                              <>
                                <span>·</span>
                                <span>{formatDateDisplay(b.startDate)} → {formatDateDisplay(b.endDate)}</span>
                              </>
                            )}
                            {amount > 0 && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                          {isRequested && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAccept(id)}
                                disabled={actionLoadingId === id}
                                className="rounded-xl bg-success hover:bg-success/90 text-white font-semibold text-xs px-3.5 py-2 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1 focus-ring"
                              >
                                {actionLoadingId === id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <CheckIcon className="w-3.5 h-3.5" />
                                )}
                                <span>Accept</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(id)}
                                disabled={actionLoadingId === id}
                                className="rounded-xl border border-error/30 hover:bg-error-light text-error font-semibold text-xs px-3 py-2 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1 focus-ring"
                              >
                                <CloseIcon className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          <Link
                            href={`/trips/${id}`}
                            className="rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold px-3 py-2 transition-colors shadow-2xs inline-flex items-center gap-1 focus-ring"
                          >
                            <span>Details</span>
                            <ArrowRightIcon className="w-3 h-3 text-muted" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-border rounded-2xl p-6 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-muted mx-auto border border-border">
                    <CalendarDaysIcon className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">No pending booking requests</h3>
                  <p className="text-[11px] text-muted max-w-xs mx-auto">
                    New reservation requests submitted by guests will appear here in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* Section 2: Managed Properties Snapshot */}
            <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    My Listed Properties ({properties.length})
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Live accommodations and verification status
                  </p>
                </div>
                <Link
                  href="/host/properties"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage All</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>

              {properties.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {properties.slice(0, 4).map((p, idx) => {
                    const propId = getPropertyId(p) || `my-prop-${idx}`;
                    const primaryImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p as any).imageUrl;

                    return (
                      <div
                        key={propId}
                        className="p-4 rounded-2xl border border-border bg-surface hover:border-border-hover transition-colors flex flex-col justify-between space-y-3 shadow-2xs"
                      >
                        <div className="space-y-2.5">
                          {/* Thumbnail with genuine fallback */}
                          <div className="h-28 w-full rounded-xl bg-surface-muted border border-border overflow-hidden relative">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={p.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#F6F5F1] to-[#E3E0D6] flex flex-col items-center justify-center p-2 text-center">
                                <Building2Icon className="w-5 h-5 text-muted stroke-[1.5]" />
                                <span className="text-[10px] font-bold text-foreground mt-1 uppercase tracking-wider">
                                  {getCategoryLabel(p.propertyType || p.category || "Stay")}
                                </span>
                              </div>
                            )}

                            <div className="absolute top-2 left-2">
                              <Badge variant="sage" size="sm">
                                {getCategoryLabel(p.propertyType || p.category || "Stay")}
                              </Badge>
                            </div>

                            <div className="absolute top-2 right-2">
                              <Badge variant={getStatusBadgeVariant(p.verificationStatus || "pending")} size="sm">
                                {p.verificationStatus || "Pending"}
                              </Badge>
                            </div>
                          </div>

                          <h3 className="text-xs font-bold text-foreground truncate">
                            {p.title}
                          </h3>

                          <div className="flex items-center gap-1 text-[11px] text-muted">
                            <MapPinIcon className="w-3 h-3 shrink-0 text-muted" />
                            <span className="truncate">
                              {[p.area, p.city].filter(Boolean).join(", ") || "Delhi NCR"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-border flex justify-between items-center text-xs">
                          <span className="font-bold text-foreground">
                            {getPropertyPriceDisplay(p)}
                          </span>

                          <div className="flex items-center gap-2.5">
                            <Link
                              href={`/host/properties/${propId}`}
                              className="text-muted hover:text-foreground font-semibold inline-flex items-center gap-1"
                              title="Edit Property"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Link>

                            <Link
                              href={`/properties/${propId}`}
                              className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                              title="View Public Page"
                            >
                              <span>View</span>
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-border rounded-2xl p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto border border-border">
                    <Building2Icon className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">You haven't listed any properties yet</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                    List your BNB, Hostel, PG, Hotel or Flat on StayTrack with zero brokerage fees.
                  </p>
                  <Link
                    href="/host/properties/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>List Your First Property</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column (4 cols): Quick Navigation & Assurance */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Host Management
              </h3>

              <div className="space-y-1.5 text-xs font-semibold">
                <Link
                  href="/host/properties"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground border border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2Icon className="w-4 h-4 text-muted" />
                    <span>My Properties</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                </Link>

                <Link
                  href="/host/properties/new"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground border border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <PlusIcon className="w-4 h-4 text-muted" />
                    <span>Add New Property</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                </Link>

                <Link
                  href="/host/bookings"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground border border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDaysIcon className="w-4 h-4 text-muted" />
                    <span>Booking Requests</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                </Link>

                <Link
                  href="/host/subscription"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground border border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheckIcon className="w-4 h-4 text-muted" />
                    <span>Subscription Plan</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                </Link>

                <Link
                  href="/host/earnings"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground border border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCardIcon className="w-4 h-4 text-muted" />
                    <span>Earnings & Payouts</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                </Link>
              </div>
            </div>

            {/* Direct Marketplace Guarantee */}
            <div className="p-5 rounded-3xl bg-surface border border-border shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                <span>StayTrack Host Assurance</span>
              </div>
              <ul className="text-[11px] text-muted space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>100% direct guest connection with zero middleman deductions.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>Review and accept reservations on your own terms.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>Direct settlement into your designated bank account.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}