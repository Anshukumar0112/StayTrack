/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getBooking,
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
  calculateStayDuration,
} from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import BackButton from "@/components/ui/BackButton";
import Badge from "@/components/ui/Badge";
import {
  Building2Icon,
  MapPinIcon,
  LuggageIcon,
  PhoneIcon,
  MessageCircleIcon,
  CheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExternalLinkIcon,
  CopyIcon,
  ShieldCheckIcon,
  CloseIcon,
} from "@/components/ui/Icons";

export default function HostBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuthGuard();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const st = booking ? getBookingStatus(booking) : "";
  const amount = booking ? getBookingAmount(booking) : 0;
  const displayId = booking ? getBookingId(booking) : bookingId;
  const badgeVariant = getBookingStatusBadgeVariant(st);
  const stayDuration = booking ? calculateStayDuration(booking) : "Stay";

  const isPending = st === "requested";
  const isAccepted = st === "accepted" || st === "payment_pending";
  const isConfirmed = st === "confirmed" || booking?.paymentStatus === "captured";

  const handleCopyRef = () => {
    if (!navigator.clipboard || !displayId) return;
    navigator.clipboard.writeText(displayId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleAcceptHost = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await acceptBooking(bookingId);
      setSuccessMessage("Booking request accepted! The guest has been notified to complete payment.");
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
    const targetUserId = booking.customerId;
    if (!targetUserId) {
      router.push("/host/messages");
      return;
    }

    try {
      await createConversation({
        participantId: targetUserId,
        propertyId: booking.propertyId,
      });
      router.push("/host/messages");
    } catch {
      router.push("/host/messages");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <BackButton
          fallbackUrl="/host/bookings"
          label="Back to Booking Requests"
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
        <div className="p-4 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200 flex items-center justify-between">
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
        <div className="p-4 rounded-2xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between">
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
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading reservation details...</p>
        </div>
      ) : !booking ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface p-8 shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
            <LuggageIcon className="w-6 h-6 text-muted" />
          </div>
          <h3 className="text-base font-bold text-foreground">Reservation Not Found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            This reservation may have been deleted, or you may not have authorization to view it.
          </p>
          <Link
            href="/host/bookings"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <span>Return to Host Bookings</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Hero Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge
                  variant={badgeVariant}
                  pulseDot={st === "requested" || st === "payment_pending" || st === "accepted"}
                  size="md"
                >
                  {getBookingStatusLabel(st, "host")}
                </Badge>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-muted border border-border">
                  Host Reservation View
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                  Payment Status
                </span>
                <span className="text-xs font-bold text-foreground capitalize">
                  {booking.paymentStatus === "captured"
                    ? "Completed (Razorpay)"
                    : booking.paymentStatus || "Pending"}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                {getBookingStatusDescription(st, "host")}
              </p>
            </div>
          </div>

          {/* Main Grid: Details & Payout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Property, Guest & Stay */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Details */}
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-24 w-full sm:w-28 rounded-xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
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

                {/* Stay Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-surface-muted border border-border">
                    <div className="flex items-center gap-1.5 text-muted mb-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Check-In Date
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

                  <div className="p-4 rounded-xl bg-surface-muted border border-border">
                    <div className="flex items-center gap-1.5 text-muted mb-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Check-Out Date
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

                {/* Guest Contact Information */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-surface-muted border border-border">
                      <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Guest Name</span>
                      <span className="font-bold text-foreground">
                        {booking.guestName || booking.userName || "Primary Guest"}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-muted border border-border">
                      <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Contact Phone</span>
                      <span className="font-bold text-foreground">
                        {booking.contactPhone ? (
                          <a href={`tel:${booking.contactPhone}`} className="hover:underline flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5 text-primary" />
                            {booking.contactPhone}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Messaging Actions */}
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Guest Coordination
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Connect directly with the guest to confirm check-in instructions or verify stay requirements.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={handleChat}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-colors cursor-pointer"
                  >
                    <MessageCircleIcon className="w-4 h-4 text-primary" />
                    <span>Message Guest</span>
                  </button>

                  <Link
                    href={`/properties/${booking.propertyId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground border border-border bg-surface hover:bg-surface-muted transition-colors"
                  >
                    <span>View Property Listing</span>
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Payout Breakdown & Actions */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-5">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
                  Payout Summary
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-foreground/80">
                    <span>Stay Duration</span>
                    <span className="font-semibold text-foreground">{stayDuration}</span>
                  </div>

                  <div className="flex justify-between items-center text-foreground/80">
                    <span>Platform Commission</span>
                    <span className="font-semibold text-success">₹0 (Zero Fee)</span>
                  </div>

                  <div className="flex justify-between items-center text-foreground/80">
                    <span>Brokerage</span>
                    <span className="font-semibold text-success">₹0</span>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-baseline">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Host Total Payout
                    </span>
                    <span className="text-2xl font-black text-foreground">
                      ₹{amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-border space-y-2">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={handleAcceptHost}
                        disabled={actionLoading}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>{actionLoading ? "Processing..." : "Accept Reservation"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectHost}
                        disabled={actionLoading}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CloseIcon className="w-4 h-4" />
                        <span>{actionLoading ? "Processing..." : "Decline Reservation"}</span>
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Accepted. Waiting for guest to pay.</span>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Confirmed reservation. Payout queued.</span>
                    </div>
                  )}

                  {st === "rejected" && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-900">
                      This reservation was declined.
                    </div>
                  )}

                  {st === "cancelled" && (
                    <div className="p-3 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-muted">
                      This reservation was cancelled by the guest.
                    </div>
                  )}
                </div>
              </div>

              {/* Security Policy */}
              <div className="p-4 rounded-xl bg-surface border border-border text-xs text-muted space-y-1.5 shadow-subtle">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheckIcon className="w-4 h-4 text-primary" />
                  <span>StayTrack Host Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Payouts for confirmed reservations are initiated directly to your registered bank account 24 hours after successful guest check-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}