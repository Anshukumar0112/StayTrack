"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import PropertyGallery from "@/components/properties/PropertyGallery";
import BackButton from "@/components/ui/BackButton";
import { formatCurrency } from "@/lib/utils";
import {
  getPropertyDetails,
  getPropertyReviews,
  createConversation,
  createReview,
  checkPropertyAvailability,
} from "@/lib/api";
import { Property, Review } from "@/types/property";
import {
  MapPinIcon,
  BadgeCheckIcon,
  Building2Icon,
  BedDoubleIcon,
  BathIcon,
  ArmchairIcon,
  StarIcon,
  StarOutlineIcon,
  MessageCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  CreditCardIcon,
  CheckIcon,
  AlertTriangleIcon,
  HeartIcon,
  Share2Icon,
  UsersIcon,
  ZapIcon,
  CarIcon,
  UtensilsIcon,
  CoffeeIcon,
  FileTextIcon,
  WifiIcon,
  WindIcon,
  TvIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
} from "@/components/ui/Icons";

const FAVORITES_KEY = "staytrack_favorites";

function getStoredFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Semantic amenity icon mapper
function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase();
  if (lower.includes("wifi") || lower.includes("internet") || lower.includes("broadband") || lower.includes("wi-fi")) {
    return <WifiIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("ac") || lower.includes("air condition") || lower.includes("cooling") || lower.includes("air-conditioning")) {
    return <WindIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("tv") || lower.includes("television") || lower.includes("cable") || lower.includes("ott")) {
    return <TvIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("parking") || lower.includes("car") || lower.includes("garage") || lower.includes("vehicle")) {
    return <CarIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("power") || lower.includes("generator") || lower.includes("backup") || lower.includes("geyser") || lower.includes("electricity")) {
    return <ZapIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("kitchen") || lower.includes("cooking") || lower.includes("fridge") || lower.includes("refrigerator") || lower.includes("microwave") || lower.includes("food") || lower.includes("mess")) {
    return <UtensilsIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("breakfast") || lower.includes("coffee") || lower.includes("tea")) {
    return <CoffeeIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("security") || lower.includes("cctv") || lower.includes("guard") || lower.includes("biometric") || lower.includes("safety") || lower.includes("lock")) {
    return <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("bed") || lower.includes("mattress") || lower.includes("linen") || lower.includes("pillow")) {
    return <BedDoubleIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("bath") || lower.includes("shower") || lower.includes("washroom") || lower.includes("toilet")) {
    return <BathIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  return <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />;
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Favorite / Wishlist state
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Dates & Availability state
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(tomorrowStr);
  const [availChecking, setAvailChecking] = useState(false);
  const [availStatus, setAvailStatus] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);

  // Review submission state (guests tap stars to choose rating, no default 5.0)
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Contact host state
  const [contactLoading, setContactLoading] = useState(false);

  // Synchronize favorite status with localStorage
  useEffect(() => {
    if (!propertyId) return;
    let isMounted = true;

    void Promise.resolve().then(() => {
      if (isMounted) {
        setIsFavorite(getStoredFavorites().includes(propertyId));
      }
    });

    const handleStorageUpdate = () => {
      if (isMounted) {
        setIsFavorite(getStoredFavorites().includes(propertyId));
      }
    };

    window.addEventListener("staytrack_favorites_updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("staytrack_favorites_updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [propertyId]);

  const handleToggleFavorite = () => {
    try {
      const current = getStoredFavorites();
      const exists = current.includes(propertyId);
      const updated = exists
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setIsFavorite(!exists);
      window.dispatchEvent(new Event("staytrack_favorites_updated"));
    } catch {
      // ignore storage errors
    }
  };

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2200);
      }
    } catch {
      // ignore clipboard error
    }
  };

  // Load property & reviews
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setLoading(true);

      try {
        const [propRes, revRes] = await Promise.allSettled([
          getPropertyDetails(propertyId),
          getPropertyReviews(propertyId),
        ]);

        if (!isMounted) return;

        if (propRes.status === "fulfilled" && propRes.value) {
          setProperty(propRes.value);
        }
        if (revRes.status === "fulfilled" && Array.isArray(revRes.value)) {
          setReviews(revRes.value);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Real-time availability validation
  useEffect(() => {
    if (!propertyId || !startDate || !endDate) return;
    let isMounted = true;

    const verifyAvailability = async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setAvailChecking(true);

      try {
        const res = await checkPropertyAvailability(propertyId, {
          startDate,
          endDate,
          bookingType: property?.bookingType || "daily",
        });
        if (isMounted) {
          setAvailStatus(res);
        }
      } catch {
        if (isMounted) {
          setAvailStatus({ available: true });
        }
      } finally {
        if (isMounted) {
          setAvailChecking(false);
        }
      }
    };

    void verifyAvailability();

    return () => {
      isMounted = false;
    };
  }, [propertyId, startDate, endDate, property?.bookingType]);

  // Determine active booking type and rates
  const resolvedBookingType = useMemo(() => {
    if (!property) return "daily";

    // 1. Explicit bookingType if valid
    const bType = String(property.bookingType || "").toLowerCase();
    if (bType === "monthly" || bType === "hourly" || bType === "daily") {
      return bType;
    }

    // 2. Check stayTypes array
    if (Array.isArray(property.stayTypes) && property.stayTypes.length > 0) {
      const lowerTypes = property.stayTypes.map((t) => String(t).toLowerCase());
      if (lowerTypes.includes("monthly") && !lowerTypes.includes("daily")) return "monthly";
      if (lowerTypes.includes("hourly") && !lowerTypes.includes("daily")) return "hourly";
      if (lowerTypes.includes("daily")) return "daily";
      if (lowerTypes.includes("monthly")) return "monthly";
    }

    // 3. Infer from available rate fields
    const hasDaily = Boolean(property.dailyPrice || property.pricePerNight);
    const hasMonthly = Boolean(property.monthlyPrice || property.pricePerMonth);
    const hasHourly = Boolean(property.hourlyPrice || property.pricePerHour);

    if (hasMonthly && !hasDaily) return "monthly";
    if (hasHourly && !hasDaily && !hasMonthly) return "hourly";
    if (hasDaily) return "daily";

    // 4. Infer from property category defaults
    const cat = String(property.propertyType || property.category || "").toUpperCase();
    if (cat === "FLAT" || cat === "APARTMENT" || cat === "PG" || cat === "HOUSE") {
      return "monthly";
    }

    return "daily";
  }, [property]);

  // Authoritative primary rate reflecting selected booking type
  const primaryPrice = useMemo(() => {
    if (!property) return 0;
    if (resolvedBookingType === "monthly") {
      return property.monthlyPrice || property.pricePerMonth || property.price || 0;
    }
    if (resolvedBookingType === "hourly") {
      return property.hourlyPrice || property.pricePerHour || property.price || 0;
    }
    return property.dailyPrice || property.pricePerNight || property.price || 0;
  }, [property, resolvedBookingType]);

  const bookingPeriodLabel = useMemo(() => {
    if (resolvedBookingType === "monthly") return "month";
    if (resolvedBookingType === "hourly") return "hour";
    return "night";
  }, [resolvedBookingType]);

  // Sync default checkout date for monthly rentals to 30 days
  useEffect(() => {
    if (resolvedBookingType === "monthly") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setEndDate(d.toISOString().split("T")[0]);
    }
  }, [resolvedBookingType]);

  const handleBookNow = () => {
    const query = new URLSearchParams({
      propertyId,
      startDate,
      endDate,
      bookingType: resolvedBookingType,
    });
    router.push(`/booking?${query.toString()}`);
  };

  const handleContactHost = async () => {
    setContactLoading(true);
    try {
      await createConversation({ propertyId });
      router.push("/chat");
    } catch {
      router.push("/chat");
    } finally {
      setContactLoading(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating) {
      setReviewFeedback({
        type: "error",
        message: "Please select a star rating (1 to 5) before submitting your review.",
      });
      return;
    }
    if (!reviewComment.trim()) return;

    setReviewLoading(true);
    setReviewFeedback(null);

    try {
      const newRev = await createReview({
        propertyId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviews((prev) => [newRev, ...prev]);
      setReviewComment("");
      setReviewRating(null);
      setReviewFeedback({
        type: "success",
        message: "Thank you! Your verified review has been published.",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit review.";
      setReviewFeedback({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const displayTitle = property?.title || "Property Details";
  const displayCity = property?.city || "Delhi NCR";
  const displayArea = property?.area || "";
  const displayAddress = property?.address || "";
  const isVerified =
    property?.verificationStatus === "approved" || Boolean(property?.topVerified);

  // Honest rating presentation (no fake 4.8)
  const hasRating =
    typeof property?.rating === "number" && property.rating > 0;

  // Duration calculation for live transparent price estimate
  const durationCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 1;
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    if (bookingPeriodLabel === "month") {
      return Math.max(1, Math.round(diffDays / 30));
    }
    return diffDays;
  }, [startDate, endDate, bookingPeriodLabel]);

  const estimatedTotal = useMemo(() => {
    return primaryPrice * durationCount;
  }, [primaryPrice, durationCount]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground selection:bg-primary/20 selection:text-foreground">
      <Header />

      <main className="stay-container pt-4 sm:pt-6 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-12 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Navigation Breadcrumb & Header Action Strip */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton fallbackUrl="/properties" />
            <span className="hidden sm:inline-block h-4 w-px bg-border shrink-0" aria-hidden="true" />
            <nav
              aria-label="Breadcrumb"
              className="hidden sm:flex items-center flex-wrap gap-2 text-xs font-medium text-muted truncate"
            >
              <Link
                href="/properties"
                className="hover:text-foreground transition-colors"
              >
                Stays
              </Link>
              <span className="text-border">/</span>
              <Link
                href={`/properties?city=${encodeURIComponent(displayCity)}`}
                className="hover:text-foreground transition-colors"
              >
                {displayCity}
              </Link>
              {displayArea && (
                <>
                  <span className="text-border">/</span>
                  <span className="text-muted">{displayArea}</span>
                </>
              )}
              <span className="text-border">/</span>
              <span className="text-foreground font-semibold truncate max-w-xs sm:max-w-md">
                {displayTitle}
              </span>
            </nav>
          </div>

          {/* Header Quick Actions: Wishlist & Share */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={
                isFavorite ? "Remove from saved stays" : "Save this stay"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-foreground/30 shadow-2xs"
              }`}
            >
              <HeartIcon
                className={`w-3.5 h-3.5 ${
                  isFavorite ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
              <span>{isFavorite ? "Saved" : "Save"}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share this listing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-muted hover:text-foreground hover:border-foreground/30 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Share2Icon className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {shareCopied && (
              <span className="absolute -bottom-8 right-0 bg-[#111716] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md whitespace-nowrap z-30 animate-in fade-in zoom-in-95">
                Link copied to clipboard!
              </span>
            )}
          </div>
        </div>

        {loading ? (
          /* Loading Skeleton */
          <div className="animate-pulse space-y-6">
            <div className="space-y-3">
              <div className="h-5 w-40 bg-surface-muted rounded-md" />
              <div className="h-9 w-2/3 bg-surface-muted rounded-xl" />
              <div className="h-4 w-1/3 bg-surface-muted rounded-md" />
            </div>
            <div className="h-80 sm:h-[440px] bg-surface-muted rounded-3xl w-full border border-border" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-surface rounded-3xl p-6 border border-border space-y-4">
                  <div className="h-8 bg-surface-muted rounded w-2/3" />
                  <div className="h-4 bg-surface-muted rounded w-1/3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                    <div className="h-16 bg-surface-muted rounded-xl" />
                    <div className="h-16 bg-surface-muted rounded-xl" />
                    <div className="h-16 bg-surface-muted rounded-xl" />
                    <div className="h-16 bg-surface-muted rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-80 bg-surface rounded-3xl border border-border" />
              </div>
            </div>
          </div>
        ) : !property ? (
          /* Not Found State */
          <div className="py-20 text-center bg-surface border border-border rounded-3xl p-8 max-w-xl mx-auto shadow-subtle my-8">
            <div className="w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center mx-auto mb-4 text-muted">
              <AlertTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Stay Not Found
            </h1>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              This property listing is unavailable, archived, or may have been
              removed by the host.
            </p>
            <div className="mt-6">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111716] text-white text-xs font-semibold hover:bg-black transition-colors"
              >
                <span>Browse All Verified Stays</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Editorial Property Header Block (Above Gallery) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {property.propertyType || "Verified Stay"}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <BadgeCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Host Verified</span>
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                {displayTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-xs text-muted font-medium pt-0.5">
                <div className="flex items-center gap-1 text-foreground font-semibold">
                  <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {displayArea ? `${displayArea}, ` : ""}
                    {displayCity}
                  </span>
                </div>
                {displayAddress && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate max-w-xs sm:max-w-md">{displayAddress}</span>
                  </>
                )}
                <span className="text-border">·</span>
                {hasRating && reviews.length > 0 ? (
                  <div className="flex items-center gap-1 text-foreground font-bold">
                    <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>{property.rating?.toFixed(1)}</span>
                    <span className="text-muted font-normal">
                      ({reviews.length}{" "}
                      {reviews.length === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-surface-muted text-[11px] font-medium text-muted border border-border/60">
                      New listing
                    </span>
                    <span className="text-muted/60">·</span>
                    <span>No reviews yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Media Gallery (Polished Mosaic Grid / Clean Single Hero) */}
            <PropertyGallery
              images={property.images}
              title={displayTitle}
              isVerified={isVerified}
              propertyType={property.propertyType}
            />

            {/* Main Content Layout: Left Details Column + Right Sticky Reservation Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 items-start pt-2">
              {/* Left Column: Cohesive Editorial Details (Card Clutter Eliminated) */}
              <div className="lg:col-span-2 space-y-9">
                {/* 1. Host Introduction Strip */}
                <div className="pb-6 border-b border-border/70 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-surface-muted border border-border flex items-center justify-center text-primary font-bold text-sm shadow-2xs">
                      {property.hostId ? property.hostId.charAt(0).toUpperCase() : "H"}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        Hosted by {property.hostId ? `Host ${property.hostId.slice(0, 8)}` : "Verified Host"}
                      </h2>
                      <p className="text-xs text-muted font-medium mt-0.5">
                        Identity Verified · Direct Host Contact
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleContactHost}
                    disabled={contactLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs shrink-0 focus-ring"
                  >
                    <MessageCircleIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{contactLoading ? "Opening..." : "Message Host"}</span>
                  </button>
                </div>

                {/* 2. Category-Adaptive Key Specifications Matrix */}
                <div className="pb-8 border-b border-border/70 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Stay Highlights & Specifications
                    </h2>
                    <p className="text-xs text-foreground font-semibold">
                      Authentic specifications verified for this {property.propertyType || "property"}
                    </p>
                  </div>

                  {(() => {
                    const catUpper = (property.propertyType || property.category || "FLAT").toUpperCase();

                    // FLAT / APARTMENT / HOUSE
                    if (catUpper === "FLAT" || catUpper === "APARTMENT" || catUpper === "HOUSE") {
                      const bhk = property.bhkConfig || (property.bedrooms ? `${property.bedrooms} BHK` : "Apartment");
                      const deposit = property.securityDeposit ? `₹${property.securityDeposit.toLocaleString("en-IN")}` : "1 Month Rent";
                      const maintenance = property.maintenanceCharges ? `₹${property.maintenanceCharges.toLocaleString("en-IN")}/mo` : "Included in Rent";
                      const floors = property.floorNumber ? `${property.floorNumber}${property.totalFloors ? ` of ${property.totalFloors}` : ""} Floor` : undefined;

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <Building2Icon className="w-3.5 h-3.5 text-primary" />
                                Configuration
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {bhk}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <BathIcon className="w-3.5 h-3.5 text-primary" />
                                Bathrooms
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {property.bathrooms || 1} {property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <ArmchairIcon className="w-3.5 h-3.5 text-primary" />
                                Furnishing & Size
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {property.furnished ? "Furnished" : "Unfurnished"}
                                {property.areaSqFt ? ` · ${property.areaSqFt} sq.ft` : ""}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <CreditCardIcon className="w-3.5 h-3.5 text-primary" />
                                Security Deposit
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {deposit}
                              </span>
                            </div>
                          </div>

                          {/* Flat Details Strip with Icons */}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted bg-surface-muted/50 p-3.5 rounded-2xl border border-border/60">
                            {floors && (
                              <span className="inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-border text-foreground font-semibold shadow-2xs">
                                <Building2Icon className="w-3.5 h-3.5 text-primary" />
                                <span>{floors}</span>
                              </span>
                            )}
                            {property.tenantPreference && (
                              <span className="inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-border text-foreground font-semibold shadow-2xs">
                                <UsersIcon className="w-3.5 h-3.5 text-primary" />
                                <span>
                                  Tenant: {property.tenantPreference === "family" ? "Families Only" : property.tenantPreference === "bachelors" ? "Bachelors Welcome" : "Any Tenant"}
                                </span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-border text-foreground font-semibold shadow-2xs">
                              <ZapIcon className="w-3.5 h-3.5 text-primary" />
                              <span>Maintenance: {maintenance}</span>
                            </span>
                            {property.parkingType && property.parkingType !== "none" && (
                              <span className="inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-border text-foreground font-semibold shadow-2xs">
                                <CarIcon className="w-3.5 h-3.5 text-primary" />
                                <span>
                                  Parking: {property.parkingType === "covered" ? "Covered Parking" : property.parkingType === "two_wheeler" ? "Two-Wheeler" : "Open Parking"}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // PG (PAYING GUEST)
                    if (catUpper === "PG") {
                      let occ = property.occupancyType;
                      if (occ === "single") occ = "Single Occupancy";
                      else if (occ === "double") occ = "Double Sharing";
                      else if (occ === "triple") occ = "Triple Sharing";
                      else if (occ === "four_plus") occ = "4+ Sharing Dorm";
                      else if (!occ && property.bedrooms) occ = property.bedrooms === 1 ? "Single Room" : `${property.bedrooms} Sharing`;
                      else occ = "Shared Room";

                      let gender = property.genderCategory;
                      if (gender === "boys") gender = "Boys Only PG";
                      else if (gender === "girls") gender = "Girls Only PG";
                      else if (gender === "unisex" || gender === "coliving") gender = "Coliving / Unisex";
                      else gender = "Unisex PG";

                      const deposit = property.securityDeposit ? `₹${property.securityDeposit.toLocaleString("en-IN")}` : "1 Month";
                      const curfew = property.gateClosingTime || "10:30 PM";

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <BedDoubleIcon className="w-3.5 h-3.5 text-primary" />
                                Occupancy
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {occ}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-primary" />
                                Gender Category
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {gender}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5 text-primary" />
                                Gate Closing
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {curfew}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <CreditCardIcon className="w-3.5 h-3.5 text-primary" />
                                Security Deposit
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {deposit}
                              </span>
                            </div>
                          </div>

                          {/* PG Meals & Notice Facility Banner */}
                          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <UtensilsIcon className="w-4 h-4 text-primary" />
                                <span>Meals & Mess: {property.foodIncluded ? "Included in Monthly Rent" : "Self Cooking / Optional Mess"}</span>
                              </span>
                              {property.foodIncluded && property.foodOptions && property.foodOptions.length > 0 && (
                                <p className="text-[11px] text-muted mt-1">
                                  Provided: {property.foodOptions.join(" · ")}
                                </p>
                              )}
                            </div>
                            {property.noticePeriodDays !== undefined && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground bg-surface px-3 py-1.5 rounded-xl border border-border shadow-2xs self-start sm:self-auto">
                                <FileTextIcon className="w-3.5 h-3.5 text-primary" />
                                <span>Notice: {property.noticePeriodDays} Days</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // HOSTEL
                    if (catUpper === "HOSTEL") {
                      const dorm = property.roomType === "private" ? "Private Room" : "Dormitory";
                      const totalBeds = property.totalBeds || property.bedrooms || 4;
                      const availBeds = property.availableBeds !== undefined ? property.availableBeds : 2;
                      const priceModel = property.priceModel === "per_room" ? "Per Room Basis" : "Per Bed Basis";
                      const audience = property.studentOrWorking === "students" ? "Students Only" : property.studentOrWorking === "working_professionals" ? "Working Professionals" : "Open to All";

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <Building2Icon className="w-3.5 h-3.5 text-primary" />
                                Structure
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {dorm}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <BedDoubleIcon className="w-3.5 h-3.5 text-primary" />
                                Bed Availability
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {availBeds} of {totalBeds} Beds Free
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <CreditCardIcon className="w-3.5 h-3.5 text-primary" />
                                Pricing Model
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {priceModel}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <UsersIcon className="w-3.5 h-3.5 text-primary" />
                                Eligibility
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {audience}
                              </span>
                            </div>
                          </div>

                          {property.sharedFacilities && property.sharedFacilities.length > 0 && (
                            <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border">
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                                Shared Hostel Facilities
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {property.sharedFacilities.map((fac) => (
                                  <span key={fac} className="inline-flex items-center gap-1.5 bg-surface text-foreground border border-border px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-primary" />
                                    <span>{fac}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // HOTEL
                    if (catUpper === "HOTEL") {
                      let room = property.roomType;
                      if (room === "standard") room = "Standard Classic";
                      else if (room === "deluxe") room = "Deluxe Room";
                      else if (room === "executive") room = "Executive Room";
                      else if (room === "suite") room = "Luxury Suite";
                      else if (!room) room = "Hotel Room";

                      let bed = property.bedType;
                      if (bed === "king") bed = "1 King Bed";
                      else if (bed === "queen") bed = "1 Queen Bed";
                      else if (bed === "twin") bed = "2 Twin Beds";
                      else if (bed === "single") bed = "1 Single Bed";
                      else bed = "Comfort Bed";

                      const maxG = property.maxGuests || 2;
                      const checkIn = property.checkInTime || "12:00 PM";
                      const checkOut = property.checkOutTime || "11:00 AM";

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <Building2Icon className="w-3.5 h-3.5 text-primary" />
                                Room Category
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {room}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <BedDoubleIcon className="w-3.5 h-3.5 text-primary" />
                                Bed Configuration
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                {bed}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5 text-primary" />
                                Check-In / Out
                              </span>
                              <span className="text-xs font-bold text-foreground mt-2">
                                In: {checkIn} · Out: {checkOut}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <UsersIcon className="w-3.5 h-3.5 text-primary" />
                                Occupancy
                              </span>
                              <span className="text-sm font-bold text-foreground mt-2">
                                Up to {maxG} Guests
                              </span>
                            </div>
                          </div>

                          {/* Hotel Breakfast & Cancellation */}
                          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <CoffeeIcon className="w-4 h-4 text-primary" />
                                <span>Breakfast: {property.breakfastIncluded ? "Complimentary Free Breakfast Included" : "Available at Property / Extra"}</span>
                              </span>
                              <p className="text-[11px] text-muted">
                                Cancellation: {property.cancellationPolicy === "flexible" ? "Free cancellation up to 24h before check-in" : property.cancellationPolicy === "non_refundable" ? "Non-refundable reservation" : "Moderate host cancellation policy applies"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // BNB / HOMESTAY
                    let space = property.spaceType;
                    if (space === "entire_place") space = "Entire Villa / Apartment";
                    else if (space === "private_room") space = "Private Room";
                    else if (space === "shared_room") space = "Shared Homestay";
                    else space = "Entire Place";

                    const maxG = property.maxGuests || (property.bedrooms ? property.bedrooms * 2 : 2);
                    const beds = property.bedsCount || property.bedrooms || 1;
                    const checkIn = property.checkInTime || "02:00 PM";
                    const checkOut = property.checkOutTime || "11:00 AM";

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <Building2Icon className="w-3.5 h-3.5 text-primary" />
                              Space Type
                            </span>
                            <span className="text-sm font-bold text-foreground mt-2">
                              {space}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <UsersIcon className="w-3.5 h-3.5 text-primary" />
                              Guest Capacity
                            </span>
                            <span className="text-sm font-bold text-foreground mt-2">
                              Up to {maxG} Guests
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <BedDoubleIcon className="w-3.5 h-3.5 text-primary" />
                              Beds & Rooms
                            </span>
                            <span className="text-sm font-bold text-foreground mt-2">
                              {beds} {beds === 1 ? "Bed" : "Beds"} · {property.bathrooms || 1} Bath
                            </span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5 text-primary" />
                              Check-In / Out
                            </span>
                            <span className="text-xs font-bold text-foreground mt-2">
                              In: {checkIn} · Out: {checkOut}
                            </span>
                          </div>
                        </div>

                        {property.houseRules && property.houseRules.length > 0 && (
                          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                              House Rules & Host Policies
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {property.houseRules.map((rule) => (
                                <span key={rule} className="inline-flex items-center gap-1.5 bg-surface text-foreground border border-border px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs">
                                  <FileTextIcon className="w-3.5 h-3.5 text-primary" />
                                  <span>{rule}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. About this stay (Description) */}
                <div className="pb-8 border-b border-border/70 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                    About this stay
                  </h2>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {property.description ||
                      "No extended description provided by host. Please contact host directly for specific queries regarding this verified accommodation."}
                  </p>
                </div>

                {/* 4. Included Amenities Section (Only if supported by the property record) */}
                {property.amenities &&
                  Array.isArray(property.amenities) &&
                  property.amenities.length > 0 && (
                    <div className="pb-8 border-b border-border/70 space-y-4">
                      <div className="space-y-0.5">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                          Amenities & Living Facilities
                        </h2>
                        <p className="text-xs text-foreground font-semibold">
                          Verified features and amenities provided with this stay
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {property.amenities.map((amenity, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-border/80 text-xs font-semibold text-foreground shadow-2xs"
                          >
                            {getAmenityIcon(amenity)}
                            <span className="truncate">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 5. Transparent Pricing & Duration Options */}
                <div className="pb-8 border-b border-border/70 space-y-4">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Transparent Rates & Durations
                    </h2>
                    <p className="text-xs text-foreground font-semibold mt-0.5">
                      Authoritative pricing configured directly by host
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Daily Rate */}
                    {property.pricePerNight || property.dailyPrice ? (
                      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                          Daily Stays
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-xl font-black text-foreground">
                            {formatCurrency(property.pricePerNight || property.dailyPrice || 0)}
                          </span>
                          <span className="text-[11px] text-muted">/ night</span>
                        </div>
                        <span className="text-[11px] text-muted mt-2 block">
                          Ideal for short visits and business layovers
                        </span>
                      </div>
                    ) : null}

                    {/* Monthly Rent */}
                    {property.pricePerMonth || property.monthlyPrice ? (
                      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                          Monthly Rental
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-xl font-black text-foreground">
                            {formatCurrency(property.pricePerMonth || property.monthlyPrice || 0)}
                          </span>
                          <span className="text-[11px] text-muted">/ month</span>
                        </div>
                        <span className="text-[11px] text-muted mt-2 block">
                          Long-term leasing with direct tenant agreements
                        </span>
                      </div>
                    ) : null}

                    {/* Hourly Slot */}
                    {property.pricePerHour || property.hourlyPrice ? (
                      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                          Hourly Slots
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-xl font-black text-foreground">
                            {formatCurrency(property.pricePerHour || property.hourlyPrice || 0)}
                          </span>
                          <span className="text-[11px] text-muted">/ hour</span>
                        </div>
                        <span className="text-[11px] text-muted mt-2 block">
                          Flexible day-use and transit stays
                        </span>
                      </div>
                    ) : null}

                    {/* Fallback */}
                    {!property.pricePerNight &&
                      !property.dailyPrice &&
                      !property.pricePerMonth &&
                      !property.monthlyPrice &&
                      !property.pricePerHour &&
                      !property.hourlyPrice && (
                        <div className="sm:col-span-3 p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                            Base Rate
                          </span>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-xl font-black text-foreground">
                              {formatCurrency(primaryPrice)}
                            </span>
                            <span className="text-[11px] text-muted">
                              / {bookingPeriodLabel}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* 7. Verified Guest Reviews & Inline Review Form */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Verified Guest Reviews
                      </h2>
                      <p className="text-xs text-foreground font-semibold mt-0.5">
                        Authentic feedback from tenants and guests who completed their stay
                      </p>
                    </div>
                    <span className="text-xs font-bold text-foreground bg-surface border border-border px-3 py-1 rounded-full shadow-2xs">
                      {reviews.length > 0
                        ? `${reviews.length} ${reviews.length === 1 ? "Review" : "Reviews"}`
                        : "No reviews yet"}
                    </span>
                  </div>

                  {/* Add Review Inline Form */}
                  <form
                    onSubmit={handleAddReview}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-subtle space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-foreground">
                        Write a Guest Review
                      </h3>
                      {/* Interactive Star Rating Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-muted mr-1.5">
                          Your Rating:
                        </span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-1 hover:scale-115 transition-transform cursor-pointer focus-ring rounded"
                            aria-label={`Select ${star} stars`}
                          >
                            <StarIcon
                              className={`w-4 h-4 ${
                                reviewRating !== null && star <= reviewRating
                                  ? "text-[#D9A441]"
                                  : "text-border"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-foreground ml-1">
                          {reviewRating ? `${reviewRating} / 5` : "Tap to rate"}
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Share your stay experience, property cleanliness, amenities, and host responsiveness..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full p-3.5 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                    />

                    {/* Inline Form Feedback Banner */}
                    {reviewFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                          reviewFeedback.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {reviewFeedback.type === "success" ? (
                          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{reviewFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={reviewLoading || !reviewComment.trim()}
                        className="px-5 py-2.5 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-ring"
                      >
                        {reviewLoading ? "Submitting..." : "Post Review"}
                      </button>
                    </div>
                  </form>

                  {/* Reviews Stream */}
                  {reviews.length > 0 ? (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 space-y-2.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-primary font-bold text-xs uppercase shadow-2xs">
                                {(r.userName || "Guest").charAt(0)}
                              </div>
                              <span className="font-bold text-foreground">
                                {r.userName || "Verified Guest"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[#D9A441] font-bold">
                              <StarIcon className="w-3.5 h-3.5 fill-current" />
                              <span>{r.rating?.toFixed(1) || r.rating}</span>
                            </div>
                          </div>
                          <p className="text-foreground/80 leading-relaxed pl-10">
                            {r.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-surface rounded-2xl border border-border p-6 shadow-2xs">
                      <p className="text-xs font-medium text-muted">
                        No reviews posted yet for this listing. Be the first guest to share your direct stay experience!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Desktop Sticky Reservation Card */}
              <div className="hidden lg:block lg:col-span-1">
                <aside className="lg:sticky lg:top-[96px] bg-surface border border-border/80 rounded-3xl p-6 shadow-subtle space-y-5">
                  {/* Price Header */}
                  <div className="flex items-baseline justify-between pb-4 border-b border-border/80">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        {formatCurrency(primaryPrice)}
                      </span>
                      <span className="text-xs text-muted font-medium ml-1">
                        / {bookingPeriodLabel}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Date Selector */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                      Choose Your Dates
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                          Check-in
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:border-primary focus:outline-none focus-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                          Check-out
                        </label>
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:border-primary focus:outline-none focus-ring"
                        />
                      </div>
                    </div>

                    {/* Real-time Availability Feedback */}
                    {availChecking ? (
                      <div className="p-2.5 rounded-xl bg-background border border-border text-[11px] text-muted flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span>Checking dates availability...</span>
                      </div>
                    ) : availStatus ? (
                      availStatus.available ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Available for selected dates</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                          <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {availStatus.reason || "Not available for selected dates"}
                          </span>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="p-3.5 rounded-2xl bg-surface-muted/50 border border-border/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted">
                      <span>
                        {formatCurrency(primaryPrice)} × {durationCount}{" "}
                        {bookingPeriodLabel === "month"
                          ? durationCount === 1
                            ? "month"
                            : "months"
                          : durationCount === 1
                          ? "night"
                          : "nights"}
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(estimatedTotal)}
                      </span>
                    </div>

                    {property.securityDeposit ? (
                      <div className="flex items-center justify-between text-muted text-[11px]">
                        <span>Security Deposit (Refundable)</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(property.securityDeposit)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-muted text-[11px]">
                      <span>Brokerage & Booking Fee</span>
                      <span className="font-bold text-emerald-600">₹0 (Free)</span>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-foreground">
                      <span>Estimated Base Total</span>
                      <span>{formatCurrency(estimatedTotal)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleBookNow}
                      disabled={availStatus ? !availStatus.available : false}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                    >
                      <span>Reserve Stay Directly</span>
                      <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleContactHost}
                      disabled={contactLoading}
                      className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 focus-ring shadow-2xs"
                    >
                      <MessageCircleIcon className="w-4 h-4 text-primary" />
                      <span>
                        {contactLoading ? "Opening Chat..." : "Chat with Host"}
                      </span>
                    </button>
                  </div>

                  {/* Trust Signals */}
                  <div className="pt-3 border-t border-border/80 space-y-2.5 text-xs text-muted">
                    <div className="flex items-start gap-2">
                      <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground font-semibold">Direct Host Approval:</strong> Your request connects directly to verified hosts without agent commissions.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <ClockIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground font-semibold">Fast Response:</strong> Host receives instant notification with standard approval turnaround.
                      </span>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Booking Bar */}
        {property && !loading && (
          <div className="lg:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 bg-surface/98 backdrop-blur-md border-t border-border px-4 py-2.5 shadow-elevated flex items-center justify-between gap-3">
            <div>
              <span className="text-base sm:text-lg font-extrabold text-foreground block leading-tight">
                {formatCurrency(primaryPrice)}
              </span>
              <span className="text-[11px] text-muted font-medium">
                / {bookingPeriodLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleContactHost}
                disabled={contactLoading}
                aria-label="Chat with host"
                className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <MessageCircleIcon className="w-3.5 h-3.5 text-primary" />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={handleBookNow}
                disabled={availStatus ? !availStatus.available : false}
                aria-label="Reserve this stay"
                className="px-4 sm:px-5 py-2 rounded-xl bg-[#111716] text-white font-bold text-xs shadow-xs hover:bg-black transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Reserve</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
