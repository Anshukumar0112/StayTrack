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
  createBookingOrder,
  verifyBookingPayment,
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
  getBookingStatusBadge,
} from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

  const fetchBooking = () => {
    setLoading(true);
    setErrorMessage(null);
    getBooking(bookingId)
      .then((data) => {
        if (data) setBooking(data);
        else setErrorMessage("Booking reservation was not found.");
      })
      .catch((err) => {
        console.warn("Failed to fetch booking details:", err);
        setErrorMessage(err.message || "Unable to access booking details.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();

    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [bookingId]);

  // Determine user perspective
  const isHost = Boolean(firebaseUser && booking && firebaseUser.uid === booking.hostId);
  const isGuest = Boolean(firebaseUser && booking && firebaseUser.uid === booking.customerId);
  const isAdmin = userProfile?.role === "admin";
  const userPerspective: "host" | "customer" = isHost ? "host" : "customer";

  const st = booking ? getBookingStatus(booking) : "";
  const amount = booking ? getBookingAmount(booking) : 0;
  const displayId = booking ? getBookingId(booking) : bookingId;
  const badge = getBookingStatusBadge(st);

  const isAccepted = st === "accepted" || st === "payment_pending";
  const isConfirmed = st === "confirmed";
  const isPending = st === "requested";

  // Guest actions
  const handlePayNow = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const orderRes = await createBookingOrder(bookingId);

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Accommodation",
        description: `Reservation #${displayId.slice(0, 8)}`,
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifyBookingPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccessMessage("Payment verified successfully! Your booking is confirmed 🎉");
            fetchBooking();
          } catch (err: any) {
            setErrorMessage("Payment verification failed: " + (err.message || "Unknown error"));
          }
        },
        theme: { color: "#111716" },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Payment gateway is loading. Please retry in a few moments.");
      }
    } catch (err: any) {
      setErrorMessage("Failed to initiate payment: " + (err.message || "Please try again"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGuest = async () => {
    if (!confirm("Are you sure you want to cancel this booking request?")) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await cancelBooking(bookingId);
      setSuccessMessage("Your booking has been cancelled.");
      fetchBooking();
    } catch (err: any) {
      setErrorMessage("Failed to cancel booking: " + (err.message || "Please try again"));
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

      <main className="stay-container pt-8 pb-24 md:py-10 flex-1 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-medium text-muted">
          {isHost ? (
            <>
              <Link href="/host/bookings" className="hover:text-foreground transition-colors">
                Host Bookings
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link href="/trips" className="hover:text-foreground transition-colors">
                My Bookings
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-semibold">
            Reservation #{displayId ? displayId.slice(0, 8) : "—"}
          </span>
        </nav>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200 flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between">
            <span>🎉 {successMessage}</span>
            <button
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
            <span className="text-4xl block mb-3">🧳</span>
            <h3 className="text-base font-bold text-foreground">Reservation Not Found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              This reservation may have been deleted, or you may not have access to view it.
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
            {/* Top Card: Property & Status */}
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border">
                <div className="flex items-start gap-4">
                  {/* Property Image */}
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                    {booking.propertyImage ? (
                      <img
                        src={booking.propertyImage}
                        alt={booking.propertyTitle || "Property"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl select-none" role="img" aria-label="Stay">
                        🏡
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                      {booking.bookingType || "STAY"}
                    </span>
                  </div>

                  {/* Title & Perspective Badge */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
                        {getBookingStatusLabel(st, userPerspective)}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-muted border border-border">
                        {isHost ? "Host View" : isGuest ? "Guest View" : "Admin View"}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      {booking.propertyTitle || `Property #${booking.propertyId}`}
                    </h1>

                    <p className="text-xs text-muted font-medium mt-1">
                      📍 {[booking.area, booking.city].filter(Boolean).join(", ") || "Delhi NCR"}
                    </p>

                    <p className="text-xs text-muted font-mono mt-1">
                      Reference ID: {displayId}
                    </p>
                  </div>
                </div>

                {/* Price Display */}
                <div className="text-left sm:text-right shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-border">
                  <span className="text-xs text-muted font-semibold uppercase tracking-wider block">
                    {isHost ? "Booking Payout" : "Total Amount"}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    ₹{amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted block capitalize mt-0.5">
                    Payment Status: {booking.paymentStatus || "created"}
                  </span>
                </div>
              </div>

              {/* Middle Section: Dates & Timing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-2xl bg-surface-muted border border-border">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1">
                    Check-In Schedule
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {booking.startDate || "Date TBD"}
                  </span>
                  {booking.startTime && (
                    <span className="text-xs text-muted block mt-0.5">
                      Check-in time: {booking.startTime}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-surface-muted border border-border">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1">
                    Check-Out Schedule
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {booking.endDate || "Date TBD"}
                  </span>
                  {booking.endTime && (
                    <span className="text-xs text-muted block mt-0.5">
                      Check-out time: {booking.endTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Role-Specific Information Panel */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border mb-6">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                  {isHost ? "Guest Contact Details" : "Host & Check-in Assistance"}
                </h3>

                {isHost ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {booking.guestName || booking.userName || "Guest"}
                      </p>
                      {booking.contactPhone && (
                        <p className="text-xs text-muted font-medium mt-0.5">
                          📞 Phone: {booking.contactPhone}
                        </p>
                      )}
                      <p className="text-xs text-muted font-mono mt-0.5">
                        Guest UID: {booking.customerId || "—"}
                      </p>
                    </div>

                    <button
                      onClick={handleChat}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all cursor-pointer"
                    >
                      <span>💬 Chat with Guest</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Property Host
                      </p>
                      <p className="text-xs text-muted font-medium mt-0.5">
                        Direct messaging is available for check-in coordination and directions.
                      </p>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        Host Reference: {booking.hostId ? booking.hostId.slice(0, 10) + "..." : "—"}
                      </p>
                    </div>

                    <button
                      onClick={handleChat}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all cursor-pointer"
                    >
                      <span>💬 Chat with Host</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-6 border-t border-border flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/properties/${booking.propertyId}`}
                    className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold transition-all shadow-2xs"
                  >
                    View Property Page →
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  {/* Host Specific Action Buttons */}
                  {isHost && isPending && (
                    <>
                      <button
                        onClick={handleAcceptHost}
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-subtle transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? "Processing..." : "✓ Accept Reservation"}
                      </button>

                      <button
                        onClick={handleRejectHost}
                        disabled={actionLoading}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* Guest Specific Action Buttons */}
                  {isGuest && isAccepted && (
                    <button
                      onClick={handlePayNow}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-subtle transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? "Processing..." : "💳 Pay Now (Razorpay)"}
                    </button>
                  )}

                  {isGuest && isPending && (
                    <button
                      onClick={handleCancelGuest}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? "Cancelling..." : "Cancel Booking Request"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
