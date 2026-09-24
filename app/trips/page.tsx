"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyBookings, createBookingOrder, verifyBookingPayment, cancelBooking } from "@/lib/api";
import { Booking } from "@/types/booking";
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
    if (activeTab === "upcoming") return b.status === "REQUESTED" || b.status === "ACCEPTED" || b.status === "PAYMENT_PENDING";
    if (activeTab === "confirmed") return b.status === "CONFIRMED";
    if (activeTab === "cancelled") return b.status === "CANCELLED" || b.status === "REJECTED";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">My Bookings</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Manage upcoming reservations, payment status, and host details</p>
          </div>

          <div className="flex gap-1.5 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
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
                  activeTab === tab.value ? "bg-black text-white shadow-sm" : "text-zinc-600 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {authLoading || loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Loading your bookings...
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((b, idx) => {
              const isAccepted = b.status === "ACCEPTED" || b.status === "PAYMENT_PENDING";
              const isConfirmed = b.status === "CONFIRMED";
              const isPending = b.status === "REQUESTED";

              return (
                <GlassCard key={b.id || (b as any).bookingId || `trip-idx-${idx}`} hoverEffect className="border border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        isConfirmed
                          ? "bg-emerald-600 text-white"
                          : isAccepted
                          ? "bg-amber-500 text-white animate-pulse"
                          : isPending
                          ? "bg-zinc-200 text-zinc-900 border border-zinc-300"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">ID: {b.id}</span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-950">{b.propertyTitle || `Property #${b.propertyId}`}</h3>
                    <p className="text-xs text-zinc-500 font-semibold mt-1">
                      🗓️ {b.startDate || "Date tbd"} → {b.endDate || "Date tbd"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-zinc-500 block font-semibold">Total Amount</span>
                      <span className="text-lg font-black text-black">₹{b.totalPrice || 0}</span>
                    </div>

                    {isAccepted && (
                      <button
                        onClick={() => handlePayNow(b.id)}
                        disabled={actionLoadingId === b.id}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === b.id ? "Processing..." : "💳 Pay Now (Razorpay)"}
                      </button>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={actionLoadingId === b.id}
                        className="rounded-xl border border-zinc-300 hover:bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/trips/${b.id}`}
                      className="rounded-xl bg-black hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                    >
                      Booking Details
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">🧳</span>
            <h3 className="text-base font-bold text-zinc-950 mt-3">No bookings yet</h3>
            <p className="text-xs text-zinc-500 mt-1">You don't have any bookings matching filter "{activeTab}".</p>
            <Link href="/properties" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
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
