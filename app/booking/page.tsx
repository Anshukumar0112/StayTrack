"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getPropertyDetails, createBooking } from "@/lib/api";
import { Property } from "@/types/property";

function CreateBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get("propertyId") || "";

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const [stayModel, setStayModel] = useState<"daily" | "hourly" | "monthly">("daily");
  
  // Daily fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Hourly fields
  const [hourlyDate, setHourlyDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");

  // Monthly fields
  const [monthlyStartDate, setMonthlyStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);

  // Guest details
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    getPropertyDetails(propertyId)
      .then((data) => {
        if (data) {
          setProperty(data);
          if (data.bookingType === "hourly") setStayModel("hourly");
          else if (data.bookingType === "monthly") setStayModel("monthly");
          else setStayModel("daily");
        }
      })
      .catch((err) => console.warn("Failed to load property details:", err))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!propertyId) {
      setError("Please select a property first.");
      return;
    }

    let finalStart = startDate;
    let finalEnd = endDate;

    if (stayModel === "hourly") {
      if (!hourlyDate) {
        setError("Please select the stay date.");
        return;
      }
      finalStart = `${hourlyDate}T${startTime}:00`;
      finalEnd = `${hourlyDate}T${endTime}:00`;
    } else if (stayModel === "monthly") {
      if (!monthlyStartDate) {
        setError("Please select start date for monthly stay.");
        return;
      }
      finalStart = monthlyStartDate;
      // Calculate end date based on duration months
      const d = new Date(monthlyStartDate);
      d.setMonth(d.getMonth() + durationMonths);
      finalEnd = d.toISOString().split("T")[0];
    } else {
      if (!startDate || !endDate) {
        setError("Please select check-in and check-out dates.");
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const res = await createBooking({
        propertyId,
        startDate: finalStart,
        endDate: finalEnd,
      });

      const newBookingId = res?.id || res?.bookingId;
      alert("Booking request submitted successfully! Host will review your request. 🎉");
      
      if (newBookingId) {
        router.push(`/booking/${newBookingId}`);
      } else {
        router.push("/trips");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit booking request.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950">Create Stay Booking</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Select stay model, dates & guest information for direct host reservation
        </p>
      </div>

      {!propertyId ? (
        <GlassCard className="py-16 text-center border border-zinc-200">
          <span className="text-4xl">🏢</span>
          <h3 className="text-base font-bold text-zinc-950 mt-3">No Property Selected</h3>
          <p className="text-xs text-zinc-500 mt-1">Please select a property to start booking.</p>
          <Link href="/properties" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
            Browse Properties
          </Link>
        </GlassCard>
      ) : loading ? (
        <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading stay details...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <GlassCard className="border border-zinc-200 p-6 sm:p-8 shadow-xl">
              <form onSubmit={handleSubmitBooking} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                    {error}
                  </div>
                )}

                {/* Stay Model Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Select Stay Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-1.5 rounded-2xl">
                    {[
                      { label: "Daily / Nightly", value: "daily" },
                      { label: "Hourly Transit", value: "hourly" },
                      { label: "Monthly Rental", value: "monthly" },
                    ].map((model) => (
                      <button
                        key={model.value}
                        type="button"
                        onClick={() => setStayModel(model.value as any)}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          stayModel === model.value ? "bg-black text-white shadow-md" : "text-zinc-600 hover:text-black"
                        }`}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date / Duration Fields */}
                {stayModel === "daily" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Check-in Date *</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Check-out Date *</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                )}

                {stayModel === "hourly" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Stay Date *</label>
                      <input
                        type="date"
                        value={hourlyDate}
                        onChange={(e) => setHourlyDate(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">Start Time *</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">End Time *</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {stayModel === "monthly" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Move-in Start Date *</label>
                      <input
                        type="date"
                        value={monthlyStartDate}
                        onChange={(e) => setMonthlyStartDate(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Duration (Months) *</label>
                      <select
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(Number(e.target.value))}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                      >
                        {[1, 2, 3, 6, 11, 12].map((m) => (
                          <option key={m} value={m}>{m} {m === 1 ? "Month" : "Months"}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Guest Details */}
                <div className="pt-4 border-t border-zinc-200 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Primary Guest Details</h3>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Guest Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter guest name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitLoading ? "Submitting Booking Request..." : "Submit Booking Request"}
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Property Summary Card */}
          <div className="lg:col-span-1">
            <GlassCard className="border border-zinc-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-200">
                Selected Property
              </h3>
              <div>
                <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  {property?.propertyType || "Flat"}
                </span>
                <h4 className="text-base font-bold text-zinc-950 mt-2">{property?.title}</h4>
                <p className="text-xs text-zinc-500 mt-1">📍 {property?.city}, {property?.area}</p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-600">Rate ({stayModel})</span>
                <span className="font-black text-black">
                  ₹{property?.pricePerNight || property?.pricePerMonth || property?.pricePerHour || property?.price || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold leading-relaxed">
                🛡️ Authoritative booking total will be calculated by the backend upon host verification.
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CreateBookingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-zinc-500">Loading Booking...</div>}>
        <CreateBookingContent />
      </Suspense>
      <Footer />
      <MobileNav />
    </div>
  );
}
