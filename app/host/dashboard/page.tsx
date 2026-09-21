"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyProperties, getHostBookings, acceptBooking, rejectBooking, getEligibility, getMySubscription } from "@/lib/api";
import { Property, Booking } from "@/lib/types";

export default function HostDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string }>({ eligible: true });
  const [subscription, setSubscription] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchHostData = async () => {
    setLoading(true);
    try {
      const [propsData, bookingsData, eligData, subData] = await Promise.allSettled([
        getMyProperties(),
        getHostBookings(),
        getEligibility(),
        getMySubscription(),
      ]);

      if (propsData.status === "fulfilled" && Array.isArray(propsData.value)) {
        setProperties(propsData.value);
      }
      if (bookingsData.status === "fulfilled" && Array.isArray(bookingsData.value)) {
        setBookings(bookingsData.value);
      }
      if (eligData.status === "fulfilled" && eligData.value) {
        setEligibility(eligData.value);
      }
      if (subData.status === "fulfilled") {
        setSubscription(subData.value);
      }
    } catch (err) {
      console.warn("Host dashboard load warning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
  }, []);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      await acceptBooking(bookingId);
      alert("Booking request accepted! Guest will be notified to make payment.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to accept booking: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!confirm("Are you sure you want to reject this booking?")) return;
    try {
      setActionLoadingId(bookingId);
      await rejectBooking(bookingId);
      alert("Booking request rejected.");
      fetchHostData();
    } catch (err: any) {
      alert("Failed to reject booking: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Host Dashboard</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Manage your stay listings and incoming guest requests</p>
          </div>

          <div className="flex items-center gap-3">
            {eligibility.eligible ? (
              <Link
                href="/host/properties/new"
                className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-5 py-3 shadow-md transition-all flex items-center gap-2"
              >
                <span>+ List New Property</span>
              </Link>
            ) : (
              <div className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2 rounded-xl">
                ⚠️ Listing limit reached: {eligibility.reason || "Upgrade Plan"}
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Incoming Booking Requests */}
            <GlassCard className="border border-zinc-200">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200">
                Incoming Guest Booking Requests
              </h2>

              {loading ? (
                <div className="py-12 text-center text-xs font-bold text-zinc-500">Loading requests...</div>
              ) : bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            b.status === "REQUESTED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {b.status}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">#{b.id}</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-950 mt-1">{b.propertyTitle || `Property #${b.propertyId}`}</h4>
                        <p className="text-xs text-zinc-500 font-semibold mt-0.5">Guest: {b.userName || b.userId}</p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {b.status === "REQUESTED" && (
                          <>
                            <button
                              onClick={() => handleAccept(b.id)}
                              disabled={actionLoadingId === b.id}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 cursor-pointer transition-all disabled:opacity-50"
                            >
                              {actionLoadingId === b.id ? "Accepting..." : "✓ Accept"}
                            </button>
                            <button
                              onClick={() => handleReject(b.id)}
                              disabled={actionLoadingId === b.id}
                              className="rounded-xl border border-zinc-300 hover:bg-zinc-200 text-zinc-800 font-bold text-xs px-3 py-2 cursor-pointer transition-all disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-semibold text-zinc-400">
                  No active guest booking requests right now.
                </div>
              )}
            </GlassCard>

            {/* My Active Properties */}
            <GlassCard className="border border-zinc-200">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200">
                My Listed Properties ({properties.length})
              </h2>

              {properties.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {properties.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="clay-badge px-2 py-0.5 text-[10px] font-bold uppercase">{p.propertyType || "Flat"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.verificationStatus === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"
                        }`}>
                          {p.verificationStatus || "Pending Approval"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-950 truncate">{p.title}</h4>
                      <p className="text-[11px] text-zinc-500">📍 {p.city}, {p.area}</p>
                      <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-xs font-bold">
                        <span>₹{p.pricePerNight || p.pricePerMonth || p.price || 0}</span>
                        <Link href={`/property/${p.id}`} className="text-emerald-600 hover:underline">View Page →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-semibold text-zinc-400">
                  You haven't listed any properties yet. Click "+ List New Property" to start.
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <GlassCard className="border border-zinc-200 bg-zinc-950 text-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                Host Subscription Plan
              </h3>
              <div className="text-xl font-black">{subscription?.name || "Free Host Plan"}</div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                ₹0 Brokerage direct host connection enabled.
              </p>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-300">
                <span>Property Limit</span>
                <span className="font-bold text-white">{subscription?.propertyLimit || "Unlimited"}</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

