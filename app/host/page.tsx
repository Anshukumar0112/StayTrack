"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { getMyProperties, getHostBookings, acceptBooking, rejectBooking, getEligibility, getMySubscription } from "@/lib/api";
import { Property } from "@/types/property";
import { Booking, getBookingId, getBookingStatus, getBookingStatusLabel } from "@/types/booking";

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
      alert("Booking request accepted! Guest will be notified to complete payment.");
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

  const activePropsCount = properties.filter((p) => p.verificationStatus === "approved").length;
  const pendingPropsCount = properties.filter((p) => p.verificationStatus === "pending").length;
  const upcomingBookingsCount = bookings.filter((b) => {
    const st = getBookingStatus(b);
    return st === "accepted" || st === "confirmed" || st === "payment_pending";
  }).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-24 md:py-10 w-full flex-1">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground">Host Dashboard</h1>
            <p className="text-xs text-muted font-semibold mt-1">
              Overview of listed properties, incoming bookings, and host subscription
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/host/subscription"
              className="rounded-xl border border-border bg-surface hover:bg-primary-soft text-foreground font-bold text-xs px-4 py-3 shadow-xs transition-all"
            >
              Subscription Plan
            </Link>

            {eligibility.eligible ? (
              <Link
                href="/host/properties/new"
                className="rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs px-5 py-3 shadow-sm transition-all flex items-center gap-2"
              >
                <span>+ List New Property</span>
              </Link>
            ) : (
              <div className="text-xs font-bold bg-warning/15 text-warning border border-warning/30 px-4 py-2 rounded-xl">
                ⚠️ Listing limit reached: {eligibility.reason || "Upgrade Plan"}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <ClayCard className="p-4 border border-border bg-surface shadow-xs">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Properties</span>
            <div className="text-2xl font-black text-foreground mt-1">{loading ? "..." : properties.length}</div>
            <span className="text-[10px] text-success font-bold mt-1 block">{activePropsCount} Approved</span>
          </ClayCard>

          <ClayCard className="p-4 border border-border bg-surface shadow-xs">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Pending Approval</span>
            <div className="text-2xl font-black text-warning mt-1">{loading ? "..." : pendingPropsCount}</div>
            <span className="text-[10px] text-muted font-medium mt-1 block">Admin Verification</span>
          </ClayCard>

          <ClayCard className="p-4 border border-border bg-surface shadow-xs">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Active Bookings</span>
            <div className="text-2xl font-black text-foreground mt-1">{loading ? "..." : bookings.length}</div>
            <span className="text-[10px] text-success font-bold mt-1 block">{upcomingBookingsCount} Upcoming</span>
          </ClayCard>

          <ClayCard className="p-4 border border-border bg-surface shadow-xs">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Plan Status</span>
            <div className="text-sm font-black text-success mt-1 capitalize">
              {subscription?.status || "Active Plan"}
            </div>
            <Link href="/host/subscription" className="text-[10px] text-primary font-bold hover:underline mt-1 block">
              Manage Subscription →
            </Link>
          </ClayCard>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Booking Requests */}
            <GlassCard className="border border-border bg-surface shadow-xs">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Guest Booking Requests ({bookings.length})
                </h2>
                <Link href="/host/bookings" className="text-xs font-bold text-primary hover:underline">
                  View All Bookings →
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs font-bold text-muted">Loading booking requests...</div>
              ) : bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b, idx) => {
                    const id = getBookingId(b);
                    const st = getBookingStatus(b);
                    const isRequested = st === "requested";

                    return (
                      <div key={id || `host-booking-${idx}`} className="p-4 rounded-2xl bg-background border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              isRequested ? "bg-warning/15 text-warning animate-pulse" : "bg-success/15 text-success"
                            }`}>
                              {getBookingStatusLabel(st, "host")}
                            </span>
                            <span className="text-xs text-muted font-mono">#{id}</span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground mt-1">{b.propertyTitle || `Property #${b.propertyId}`}</h4>
                          <p className="text-xs text-muted font-semibold mt-0.5">Guest: {b.userName || b.userId || b.customerId || "Guest"}</p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {isRequested && (
                            <>
                              <button
                                onClick={() => handleAccept(id)}
                                disabled={actionLoadingId === id}
                                className="rounded-xl bg-success hover:opacity-90 text-white font-bold text-xs px-3 py-2 cursor-pointer transition-all disabled:opacity-50"
                              >
                                {actionLoadingId === id ? "Accepting..." : "✓ Accept"}
                              </button>
                              <button
                                onClick={() => handleReject(id)}
                                disabled={actionLoadingId === id}
                                className="rounded-xl border border-border hover:bg-error/10 text-error font-bold text-xs px-3 py-2 cursor-pointer transition-all disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-semibold text-muted bg-primary-soft/50 rounded-2xl border border-border/60 p-6">
                  <span className="text-2xl block mb-1">📅</span>
                  <div className="font-bold text-foreground">No pending booking requests</div>
                  <p className="text-[11px] text-muted mt-0.5">New guest reservation requests will appear here in real-time.</p>
                </div>
              )}
            </GlassCard>

            {/* My Listed Properties */}
            <GlassCard className="border border-border bg-surface shadow-xs">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  My Properties ({properties.length})
                </h2>
                <Link href="/host/properties" className="text-xs font-bold text-primary hover:underline">
                  Manage All →
                </Link>
              </div>

              {properties.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {properties.map((p, idx) => (
                    <div key={p.id || (p as any).propertyId || `my-prop-${idx}`} className="p-4 rounded-2xl border border-border bg-surface space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="clay-badge px-2 py-0.5 text-[10px] font-bold uppercase">{p.propertyType || "Flat"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.verificationStatus === "approved" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                        }`}>
                          {p.verificationStatus || "Pending"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground truncate">{p.title}</h4>
                      <p className="text-[11px] text-muted">📍 {p.city}, {p.area}</p>
                      <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold">
                        <span className="text-foreground">₹{p.pricePerNight || p.pricePerMonth || p.price || 0}</span>
                        <Link href={`/properties/${p.id}`} className="text-primary hover:underline">View Public Page →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-semibold text-muted bg-primary-soft/50 rounded-2xl border border-border/60 p-6">
                  <span className="text-2xl block mb-1">🏢</span>
                  <div className="font-bold text-foreground">You haven't listed any properties yet</div>
                  <p className="text-[11px] text-muted mt-0.5 mb-3">List your BNB, Hostel, PG, Hotel or Flat on StayTrack with zero commission.</p>
                  <Link href="/host/properties/new" className="inline-block rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2 shadow-xs transition-all">
                    + List Your First Property
                  </Link>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Sidebar Quick Navigation */}
          <div className="space-y-6">
            <div className="border border-primary-dark/60 bg-brand-deep text-surface p-6 space-y-4 rounded-3xl shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-light">
                Host Quick Navigation
              </h3>
              <div className="space-y-2 text-xs font-bold">
                <Link href="/host/properties" className="block p-3 rounded-xl bg-primary-dark/40 hover:bg-primary-dark/80 text-surface border border-primary-dark/60 transition-colors">
                  🏢 My Properties
                </Link>
                <Link href="/host/properties/new" className="block p-3 rounded-xl bg-primary-dark/40 hover:bg-primary-dark/80 text-surface border border-primary-dark/60 transition-colors">
                  ➕ Add New Property
                </Link>
                <Link href="/host/bookings" className="block p-3 rounded-xl bg-primary-dark/40 hover:bg-primary-dark/80 text-surface border border-primary-dark/60 transition-colors">
                  📅 Booking Requests
                </Link>
                <Link href="/host/subscription" className="block p-3 rounded-xl bg-primary-dark/40 hover:bg-primary-dark/80 text-surface border border-primary-dark/60 transition-colors">
                  ⭐ Host Subscription Plan
                </Link>
                <Link href="/host/earnings" className="block p-3 rounded-xl bg-primary-dark/40 hover:bg-primary-dark/80 text-surface border border-primary-dark/60 transition-colors">
                  💳 Earnings & Settlements
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}