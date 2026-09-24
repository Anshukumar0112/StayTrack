"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getBooking, createBookingOrder, verifyBookingPayment, cancelBooking, createConversation } from "@/lib/api";
import { Booking } from "@/types/booking";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchBooking = () => {
    setLoading(true);
    getBooking(bookingId)
      .then((data) => {
        if (data) setBooking(data);
      })
      .catch((err) => console.warn("Failed to fetch trip details:", err))
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

  const handlePayNow = async () => {
    setPayLoading(true);
    try {
      const orderRes = await createBookingOrder(bookingId);

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Accommodation",
        description: `Trip Booking #${bookingId}`,
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifyBookingPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert("Payment Verified! Trip confirmed 🎉");
            fetchBooking();
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
      setPayLoading(false);
    }
  };

  const handleChatWithHost = async () => {
    if (!booking?.hostId) return;
    try {
      await createConversation({
        participantId: booking.hostId,
        propertyId: booking.propertyId,
      });
      router.push("/chat");
    } catch {
      router.push("/chat");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelLoading(true);
    try {
      await cancelBooking(bookingId);
      alert("Booking cancelled successfully.");
      fetchBooking();
    } catch (err: any) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const isAccepted = booking?.status === "ACCEPTED" || booking?.status === "PAYMENT_PENDING";
  const isConfirmed = booking?.status === "CONFIRMED";
  const isPending = booking?.status === "REQUESTED";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/trips" className="hover:text-black">My Bookings</Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold">Booking #{bookingId}</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Loading booking details...
          </div>
        ) : !booking ? (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">🧳</span>
            <h3 className="text-lg font-bold text-zinc-950 mt-3">Booking Record Not Found</h3>
            <p className="text-xs text-zinc-500 mt-1">Check your booking ID or return to list.</p>
            <Link href="/trips" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
              View My Bookings
            </Link>
          </GlassCard>
        ) : (
          <GlassCard className="border border-zinc-200 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex justify-between items-start flex-wrap gap-4 pb-6 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`clay-badge px-3 py-1 text-xs font-extrabold uppercase ${
                    isConfirmed
                      ? "bg-emerald-600 text-white"
                      : isAccepted
                      ? "bg-amber-500 text-white animate-pulse"
                      : isPending
                      ? "bg-zinc-200 text-zinc-900 border border-zinc-300"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {booking.status}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">Booking ID: {booking.id}</span>
                </div>
                <h1 className="text-2xl font-black text-zinc-950">
                  {booking.propertyTitle || `Property #${booking.propertyId}`}
                </h1>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-500 block font-semibold">Total Price</span>
                <span className="text-2xl font-black text-black">₹{booking.totalPrice || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-zinc-700">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Check-In Date</span>
                <span className="text-base font-bold text-zinc-950">{booking.startDate || "TBD"}</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Check-Out Date</span>
                <span className="text-base font-bold text-zinc-950">{booking.endDate || "TBD"}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-3">
                <Link
                  href={`/properties/${booking.propertyId}`}
                  className="rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 px-4 py-2.5 text-xs font-bold text-zinc-900"
                >
                  View Property
                </Link>

                {booking.hostId && (
                  <button
                    onClick={handleChatWithHost}
                    className="rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 px-4 py-2.5 text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    💬 Chat with Host
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                {isAccepted && (
                  <button
                    onClick={handlePayNow}
                    disabled={payLoading}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 cursor-pointer shadow-md transition-all disabled:opacity-50"
                  >
                    {payLoading ? "Processing..." : "💳 Pay Now (Razorpay)"}
                  </button>
                )}

                {isPending && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className="rounded-xl border border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs px-4 py-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {cancelLoading ? "Cancelling..." : "Cancel Booking"}
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
