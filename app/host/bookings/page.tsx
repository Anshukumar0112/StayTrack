"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { getHostBookings, acceptBooking, rejectBooking } from "@/lib/api";
import { Property } from "@/types/property";
import { Booking, getBookingId, getBookingStatus, getBookingAmount, getBookingStatusLabel } from "@/types/booking";

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "requested" | "confirmed" | "rejected">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    getHostBookings()
      .then((data) => {
        if (data && Array.isArray(data)) setBookings(data);
        else setBookings([]);
      })
      .catch((err) => console.warn("Failed to fetch host bookings:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      await acceptBooking(bookingId);
      alert("Booking accepted successfully!");
      fetchBookings();
    } catch (err: any) {
      alert("Failed to accept: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!confirm("Are you sure you want to reject this booking?")) return;
    try {
      setActionLoadingId(bookingId);
      await rejectBooking(bookingId);
      alert("Booking rejected.");
      fetchBookings();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const st = getBookingStatus(b);
    if (filter === "requested") return st === "requested";
    if (filter === "confirmed") return st === "confirmed" || st === "accepted" || st === "payment_pending";
    if (filter === "rejected") return st === "rejected" || st === "cancelled";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Host Booking Requests</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Review guest reservation requests and approve check-in dates</p>
          </div>

          <div className="flex gap-1.5 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
            {[
              { label: "All Requests", value: "all" },
              { label: "Pending Approval", value: "requested" },
              { label: "Confirmed / Paid", value: "confirmed" },
              { label: "Rejected / Cancelled", value: "rejected" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filter === tab.value ? "bg-black text-white" : "text-zinc-600 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="border border-zinc-200 p-6 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading booking requests...</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((b) => {
                const id = getBookingId(b);
                const st = getBookingStatus(b);
                const amount = getBookingAmount(b);
                const isRequested = st === "requested";
                const isConfirmed = st === "confirmed";
                const isAccepted = st === "accepted" || st === "payment_pending";

                return (
                  <div key={id || `host-booking-${b.propertyId}`} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isConfirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : isAccepted
                            ? "bg-amber-100 text-amber-800"
                            : isRequested
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-zinc-200 text-zinc-800"
                        }`}>
                          {getBookingStatusLabel(st, "host")}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">ID: {id}</span>
                      </div>

                      <h3 className="text-sm font-bold text-zinc-950">{b.propertyTitle || `Property #${b.propertyId}`}</h3>
                      <p className="text-xs text-zinc-500 mt-1 font-semibold">
                        👤 Guest: {b.userName || b.userId || b.customerId || "Guest"} • 🗓️ {b.startDate || "Date tbd"} → {b.endDate || "Date tbd"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Amount</span>
                        <span className="text-base font-black text-black">₹{amount.toLocaleString()}</span>
                      </div>

                      {isRequested && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(id)}
                            disabled={actionLoadingId === id}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 cursor-pointer disabled:opacity-50"
                          >
                            {actionLoadingId === id ? "Accepting..." : "✓ Accept"}
                          </button>
                          <button
                            onClick={() => handleReject(id)}
                            disabled={actionLoadingId === id}
                            className="rounded-xl border border-zinc-300 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 cursor-pointer disabled:opacity-50"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400">
              No booking requests found under filter "{filter}".
            </div>
          )}
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
