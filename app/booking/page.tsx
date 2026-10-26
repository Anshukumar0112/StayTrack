"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import BackButton from "@/components/ui/BackButton";
import Badge from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { getCategoryLabel, normalizeCategoryKey } from "@/lib/categories";
import { getPropertyDetails, createBooking, checkPropertyAvailability } from "@/lib/api";
import { Property } from "@/types/property";
import {
  Building2Icon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  CheckIcon,
  MapPinIcon,
  StarIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  UserIcon,
} from "@/components/ui/Icons";

type BookingType = "daily" | "hourly" | "monthly";

const TAB_CONFIG: Array<{ value: BookingType; label: string; description: string }> = [
  { value: "daily", label: "Daily / Nightly", description: "Per-night reservation" },
  { value: "monthly", label: "Monthly Rental", description: "30-day billing cycle" },
  { value: "hourly", label: "Hourly Transit", description: "Day-use or short transit" },
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
  if (rawTypes.some((t) => t.includes("daily") || t.includes("night")) || prop.dailyPrice || prop.pricePerNight) {
    supported.push("daily");
  }
  if (rawTypes.some((t) => t.includes("monthly") || t.includes("rent")) || prop.monthlyPrice || prop.pricePerMonth) {
    supported.push("monthly");
  }
  if (rawTypes.some((t) => t.includes("hourly") || t.includes("transit")) || prop.hourlyPrice || prop.pricePerHour) {
    supported.push("hourly");
  }

  if (supported.length === 0) {
    const cat = String(prop.propertyType || prop.category || "").toUpperCase();
    if (cat === "FLAT" || cat === "APARTMENT" || cat === "PG" || cat === "HOUSE") {
      supported.push("monthly");
    } else {
      supported.push("daily");
    }
  }

  return supported.length > 0 ? supported : ["daily"];
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return "";
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
}

function CreateBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get("propertyId") || "";
  const queryBookingType = (searchParams.get("bookingType") || "").toLowerCase() as BookingType;
  const occupancyOptionId = searchParams.get("occupancyOptionId") || "";
  const occupancyType = searchParams.get("occupancyType") || "";
  const occupancyOptionName = searchParams.get("occupancyOptionName") || "";
  const roomTypeId = searchParams.get("roomTypeId") || "";
  const inventoryUnitId = searchParams.get("inventoryUnitId") || "";

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const [bookingType, setBookingType] = useState<BookingType>(() => {
    return queryBookingType === "monthly" || queryBookingType === "hourly" ? queryBookingType : "daily";
  });

  // Base dates
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(
    () => searchParams.get("startDate") || todayStr
  );
  const [endDate, setEndDate] = useState(
    () => searchParams.get("endDate") || tomorrowStr
  );

  // Hourly transit fields
  const [hourlyDate, setHourlyDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");

  // Guest details
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Preserved state back navigation
  const backUrl = useMemo(() => {
    if (!propertyId) return "/properties";
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (bookingType) params.set("bookingType", bookingType);
    const q = params.toString();
    return `/properties/${propertyId}${q ? `?${q}` : ""}`;
  }, [propertyId, startDate, endDate, bookingType]);

  useEffect(() => {
    if (!propertyId) return;
    let isMounted = true;

    const loadProperty = async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setLoading(true);

      try {
        const data = await getPropertyDetails(propertyId);
        if (data && isMounted) {
          setProperty(data);
          const supported = getSupportedStayTypes(data);
          if (queryBookingType && supported.includes(queryBookingType)) {
            setBookingType(queryBookingType);
          } else if (supported.includes("monthly") && !supported.includes("daily")) {
            setBookingType("monthly");
          } else if (supported.includes("daily")) {
            setBookingType("daily");
          } else if (supported.length > 0) {
            setBookingType(supported[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load property details:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProperty();

    return () => {
      isMounted = false;
    };
  }, [propertyId, queryBookingType]);

  // Selected occupancy option for PG & Hostel
  const selectedOccupancyOption = useMemo(() => {
    if (!property) return null;
    const cat = String(property.propertyType || property.category || "").toUpperCase();
    if (cat !== "PG" && cat !== "HOSTEL") return null;

    if (Array.isArray(property.occupancyOptions) && property.occupancyOptions.length > 0) {
      if (occupancyOptionId) {
        const found = property.occupancyOptions.find((o) => o.id === occupancyOptionId);
        if (found) return found;
      }
      if (occupancyType) {
        const found = property.occupancyOptions.find((o) => o.occupancyType === occupancyType);
        if (found) return found;
      }
      return property.occupancyOptions[0];
    }
    if (occupancyOptionName || occupancyType) {
      return {
        id: occupancyOptionId || "custom",
        name: occupancyOptionName || "Selected Room Sharing",
        occupancyType: occupancyType || "single",
        monthlyRentPerBed: property.monthlyRentPerBed || property.monthlyPrice || property.price || 0,
      };
    }
    return null;
  }, [property, occupancyOptionId, occupancyType, occupancyOptionName]);

  const canonicalCategory = useMemo(() => {
    return normalizeCategoryKey(property?.category || property?.propertyType || "");
  }, [property]);

  const isDirectBooking = useMemo(() => {
    if (canonicalCategory === "HOTEL" || canonicalCategory === "BNB") {
      return true;
    }
    if (canonicalCategory === "HOSTEL") {
      return bookingType === "daily";
    }
    return false;
  }, [canonicalCategory, bookingType]);

  // Live availability verification
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
      setCheckingAvailability(true);
      checkPropertyAvailability(propertyId, {
        startDate: sDate,
        endDate: eDate,
        startTime: bookingType === "hourly" ? startTime : undefined,
        endTime: bookingType === "hourly" ? endTime : undefined,
        bookingType,
        occupancyType: selectedOccupancyOption?.occupancyType || occupancyType || undefined,
        roomTypeId: selectedOccupancyOption?.id !== "custom" ? (selectedOccupancyOption?.id || roomTypeId || undefined) : (roomTypeId || undefined),
        inventoryUnitId: inventoryUnitId || undefined,
      })
        .then((res) => {
          if (!cancel) {
            if (res && res.available === false) {
              setAvailabilityError(res.reason || "Selected dates are unavailable for this property.");
            } else {
              setAvailabilityError("");
            }
          }
        })
        .catch(() => {
          if (!cancel) setAvailabilityError("");
        })
        .finally(() => {
          if (!cancel) setCheckingAvailability(false);
        });
    }
    return () => {
      cancel = true;
    };
  }, [propertyId, bookingType, startDate, endDate, hourlyDate, startTime, endTime, selectedOccupancyOption, occupancyType, roomTypeId, inventoryUnitId]);

  const supportedStayTypes = useMemo(() => getSupportedStayTypes(property), [property]);

  const visibleTabs = useMemo(() => {
    return TAB_CONFIG.filter((tab) => supportedStayTypes.includes(tab.value));
  }, [supportedStayTypes]);

  // Genuine property photography extraction
  const rawImages: string[] = useMemo(() => {
    if (!property) return [];
    if (Array.isArray(property.images) && property.images.length > 0) {
      return property.images.filter((img): img is string => typeof img === "string" && img.trim().length > 0);
    }
    const single = (property as { imageUrl?: string })?.imageUrl;
    if (typeof single === "string" && single.trim().length > 0) {
      return [single.trim()];
    }
    return [];
  }, [property]);

  const currentImage = !imageFailed && rawImages.length > 0 ? rawImages[0] : null;
  const hasValidRating = typeof property?.rating === "number" && property.rating > 0;
  const securityDeposit = typeof property?.securityDeposit === "number" && property.securityDeposit > 0 ? property.securityDeposit : 0;

  // Price & duration preview calculation matching backend logic
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
        unitPrice: price,
        rateLabel: `${formatCurrency(price)} / hour`,
        durationText: `${hours} ${hours === 1 ? "hour" : "hours"}`,
        billedText: null,
        total: price * hours,
      };
    } else if (bookingType === "monthly") {
      const dailyPrice = property.dailyPrice || property.pricePerNight || property.price || 0;
      let monthlyPrice = property.monthlyPrice || property.pricePerMonth || (dailyPrice > 0 ? dailyPrice * 30 : 0);
      if (selectedOccupancyOption && selectedOccupancyOption.monthlyRentPerBed > 0) {
        monthlyPrice = selectedOccupancyOption.monthlyRentPerBed;
      }

      let bookedDays = 1;
      if (startDate && endDate) {
        const sMs = new Date(startDate).getTime();
        const eMs = new Date(endDate).getTime();
        const diff = Math.round((eMs - sMs) / (1000 * 60 * 60 * 24));
        bookedDays = diff <= 0 ? 1 : diff;
      }
      const billedMonths = Math.max(1, Math.ceil(bookedDays / 30));
      return {
        unitPrice: monthlyPrice,
        rateLabel: `${formatCurrency(monthlyPrice)} / month`,
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
        unitPrice: price,
        rateLabel: `${formatCurrency(price)} / night`,
        durationText: `${bookedDays} ${bookedDays === 1 ? "night" : "nights"}`,
        billedText: null,
        total: price * bookedDays,
      };
    }
  }, [property, bookingType, startDate, endDate, startTime, endTime, selectedOccupancyOption]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && (!endDate || endDate <= val)) {
      const next = new Date(val);
      next.setDate(next.getDate() + 1);
      setEndDate(next.toISOString().split("T")[0]);
    }
  };

  const handleMonthlyStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      const next = new Date(val);
      next.setDate(next.getDate() + 30);
      setEndDate(next.toISOString().split("T")[0]);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!propertyId) {
      setError("Please select a property first.");
      return;
    }

    if (!bookingType || !["daily", "hourly", "monthly"].includes(bookingType)) {
      setError("Please select a valid stay type.");
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
      const [sH, sM] = startTime.split(":").map(Number);
      const [eH, eM] = endTime.split(":").map(Number);
      if (eH * 60 + eM <= sH * 60 + sM) {
        setError("End time must be after start time.");
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
        inventoryUnitId: inventoryUnitId || undefined,
        occupancyType: selectedOccupancyOption?.occupancyType || occupancyType || undefined,
        roomTypeId: selectedOccupancyOption?.id !== "custom" ? (selectedOccupancyOption?.id || roomTypeId || undefined) : (roomTypeId || undefined),
        occupancyOptionName: selectedOccupancyOption?.name || occupancyOptionName || undefined,
      });

      const newBookingId = res?.id || res?.bookingId;
      if (newBookingId) {
        router.push(`/trips/${newBookingId}`);
      } else {
        router.push("/trips");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit reservation request.";
      setError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-8 w-full flex-1">
      {/* Top Header & Reliable Back Navigation */}
      <div className="mb-6 sm:mb-8">
        <BackButton
          fallbackUrl={backUrl}
          label="Back to property"
          ariaLabel="Return to property details"
          className="mb-3.5"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {isDirectBooking ? "Confirm and Reserve" : "Request Reservation"}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          {isDirectBooking
            ? "Review your dates, duration, and reserve your stay directly."
            : "Review your dates, duration, and send a direct reservation request to the host."}
        </p>
      </div>

      {!propertyId ? (
        <div className="py-16 text-center border border-border bg-surface rounded-3xl p-8 max-w-lg mx-auto shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto mb-4 border border-border">
            <Building2Icon className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No Property Selected</h2>
          <p className="text-xs text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
            Select an accommodation from the StayTrack catalog to review rates and book your stay.
          </p>
          <Link
            href="/properties"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-6 py-3 text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-2xs"
          >
            <span>Explore Properties</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-muted">Loading stay & rate details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
          {/* Main Booking Form Column */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmitBooking} className="space-y-6">
              {/* Submission Error Banner */}
              {error && (
                <div className="p-4 bg-error-light border border-error/20 text-error text-xs font-semibold rounded-2xl flex items-start gap-3">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0 text-error mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Stay Model & Dates */}
              <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      1. Stay Duration & Dates
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Select your stay type and check-in timeline
                    </p>
                  </div>
                  <CalendarDaysIcon className="w-5 h-5 text-muted shrink-0" />
                </div>

                {/* Stay Type Selector Tabs */}
                {visibleTabs.length > 1 ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Stay Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-muted p-1.5 rounded-2xl border border-border/60">
                      {visibleTabs.map((tab) => {
                        const isActive = bookingType === tab.value;
                        return (
                          <button
                            key={tab.value}
                            type="button"
                            onClick={() => setBookingType(tab.value)}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? "bg-surface text-foreground shadow-2xs border border-border"
                                : "text-muted hover:text-foreground hover:bg-surface/50"
                            }`}
                          >
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : visibleTabs.length === 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Stay Type:</span>
                    <Badge variant="sage" size="sm">
                      {visibleTabs[0].label}
                    </Badge>
                  </div>
                ) : null}

                {/* Date Fields — Daily / Nightly */}
                {bookingType === "daily" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Check-in Date *
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Check-out Date *
                        </label>
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                    </div>

                    {startDate && endDate && (
                      <div className="p-3 rounded-xl bg-surface-muted border border-border/80 flex items-center justify-between text-xs text-muted">
                        <span className="font-medium">
                          {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                        </span>
                        <span className="font-bold text-foreground">
                          {pricePreview?.durationText}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Fields — Monthly Rental */}
                {bookingType === "monthly" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Move-in Date *
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => handleMonthlyStartDateChange(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Move-out Date *
                        </label>
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                    </div>

                    {/* Quick Duration Preset Buttons */}
                    <div>
                      <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        Quick Duration Presets (30-day billing cycles)
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
                            className="px-3 py-1.5 bg-surface-muted hover:bg-surface border border-border text-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            + {months} {months === 1 ? "Month" : "Months"} ({months * 30} Days)
                          </button>
                        ))}
                      </div>
                    </div>

                    {startDate && endDate && (
                      <div className="p-3 rounded-xl bg-surface-muted border border-border/80 flex items-center justify-between text-xs text-muted">
                        <span className="font-medium">
                          {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                        </span>
                        <span className="font-bold text-foreground">
                          {pricePreview?.durationText} ({pricePreview?.billedText} billed)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Fields — Hourly Transit */}
                {bookingType === "hourly" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-foreground">
                        Stay Date *
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        value={hourlyDate}
                        onChange={(e) => setHourlyDate(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-foreground">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus-ring"
                        />
                      </div>
                    </div>

                    {/* Quick Duration Presets for Transit */}
                    <div>
                      <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        Common Transit Durations
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[2, 4, 6, 8].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => {
                              const [sH, sM] = (startTime || "10:00").split(":").map(Number);
                              const endMins = sH * 60 + sM + hours * 60;
                              const clamped = Math.min(endMins, 23 * 60 + 59);
                              const eH = Math.floor(clamped / 60);
                              const eM = clamped % 60;
                              setEndTime(`${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`);
                            }}
                            className="px-3 py-1.5 bg-surface-muted hover:bg-surface border border-border text-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            {hours} Hours
                          </button>
                        ))}
                      </div>
                    </div>

                    {hourlyDate && startTime && endTime && (
                      <div className="p-3 rounded-xl bg-surface-muted border border-border/80 flex items-center justify-between text-xs text-muted">
                        <span className="font-medium">
                          {formatDateDisplay(hourlyDate)} ({formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)})
                        </span>
                        <span className="font-bold text-foreground">
                          {pricePreview?.durationText}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Live Availability Feedback Banner */}
                {availabilityError ? (
                  <div className="p-3.5 bg-error-light border border-error/25 text-error text-xs font-medium rounded-2xl flex items-start gap-2.5">
                    <AlertTriangleIcon className="w-4 h-4 shrink-0 text-error mt-0.5" />
                    <div>
                      <p className="font-semibold text-error">Dates Unavailable</p>
                      <p className="text-[11px] text-error/90 mt-0.5">{availabilityError}</p>
                    </div>
                  </div>
                ) : checkingAvailability ? (
                  <div className="p-3 bg-surface-muted border border-border text-muted text-xs font-medium rounded-2xl flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-muted/30 border-t-muted rounded-full animate-spin shrink-0" />
                    <span>Verifying stay availability with backend...</span>
                  </div>
                ) : (
                  <div className="p-3 bg-success-light/60 border border-success/20 text-success text-xs font-medium rounded-2xl flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 shrink-0 text-success" />
                    <span>Selected dates are available for reservation</span>
                  </div>
                )}
              </div>

              {/* Section 2: Primary Guest Details */}
              <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      2. Guest Contact Information
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      The host receives these details to coordinate your check-in access
                    </p>
                  </div>
                  <UserIcon className="w-5 h-5 text-muted shrink-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Rahul Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    leftIcon={<UserIcon className="w-4 h-4" />}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    leftIcon={<span className="text-xs font-bold text-muted">+91</span>}
                    hint="For WhatsApp or direct host coordination"
                  />
                </div>
              </div>

              {/* Section 3: Direct Reservation Assurance */}
              <div className="bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xs space-y-3.5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  StayTrack Direct Guarantee
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-surface-muted/60 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                      <span>{isDirectBooking ? "Direct Reservation" : "Host Review"}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      {isDirectBooking
                        ? "Instant reservation directly held and confirmed with the property."
                        : "Reservation goes directly to the host for verification and confirmation."}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-muted/60 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <CreditCardIcon className="w-4 h-4 text-primary shrink-0" />
                      <span>No Upfront Charge</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      You are not charged until the host reviews and confirms your reservation.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-muted/60 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <ClockIcon className="w-4 h-4 text-primary shrink-0" />
                      <span>Direct Chat</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Coordinate check-in times and house guidelines directly with the host.
                    </p>
                  </div>
                </div>
              </div>

              {/* Final Reservation Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitLoading || !!availabilityError}
                  className="w-full py-4 px-6 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus-ring"
                >
                  {submitLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      <span>{isDirectBooking ? "Confirming Direct Reservation..." : "Submitting Reservation Request..."}</span>
                    </>
                  ) : availabilityError ? (
                    <span>Dates Unavailable — Choose Other Dates</span>
                  ) : (
                    <>
                      <span>{isDirectBooking ? "Confirm & Reserve Directly" : "Request Reservation"}</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-muted font-medium mt-2.5">
                  {isDirectBooking
                    ? "Your reservation will be confirmed and tracked in My Trips."
                    : "You will not be billed at this step. Your reservation request will be tracked in My Trips."}
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Property Overview & Itemized Price Breakdown */}
          <div className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
              {/* Genuine Property Photo or Deliberate Architectural Fallback */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-surface-muted border border-border/80">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={property?.title || "Property"}
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE5] to-[#E3E0D6] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-surface/90 border border-border flex items-center justify-center text-foreground mb-2 shadow-2xs">
                      <Building2Icon className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {getCategoryLabel(property?.propertyType || property?.category || "Stay")}
                    </span>
                    <span className="text-[11px] text-muted font-medium mt-0.5 line-clamp-1 max-w-[220px]">
                      {[property?.area, property?.city].filter(Boolean).join(", ") || "Delhi NCR"}
                    </span>
                  </div>
                )}
              </div>

              {/* Selected Property Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge variant="sage" size="sm">
                    {getCategoryLabel(property?.propertyType || property?.category || "Stay")}
                  </Badge>
                  {hasValidRating && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                      <span>{property!.rating!.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <h2 className="text-base font-bold text-foreground tracking-tight leading-snug">
                  {property?.title}
                </h2>

                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
                  <span className="line-clamp-1">
                    {[property?.area, property?.city].filter(Boolean).join(", ") || "Delhi NCR"}
                  </span>
                </div>

                {selectedOccupancyOption && (
                  <div className="p-3 rounded-2xl bg-surface-muted border border-border/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Room / Sharing Option
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {selectedOccupancyOption.occupancyType}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {selectedOccupancyOption.name}
                    </p>
                    <p className="text-[11px] text-muted font-medium">
                      {formatCurrency(selectedOccupancyOption.monthlyRentPerBed)} / month per bed
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized Price Breakdown */}
              {pricePreview && (
                <div className="pt-4 border-t border-border space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Price Details
                  </h3>

                  <div className="space-y-2 text-xs">
                    {/* Stay Rate × Duration */}
                    <div className="flex justify-between items-center text-muted">
                      <span>
                        {pricePreview.rateLabel} × {pricePreview.durationText}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(pricePreview.total)}
                      </span>
                    </div>

                    {/* Refundable Security Deposit if configured */}
                    {securityDeposit > 0 && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-muted">
                          <span>Refundable Security Deposit</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(securityDeposit)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-light">
                          Payable directly to host at move-in; fully refunded at check-out.
                        </p>
                      </div>
                    )}

                    {/* StayTrack Booking & Platform Fee */}
                    <div className="flex justify-between items-center text-muted">
                      <span>Platform & Booking Fee</span>
                      <span className="font-semibold text-success">₹0 (Free)</span>
                    </div>

                    {/* Total Row */}
                    <div className="pt-3 border-t border-border flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-bold text-foreground">
                          Estimated Total
                        </span>
                        <p className="text-[10px] text-muted">
                          Stay charges verified by backend
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-foreground">
                        {formatCurrency(pricePreview.total)}
                      </span>
                    </div>
                  </div>

                  {securityDeposit > 0 && (
                    <p className="text-[11px] text-muted leading-relaxed bg-surface-muted/60 p-2.5 rounded-xl border border-border/60">
                      <strong>Note:</strong> Total covers accommodation charges. The {formatCurrency(securityDeposit)} refundable deposit is settled directly with the host upon check-in.
                    </p>
                  )}
                </div>
              )}

              {/* Trust Badge */}
              <div className="p-3 rounded-2xl bg-surface-muted border border-border/80 flex items-center gap-2.5 text-[11px] text-muted">
                <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                <span>{isDirectBooking ? "Direct property reservation · Zero brokerage markup" : "Direct host reservation · Zero brokerage markup"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CreateBookingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-muted">Loading booking page...</p>
          </div>
        </div>
      }>
        <CreateBookingContent />
      </Suspense>
      <Footer />
      <MobileNav />
    </div>
  );
}
