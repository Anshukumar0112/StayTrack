/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import Link from "next/link";
import { getMyBookings, createBookingOrder, verifyBookingPayment, cancelBooking } from "@/lib/api";
import { Booking, getBookingId, getBookingStatus, getBookingAmount, getBookingStatusLabel, getBookingStatusBadge } from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type TripFilter = "all" | "requested" | "payment_pending" | "confirmed" | "history";

export default function MyTripsPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripFilter>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBookings = () => {
    if (!firebaseUser) return;
    setLoading(true);
    getMyBookings()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch guest bookings:", err);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/trips", "customer");
    } else if (firebaseUser) {
      fetchBookings();
    }

    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [firebaseUser, authLoading]);

  const handlePayNow = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      const orderRes = await createBookingOrder(bookingId);

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Accommodation",
        description: `Reservation Payment #${bookingId.slice(0, 8)}`,
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifyBookingPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBannerMessage({
              type: "success",
              text: "Payment successful! Your stay is now confirmed 🎉",
            });
            fetchBookings();
          } catch (err: any) {
            setBannerMessage({
              type: "error",
              text: "Payment verification failed: " + (err.message || "Unknown error"),
            });
          }
        },
        theme: { color: "#111716" },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Payment gateway is loading. Please retry in a few seconds.");
      }
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to initiate payment: " + (err.message || "Please try again"),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking request?")) return;
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await cancelBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Booking request has been cancelled.",
      });
      fetchBookings();
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: "Failed to cancel booking: " + (err.message || "Please try again"),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = getBookingStatus(b);
      if (activeTab === "requested") return st === "requested";
      if (activeTab === "payment_pending") return st === "accepted" || st === "payment_pending";
      if (activeTab === "confirmed") return st === "confirmed";
      if (activeTab === "history") return st === "completed" || st === "cancelled" || st === "rejected";
      return true;
    });
  }, [bookings, activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="stay-container pt-8 pb-24 md:py-10 flex-1">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-muted text-foreground border border-border">
                Guest Portal
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Bookings</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Track your upcoming reservations, stay details, and complete pending payments directly with verified hosts.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-xl border border-border overflow-x-auto max-w-full">
            {[
              { label: "All Stays", value: "all" },
              { label: "Pending Host", value: "requested" },
              { label: "Awaiting Payment", value: "payment_pending" },
              { label: "Confirmed", value: "confirmed" },
              { label: "Past / Cancelled", value: "history" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as TripFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.value
                    ? "bg-surface text-foreground shadow-2xs border border-border/80"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Banner / Notification */}
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

        {/* Content Section */}
        {authLoading || loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 rounded-2xl bg-surface-muted animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((b, idx) => {
              const id = getBookingId(b);
              const st = getBookingStatus(b);
              const amount = getBookingAmount(b);
              const badge = getBookingStatusBadge(st);
              const isAccepted = st === "accepted" || st === "payment_pending";
              const isPending = st === "requested";

              const propertyTitle = b.propertyTitle || `Stay #${b.propertyId?.slice(0, 8) || "Reservation"}`;
              const locationText = [b.area, b.city].filter(Boolean).join(", ") || "Delhi NCR";
              const stayModel = b.bookingType ? b.bookingType.toUpperCase() : "STAY";

              return (
                <div
                  key={id || `booking-card-${idx}`}
                  className="group relative rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-subtle hover:shadow-elevated transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Thumbnail & Main Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                    {/* Thumbnail Image */}
                    <div className="h-24 w-full sm:w-28 rounded-xl bg-surface-muted border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                      {b.propertyImage ? (
                        <img
                          src={b.propertyImage}
                          alt={propertyTitle}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-3xl select-none" role="img" aria-label="Stay">
                          🏡
                        </span>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                        {stayModel}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {getBookingStatusLabel(st, "customer")}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          Ref: #{id ? id.slice(0, 8) : "—"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground truncate">
                        {propertyTitle}
                      </h3>

                      <p className="text-xs text-muted font-medium mt-0.5">
                        📍 {locationText}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-xs text-foreground/80 font-medium">
                        <span>
                          🗓️ {b.startDate || "Date tbd"} → {b.endDate || "Date tbd"}
                        </span>
                        {b.startTime && (
                          <span className="text-muted">
                            ⏰ {b.startTime} - {b.endTime || "TBD"}
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
                      <span className="text-xl font-extrabold text-foreground">
                        ₹{amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAccepted && (
                        <button
                          onClick={() => handlePayNow(id)}
                          disabled={actionLoadingId === id}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-subtle cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === id ? "Securing..." : "💳 Pay Now"}
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => handleCancelBooking(id)}
                          disabled={actionLoadingId === id}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}

                      <Link
                        href={`/trips/${id}`}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-surface-muted hover:bg-border/60 border border-border transition-all shadow-2xs"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-surface p-8 shadow-2xs">
            <div className="h-14 w-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-3xl mx-auto mb-3">
              🧳
            </div>
            <h3 className="text-base font-bold text-foreground">No bookings found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {activeTab === "all"
                ? "You have not made any guest reservations yet. Discover spaces across Delhi NCR."
                : `No bookings found under the "${activeTab}" filter tab.`}
            </p>
            <Link
              href="/properties"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity shadow-subtle"
            >
              <span>Explore Stays</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
