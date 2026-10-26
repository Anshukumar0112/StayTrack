/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getBooking,
  cancelBooking,
  acceptBooking,
  rejectBooking,
  createConversation,
} from "@/lib/api";
import {
  Booking,
  getBookingId,
  getBookingStatus,
  getBookingAmount,
  getBookingStatusLabel,
  getBookingStatusBadgeVariant,
  getBookingStatusDescription,
  isBookingCancellable,
  calculateStayDuration,
} from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import BackButton from "@/components/ui/BackButton";
import Badge from "@/components/ui/Badge";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import {
  Building2Icon,
  MapPinIcon,
  LuggageIcon,
  PhoneIcon,
  MessageCircleIcon,
  CheckIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExternalLinkIcon,
  CopyIcon,
  CloseIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";

export default function UnifiedBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const { firebaseUser, userProfile, loading: authLoading } = useAuthGuard();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const fetchBooking = () => {
    setLoading(true);
    setErrorMessage(null);
    getBooking(bookingId)
      .then((data) => {
        if (data) setBooking(data);
        else setErrorMessage("Reservation not found.");
      })
      .catch((err) => {
        console.warn("Failed to fetch booking details:", err);
        setErrorMessage(err.message || "Unable to access booking details.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  // Determine role perspective
  const isHost = Boolean(firebaseUser && booking && firebaseUser.uid === booking.hostId);
  const isGuest = Boolean(firebaseUser && booking && firebaseUser.uid === booking.customerId);
  const userPerspective: "host" | "customer" = isHost ? "host" : "customer";

  const st = booking ? getBookingStatus(booking) : "";
  const amount = booking ? getBookingAmount(booking) : 0;
  const displayId = booking ? getBookingId(booking) : bookingId;
  const badgeVariant = getBookingStatusBadgeVariant(st);
  const cancellable = booking ? isBookingCancellable(booking) : false;
  const stayDuration = booking ? calculateStayDuration(booking) : "Stay";

  const rawCat = (booking?.category || booking?.propertyType || "").toUpperCase();
  const isDirectAccommodation = Boolean(
    booking?.isDirectBooking ||
    rawCat === "HOTEL" || rawCat === "HOTELS" ||
    rawCat === "BNB" || rawCat === "BNBS" || rawCat === "B&B" ||
    rawCat === "BED & BREAKFAST" || rawCat === "BED AND BREAKFAST" || rawCat === "BED_AND_BREAKFAST" ||
    rawCat === "VACATIONSTAY" || rawCat === "VACATION_STAY" || rawCat === "ROOM" ||
    (rawCat === "HOSTEL" && booking?.bookingType === "daily")
  );

  const isTerminal = st === "confirmed" || st === "cancelled" || st === "rejected" || st === "expired";
  const isDirectPaymentRequired = isDirectAccommodation && !isHost && !isTerminal && booking?.paymentStatus !== "captured";

  const isAccepted = st === "accepted" || st === "payment_pending" || isDirectPaymentRequired;
  const isConfirmed = st === "confirmed" || booking?.paymentStatus === "captured";
  const isPending = !isDirectAccommodation && st === "requested";

  const handleCopyRef = () => {
    if (!navigator.clipboard || !displayId) return;
    navigator.clipboard.writeText(displayId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleConfirmCancelGuest = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await cancelBooking(bookingId);
      setSuccessMessage("Your reservation has been cancelled.");
      setShowCancelModal(false);
      fetchBooking();
    } catch (err: any) {
      setErrorMessage("Failed to cancel reservation: " + (err.message || "Please try again"));
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Host actions
  const handleAcceptHost = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await acceptBooking(bookingId);
      setSuccessMessage("Booking request accepted! Guest has been notified to complete payment.");
      fetchBooking();
    } catch (err: any) {
      setErrorMessage("Failed to accept booking: " + (err.message || "Please try again"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectHost = async () => {
    if (!confirm("Are you sure you want to decline this booking request?")) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await rejectBooking(bookingId);
      setSuccessMessage("Booking request has been declined.");
      fetchBooking();
    } catch (err: any) {
      setErrorMessage("Failed to decline booking: " + (err.message || "Please try again"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = async () => {
    if (!booking) return;
    const targetUserId = isHost ? booking.customerId : booking.hostId;
    if (!targetUserId) {
      router.push("/chat");
      return;
    }

    try {
      await createConversation({
        participantId: targetUserId,
        propertyId: booking.propertyId,
      });
      router.push("/chat");
    } catch {
      router.push("/chat");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-10 flex-1 max-w-5xl">
        {/* Navigation & Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <BackButton
            fallbackUrl={isHost ? "/host/bookings" : "/trips"}
            label={isHost ? "Back to Host Bookings" : "Back to My Bookings"}
            className="text-xs font-semibold"
          />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted bg-surface-muted border border-border px-2.5 py-1 rounded-lg">
              Ref: #{displayId ? displayId.slice(0, 8) : "—"}
            </span>
            <button
              type="button"
              onClick={handleCopyRef}
              title="Copy full reference ID"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-foreground bg-surface-muted hover:bg-border/60 border border-border px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {copiedRef ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Feedback Banners */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-border bg-surface p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-muted">Loading reservation details...</p>
          </div>
        ) : !booking ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-surface p-8 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
              <LuggageIcon className="w-6 h-6 text-muted" />
            </div>
            <h3 className="text-base font-bold text-foreground">Reservation Not Found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              This reservation may have been deleted, or you may not have authorization to view it.
            </p>
            <Link
              href={isHost ? "/host/bookings" : "/trips"}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span>Return to {isHost ? "Host Bookings" : "My Bookings"}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Hero Card */}
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge
                    variant={isDirectPaymentRequired ? "warning" : badgeVariant}
                    pulseDot={st === "requested" || st === "payment_pending" || st === "accepted" || isDirectPaymentRequired}
                    size="md"
                  >
                    {isDirectAccommodation && !isHost && !isConfirmed && !isTerminal
                      ? "Direct Reservation — Payment Required"
                      : getBookingStatusLabel(st, userPerspective)}
                  </Badge>

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-muted border border-border">
                    {isHost ? "Host Perspective" : "Guest Perspective"}
                  </span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                    Payment Status
                  </span>
                  <span className="text-xs font-bold text-foreground capitalize">
                    {booking.paymentStatus === "captured"
                      ? "Completed (Razorpay)"
                      : booking.paymentStatus || "Created"}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                  {isDirectAccommodation && !isHost && !isConfirmed && !isTerminal
                    ? "Direct reservation held with property! Complete payment within 30 minutes to confirm your stay."
                    : getBookingStatusDescription(st, userPerspective)}
                </p>
              </div>
            </div>

            {/* Main Content Grid: 2-Columns on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 spans): Property & Stay Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Property & Schedule Card */}
                <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-subtle space-y-6">
                  {/* Property Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="h-24 w-full sm:w-28 rounded-2xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                      {booking.propertyImage ? (
                        <img
                          src={booking.propertyImage}
                          alt={booking.propertyTitle || "Property"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                          <Building2Icon className="w-8 h-8 text-muted stroke-[1.5]" />
                          <span className="text-[9px] font-bold mt-0.5 text-muted-light">StayTrack</span>
                        </div>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        {booking.bookingType || "STAY"}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface-muted text-muted border border-border">
                          {stayDuration}
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                        <Link
                          href={`/properties/${booking.propertyId}`}
                          className="hover:text-primary transition-colors"
                        >
                          {booking.propertyTitle || `Property #${booking.propertyId}`}
                        </Link>
                      </h2>

                      <p className="text-xs text-muted font-medium mt-1 flex items-center gap-1">
                        <MapPinIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span>{[booking.area, booking.city].filter(Boolean).join(", ") || "Delhi NCR"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Stay Dates Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-surface-muted border border-border">
                      <div className="flex items-center gap-1.5 text-muted mb-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Check-In Schedule
                        </span>
                      </div>
                      <p className="text-base font-extrabold text-foreground">
                        {booking.startDate || "Date TBD"}
                      </p>
                      {booking.startTime && (
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-muted shrink-0" />
                          <span>Entry from {booking.startTime}</span>
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-muted border border-border">
                      <div className="flex items-center gap-1.5 text-muted mb-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Check-Out Schedule
                        </span>
                      </div>
                      <p className="text-base font-extrabold text-foreground">
                        {booking.endDate || "Date TBD"}
                      </p>
                      {booking.endTime && (
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-muted shrink-0" />
                          <span>Until {booking.endTime}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Guest Information */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                      Guest & Reservation Contact
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-foreground">
                          {booking.guestName || booking.userName || "Primary Guest"}
                        </span>
                        {booking.contactPhone && (
                          <span className="text-muted block sm:inline sm:ml-2">
                            • Phone: {booking.contactPhone}
                          </span>
                        )}
                      </div>
                      <span className="text-muted font-mono text-[11px]">
                        Guest ID: {booking.customerId ? booking.customerId.slice(0, 10) + "..." : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Assistance & Communication Card */}
                <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {isHost ? "Guest Messaging & Coordination" : "Direct Host Communication"}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {isHost
                          ? "Message the guest to confirm check-in instructions or verify key handover."
                          : "Coordinate arrival, key collection, and house rules directly with the verified host."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap pt-2">
                    <button
                      type="button"
                      onClick={handleChat}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-colors cursor-pointer focus-ring"
                    >
                      <MessageCircleIcon className="w-4 h-4 text-primary" />
                      <span>{isHost ? "Chat with Guest" : "Chat with Host"}</span>
                    </button>

                    <Link
                      href={`/properties/${booking.propertyId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground border border-border bg-surface hover:bg-surface-muted transition-colors focus-ring"
                    >
                      <span>View Listing</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Cancellation Policy Card */}
                <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-subtle space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      Cancellation Policy & Timelines
                    </h3>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    Reservations may be cancelled at any time prior to the scheduled check-in date and start time.
                    Once the check-in date has commenced, cancellations cannot be processed through the system.
                  </p>

                  {isGuest && cancellable && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-light border border-error/25 transition-colors cursor-pointer disabled:opacity-50 focus-ring"
                      >
                        Cancel This Reservation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (1 span): Itemized Pricing & Primary CTA */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-border bg-surface p-6 shadow-subtle space-y-5">
                  <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
                    Price Breakdown
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center text-foreground/80">
                      <span>Stay Duration</span>
                      <span className="font-semibold text-foreground">{stayDuration}</span>
                    </div>

                    <div className="flex justify-between items-center text-foreground/80">
                      <span>Platform Service Fee</span>
                      <span className="font-semibold text-success">₹0 (Free)</span>
                    </div>

                    <div className="flex justify-between items-center text-foreground/80">
                      <span>Direct Brokerage</span>
                      <span className="font-semibold text-success">₹0 (Zero Brokerage)</span>
                    </div>

                    <div className="pt-3 border-t border-border flex justify-between items-baseline">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {isHost ? "Host Payout" : "Total Amount"}
                      </span>
                      <span className="text-2xl font-black text-foreground">
                        ₹{amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Primary Role Action */}
                  <div className="pt-3 border-t border-border space-y-2">
                    {/* Guest: Awaiting Payment */}
                    {isGuest && isAccepted && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowCheckoutModal(true)}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-subtle transition-all cursor-pointer focus-ring"
                        >
                          <CreditCardIcon className="w-4 h-4" />
                          <span>Pay Now (Secure Razorpay)</span>
                        </button>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted">
                          <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>256-bit encrypted • UPI, Cards, Netbanking</span>
                        </div>
                      </div>
                    )}

                    {/* Guest: Confirmed Stay */}
                    {isGuest && isConfirmed && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dates confirmed and locked in.</span>
                      </div>
                    )}

                    {/* Guest: Pending Host */}
                    {isGuest && isPending && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Awaiting host response.</span>
                      </div>
                    )}

                    {/* Host Actions */}
                    {isHost && isPending && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleAcceptHost}
                          disabled={actionLoading}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 focus-ring"
                        >
                          <CheckIcon className="w-4 h-4" />
                          <span>{actionLoading ? "Processing..." : "Accept Reservation"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectHost}
                          disabled={actionLoading}
                          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 focus-ring"
                        >
                          Decline Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accessible In-App Cancellation Confirmation Modal */}
        {showCancelModal && booking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-surface rounded-3xl border border-border shadow-elevated p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-error shrink-0" />
                  <span>Cancel Booking Reservation?</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="p-1 rounded-lg text-muted hover:text-foreground cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted border border-border space-y-1">
                <p className="text-xs font-bold text-foreground">
                  {booking.propertyTitle || "Reservation"}
                </p>
                <p className="text-[11px] text-muted">
                  Dates: {booking.startDate || "TBD"} → {booking.endDate || "TBD"}
                </p>
                <p className="text-[10px] text-muted font-mono">
                  Ref: #{displayId.slice(0, 8)}
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold">Cancellation Consequences:</p>
                <p className="text-[11px] leading-relaxed">
                  {st === "confirmed"
                    ? "Your accommodation dates will be released back to the host immediately. Any applicable refund will follow standard platform payment processing timelines."
                    : "Your booking request will be withdrawn and dates released. No payment has been charged."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border cursor-pointer transition-colors"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelGuest}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-error hover:bg-error/90 cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? <span>Cancelling...</span> : <span>Confirm Cancellation</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Checkout & Payment Recovery Modal */}
        <CheckoutModal
          booking={booking}
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          onPaymentSuccess={() => {
            setSuccessMessage("Payment verified successfully! Your booking is confirmed.");
            fetchBooking();
          }}
          userEmail={firebaseUser?.email || undefined}
          userName={firebaseUser?.displayName || undefined}
          userPhone={booking?.contactPhone || undefined}
        />
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
