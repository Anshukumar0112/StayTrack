"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyBookings, createBookingOrder, verifyBookingPayment, cancelBooking } from "@/lib/api";
import { Booking, getBookingId, getBookingStatus, getBookingAmount, getBookingStatusLabel } from "@/types/booking";
import { useAuthGuard } from "@/hooks/useAuthGuard";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MyTripsPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "confirmed" | "cancelled">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
        console.warn("Could not fetch my trips/bookings:", err);
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
      const orderRes = await createBookingOrder(bookingId);

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Accommodation",
        description: `Booking #${bookingId}`,
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifyBookingPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert("Payment Successful! Booking confirmed 🎉");
            fetchBookings();
          } catch (err: any) {
            alert("Payment verification failed: " + err.message);
          }
        },
        theme: { color: "#059669" },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay checkout SDK loading...");
      }
    } catch (err: any) {
      alert("Failed to initiate payment: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setActionLoadingId(bookingId);
      await cancelBooking(bookingId);
      alert("Booking cancelled.");
      fetchBookings();
    } catch (err: any) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const st = getBookingStatus(b);
    if (activeTab === "upcoming") return st === "requested" || st === "accepted" || st === "payment_pending" || st === "confirmed";
    if (activeTab === "confirmed") return st === "confirmed";
    if (activeTab === "cancelled") return st === "cancelled" || st === "rejected";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-24 md:py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground">My Bookings</h1>
            <p className="text-xs text-muted font-semibold mt-1">Manage upcoming reservations, payment status, and host details</p>
          </div>

          <div className="flex gap-1.5 p-1 bg-surface border border-border rounded-xl shadow-xs">
            {[
              { label: "All Bookings", value: "all" },
              { label: "Upcoming / Requested", value: "upcoming" },
              { label: "Confirmed", value: "confirmed" },
              { label: "Cancelled", value: "cancelled" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.value ? "bg-primary text-white shadow-xs" : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {authLoading || loading ? (
          <div className="py-20 text-center text-xs font-bold text-muted">
            Loading your bookings...
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((b, idx) => {
              const id = getBookingId(b);
              const st = getBookingStatus(b);
              const amount = getBookingAmount(b);

              const isAccepted = st === "accepted" || st === "payment_pending";
              const isConfirmed = st === "confirmed";
              const isPending = st === "requested";

              return (
                <GlassCard key={id || `trip-idx-${idx}`} hoverEffect className="border border-border bg-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isConfirmed
                          ? "bg-success text-white"
                          : isAccepted
                          ? "bg-warning text-white animate-pulse"
                          : isPending
                          ? "bg-primary-soft text-foreground border border-border"
                          : "bg-error/15 text-error"
                      }`}>
                        {getBookingStatusLabel(st, "customer")}
                      </span>
                      <span className="text-xs text-muted font-mono">ID: {id}</span>
                    </div>

                    <h3 className="text-base font-bold text-foreground">{b.propertyTitle || `Property #${b.propertyId}`}</h3>
                    <p className="text-xs text-muted font-semibold mt-1">
                      🗓️ {b.startDate || "Date tbd"} → {b.endDate || "Date tbd"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-muted block font-semibold">Total Amount</span>
                      <span className="text-lg font-black text-foreground">₹{amount.toLocaleString()}</span>
                    </div>

                    {isAccepted && (
                      <button
                        onClick={() => handlePayNow(id)}
                        disabled={actionLoadingId === id}
                        className="rounded-xl bg-success hover:opacity-90 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === id ? "Processing..." : "💳 Pay Now (Razorpay)"}
                      </button>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handleCancelBooking(id)}
                        disabled={actionLoadingId === id}
                        className="rounded-xl border border-border hover:bg-error/10 px-3 py-2 text-xs font-bold text-error transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/trips/${id}`}
                      className="rounded-xl bg-primary hover:bg-primary-dark px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
                    >
                      Booking Details
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="py-16 text-center border border-border bg-surface shadow-xs rounded-3xl">
            <span className="text-4xl block mb-2">🧳</span>
            <h3 className="text-base font-bold text-foreground mt-1">No bookings yet</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">You don't have any bookings matching filter "{activeTab}".</p>
            <Link href="/properties" className="mt-4 inline-block rounded-xl bg-primary hover:bg-primary-dark text-white px-5 py-2.5 text-xs font-bold shadow-xs">
              Find & Book A Stay
            </Link>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
