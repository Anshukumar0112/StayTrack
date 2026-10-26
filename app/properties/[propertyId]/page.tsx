"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackButton from "@/components/ui/BackButton";
import PropertyGallery from "@/components/properties/PropertyGallery";
import PropertyAmenitiesModal, { getAmenityIcon } from "@/components/properties/PropertyAmenitiesModal";
import PropertySleepingArrangements from "@/components/properties/PropertySleepingArrangements";
import PropertyThingsToKnow from "@/components/properties/PropertyThingsToKnow";
import PropertyHostCard from "@/components/properties/PropertyHostCard";
import PropertyLocationSection from "@/components/properties/PropertyLocationSection";
import { formatCurrency } from "@/lib/utils";
import {
  getPropertyDetails,
  getPropertyReviews,
  createConversation,
  sendMessage,
  createReview,
  checkPropertyAvailability,
  createVisit,
} from "@/lib/api";
import { normalizeCategoryKey, formatGenderLabel, formatContractDuration } from "@/lib/categories";
import { Property, Review, OccupancyOption } from "@/types/property";
import {
  MapPinIcon,
  BadgeCheckIcon,
  BedDoubleIcon,
  BathIcon,
  StarIcon,
  MessageCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckIcon,
  AlertTriangleIcon,
  HeartIcon,
  Share2Icon,
  UsersIcon,
  ZapIcon,
  WifiIcon,
  WindIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  LaurelBranchLeftIcon,
  LaurelBranchRightIcon,
  SparklesIcon,
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

  // Expandable Description state
  const [descExpanded, setDescExpanded] = useState(false);

  // Amenities Modal state
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);

  // Guest count selector state (defaults to 1, max based on property)
  const [guestCount, setGuestCount] = useState(1);

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

  // Multiple Occupancy Options (PG & Hostel)
  const [selectedOccupancyOptionId, setSelectedOccupancyOptionId] = useState<string>("");

  // Schedule a Visit state
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [visitTimeSlot, setVisitTimeSlot] = useState("Morning (10:00 AM - 01:00 PM)");
  const [visitorName, setVisitorName] = useState("");
  const [visitorNote, setVisitorNote] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(false);
  const [visitError, setVisitError] = useState("");
  const [createdVisitRef, setCreatedVisitRef] = useState("");

  // Keyboard navigation for visit modal
  useEffect(() => {
    if (!visitModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisitModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visitModalOpen]);

  // Sticky sub-nav state: active section and scroll trigger
  const [activeSection, setActiveSection] = useState("photos");
  const [showStickyNav, setShowStickyNav] = useState(false);

  // Review submission state
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

  // Available Occupancy Options for PG, Hostel & Hotel
  const availableOccupancyOptions = useMemo<OccupancyOption[]>(() => {
    if (!property) return [];
    const cat = String(property.propertyType || property.category || "").toUpperCase();
    if (cat !== "PG" && cat !== "HOSTEL" && cat !== "HOTEL") return [];
    if (Array.isArray(property.occupancyOptions) && property.occupancyOptions.length > 0) {
      return property.occupancyOptions;
    }
    if (cat === "HOTEL") {
      const nightly = property.dailyPrice || property.pricePerNight || property.price || 0;
      return [{
        id: "default_hotel_opt",
        name: property.roomType ? `${property.roomType.charAt(0).toUpperCase() + property.roomType.slice(1)} Room` : "Standard Room",
        occupancyType: "standard",
        roomCategory: property.roomType || "standard",
        monthlyRentPerBed: nightly,
        price: nightly,
        nightlyPrice: nightly,
        bedType: property.bedType || "queen",
        furnished: property.furnished,
        bathrooms: property.bathrooms || 1,
        bathroomType: "attached",
        maxOccupancy: property.maxGuests || 2,
        isAvailable: true,
        roomDetails: "Standard hotel room accommodation",
      }];
    }
    const rent = property.monthlyRentPerBed || property.monthlyPrice || property.price || 0;
    const optType = property.occupancyType || (cat === "HOSTEL" ? "dormitory" : "single");
    const optName = cat === "HOSTEL" ? "Standard Hostel Bed" : "Single Room Sharing";
    return [{
      id: "default_opt",
      name: optName,
      occupancyType: optType,
      monthlyRentPerBed: rent,
      price: rent,
      furnished: property.furnished,
      bathrooms: property.bathrooms,
      roomDetails: "Standard accommodation plan",
      isAvailable: true,
    }];
  }, [property]);

  useEffect(() => {
    if (availableOccupancyOptions.length > 0 && !selectedOccupancyOptionId) {
      const firstAvailable = availableOccupancyOptions.find((o) => o.isAvailable !== false) || availableOccupancyOptions[0];
      setSelectedOccupancyOptionId(firstAvailable.id);
    }
  }, [availableOccupancyOptions, selectedOccupancyOptionId]);

  const selectedOccupancyOption = useMemo(() => {
    if (availableOccupancyOptions.length === 0) return null;
    return availableOccupancyOptions.find((o) => o.id === selectedOccupancyOptionId) || availableOccupancyOptions[0];
  }, [availableOccupancyOptions, selectedOccupancyOptionId]);

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
          occupancyType: selectedOccupancyOption?.occupancyType,
          roomTypeId: selectedOccupancyOption && selectedOccupancyOption.id !== "default_opt" ? selectedOccupancyOption.id : undefined,
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
  }, [propertyId, startDate, endDate, property?.bookingType, selectedOccupancyOption?.id, selectedOccupancyOption?.occupancyType]);

  // Scroll spy for sticky section navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyNav(scrollY > 520);

      const sections = ["photos", "overview", "room-types", "amenities", "availability", "reviews", "host", "location", "rules"];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine active booking type and rates
  const resolvedBookingType = useMemo(() => {
    if (!property) return "daily";

    const bType = String(property.bookingType || "").toLowerCase();
    if (bType === "monthly" || bType === "hourly" || bType === "daily") {
      return bType;
    }

    if (Array.isArray(property.stayTypes) && property.stayTypes.length > 0) {
      const lowerTypes = property.stayTypes.map((t) => String(t).toLowerCase());
      if (lowerTypes.includes("monthly") && !lowerTypes.includes("daily")) return "monthly";
      if (lowerTypes.includes("hourly") && !lowerTypes.includes("daily")) return "hourly";
      if (lowerTypes.includes("daily")) return "daily";
      if (lowerTypes.includes("monthly")) return "monthly";
    }

    const hasDaily = Boolean(property.dailyPrice || property.pricePerNight);
    const hasMonthly = Boolean(property.monthlyPrice || property.pricePerMonth);
    const hasHourly = Boolean(property.hourlyPrice || property.pricePerHour);

    if (hasMonthly && !hasDaily) return "monthly";
    if (hasHourly && !hasDaily && !hasMonthly) return "hourly";
    if (hasDaily) return "daily";

    const cat = String(property.propertyType || property.category || "").toUpperCase();
    if (cat === "FLAT" || cat === "APARTMENT" || cat === "PG" || cat === "HOUSE") {
      return "monthly";
    }

    return "daily";
  }, [property]);

  // Canonical category and conditional action flags
  const canonicalCategory = useMemo(() => {
    if (!property) return "";
    return normalizeCategoryKey(property.category || property.propertyType);
  }, [property]);

  // Visit action: PG, Hostel, Flat allow visits. Hotel and B&B strictly hide visits.
  const isVisitAllowed = useMemo(() => {
    return canonicalCategory === "PG" || canonicalCategory === "HOSTEL" || canonicalCategory === "FLAT";
  }, [canonicalCategory]);

  // Booking action:
  // Hotel / B&B: direct booking
  // PG: host approval
  // Hostel: daily is direct booking, monthly is host approval
  // Flat: host approval
  const isDirectBooking = useMemo(() => {
    if (canonicalCategory === "HOTEL" || canonicalCategory === "BNB") return true;
    if (canonicalCategory === "HOSTEL") {
      return resolvedBookingType === "daily";
    }
    return false;
  }, [canonicalCategory, resolvedBookingType]);

  // Primary rate reflecting selected booking type and selected occupancy option
  const primaryPrice = useMemo(() => {
    if (!property) return 0;
    if (selectedOccupancyOption) {
      if (resolvedBookingType === "monthly") {
        if (selectedOccupancyOption.monthlyRentPerBed && selectedOccupancyOption.monthlyRentPerBed > 0) {
          return selectedOccupancyOption.monthlyRentPerBed;
        }
        if (selectedOccupancyOption.price && selectedOccupancyOption.price > 0) {
          return selectedOccupancyOption.price;
        }
      } else {
        // Daily / nightly
        if (selectedOccupancyOption.nightlyPrice && selectedOccupancyOption.nightlyPrice > 0) {
          return selectedOccupancyOption.nightlyPrice;
        }
        if (selectedOccupancyOption.price && selectedOccupancyOption.price > 0) {
          return selectedOccupancyOption.price;
        }
        if (selectedOccupancyOption.monthlyRentPerBed && selectedOccupancyOption.monthlyRentPerBed > 0) {
          return selectedOccupancyOption.monthlyRentPerBed;
        }
      }
    }
    if (resolvedBookingType === "monthly") {
      return property.monthlyPrice || property.pricePerMonth || property.monthlyRentPerBed || property.price || 0;
    }
    if (resolvedBookingType === "hourly") {
      return property.hourlyPrice || property.pricePerHour || property.price || 0;
    }
    return property.dailyPrice || property.pricePerNight || property.price || 0;
  }, [property, resolvedBookingType, selectedOccupancyOption]);

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

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (!newStart) return;
    const startD = new Date(newStart);
    const endD = new Date(endDate);
    if (isNaN(endD.getTime()) || startD >= endD) {
      const nextD = new Date(startD);
      if (resolvedBookingType === "monthly") {
        nextD.setDate(nextD.getDate() + 30);
      } else {
        nextD.setDate(nextD.getDate() + 1);
      }
      setEndDate(nextD.toISOString().split("T")[0]);
    }
  };

  const handleBookNow = () => {
    if (selectedOccupancyOption && selectedOccupancyOption.isAvailable === false) {
      return;
    }
    const query = new URLSearchParams({
      propertyId,
      startDate,
      endDate,
      bookingType: resolvedBookingType,
      guestCount: String(guestCount),
    });
    if (selectedOccupancyOption) {
      query.set("occupancyOptionId", selectedOccupancyOption.id);
      query.set("occupancyType", selectedOccupancyOption.occupancyType);
      query.set("occupancyOptionName", selectedOccupancyOption.name);
      if (selectedOccupancyOption.id !== "default_opt" && selectedOccupancyOption.id !== "default_hotel_opt") {
        query.set("roomTypeId", selectedOccupancyOption.id);
      }
    }
    router.push(`/booking?${query.toString()}`);
  };

  const handleScheduleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitError("");

    if (!isVisitAllowed) {
      setVisitError("In-person visits are not available for this property type.");
      return;
    }

    if (!visitorName.trim()) {
      setVisitError("Please enter your full name.");
      return;
    }

    if (!visitDate) {
      setVisitError("Please select a preferred visit date.");
      return;
    }

    setVisitSubmitting(true);
    try {
      const res = await createVisit({
        propertyId,
        visitDate,
        timeSlot: visitTimeSlot,
        visitorName: visitorName.trim(),
        notes: visitorNote.trim() || undefined,
      });

      setCreatedVisitRef(res.referenceId || res.visitId || "VIS-CONFIRMED");
      setVisitSuccess(true);
    } catch (err: any) {
      setVisitError(err.message || "Failed to schedule visit. Please try again or chat with host directly.");
    } finally {
      setVisitSubmitting(false);
    }
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

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const displayTitle = property?.title || "Property Details";
  const rawCity = property?.city || "Delhi NCR";
  const displayCity = toTitleCase(rawCity);
  const displayArea = property?.area ? toTitleCase(property.area) : "";
  const displayAddress = property?.address || "";
  const isVerified =
    property?.verificationStatus === "approved" || Boolean(property?.topVerified);

  const hasValidHostName =
    typeof property?.hostName === "string" &&
    property.hostName.trim().length > 0 &&
    !property.hostName.toLowerCase().startsWith("host ") &&
    property.hostName.trim().length < 40;

  const hostDisplayName = hasValidHostName
    ? property!.hostName!.trim()
    : "StayTrack Verified Host";

  const hostInitial = hasValidHostName
    ? hostDisplayName.charAt(0).toUpperCase()
    : "V";

  // Honest rating presentation (no fake 4.8)
  const averageRating = useMemo(() => {
    if (property?.rating && property.rating > 0) return property.rating;
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
      return total / reviews.length;
    }
    return null;
  }, [property?.rating, reviews]);

  const hasRating = averageRating !== null && averageRating > 0;
  const isGuestFavourite = hasRating && averageRating >= 4.7 && reviews.length >= 2;

  // Rating breakdown distribution
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1
    if (reviews.length === 0) return counts;
    for (const r of reviews) {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[5 - star]++;
    }
    return counts;
  }, [reviews]);

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

  // Category & Property Overview Specifications Summary
  const propertyCategory = property?.propertyType || property?.category || "Stay";
  const catUpper = String(propertyCategory).toUpperCase();

  const estimatedTotal = useMemo(() => {
    const base = primaryPrice * durationCount;
    if (catUpper === "FLAT" && property?.maintenanceCharges && property.maintenanceCharges > 0) {
      return base + (property.maintenanceCharges * durationCount);
    }
    return base;
  }, [primaryPrice, durationCount, catUpper, property?.maintenanceCharges]);

  // Formatted date range label for in-page availability
  const formattedDateRange = useMemo(() => {
    if (!startDate || !endDate) return "Select dates";
    try {
      const s = new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const e = new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return `${s} – ${e}`;
    } catch {
      return `${startDate} to ${endDate}`;
    }
  }, [startDate, endDate]);

  const maxGuests = property?.maxGuests || (property?.bedrooms ? property.bedrooms * 2 : 2);
  const bedroomsCount = property?.bedrooms || (catUpper === "FLAT" ? 2 : 1);
  const bedsCount = property?.bedsCount || property?.totalBeds || bedroomsCount;
  const bathroomsCount = property?.bathrooms || 1;

  // Key Highlights list
  const highlights = useMemo(() => {
    if (!property) return [];
    const items = [];

    // 1. Check-in highlight
    const checkInTime = property.checkInTime || (catUpper === "HOTEL" ? "12:00 PM" : "02:00 PM");
    items.push({
      icon: <KeyIcon className="w-5 h-5 text-primary shrink-0" />,
      title: "Direct Host Check-in",
      desc: `Check yourself in after ${checkInTime} with direct host coordination.`,
    });

    // 2. Connectivity / Workspace
    const amList = Array.isArray(property.amenities) ? property.amenities.map(a => a.toLowerCase()) : [];
    if (amList.some(a => a.includes("wifi") || a.includes("internet") || a.includes("desk"))) {
      items.push({
        icon: <WifiIcon className="w-5 h-5 text-primary shrink-0" />,
        title: "Fast Wi-Fi & Work Setup",
        desc: "Dedicated high-speed connectivity suitable for remote work and streaming.",
      });
    }

    // 3. Air conditioning or power backup
    if (amList.some(a => a.includes("ac") || a.includes("air condition"))) {
      items.push({
        icon: <WindIcon className="w-5 h-5 text-primary shrink-0" />,
        title: "Climate Control",
        desc: "Air conditioning installed for optimal seasonal comfort.",
      });
    } else if (amList.some(a => a.includes("power") || a.includes("backup"))) {
      items.push({
        icon: <ZapIcon className="w-5 h-5 text-primary shrink-0" />,
        title: "Power Backup",
        desc: "Continuous electricity backup supported on premises.",
      });
    }

    // 4. Experienced or Verified Host
    items.push({
      icon: <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0" />,
      title: isGuestFavourite ? "Guest Favourite Stay" : "Verified StayTrack Listing",
      desc: "Authentic accommodation verified directly with property host.",
    });

    return items;
  }, [property, catUpper, isGuestFavourite]);

  const amenities = useMemo(() => {
    const list = Array.isArray(property?.amenities) ? [...property.amenities] : [];
    if (Array.isArray(property?.sharedFacilities)) {
      for (const f of property.sharedFacilities) {
        if (f && !list.includes(f)) {
          list.push(f);
        }
      }
    }
    return list;
  }, [property?.amenities, property?.sharedFacilities]);
  const previewAmenities = amenities.slice(0, 8);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground selection:bg-primary/20 selection:text-foreground">
      <Header />

      {/* Sticky Sub-Navigation Bar (Appears when scrolling past hero) */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-surface/98 backdrop-blur-md border-b border-border transition-all duration-300 shadow-subtle ${
          showStickyNav ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-muted overflow-x-auto no-scrollbar">
            {[
              { id: "photos", label: "Photos" },
              { id: "overview", label: "Overview" },
              { id: "amenities", label: "Amenities" },
              { id: "availability", label: "Availability" },
              { id: "reviews", label: "Reviews" },
              { id: "host", label: "Host" },
              { id: "location", label: "Location" },
              { id: "rules", label: "Rules" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`py-4 transition-colors whitespace-nowrap cursor-pointer relative ${
                  activeSection === tab.id
                    ? "text-foreground font-bold"
                    : "hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {activeSection === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <span className="text-sm font-black text-foreground">
                {formatCurrency(primaryPrice)}
              </span>
              <span className="text-[11px] text-muted ml-1 font-medium">
                / {bookingPeriodLabel}
              </span>
              {hasRating && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-muted">
                  <StarIcon className="w-3 h-3 text-[#D9A441]" />
                  <span className="font-bold text-foreground">{averageRating?.toFixed(1)}</span>
                  <span>({reviews.length})</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleBookNow}
              disabled={availStatus ? !availStatus.available : false}
              className="px-4 py-2 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {availStatus && !availStatus.available
                ? "Unavailable"
                : isDirectBooking
                ? "Reserve"
                : "Request to Book"}
            </button>
          </div>
        </div>
      </div>

      <main className="stay-container pt-4 sm:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Navigation Breadcrumb & Header Action Strip */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton fallbackUrl="/properties" />
            <span className="hidden sm:inline-block h-4 w-px bg-border shrink-0" aria-hidden="true" />
            <nav
              aria-label="Breadcrumb"
              className="hidden sm:flex items-center flex-wrap gap-2 text-xs font-medium text-muted truncate"
            >
              <Link href="/properties" className="hover:text-foreground transition-colors">
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
              aria-label={isFavorite ? "Remove from saved stays" : "Save this stay"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-surface border-border text-muted hover:text-foreground hover:border-foreground/30 shadow-2xs"
              }`}
            >
              <HeartIcon className={`w-3.5 h-3.5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
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
            <h1 className="text-xl font-bold text-foreground">Stay Not Found</h1>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              This property listing is unavailable, archived, or may have been removed by the host.
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
            {/* Header Block Above Gallery */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {propertyCategory}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <BadgeCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Host Verified</span>
                  </span>
                )}
                {isGuestFavourite && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    <SparklesIcon className="w-3 h-3 text-amber-600" />
                    <span>Guest Favourite</span>
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
                    {displayCity}, India
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
                  <button
                    type="button"
                    onClick={() => scrollToSection("reviews")}
                    className="flex items-center gap-1 text-foreground font-bold hover:underline cursor-pointer"
                  >
                    <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>{averageRating?.toFixed(1)}</span>
                    <span className="text-muted font-normal">
                      ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                    </span>
                  </button>
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

            {/* Section 1: Media Gallery */}
            <div id="photos">
              <PropertyGallery
                images={property.images}
                title={displayTitle}
                isVerified={isVerified}
                propertyType={property.propertyType}
              />
            </div>

            {/* Main Content Layout: Left Details Column + Right Sticky Reservation Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 items-start pt-2">
              {/* Left Column: Cohesive Editorial Content */}
              <div className="lg:col-span-2 space-y-9">
                {/* Section 2: Property Overview & Summary Headline */}
                <div id="overview" className="pb-8 border-b border-border/70 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground">
                        {catUpper === "BNB" || catUpper === "VILLA"
                          ? `Entire ${property.spaceType === "private_room" ? "private room" : "home"} in ${displayCity}`
                          : catUpper === "HOTEL"
                          ? `Hotel room in ${displayCity}`
                          : catUpper === "PG"
                          ? `Paying guest accommodation in ${displayCity}`
                          : catUpper === "HOSTEL"
                          ? `Hostel stay in ${displayCity}`
                          : `Entire apartment in ${displayCity}`}
                      </h2>
                      <p className="text-xs text-muted font-medium mt-1">
                        Up to {maxGuests} {maxGuests === 1 ? "guest" : "guests"} · {bedroomsCount} {bedroomsCount === 1 ? "bedroom" : "bedrooms"} · {bedsCount} {bedsCount === 1 ? "bed" : "beds"} · {bathroomsCount} {bathroomsCount === 1 ? "bath" : "baths"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-2xs">
                        {hostInitial}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                          Hosted by {hostDisplayName}
                        </p>
                        <p className="text-[11px] text-muted">
                          {isVerified ? "Verified Identity" : "Direct Host"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Guest Favourite Badge Card OR StayTrack Verified Banner */}
                  {isGuestFavourite ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-surface to-amber-50/50 border border-amber-200/80 shadow-2xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex items-center text-amber-700">
                          <LaurelBranchLeftIcon className="w-5 h-9 shrink-0 text-amber-600" />
                          <span className="font-extrabold text-xs uppercase tracking-wider px-1">
                            Guest Favourite
                          </span>
                          <LaurelBranchRightIcon className="w-5 h-9 shrink-0 text-amber-600" />
                        </div>
                        <p className="hidden sm:block text-xs text-muted">
                          One of the most loved stays on StayTrack based on ratings, reviews, and reliability.
                        </p>
                      </div>
                      <div className="text-right shrink-0 border-l border-amber-200/80 pl-4">
                        <span className="text-lg font-black text-foreground block leading-tight flex items-center justify-end gap-1">
                          <span>{averageRating?.toFixed(1)}</span>
                          <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                        </span>
                        <span className="text-[11px] text-muted">
                          {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <BadgeCheckIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            StayTrack Direct Verification
                          </p>
                          <p className="text-[11px] text-muted">
                            100% verified photography, direct host communication, zero broker commissions.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0 hidden sm:inline-block">
                        Zero Brokerage
                      </span>
                    </div>
                  )}

                    {/* Key Highlights List */}
                  <div className="space-y-3.5 pt-2">
                    {highlights.map((hl, i) => (
                      <div key={i} className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-surface-muted border border-border/80 text-primary shadow-2xs shrink-0">
                          {hl.icon}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-bold text-foreground">{hl.title}</h3>
                          <p className="text-[11px] text-muted leading-relaxed">{hl.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Category-Specific Stay Terms & Specifications */}
                  {/* Category-Specific Stay Terms & Specifications */}
                  <div id="category-specs" className="p-5 sm:p-6 rounded-3xl bg-surface border border-border/80 shadow-2xs space-y-4 mt-2">
                    <div className="flex items-center justify-between pb-3 border-b border-border/70">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                          {catUpper === "PG"
                            ? "PG Stay Terms & Guidelines"
                            : catUpper === "FLAT"
                            ? "Flat Lease Terms & Specifications"
                            : catUpper === "HOSTEL"
                            ? "Hostel Guidelines & Details"
                            : "Stay Specifications & Policies"}
                        </h3>
                        <p className="text-[11px] text-muted font-medium mt-0.5">
                          Verified key terms for this {propertyCategory} accommodation
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
                        {propertyCategory}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {/* PG Specific Terms */}
                      {catUpper === "PG" && (
                        <>
                          {property.genderCategory && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Gender Preference</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{formatGenderLabel(property.genderCategory)}</p>
                            </div>
                          )}
                          {property.contractDuration && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Minimum Stay</span>
                              <p className="font-bold text-foreground text-xs leading-snug">
                                {formatContractDuration(property.contractDuration, property.customDurationValue, property.customDurationUnit)}
                              </p>
                            </div>
                          )}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Food & Meals</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.foodIncluded
                                ? (property.foodOptions && property.foodOptions.length > 0
                                    ? `Included (${property.foodOptions.join(", ")})`
                                    : "Included (3 Meals Daily)")
                                : "Self-Cooking / Not Included"}
                            </p>
                          </div>
                          {property.gateClosingTime && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Gate Curfew</span>
                              <p className="font-bold text-amber-700 text-xs leading-snug">{property.gateClosingTime}</p>
                            </div>
                          )}
                          {property.securityDeposit ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Security Deposit</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{formatCurrency(property.securityDeposit)}</p>
                            </div>
                          ) : null}
                          {property.noticePeriodDays ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Notice Period</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.noticePeriodDays} Days</p>
                            </div>
                          ) : null}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Furnishing</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.furnished ? "Fully Furnished" : "Unfurnished"}</p>
                          </div>
                          {property.sharedFacilities && property.sharedFacilities.length > 0 && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1 col-span-2 sm:col-span-3">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Shared Facilities</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.sharedFacilities.join(" · ")}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* FLAT Specific Terms */}
                      {catUpper === "FLAT" && (
                        <>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Configuration</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.bhkConfig ? `${property.bhkConfig} Apartment` : `${bedroomsCount} BHK Apartment`}
                            </p>
                          </div>
                          {property.areaSqFt ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Super Built-up Area</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.areaSqFt} sq.ft.</p>
                            </div>
                          ) : null}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Maintenance Charges</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.maintenanceCharges && property.maintenanceCharges > 0
                                ? `${formatCurrency(property.maintenanceCharges)} / mo (Separate)`
                                : "Included in Rent"}
                            </p>
                          </div>
                          {property.tenantPreference && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Tenant Preference</span>
                              <p className="font-bold text-foreground text-xs leading-snug">
                                {property.tenantPreference === "family"
                                  ? "Family Preferred"
                                  : property.tenantPreference === "bachelors"
                                  ? "Bachelors Allowed"
                                  : "Open to All (Any)"}
                              </p>
                            </div>
                          )}
                          {property.parkingType && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Parking Facility</span>
                              <p className="font-bold text-foreground text-xs leading-snug">
                                {property.parkingType === "covered"
                                  ? "Covered Car Parking"
                                  : property.parkingType === "open"
                                  ? "Open Parking Space"
                                  : property.parkingType === "two_wheeler"
                                  ? "Two-Wheeler Only"
                                  : "No Dedicated Parking"}
                              </p>
                            </div>
                          )}
                          {(property.floorNumber !== undefined || property.totalFloors !== undefined) && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Floor Level</span>
                              <p className="font-bold text-foreground text-xs leading-snug">
                                {property.floorNumber !== undefined && property.totalFloors !== undefined
                                  ? `Floor ${property.floorNumber} of ${property.totalFloors}`
                                  : property.floorNumber !== undefined
                                  ? `Floor ${property.floorNumber}`
                                  : `${property.totalFloors} Total Floors`}
                              </p>
                            </div>
                          )}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Furnishing</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.furnished ? "Fully Furnished" : "Semi / Unfurnished"}</p>
                          </div>
                          {property.securityDeposit ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Security Deposit</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{formatCurrency(property.securityDeposit)}</p>
                            </div>
                          ) : null}
                          {property.noticePeriodDays ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Notice Period</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.noticePeriodDays} Days</p>
                            </div>
                          ) : null}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">Direct Brokerage</span>
                            <p className="font-bold text-emerald-700 text-xs leading-snug">₹0 (Zero Brokerage)</p>
                          </div>
                        </>
                      )}

                      {/* HOSTEL Specific Terms */}
                      {catUpper === "HOSTEL" && (
                        <>
                          {property.genderCategory && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Resident Type</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{formatGenderLabel(property.genderCategory)} Hostel</p>
                            </div>
                          )}
                          {property.contractDuration && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Minimum Stay</span>
                              <p className="font-bold text-foreground text-xs leading-snug">
                                {formatContractDuration(property.contractDuration, property.customDurationValue, property.customDurationUnit)}
                              </p>
                            </div>
                          )}
                          {property.gateClosingTime && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Gate Curfew</span>
                              <p className="font-bold text-amber-700 text-xs leading-snug">{property.gateClosingTime}</p>
                            </div>
                          )}
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Stay Model</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{resolvedBookingType === "monthly" ? "Monthly Rental" : "Daily Booking"}</p>
                          </div>
                          {property.securityDeposit ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Security Deposit</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{formatCurrency(property.securityDeposit)}</p>
                            </div>
                          ) : null}
                          {property.noticePeriodDays ? (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Notice Period</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.noticePeriodDays} Days</p>
                            </div>
                          ) : null}
                          {property.sharedFacilities && property.sharedFacilities.length > 0 && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1 col-span-2 sm:col-span-3">
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Shared Facilities</span>
                              <p className="font-bold text-foreground text-xs leading-snug">{property.sharedFacilities.join(" · ")}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* HOTEL Specific Terms */}
                      {catUpper === "HOTEL" && (
                        <>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Check-in</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.checkInTime || "12:00 PM"}</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Check-out</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.checkOutTime || "11:00 AM"}</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Breakfast Option</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.breakfastIncluded ? "Breakfast Included in Rate" : "Breakfast Not Included / Extra"}
                            </p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Cancellation Policy</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.cancellationPolicy === "strict"
                                ? "Strict Cancellation"
                                : property.cancellationPolicy === "moderate"
                                ? "Moderate Cancellation"
                                : "Flexible (Free Cancellation)"}
                            </p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Front Desk & Service</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.sharedFacilities && property.sharedFacilities.length > 0
                                ? property.sharedFacilities.join(" · ")
                                : "24/7 Front Desk Support"}
                            </p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">Reservation</span>
                            <p className="font-bold text-emerald-700 text-xs leading-snug">Instant Direct Booking</p>
                          </div>
                        </>
                      )}

                      {/* BNB / VILLA Specific Terms */}
                      {(catUpper === "BNB" || catUpper === "VILLA" || catUpper === "VACATIONSTAY") && (
                        <>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Space Type</span>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {property.spaceType === "private_room"
                                ? "Private Room"
                                : property.spaceType === "shared_room"
                                ? "Shared Room"
                                : "Entire Place"}
                            </p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Check-in</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.checkInTime || "02:00 PM"}</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Check-out</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{property.checkOutTime || "11:00 AM"}</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Max Guests</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{maxGuests} Guests max</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-muted/50 border border-border/70 space-y-1">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Bedrooms & Beds</span>
                            <p className="font-bold text-foreground text-xs leading-snug">{bedroomsCount} Bedroom(s) · {bedsCount} Bed(s)</p>
                          </div>
                          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">Confirmation</span>
                            <p className="font-bold text-emerald-700 text-xs leading-snug">Direct Reservation</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2.5: Room Types & Occupancy Options */}
                {availableOccupancyOptions.length > 0 && (
                  <div id="room-types" className="pb-8 border-b border-border/70 space-y-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                          {catUpper === "HOTEL" ? "Available Hotel Room Types" : "Available Room Types & Occupancy Options"}
                        </h2>
                        <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                          {availableOccupancyOptions.length} {availableOccupancyOptions.length === 1 ? "Option" : "Options"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-semibold">
                        {catUpper === "HOTEL"
                          ? "Select a room type below to update rates and reserve your preferred accommodations."
                          : "Select an occupancy arrangement below to update prices and check live bed availability for your dates."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {availableOccupancyOptions.map((opt) => {
                        const isSelected = selectedOccupancyOption?.id === opt.id;
                        const isOptAvailable = opt.isAvailable !== false;

                        const optOccupancyLabel =
                          catUpper === "HOTEL"
                            ? (opt.roomCategory ? `${opt.roomCategory.charAt(0).toUpperCase() + opt.roomCategory.slice(1)} Room` : opt.occupancyType || "Standard Room")
                            : opt.occupancyType === "single"
                            ? "Single Sharing"
                            : opt.occupancyType === "double"
                            ? "Double Sharing"
                            : opt.occupancyType === "triple"
                            ? "Triple Sharing"
                            : opt.occupancyType === "four_sharing"
                            ? "Four Sharing"
                            : opt.occupancyType;

                        const optPrice =
                          catUpper === "HOTEL"
                            ? (opt.nightlyPrice || opt.price || opt.monthlyRentPerBed || 0)
                            : resolvedBookingType === "daily"
                            ? (opt.nightlyPrice || opt.price || opt.monthlyRentPerBed || 0)
                            : (opt.monthlyRentPerBed || opt.price || 0);

                        const optUnit =
                          catUpper === "HOTEL"
                            ? "/ night"
                            : resolvedBookingType === "daily"
                            ? "/ night / bed"
                            : "/ month / bed";

                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              if (isOptAvailable) {
                                setSelectedOccupancyOptionId(opt.id);
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                              !isOptAvailable
                                ? "opacity-75 bg-surface-muted/40 border-border/60 cursor-not-allowed"
                                : isSelected
                                ? "bg-surface border-primary ring-2 ring-primary/25 shadow-subtle cursor-pointer"
                                : "bg-surface border-border/80 hover:border-primary/40 hover:shadow-2xs cursor-pointer"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-bold text-foreground">
                                      {opt.name}
                                    </h3>
                                    {!isOptAvailable ? (
                                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                                        Booked / Unavailable
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                        Available
                                      </span>
                                    )}
                                  </div>
                                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-surface-muted text-muted px-2 py-0.5 rounded-md mt-1 border border-border/60">
                                    {optOccupancyLabel}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-sm sm:text-base font-extrabold text-foreground">
                                    {formatCurrency(optPrice)}
                                  </span>
                                  <span className="text-[10px] text-muted block">{optUnit}</span>
                                </div>
                              </div>

                              {opt.roomDetails && (
                                <p className="text-xs text-muted leading-relaxed">
                                  {opt.roomDetails}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {opt.bedType && (
                                  <span className="text-[10px] font-semibold text-foreground/80 bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    {opt.bedType.charAt(0).toUpperCase() + opt.bedType.slice(1)} Bed
                                  </span>
                                )}
                                {opt.maxOccupancy ? (
                                  <span className="text-[10px] font-semibold text-foreground/80 bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    Up to {opt.maxOccupancy} Guests
                                  </span>
                                ) : null}
                                {opt.bathroomType ? (
                                  <span className="text-[10px] font-semibold text-foreground/80 bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    {opt.bathroomType === "attached" ? "Attached Washroom" : opt.bathroomType === "shared" ? "Shared Washroom" : "Washroom"}
                                  </span>
                                ) : typeof opt.bathrooms === "number" && opt.bathrooms > 0 ? (
                                  <span className="text-[10px] font-semibold text-foreground/80 bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    {opt.bathrooms} {opt.bathrooms === 1 ? "Washroom" : "Washrooms"}
                                  </span>
                                ) : null}
                                {opt.furnished && (
                                  <span className="text-[10px] font-semibold text-foreground/80 bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    Furnished
                                  </span>
                                )}
                                {opt.roomCount ? (
                                  <span className="text-[10px] font-semibold text-muted bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    {opt.roomCount} {opt.roomCount === 1 ? "Room" : "Rooms"} Total
                                  </span>
                                ) : null}
                                {opt.securityDeposit ? (
                                  <span className="text-[10px] font-semibold text-muted bg-surface-muted px-2 py-0.5 rounded-md border border-border/70">
                                    Deposit: {formatCurrency(opt.securityDeposit)}
                                  </span>
                                ) : null}
                              </div>

                              {Array.isArray(opt.amenities) && opt.amenities.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {opt.amenities.map((am, i) => (
                                    <span key={i} className="text-[10px] font-medium text-foreground/80 bg-surface-muted/90 px-2 py-0.5 rounded-md border border-border/60">
                                      {am}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                              {!isOptAvailable ? (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                    <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>Room Unavailable</span>
                                  </span>
                                  <span className="text-[11px] text-muted font-normal">Fully Booked</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isSelected ? "border-primary bg-primary text-white" : "border-border bg-surface"
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={isSelected ? "text-primary font-bold text-xs" : "text-muted text-xs font-medium"}>
                                      {isSelected ? "Selected Option" : "Select Option"}
                                    </span>
                                  </div>

                                  {isSelected && (
                                    availChecking ? (
                                      <span className="text-[11px] text-muted font-normal">Checking...</span>
                                    ) : availStatus?.available ? (
                                      <span className="text-[11px] font-bold text-emerald-600">Available</span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-rose-600">Sold Out</span>
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Where you'll sleep (Sleeping arrangements & rooms) */}
                <PropertySleepingArrangements property={property} />

                {/* Section 4: About this stay (Description with Show More) */}
                <div className="pb-8 border-b border-border/70 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                    About this stay
                  </h2>
                  <div className="relative">
                    <p
                      className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-line ${
                        !descExpanded && (property.description?.length || 0) > 280
                          ? "line-clamp-4"
                          : ""
                      }`}
                    >
                      {property.description ||
                        "No extended description provided by host. Please contact host directly for specific queries regarding this verified accommodation."}
                    </p>
                    {(property.description?.length || 0) > 280 && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="mt-2 text-xs font-bold text-foreground hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{descExpanded ? "Show less" : "Show more"}</span>
                        {descExpanded ? (
                          <ChevronUpIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDownIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 5: What this place offers (Amenities) */}
                {amenities.length > 0 && (
                  <div id="amenities" className="pb-8 border-b border-border/70 space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                        What this place offers
                      </h2>
                      <p className="text-xs text-foreground font-semibold">
                        Verified features and amenities provided with this stay
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {previewAmenities.map((amenity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-border/80 text-xs font-semibold text-foreground shadow-2xs"
                        >
                          <div className="w-8 h-8 rounded-xl bg-surface-muted border border-border/70 flex items-center justify-center shrink-0">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span className="truncate">{amenity}</span>
                        </div>
                      ))}
                    </div>

                    {amenities.length > previewAmenities.length && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setAmenitiesModalOpen(true)}
                          className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-bold text-foreground shadow-2xs transition-colors cursor-pointer focus-ring"
                        >
                          Show all {amenities.length} amenities
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 6: In-Page Availability & Date Picker */}
                <div id="availability" className="pb-8 border-b border-border/70 space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                      {durationCount}{" "}
                      {bookingPeriodLabel === "month"
                        ? durationCount === 1
                          ? "month"
                          : "months"
                        : durationCount === 1
                        ? "night"
                        : "nights"}{" "}
                      in {displayCity}
                    </h2>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      {formattedDateRange}
                    </p>
                  </div>

                  {/* Interactive Date Pickers */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border/80 shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-muted mb-1.5">
                          Check-in Date
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:border-primary focus:outline-none focus-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-muted mb-1.5">
                          Check-out Date
                        </label>
                        <input
                          type="date"
                          min={startDate || todayStr}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:border-primary focus:outline-none focus-ring"
                        />
                      </div>
                    </div>

                    {/* Real-time Status & Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/70">
                      <div>
                        {availChecking ? (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span>Verifying live date availability...</span>
                          </div>
                        ) : availStatus ? (
                          availStatus.available ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Available for selected {bookingPeriodLabel === "month" ? "rental period" : "dates"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
                              <span>{availStatus.reason || "Dates already reserved by another guest"}</span>
                            </span>
                          )
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setStartDate(todayStr);
                          setEndDate(tomorrowStr);
                        }}
                        className="text-xs font-semibold text-muted hover:text-foreground underline cursor-pointer self-start sm:self-auto"
                      >
                        Reset to today
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 7: Verified Guest Reviews */}
                <div id="reviews" className="pb-8 border-b border-border/70 space-y-6">
                  {/* Reviews Hero Rating Summary */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                          Guest Reviews
                        </h2>
                        <p className="text-xs text-muted mt-0.5">
                          Authentic feedback from verified guests who stayed at this accommodation
                        </p>
                      </div>
                      <span className="text-xs font-bold text-foreground bg-surface border border-border px-3 py-1 rounded-full shadow-2xs self-start sm:self-auto">
                        {reviews.length > 0
                          ? `${reviews.length} ${reviews.length === 1 ? "Review" : "Reviews"}`
                          : "No reviews yet"}
                      </span>
                    </div>

                    {hasRating && reviews.length > 0 && (
                      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border/80 shadow-2xs space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          {/* Big Centered Rating */}
                          <div className="flex items-center gap-3">
                            <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                              {averageRating?.toFixed(1)}
                            </span>
                            <div>
                              <div className="flex items-center gap-1 text-[#D9A441]">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <StarIcon
                                    key={star}
                                    className={`w-4 h-4 ${
                                      averageRating && star <= Math.round(averageRating)
                                        ? "text-[#D9A441]"
                                        : "text-border"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs font-bold text-foreground mt-0.5">
                                Overall Guest Rating
                              </p>
                              <p className="text-[11px] text-muted">
                                Based on {reviews.length} completed {reviews.length === 1 ? "stay" : "stays"}
                              </p>
                            </div>
                          </div>

                          {/* Star Distribution Bars */}
                          <div className="flex-1 max-w-xs space-y-1 text-[11px] font-semibold text-muted">
                            {[5, 4, 3, 2, 1].map((stars, idx) => {
                              const count = ratingDistribution[idx];
                              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                              return (
                                <div key={stars} className="flex items-center gap-2">
                                  <span className="w-3 text-right">{stars}</span>
                                  <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden border border-border/60">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-5 text-muted/80">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Review Inline Form */}
                  <form
                    onSubmit={handleAddReview}
                    className="p-4 sm:p-5 rounded-3xl bg-surface border border-border/80 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-foreground">
                        Write a Guest Review
                      </h3>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 space-y-2.5 text-xs shadow-2xs flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-2xs">
                                {(r.userName || "Guest").charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">
                                  {r.userName || "Verified Guest"}
                                </span>
                                <span className="text-[10px] text-muted">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Stayed recently"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[#D9A441] font-bold">
                              <StarIcon className="w-3.5 h-3.5 fill-current" />
                              <span>{r.rating?.toFixed(1) || r.rating}</span>
                            </div>
                          </div>
                          <p className="text-foreground/80 leading-relaxed text-[11px]">
                            {r.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-surface rounded-3xl border border-border p-6 shadow-2xs">
                      <p className="text-xs font-medium text-muted">
                        No reviews posted yet for this listing. Be the first guest to share your direct stay experience!
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 8: Meet Your Host */}
                <PropertyHostCard
                  property={property}
                  reviews={reviews}
                  onContactHost={handleContactHost}
                  contactLoading={contactLoading}
                />

                {/* Section 9: Where You'll Be (Location) */}
                <PropertyLocationSection property={property} />

                {/* Section 10: Things to Know (Rules & Safety & Cancellation) */}
                <PropertyThingsToKnow property={property} />
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

                    {hasRating && (
                      <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                        <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>{averageRating?.toFixed(1)}</span>
                        <span className="text-muted font-normal">({reviews.length})</span>
                      </div>
                    )}
                  </div>

                  {selectedOccupancyOption && (
                    <div className="p-3 rounded-2xl bg-surface-muted/60 border border-border/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-muted">Selected Room Option</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{selectedOccupancyOption.name}</span>
                          {selectedOccupancyOption.isAvailable === false ? (
                            <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                              Sold Out
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-xs font-black text-foreground">
                        {formatCurrency(
                          catUpper === "HOTEL" || resolvedBookingType === "daily"
                            ? (selectedOccupancyOption.nightlyPrice || selectedOccupancyOption.price || selectedOccupancyOption.monthlyRentPerBed || 0)
                            : (selectedOccupancyOption.monthlyRentPerBed || selectedOccupancyOption.price || 0)
                        )}
                        /{catUpper === "HOTEL" || resolvedBookingType === "daily" ? "night" : "mo"}
                      </span>
                    </div>
                  )}

                  {property.contractDuration && (
                    <div className="p-3 rounded-2xl bg-surface-muted/60 border border-border/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-muted">Minimum Stay Commitment</span>
                        <span className="font-bold text-foreground">
                          {formatContractDuration(property.contractDuration, property.customDurationValue, property.customDurationUnit)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    </div>
                  )}

                  {/* Interactive Date & Guest Selector */}
                  <div className="space-y-3">
                    <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-background">
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-2.5">
                          <label className="block text-[10px] uppercase font-bold text-muted mb-0.5">
                            Check-in
                          </label>
                          <input
                            type="date"
                            min={todayStr}
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="w-full text-xs bg-transparent text-foreground font-semibold focus:outline-none"
                          />
                        </div>
                        <div className="p-2.5">
                          <label className="block text-[10px] uppercase font-bold text-muted mb-0.5">
                            Check-out
                          </label>
                          <input
                            type="date"
                            min={startDate || todayStr}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full text-xs bg-transparent text-foreground font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5">
                        <label className="block text-[10px] uppercase font-bold text-muted mb-0.5">
                          Guests
                        </label>
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(Number(e.target.value))}
                          className="w-full text-xs bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                        >
                          {Array.from({ length: Math.min(10, Math.max(1, maxGuests)) }, (_, i) => i + 1).map((g) => (
                            <option key={g} value={g} className="bg-surface text-foreground">
                              {g} {g === 1 ? "guest" : "guests"}
                            </option>
                          ))}
                        </select>
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
                          <span>Available for selected {bookingPeriodLabel === "month" ? "period" : "dates"}</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                          <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{availStatus.reason || "Not available for selected dates"}</span>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="p-3.5 rounded-2xl bg-surface-muted/50 border border-border/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted">
                      <span>
                        {catUpper === "FLAT" ? "Monthly Rent" : "Base Rate"} ({formatCurrency(primaryPrice)} × {durationCount}{" "}
                        {bookingPeriodLabel === "month"
                          ? durationCount === 1
                            ? "month"
                            : "months"
                          : durationCount === 1
                          ? "night"
                          : "nights"})
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(primaryPrice * durationCount)}
                      </span>
                    </div>

                    {catUpper === "FLAT" && (
                      <div className="flex items-center justify-between text-muted text-[11px]">
                        <span>Maintenance Charges</span>
                        <span className="font-semibold text-foreground">
                          {property.maintenanceCharges && property.maintenanceCharges > 0
                            ? `+ ${formatCurrency(property.maintenanceCharges * durationCount)} (${formatCurrency(property.maintenanceCharges)}/mo)`
                            : "Included in Rent"}
                        </span>
                      </div>
                    )}

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
                      <span>Estimated Total</span>
                      <span>{formatCurrency(estimatedTotal)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleBookNow}
                      disabled={
                        (availStatus ? !availStatus.available : false) ||
                        (selectedOccupancyOption?.isAvailable === false)
                      }
                      className="w-full py-3.5 px-4 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                    >
                      <span>
                        {selectedOccupancyOption?.isAvailable === false
                          ? "Room Unavailable"
                          : availStatus && !availStatus.available
                          ? "Dates Unavailable"
                          : isDirectBooking
                          ? "Reserve Stay Directly"
                          : "Request to Book"}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {isVisitAllowed && (
                      <button
                        type="button"
                        onClick={() => {
                          setVisitSuccess(false);
                          setVisitError("");
                          setVisitModalOpen(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 focus-ring shadow-2xs"
                      >
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>Schedule an In-Person Visit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleContactHost}
                      disabled={contactLoading}
                      className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 focus-ring shadow-2xs"
                    >
                      <MessageCircleIcon className="w-4 h-4 text-primary" />
                      <span>{contactLoading ? "Opening Chat..." : "Chat with Host"}</span>
                    </button>
                  </div>

                  {/* Trust Signals */}
                  <div className="pt-3 border-t border-border/80 space-y-2.5 text-xs text-muted">
                    <div className="flex items-start gap-2">
                      <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground font-semibold">
                          {isDirectBooking ? "Direct Reservation:" : "Direct Host Approval:"}
                        </strong>{" "}
                        {isDirectBooking
                          ? "Your reservation connects directly with real-time inventory locking."
                          : "Your request connects directly to verified hosts without agent commissions."}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <ClockIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground font-semibold">Fast Response:</strong> Host receives instant notification with standard turnaround.
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
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/98 backdrop-blur-md border-t border-border px-3.5 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-floating flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-black text-foreground block leading-tight truncate">
                {formatCurrency(primaryPrice)}
              </span>
              <span className="text-[11px] text-muted font-medium block truncate">
                / {bookingPeriodLabel} · {durationCount} {bookingPeriodLabel === "month" ? "mo" : "night"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isVisitAllowed && (
                <button
                  type="button"
                  onClick={() => {
                    setVisitSuccess(false);
                    setVisitError("");
                    setVisitModalOpen(true);
                  }}
                  aria-label="Schedule in-person visit"
                  className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <CalendarDaysIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden xs:inline">Visit</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleContactHost}
                disabled={contactLoading}
                aria-label="Chat with host"
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
              >
                <MessageCircleIcon className="w-3.5 h-3.5 text-primary" />
                <span className="hidden xs:inline">Chat</span>
              </button>
              <button
                type="button"
                onClick={handleBookNow}
                disabled={
                  (availStatus ? !availStatus.available : false) ||
                  (selectedOccupancyOption?.isAvailable === false)
                }
                aria-label={isDirectBooking ? "Reserve this stay" : "Request this stay"}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#111716] text-white font-bold text-xs shadow-xs hover:bg-black transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {selectedOccupancyOption?.isAvailable === false
                    ? "Unavailable"
                    : availStatus && !availStatus.available
                    ? "Unavailable"
                    : isDirectBooking
                    ? "Reserve"
                    : "Request"}
                </span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Amenities Modal Dialog */}
      {property && (
        <PropertyAmenitiesModal
          isOpen={amenitiesModalOpen}
          onClose={() => setAmenitiesModalOpen(false)}
          amenities={amenities}
          propertyName={displayTitle}
        />
      )}

      {/* Schedule a Visit Modal Dialog */}
      {visitModalOpen && isVisitAllowed && (
        <div
          onClick={() => setVisitModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-lg bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-elevated space-y-5 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {visitSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-muted text-muted border border-border">
                    Ref: #{createdVisitRef}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    In-Person Visit Scheduled!
                  </h3>
                  <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                    Your visit has been recorded with the host. You can view your visit pass in My Bookings and coordinate arrival directly in Messages.
                  </p>
                </div>
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVisitModalOpen(false);
                      router.push("/trips");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    View in My Bookings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisitModalOpen(false);
                      router.push("/chat");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
                  >
                    Open Messages
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleScheduleVisitSubmit} className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Schedule an In-Person Visit
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Tour this verified accommodation before committing. Free with zero booking hold.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisitModalOpen(false)}
                    className="text-xs font-bold text-muted hover:text-foreground cursor-pointer p-1"
                  >
                    Close
                  </button>
                </div>

                {visitError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{visitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                      Time Slot *
                    </label>
                    <select
                      value={visitTimeSlot}
                      onChange={(e) => setVisitTimeSlot(e.target.value)}
                      className="w-full p-2.5 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="Morning (10:00 AM - 01:00 PM)">Morning (10:00 AM - 01:00 PM)</option>
                      <option value="Afternoon (01:00 PM - 05:00 PM)">Afternoon (01:00 PM - 05:00 PM)</option>
                      <option value="Evening (05:00 PM - 08:00 PM)">Evening (05:00 PM - 08:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl text-xs bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                    Special Requests or Questions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. I would like to inspect the double sharing room and verify parking."
                    value={visitorNote}
                    onChange={(e) => setVisitorNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-surface-muted border border-border/80 text-[11px] text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-primary" />
                    <span>No Inventory Hold</span>
                  </div>
                  <p>
                    Scheduling a visit is an inquiry to tour the property. It does not place a lock on any room or bed inventory.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisitModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={visitSubmitting || !visitorName.trim() || !visitDate}
                    className="px-5 py-2 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {visitSubmitting ? "Submitting..." : "Schedule In-Person Visit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
