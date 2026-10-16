"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getPropertyDetails, createBooking, checkPropertyAvailability } from "@/lib/api";
import { Property } from "@/types/property";

type BookingType = "daily" | "hourly" | "monthly";

const TAB_CONFIG: Array<{ value: BookingType; label: string }> = [
  { value: "daily", label: "Daily / Nightly" },
  { value: "hourly", label: "Hourly Transit" },
  { value: "monthly", label: "Monthly Rental" },
];

function getSupportedStayTypes(prop: Property | null): BookingType[] {
  if (!prop) return ["daily", "hourly", "monthly"];
  let rawTypes: string[] = [];
  if (Array.isArray(prop.stayTypes) && prop.stayTypes.length > 0) {
    rawTypes = prop.stayTypes.map((t) => String(t).toLowerCase());
  } else if (prop.bookingType) {
    rawTypes = [String(prop.bookingType).toLowerCase()];
  }

  const supported: BookingType[] = [];
  if (rawTypes.some((t) => t.includes("daily") || t.includes("night"))) supported.push("daily");
  if (rawTypes.some((t) => t.includes("hourly") || t.includes("transit"))) supported.push("hourly");
  if (rawTypes.some((t) => t.includes("monthly") || t.includes("rent"))) supported.push("monthly");

  return supported.length > 0 ? supported : ["daily"];
}

function CreateBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get("propertyId") || "";

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");

  const [bookingType, setBookingType] = useState<BookingType>("daily");

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(tomorrowStr);

  // Hourly fields
  const [hourlyDate, setHourlyDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");

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
          const supported = getSupportedStayTypes(data);
          if (supported.includes("daily")) {
            setBookingType("daily");
          } else if (supported.length > 0) {
            setBookingType(supported[0]);
          }
        }
      })
      .catch((err) => console.warn("Failed to load property details:", err))
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    let cancel = false;
    let sDate = startDate;
    let eDate = endDate;
    if (bookingType === "hourly") {
      sDate = hourlyDate;
      eDate = hourlyDate;
    }
    if (sDate && eDate) {
      checkPropertyAvailability(propertyId, {
        startDate: sDate,
        endDate: eDate,
        startTime: bookingType === "hourly" ? startTime : undefined,
        endTime: bookingType === "hourly" ? endTime : undefined,
        bookingType,
      })
        .then((res) => {
          if (!cancel) {
            if (res && res.available === false) {
              setAvailabilityError(res.reason || "Unavailable for selected dates");
            } else {
              setAvailabilityError("");
            }
          }
        })
        .catch(() => {
          if (!cancel) setAvailabilityError("");
        });
    }
    return () => {
      cancel = true;
    };
  }, [propertyId, bookingType, startDate, endDate, hourlyDate, startTime, endTime]);

  const supportedStayTypes = useMemo(() => getSupportedStayTypes(property), [property]);

  const visibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) => supportedStayTypes.includes(tab.value));
  }, [supportedStayTypes]);

  // Price & Duration Preview Calculation
  const pricePreview = useMemo(() => {
    if (!property) return null;

    if (bookingType === "hourly") {
      const price = property.hourlyPrice || property.pricePerHour || property.price || 0;
      let hours = 1;
      if (startTime && endTime) {
        const [sH, sM] = startTime.split(":").map(Number);
        const [eH, eM] = endTime.split(":").map(Number);
        const diffMins = (eH * 60 + eM) - (sH * 60 + sM);
        if (diffMins > 0) {
          hours = Math.ceil(diffMins / 60);
        }
      }
      return {
        rateLabel: `₹${price} / hour`,
        durationText: `${hours} ${hours === 1 ? "hour" : "hours"}`,
        billedText: null,
        total: price * hours,
      };
    } else if (bookingType === "monthly") {
      let dailyPrice = property.dailyPrice || property.pricePerNight || property.price || 0;
      let monthlyPrice = property.monthlyPrice || property.pricePerMonth || (dailyPrice > 0 ? dailyPrice * 30 : 0);

      let bookedDays = 1;
      if (startDate && endDate) {
        const sMs = new Date(startDate).getTime();
        const eMs = new Date(endDate).getTime();
        const diff = Math.round((eMs - sMs) / (1000 * 60 * 60 * 24));
        bookedDays = diff <= 0 ? 1 : diff;
      }
      const billedMonths = Math.max(1, Math.ceil(bookedDays / 30));
      return {
        rateLabel: `₹${monthlyPrice} / 30 days`,
        durationText: `${bookedDays} ${bookedDays === 1 ? "day" : "days"}`,
        billedText: `${billedMonths} ${billedMonths === 1 ? "month" : "months"}`,
        total: monthlyPrice * billedMonths,
      };
    } else {
      // daily
      const price = property.dailyPrice || property.pricePerNight || property.price || 0;
      let bookedDays = 1;
      if (startDate && endDate) {
        const sMs = new Date(startDate).getTime();
        const eMs = new Date(endDate).getTime();
        const diff = Math.round((eMs - sMs) / (1000 * 60 * 60 * 24));
        bookedDays = diff <= 0 ? 1 : diff;
      }
      return {
        rateLabel: `₹${price} / day`,
        durationText: `${bookedDays} ${bookedDays === 1 ? "day" : "days"}`,
        billedText: null,
        total: price * bookedDays,
      };
    }
  }, [property, bookingType, startDate, endDate, startTime, endTime]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!propertyId) {
      setError("Please select a property first.");
      return;
    }

    if (!bookingType || !["daily", "hourly", "monthly"].includes(bookingType)) {
      setError("Please select a stay type.");
      return;
    }

    let finalStart = startDate;
    let finalEnd = endDate;

    if (bookingType === "hourly") {
      if (!hourlyDate) {
        setError("Please select the stay date.");
        return;
      }
      if (!startTime || !endTime) {
        setError("Please select start time and end time for hourly transit.");
        return;
      }
      finalStart = hourlyDate;
      finalEnd = hourlyDate;
    } else {
      if (!startDate || !endDate) {
        setError("Please select valid start and end dates.");
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError("End date cannot be before start date.");
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const res = await createBooking({
        propertyId,
        bookingType,
        startDate: finalStart,
        endDate: finalEnd,
        startTime: bookingType === "hourly" ? startTime : undefined,
        endTime: bookingType === "hourly" ? endTime : undefined,
        guestName: guestName.trim() || undefined,
        contactPhone: guestPhone.trim() || undefined,
      });

      const newBookingId = res?.id || res?.bookingId;
      alert("Booking request submitted successfully! Host will review your request. 🎉");
      
      if (newBookingId) {
        router.push(`/trips/${newBookingId}`);
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
                    ⚠️ {error}
                  </div>
                )}

                {availabilityError && (
                  <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-xl">
                    🚫 Unavailable for selected dates
                  </div>
                )}

                {/* Stay Model Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Select Stay Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-zinc-100 p-1.5 rounded-2xl">
                    {visibleTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setBookingType(tab.value)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          bookingType === tab.value ? "bg-black text-white shadow-md" : "text-zinc-600 hover:text-black hover:bg-zinc-200/60"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date / Duration Fields */}
                {bookingType === "daily" && (
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

                {bookingType === "hourly" && (
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

                {bookingType === "monthly" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (e.target.value) {
                              const d = new Date(e.target.value);
                              d.setDate(d.getDate() + 30);
                              setEndDate(d.toISOString().split("T")[0]);
                            }
                          }}
                          className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">End Date *</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* Preset Duration Buttons Helper */}
                    <div className="pt-2">
                      <span className="block text-[11px] font-bold text-zinc-500 uppercase mb-1.5">
                        Quick Duration Presets (30-Day Billing)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 6].map((months) => (
                          <button
                            key={months}
                            type="button"
                            onClick={() => {
                              const base = startDate ? new Date(startDate) : new Date();
                              const newEnd = new Date(base);
                              newEnd.setDate(newEnd.getDate() + months * 30);
                              setStartDate(base.toISOString().split("T")[0]);
                              setEndDate(newEnd.toISOString().split("T")[0]);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            + {months} {months === 1 ? "Month" : "Months"} ({months * 30} Days)
                          </button>
                        ))}
                      </div>
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
                  disabled={submitLoading || !!availabilityError}
                  className="w-full py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitLoading
                    ? "Submitting Booking Request..."
                    : availabilityError
                    ? "Unavailable for Selected Dates"
                    : "Submit Booking Request"}
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Property Summary & Live Price Preview Card */}
          <div className="lg:col-span-1">
            <GlassCard className="border border-zinc-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-200">
                Selected Property
              </h3>
              <div>
                <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  {property?.propertyType || "Stay"}
                </span>
                <h4 className="text-base font-bold text-zinc-950 mt-2">{property?.title}</h4>
                <p className="text-xs text-zinc-500 mt-1">📍 {property?.city}, {property?.area}</p>
              </div>

              {pricePreview && (
                <div className="pt-3 border-t border-zinc-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-600 font-semibold">
                    <span>Rate</span>
                    <span className="font-bold text-zinc-900">{pricePreview.rateLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 font-semibold">
                    <span>Duration</span>
                    <span className="font-bold text-zinc-900">{pricePreview.durationText}</span>
                  </div>
                  {pricePreview.billedText && (
                    <div className="flex justify-between items-center text-zinc-600 font-semibold">
                      <span>Billed</span>
                      <span className="font-bold text-zinc-900">{pricePreview.billedText}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-sm">
                    <span className="font-extrabold text-zinc-900">Estimated total</span>
                    <span className="font-black text-emerald-600 text-lg">₹{pricePreview.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold leading-relaxed">
                🛡️ Authoritative booking total will be calculated and verified by the backend upon submission.
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
