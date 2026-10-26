/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyBookings,
  cancelBooking,
  getMyVisits,
  cancelVisit,
  createConversation,
} from "@/lib/api";
import {
  Booking,
  getBookingId,
  getBookingStatus,
  getBookingAmount,
  getBookingStatusLabel,
  getBookingStatusBadgeVariant,
  isBookingCancellable,
  calculateStayDuration,
} from "@/types/booking";
import { VisitBooking } from "@/types/visit";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import Badge from "@/components/ui/Badge";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import StatusFilterDropdown from "@/components/ui/StatusFilterDropdown";
import {
  Building2Icon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  LuggageIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CopyIcon,
  CheckIcon,
  CloseIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/ui/Icons";

type TripFilter = "all" | "upcoming" | "action_needed" | "pending" | "completed" | "cancelled" | "visits";

function isStayPassed(b: Booking): boolean {
  if (!b.endDate) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(b.endDate);
    return end < today;
  } catch {
    return false;
  }
}

export default function MyTripsPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripFilter>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<Booking | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<Booking | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visitPassModalTarget, setVisitPassModalTarget] = useState<VisitBooking | null>(null);
  const [visitCancelModalTarget, setVisitCancelModalTarget] = useState<VisitBooking | null>(null);
  const [cancellingVisitId, setCancellingVisitId] = useState<string | null>(null);

  const fetchData = () => {
    if (!firebaseUser) return;
    setLoading(true);
    Promise.allSettled([getMyBookings(), getMyVisits()])
      .then(([bRes, vRes]) => {
        if (bRes.status === "fulfilled" && Array.isArray(bRes.value)) {
          setBookings(bRes.value);
        } else {
          setBookings([]);
        }
        if (vRes.status === "fulfilled" && Array.isArray(vRes.value)) {
          setVisits(vRes.value);
        } else {
          setVisits([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch trips and visits data:", err);
        setBookings([]);
        setVisits([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/trips", "customer");
    } else if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, authLoading]);

  const handleCopyRef = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalTarget) return;
    const bookingId = getBookingId(cancelModalTarget);
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await cancelBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Your reservation request has been cancelled.",
      });
      setCancelModalTarget(null);
      fetchData();
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to cancel reservation: " + (err.message || "Please try again"),
      });
      setCancelModalTarget(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancelVisit = async () => {
    if (!visitCancelModalTarget) return;
    const vId = visitCancelModalTarget.visitId || visitCancelModalTarget.id;
    if (!vId) return;
    try {
      setCancellingVisitId(vId);
      setBannerMessage(null);
      await cancelVisit(vId);
      setBannerMessage({
        type: "success",
        text: "In-person visit has been cancelled.",
      });
      setVisitCancelModalTarget(null);
      if (visitPassModalTarget && (visitPassModalTarget.visitId === vId || visitPassModalTarget.id === vId)) {
        setVisitPassModalTarget(null);
      }
      fetchData();
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to cancel visit: " + (err.message || "Please try again"),
      });
      setVisitCancelModalTarget(null);
    } finally {
      setCancellingVisitId(null);
    }
  };

  const handleVisitChat = async (v: VisitBooking) => {
    try {
      await createConversation({
        propertyId: v.propertyId,
        participantId: v.hostId,
      });
      router.push("/chat");
    } catch {
      router.push("/chat");
    }
  };

  const counts = useMemo(() => {
    let upcoming = 0;
    let actionNeeded = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;

    bookings.forEach((b) => {
      const st = getBookingStatus(b);
      if (st === "confirmed" && !isStayPassed(b)) {
        upcoming++;
      } else if (st === "accepted" || st === "payment_pending") {
        actionNeeded++;
      } else if (st === "requested") {
        pending++;
      } else if (st === "completed" || (st === "confirmed" && isStayPassed(b))) {
        completed++;
      } else if (st === "cancelled" || st === "rejected") {
        cancelled++;
      }
    });

    return {
      all: bookings.length,
      upcoming,
      action_needed: actionNeeded,
      pending,
      completed,
      cancelled,
      visits: visits.length,
    };
  }, [bookings, visits]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = getBookingStatus(b);
      if (activeTab === "upcoming") {
        return st === "confirmed" && !isStayPassed(b);
      }
      if (activeTab === "action_needed") {
        return st === "accepted" || st === "payment_pending";
      }
      if (activeTab === "pending") {
        return st === "requested";
      }
      if (activeTab === "completed") {
        return st === "completed" || (st === "confirmed" && isStayPassed(b));
      }
      if (activeTab === "cancelled") {
        return st === "cancelled" || st === "rejected";
      }
      return true;
    });
  }, [bookings, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-10 flex-1">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-muted border border-border">
                Guest Trips & Reservations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl">
              Track your upcoming stays, scheduled in-person visits, and payments directly with verified hosts.
            </p>
          </div>

          {/* Filter Dropdown with Live Counts */}
          <StatusFilterDropdown<TripFilter>
            labelPrefix="Status"
            headerTitle="Filter by Status"
            options={[
              { label: "All Stays", value: "all", count: counts.all },
              { label: "Upcoming", value: "upcoming", count: counts.upcoming },
              { label: "Awaiting Payment", value: "action_needed", count: counts.action_needed },
              { label: "Pending Host", value: "pending", count: counts.pending },
              { label: "Completed", value: "completed", count: counts.completed },
              { label: "Cancelled", value: "cancelled", count: counts.cancelled },
              { label: "Scheduled Visits", value: "visits", count: counts.visits },
            ]}
            activeValue={activeTab}
            onChange={(val) => setActiveTab(val)}
            className="w-full sm:w-auto"
            buttonClassName="w-full sm:w-auto"
          />
        </div>

        {/* Global Action Banner */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              bannerMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <span className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="ml-4 text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Section */}
        {authLoading || loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-surface-muted animate-pulse border border-border"
              />
            ))}
          </div>
        ) : activeTab === "visits" ? (
          visits.length > 0 ? (
            <div className="space-y-4">
              {visits.map((v) => {
                const isScheduled = v.status === "scheduled";
                const refText = v.referenceId || v.visitId || "—";
                return (
                  <div
                    key={v.visitId || v.id}
                    className="group relative rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-subtle hover:shadow-elevated transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                      <div className="h-28 w-full sm:w-32 rounded-xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                        {v.propertyImage ? (
                          <img
                            src={v.propertyImage}
                            alt={v.propertyTitle || "Property"}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                            <Building2Icon className="w-7 h-7 stroke-[1.5]" />
                            <span className="text-[10px] font-bold mt-1 text-muted-light">StayTrack</span>
                          </div>
                        )}
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-700 text-white backdrop-blur-xs">
                          VISIT PASS
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge
                            variant={isScheduled ? "success" : v.status === "completed" ? "neutral" : "error"}
                            pulseDot={isScheduled}
                            size="sm"
                          >
                            {isScheduled ? "Visit Scheduled" : v.status === "completed" ? "Completed" : "Cancelled"}
                          </Badge>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-muted text-muted border border-border">
                            Zero Inventory Hold
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleCopyRef(refText, e)}
                            title="Copy reference ID"
                            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground font-mono bg-surface-muted px-2 py-0.5 rounded-md border border-border transition-colors cursor-pointer"
                          >
                            <span>Ref: #{refText}</span>
                            {copiedId === refText ? (
                              <CheckIcon className="w-3 h-3 text-success shrink-0" />
                            ) : (
                              <CopyIcon className="w-3 h-3 text-muted shrink-0" />
                            )}
                          </button>
                        </div>

                        <h3 className="text-base font-bold text-foreground truncate">
                          <Link
                            href={`/properties/${v.propertyId}`}
                            className="hover:text-primary transition-colors"
                          >
                            {v.propertyTitle || `Property #${v.propertyId}`}
                          </Link>
                        </h3>

                        <div className="flex items-center gap-1 text-xs text-muted font-medium mt-0.5">
                          <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
                          <span className="truncate">{[v.area, v.city].filter(Boolean).join(", ") || "Delhi NCR"}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground/80 font-medium">
                          <div className="flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              <strong>Visit Date:</strong> {v.visitDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              <strong>Time Window:</strong> {v.timeSlot}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              <strong>Visitor:</strong> {v.visitorName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                          Visit Pass Status
                        </span>
                        <span className="text-xs font-bold text-emerald-600 capitalize">
                          {isScheduled ? "Confirmed with Host" : v.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => setVisitPassModalTarget(v)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-subtle transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                        >
                          <ShieldCheckIcon className="w-3.5 h-3.5" />
                          <span>Show Confirmation Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleVisitChat(v)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                        >
                          <MessageCircleIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Chat with Host</span>
                        </button>

                        {isScheduled && (
                          <button
                            type="button"
                            onClick={() => setVisitCancelModalTarget(v)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-light border border-error/25 transition-all cursor-pointer focus-ring"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-surface p-8 shadow-2xs">
              <div className="h-14 w-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-muted mx-auto mb-3">
                <CalendarDaysIcon className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                No Scheduled Visits
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                You do not have any in-person property walkthroughs scheduled. Explore PG and Hostel accommodations to schedule a free tour.
              </p>
              <Link
                href="/properties"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity shadow-subtle focus-ring"
              >
                <span>Explore Stays</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Scheduled In-Person Visits Section (shown on All Stays / Upcoming) */}
            {visits.length > 0 && (activeTab === "all" || activeTab === "upcoming") && (
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">
                      Scheduled In-Person Visits ({visits.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("visits")}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    View All Visits
                  </button>
                </div>

                <div className="space-y-3">
                  {visits.slice(0, 2).map((v) => {
                    const isScheduled = v.status === "scheduled";
                    const refText = v.referenceId || v.visitId || "—";
                    return (
                      <div
                        key={`top-visit-${v.visitId || v.id}`}
                        className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-surface text-foreground border border-border">
                              Ref: #{refText}
                            </span>
                            <Badge variant={isScheduled ? "success" : "neutral"} size="sm">
                              {isScheduled ? "Visit Scheduled" : v.status}
                            </Badge>
                            <span className="text-[11px] text-muted">
                              Zero Inventory Hold
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-foreground truncate">
                            <Link href={`/properties/${v.propertyId}`} className="hover:underline">
                              {v.propertyTitle || "Property Tour"}
                            </Link>
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-muted font-medium flex-wrap">
                            <span>{[v.area, v.city].filter(Boolean).join(", ") || "Delhi NCR"}</span>
                            <span>•</span>
                            <span>Date: {v.visitDate}</span>
                            <span>•</span>
                            <span>Slot: {v.timeSlot}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setVisitPassModalTarget(v)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            <span>Show Pass</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVisitChat(v)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground bg-surface border border-border hover:bg-surface-muted transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <MessageCircleIcon className="w-3.5 h-3.5 text-primary" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.map((b, idx) => {
                  const id = getBookingId(b);
                  const st = getBookingStatus(b);
                  const amount = getBookingAmount(b);
                  const badgeVariant = getBookingStatusBadgeVariant(st);
                  const rawCat = (b.category || "").toUpperCase();
                  const isDirectAccommodation = Boolean(
                    b.isDirectBooking ||
                    rawCat === "HOTEL" || rawCat === "HOTELS" ||
                    rawCat === "BNB" || rawCat === "BNBS" || rawCat === "B&B" ||
                    rawCat === "BED & BREAKFAST" || rawCat === "BED AND BREAKFAST" || rawCat === "BED_AND_BREAKFAST" ||
                    rawCat === "VACATIONSTAY" || rawCat === "VACATION_STAY" || rawCat === "ROOM" ||
                    (rawCat === "HOSTEL" && b.bookingType === "daily")
                  );
                  const isTerminal = st === "confirmed" || st === "cancelled" || st === "rejected" || st === "expired";
                  const isDirectPaymentRequired = isDirectAccommodation && !isTerminal && b.paymentStatus !== "captured";
                  const isAccepted = st === "accepted" || st === "payment_pending" || isDirectPaymentRequired;
                  const cancellable = isBookingCancellable(b);
                  const duration = calculateStayDuration(b);

                  const propertyTitle = b.propertyTitle || `Stay #${b.propertyId?.slice(0, 8) || "Reservation"}`;
                  const locationText = [b.area, b.city].filter(Boolean).join(", ") || "Delhi NCR";
                  const stayModel = b.bookingType ? b.bookingType.toUpperCase() : "STAY";

                  return (
                    <div
                      key={id || `booking-card-${idx}`}
                      className="group relative rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-subtle hover:shadow-elevated transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      {/* Left: Thumbnail & Core Details */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                        {/* Thumbnail Image with Architectural Fallback */}
                        <div className="h-28 w-full sm:w-32 rounded-xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                          {b.propertyImage ? (
                            <img
                              src={b.propertyImage}
                              alt={propertyTitle}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                              <Building2Icon className="w-7 h-7 stroke-[1.5]" />
                              <span className="text-[10px] font-bold mt-1 text-muted-light">StayTrack</span>
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                            {stayModel}
                          </span>
                        </div>

                        {/* Metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge
                              variant={isDirectPaymentRequired ? "warning" : badgeVariant}
                              pulseDot={st === "requested" || st === "payment_pending" || st === "accepted" || isDirectPaymentRequired}
                              size="sm"
                            >
                              {isDirectAccommodation && !isTerminal
                                ? "Direct Reservation — Payment Required"
                                : getBookingStatusLabel(st, "customer")}
                            </Badge>

                            <button
                              type="button"
                              onClick={(e) => handleCopyRef(id, e)}
                              title="Copy reference ID"
                              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground font-mono bg-surface-muted px-2 py-0.5 rounded-md border border-border transition-colors cursor-pointer"
                            >
                              <span>Ref: #{id ? id.slice(0, 8) : "—"}</span>
                              {copiedId === id ? (
                                <CheckIcon className="w-3 h-3 text-success shrink-0" />
                              ) : (
                                <CopyIcon className="w-3 h-3 text-muted shrink-0" />
                              )}
                            </button>
                          </div>

                          <h3 className="text-base font-bold text-foreground truncate">
                            <Link
                              href={`/properties/${b.propertyId}`}
                              className="hover:text-primary transition-colors"
                            >
                              {propertyTitle}
                            </Link>
                          </h3>

                          <div className="flex items-center gap-1 text-xs text-muted font-medium mt-0.5">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
                            <span className="truncate">{locationText}</span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-3 text-xs text-foreground/80 font-medium flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span>{b.startDate || "Date TBD"} → {b.endDate || "Date TBD"}</span>
                            </span>

                            <span className="text-muted-light">•</span>

                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface-muted text-foreground border border-border">
                              {duration}
                            </span>

                            {b.startTime && (
                              <span className="flex items-center gap-1 text-muted">
                                <ClockIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span>{b.startTime} - {b.endTime || "TBD"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Pricing & Role Actions */}
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                        <div className="text-left md:text-right">
                          <span className="text-[11px] text-muted font-semibold uppercase tracking-wider block">
                            Total Amount
                          </span>
                          <span className="text-xl font-black text-foreground">
                            ₹{amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted font-medium block capitalize mt-0.5">
                            Payment: {b.paymentStatus === "captured" ? "Completed" : b.paymentStatus || "Created"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isAccepted && (
                            <button
                              type="button"
                              onClick={() => setCheckoutTarget(b)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-all shadow-subtle cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                            >
                              <CreditCardIcon className="w-3.5 h-3.5" />
                              <span>Pay Now</span>
                            </button>
                          )}

                          {cancellable && (
                            <button
                              type="button"
                              onClick={() => setCancelModalTarget(b)}
                              disabled={actionLoadingId === id}
                              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-light border border-error/25 transition-all cursor-pointer disabled:opacity-50 focus-ring"
                            >
                              Cancel
                            </button>
                          )}

                          <Link
                            href={`/trips/${id}`}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all shadow-2xs inline-flex items-center gap-1 focus-ring"
                          >
                            <span>View Details</span>
                            <ArrowRightIcon className="w-3.5 h-3.5 text-muted" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-surface p-8 shadow-2xs">
                <div className="h-14 w-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-muted mx-auto mb-3">
                  <LuggageIcon className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {activeTab === "all"
                    ? "No reservations found"
                    : activeTab === "upcoming"
                    ? "No upcoming stays"
                    : activeTab === "action_needed"
                    ? "No payments pending"
                    : activeTab === "pending"
                    ? "No pending host reviews"
                    : activeTab === "completed"
                    ? "No past completed stays"
                    : "No cancelled bookings"}
                </h3>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  {activeTab === "all"
                    ? "You haven't made any guest reservations yet. Discover verified accommodations across Delhi NCR."
                    : activeTab === "upcoming"
                    ? "You don't have any upcoming trips scheduled. Ready to find your next place?"
                    : activeTab === "action_needed"
                    ? "You're all caught up! No reservations are waiting for payment."
                    : activeTab === "pending"
                    ? "No requests currently waiting for host response."
                    : activeTab === "completed"
                    ? "Completed stays will appear here after your trip concludes."
                    : "Cancelled or rejected reservations will be archived here."}
                </p>
                <Link
                  href="/properties"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity shadow-subtle focus-ring"
                >
                  <span>Explore Stays</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Accessible In-App Cancellation Confirmation Modal */}
        {cancelModalTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-surface rounded-3xl border border-border shadow-elevated p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-error shrink-0" />
                  <span>Cancel Booking Reservation?</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCancelModalTarget(null)}
                  disabled={actionLoadingId === getBookingId(cancelModalTarget)}
                  className="p-1 rounded-lg text-muted hover:text-foreground cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted border border-border space-y-1">
                <p className="text-xs font-bold text-foreground">
                  {cancelModalTarget.propertyTitle || "Reservation"}
                </p>
                <p className="text-[11px] text-muted">
                  Dates: {cancelModalTarget.startDate || "TBD"} → {cancelModalTarget.endDate || "TBD"}
                </p>
                <p className="text-[10px] text-muted font-mono">
                  Ref: #{getBookingId(cancelModalTarget).slice(0, 8)}
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold">Cancellation Consequences:</p>
                <p className="text-[11px] leading-relaxed">
                  {getBookingStatus(cancelModalTarget) === "confirmed"
                    ? "Your accommodation dates will be released back to the host immediately. Any applicable refund will follow standard platform payment processing timelines."
                    : "Your booking request will be withdrawn and dates released. No payment has been charged."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalTarget(null)}
                  disabled={actionLoadingId === getBookingId(cancelModalTarget)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border cursor-pointer transition-colors"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoadingId === getBookingId(cancelModalTarget)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-error hover:bg-error/90 cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionLoadingId === getBookingId(cancelModalTarget) ? (
                    <span>Cancelling...</span>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled In-Person Visit Confirmation Pass Modal */}
        {visitPassModalTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-surface rounded-3xl border border-border shadow-elevated p-6 sm:p-7 max-w-lg w-full space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                      PASS: #{visitPassModalTarget.referenceId || visitPassModalTarget.visitId}
                    </span>
                    <Badge variant={visitPassModalTarget.status === "scheduled" ? "success" : "neutral"} size="sm">
                      {visitPassModalTarget.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                    In-Person Visit Pass
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVisitPassModalTarget(null)}
                  className="p-1 rounded-lg text-muted hover:text-foreground cursor-pointer"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Pass Card Body */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-surface to-surface-muted border border-border space-y-4">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {visitPassModalTarget.propertyTitle || "Accommodation Tour"}
                  </h4>
                  <p className="text-xs text-muted font-medium flex items-center gap-1 mt-0.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{[visitPassModalTarget.area, visitPassModalTarget.city].filter(Boolean).join(", ") || "Delhi NCR"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/80">
                  <div className="p-3 rounded-xl bg-surface border border-border/60">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                      Confirmed Date
                    </span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      {visitPassModalTarget.visitDate}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border/60">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                      Time Slot
                    </span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      {visitPassModalTarget.timeSlot}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                      Visitor Name
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {visitPassModalTarget.visitorName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                      Platform Pass
                    </span>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      StayTrack Verified
                    </span>
                  </div>
                </div>

                {visitPassModalTarget.notes && (
                  <div className="p-2.5 rounded-xl bg-surface-muted/60 text-[11px] text-muted">
                    <strong className="text-foreground">Notes:</strong> {visitPassModalTarget.notes}
                  </div>
                )}
              </div>

              {/* Instructions banner */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Present to Host Upon Arrival:</strong> Show this confirmation pass to verify your appointment. Zero inventory hold was placed on accommodation rooms.
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleVisitChat(visitPassModalTarget)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-950 hover:bg-black transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 focus-ring"
                >
                  <MessageCircleIcon className="w-3.5 h-3.5" />
                  <span>Chat with Host</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {visitPassModalTarget.status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => {
                        setVisitCancelModalTarget(visitPassModalTarget);
                        setVisitPassModalTarget(null);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-light border border-error/25 cursor-pointer transition-colors"
                    >
                      Cancel Visit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVisitPassModalTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border cursor-pointer transition-colors"
                  >
                    Close Pass
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visit Cancellation Modal */}
        {visitCancelModalTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-surface rounded-3xl border border-border shadow-elevated p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-error shrink-0" />
                  <span>Cancel Scheduled Visit?</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setVisitCancelModalTarget(null)}
                  disabled={cancellingVisitId !== null}
                  className="p-1 rounded-lg text-muted hover:text-foreground cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted border border-border space-y-1">
                <p className="text-xs font-bold text-foreground">
                  {visitCancelModalTarget.propertyTitle || "Accommodation Tour"}
                </p>
                <p className="text-[11px] text-muted">
                  Date: {visitCancelModalTarget.visitDate} ({visitCancelModalTarget.timeSlot})
                </p>
                <p className="text-[10px] text-muted font-mono">
                  Ref: #{visitCancelModalTarget.referenceId || visitCancelModalTarget.visitId}
                </p>
              </div>

              <p className="text-xs text-muted">
                Are you sure you want to cancel this in-person walkthrough? The host will be notified of the cancellation.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVisitCancelModalTarget(null)}
                  disabled={cancellingVisitId !== null}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border cursor-pointer transition-colors"
                >
                  Keep Visit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelVisit}
                  disabled={cancellingVisitId !== null}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-error hover:bg-error/90 cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {cancellingVisitId ? <span>Cancelling...</span> : <span>Confirm Cancellation</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Checkout & Payment Recovery Modal */}
        <CheckoutModal
          booking={checkoutTarget}
          isOpen={Boolean(checkoutTarget)}
          onClose={() => setCheckoutTarget(null)}
          onPaymentSuccess={() => {
            setBannerMessage({
              type: "success",
              text: "Payment verified successfully! Your stay reservation is confirmed.",
            });
            fetchData();
          }}
          userEmail={firebaseUser?.email || undefined}
          userName={firebaseUser?.displayName || undefined}
        />
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
