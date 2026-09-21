"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyBookings, createBookingOrder, verifyBookingPayment, cancelBooking } from "@/lib/api";
import { Booking } from "@/lib/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fallbackBookings: Booking[] = [
    {
      id: "bk-901",
      propertyId: "p1",
      propertyTitle: "Luxury 2BHK Glass Suite",
      userId: "u1",
      hostId: "h1",
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      totalPrice: 4800,
      status: "CONFIRMED",
    },
    {
      id: "bk-902",
      propertyId: "p2",
      propertyTitle: "Executive Single Room PG",
      userId: "u1",
      hostId: "h2",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      totalPrice: 8500,
      status: "ACCEPTED",
    },
  ];

  const fetchBookings = () => {
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
        console.warn("Could not fetch my bookings:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();

    // Dynamically load Razorpay SDK script
    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
            alert("Payment Successful! Booking confirmed. 🎉");
            fetchBookings();
          } catch (err: any) {
            alert("Payment verification failed: " + err.message);
          }
        },
        prefill: {
          name: "Guest",
        },
        theme: {
          color: "#059669",
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay checkout SDK is loading. Please retry in a moment.");
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
      alert("Booking cancelled successfully.");
      fetchBookings();
    } catch (err: any) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayList = bookings.length > 0 ? bookings : fallbackBookings;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">My Bookings</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Track active reservations, payment state, and host updates</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Loading your bookings...
          </div>
        ) : (
          <div className="space-y-4">
            {displayList.map((b) => {
              const isAccepted = b.status === "ACCEPTED" || b.status === "PAYMENT_PENDING";
              const isConfirmed = b.status === "CONFIRMED";
              const isPending = b.status === "REQUESTED";

              return (
                <GlassCard key={b.id} hoverEffect className="border border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
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
                        className="rounded-xl border border-zinc-300 hover:bg-zinc-100 px-3 py-2 text-xs font-bold text-red-600 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/booking/${b.id}`}
                      className="rounded-xl bg-black hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

