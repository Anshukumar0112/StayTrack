"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getPropertyId, Property } from "@/types/property";
import { getCategoryLabel } from "@/lib/categories";
import {
  ArrowRightIcon,
  Building2Icon,
  HeartIcon,
  MapPinIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";

function subscribeWishlist(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("staytrack_favorites_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("staytrack_favorites_updated", callback);
  };
}

function getWishlistSnapshot(): string {
  try {
    return localStorage.getItem("staytrack_favorites") || "[]";
  } catch {
    return "[]";
  }
}

function getWishlistServerSnapshot(): string {
  return "[]";
}

interface PropertyCardProps {
  property?: Property;
  id?: string;
  title?: string;
  location?: string;
  category?: string;
  price?: number;
  rating?: number;
  stayType?: string;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

export default function PropertyCard(props: PropertyCardProps) {
  const p = props.property;

  const id = getPropertyId(p) || props.id || "";
  const title = p?.title || props.title || "StayTrack Property";
  const location = p
    ? [p.area, p.city].filter(Boolean).join(", ")
    : (props.location || "");
  const category = p?.propertyType || props.category || "Flat";

  const rawPrice = p
    ? (p.dailyPrice ?? p.pricePerNight ?? p.monthlyPrice ?? p.pricePerMonth ?? p.hourlyPrice ?? p.pricePerHour ?? p.price ?? 0)
    : (props.price || 0);

  const bookingTypeStr = p?.bookingType || p?.stayTypes?.[0] || props.stayType || "daily";
  const displayStayType = bookingTypeStr.toLowerCase() === "monthly" ? "month" : bookingTypeStr.toLowerCase() === "hourly" ? "hour" : "night";

  // Real data only: do NOT fabricate default 4.8 rating or fake verification
  const rating = p?.rating ?? props.rating;
  const hasValidRating = typeof rating === "number" && rating > 0;
  const isVerified = Boolean(p?.topVerified || p?.verificationStatus === "approved");

  const bedrooms = p?.bedrooms ?? props.bedrooms;
  const bathrooms = p?.bathrooms ?? props.bathrooms;
  const furnished = p?.furnished ?? props.furnished;

  const catUpper = category.toUpperCase();

  // Multi-image management with actual uploaded photos
  const rawImages: string[] = Array.isArray(p?.images) && p.images.length > 0
    ? p.images.filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    : (p as { imageUrl?: string })?.imageUrl
    ? [(p as { imageUrl?: string }).imageUrl as string]
    : [];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());

  const validImages = rawImages.filter((_, idx) => !failedImageIndices.has(idx));
  const hasImages = validImages.length > 0;
  const safeIndex = Math.min(activeImageIndex, Math.max(0, validImages.length - 1));
  const currentImage = hasImages ? validImages[safeIndex] : null;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(idx);
  };

  const handleImageError = () => {
    setFailedImageIndices((prev) => {
      const next = new Set(prev);
      next.add(safeIndex);
      return next;
    });
  };

  const renderCategorySpecs = () => {
    // 1. FLAT / APARTMENT / HOUSE
    if (catUpper === "FLAT" || catUpper === "APARTMENT" || catUpper === "HOUSE") {
      const bhk = p?.bhkConfig || (bedrooms ? `${bedrooms} BHK` : undefined);
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
          {bhk && <span className="font-semibold text-foreground/90">{bhk}</span>}
          {bhk && bathrooms !== undefined && <span>·</span>}
          {bathrooms !== undefined && <span>{bathrooms} Bath</span>}
          {furnished !== undefined && (
            <>
              <span>·</span>
              <span className={furnished ? "text-emerald-700 font-semibold" : ""}>
                {furnished ? "Furnished" : "Unfurnished"}
              </span>
            </>
          )}
          {p?.areaSqFt ? (
            <>
              <span>·</span>
              <span>{p.areaSqFt} sq.ft</span>
            </>
          ) : null}
        </div>
      );
    }

    // 2. PG
    if (catUpper === "PG") {
      let occ = p?.occupancyType;
      if (occ === "single") occ = "Single Room";
      else if (occ === "double") occ = "Double Sharing";
      else if (occ === "triple") occ = "Triple Sharing";
      else if (occ === "four_plus") occ = "4+ Sharing";
      else if (!occ && bedrooms) occ = bedrooms === 1 ? "Single Room" : `${bedrooms} Sharing`;

      let gender = p?.genderCategory;
      if (gender === "boys") gender = "Boys PG";
      else if (gender === "girls") gender = "Girls PG";
      else if (gender === "unisex" || gender === "coliving") gender = "Coliving";

      const food = p?.foodIncluded;

      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
          {occ && <span className="font-semibold text-foreground/90">{occ}</span>}
          {occ && gender && <span>·</span>}
          {gender && <span>{gender}</span>}
          {food !== undefined && (
            <>
              <span>·</span>
              <span className={food ? "text-emerald-700 font-semibold" : ""}>
                {food ? "Meals Included" : "Self Cooking"}
              </span>
            </>
          )}
        </div>
      );
    }

    // 3. HOSTEL
    if (catUpper === "HOSTEL") {
      const dorm = p?.roomType === "private" ? "Private Room" : "Dormitory";
      const beds = p?.totalBeds || bedrooms;
      const audience = p?.studentOrWorking;
      let audLabel = "";
      if (audience === "students") audLabel = "Students Only";
      else if (audience === "working_professionals") audLabel = "Working Pros";

      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
          <span className="font-semibold text-foreground/90">{dorm}</span>
          {beds && <span>· {beds} Beds</span>}
          {audLabel && <span>· {audLabel}</span>}
          {bathrooms !== undefined && <span>· {bathrooms} Bath</span>}
        </div>
      );
    }

    // 4. HOTEL
    if (catUpper === "HOTEL") {
      let room = p?.roomType;
      if (room === "standard") room = "Standard Room";
      else if (room === "deluxe") room = "Deluxe Room";
      else if (room === "executive") room = "Executive Room";
      else if (room === "suite") room = "Suite";
      else if (!room) room = "Hotel Room";

      const guests = p?.maxGuests || 2;
      const breakfast = p?.breakfastIncluded;

      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
          <span className="font-semibold text-foreground/90">{room}</span>
          <span>· {guests} Guests</span>
          {breakfast ? (
            <>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">Free Breakfast</span>
            </>
          ) : null}
          {p?.bedType && <span>· {p.bedType === "king" ? "King Bed" : p.bedType === "queen" ? "Queen Bed" : `${p.bedType} Bed`}</span>}
        </div>
      );
    }

    // 5. BNB
    if (catUpper === "BNB" || catUpper === "VACATIONSTAY" || catUpper === "VACATION_STAY") {
      let space = p?.spaceType;
      if (space === "entire_place") space = "Entire place";
      else if (space === "private_room") space = "Private room";
      else if (space === "shared_room") space = "Shared room";
      else if (!space) space = "Homestay";

      const guests = p?.maxGuests || (bedrooms ? bedrooms * 2 : 2);
      const beds = p?.bedsCount || bedrooms || 1;

      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
          <span className="font-semibold text-foreground/90">{space}</span>
          <span>· {guests} Guests</span>
          <span>· {beds} {beds === 1 ? "Bed" : "Beds"}</span>
          {bathrooms !== undefined && <span>· {bathrooms} Bath</span>}
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted flex-wrap">
        {bedrooms !== undefined && <span>{bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}</span>}
        {bathrooms !== undefined && <span>· {bathrooms} Bath</span>}
      </div>
    );
  };

  const targetPath = `/properties/${id}`;

  // Hydration-safe external store subscription for wishlist persistence
  const wishlistJson = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );
  const isFavorite = Boolean(id && wishlistJson.includes(`"${id}"`));

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("staytrack_favorites");
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(list)) list = [];
      if (list.includes(id)) {
        list = list.filter((item) => item !== id);
      } else {
        list.push(id);
      }
      localStorage.setItem("staytrack_favorites", JSON.stringify(list));
      window.dispatchEvent(new Event("staytrack_favorites_updated"));
    } catch {
      // Safe fallback if storage throws
    }
  };

  const priceUnit =
    catUpper === "HOSTEL" && p?.priceModel === "per_bed" && displayStayType === "month"
      ? " /bed/mo"
      : ` /${displayStayType}`;

  return (
    <div
      id={`property-card-${id}`}
      onMouseEnter={() => props.onHover && id && props.onHover(id)}
      onMouseLeave={() => props.onHover && props.onHover(null)}
      onClick={() => props.onSelect && id && props.onSelect(id)}
      className={`group flex flex-col justify-between overflow-hidden border rounded-3xl bg-surface transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 h-full ${
        props.isHovered
          ? "border-primary ring-2 ring-primary/25 shadow-elevated scale-[1.01]"
          : "border-border/90 shadow-subtle"
      }`}
    >
      {/* Spacious Photography Container (Aspect 16/11) with Carousel Controls */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-surface-muted select-none">
        <Link href={targetPath} aria-label={`View ${title}`} className="block w-full h-full">
          {hasImages && currentImage ? (
            <img
              src={currentImage}
              alt={`${title} - Photo ${safeIndex + 1}`}
              onError={handleImageError}
              className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              loading="lazy"
            />
          ) : (
            /* Deliberate, Attractive Architectural Fallback (Zero Stock Photography) */
            <div className="w-full h-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE5] to-[#E3E0D6] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-surface/90 border border-border shadow-subtle flex items-center justify-center text-[#111716] mb-2.5">
                <Building2Icon className="w-6 h-6 stroke-[1.75]" />
              </div>
              <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                {getCategoryLabel(category)}
              </span>
              <span className="text-[11px] text-muted font-medium mt-0.5 line-clamp-1 max-w-[200px]">
                {location || "Delhi NCR"}
              </span>
              <span className="mt-3 text-[10px] font-semibold tracking-wider text-muted/80 uppercase px-2.5 py-0.5 rounded-full bg-surface/80 border border-border/60">
                Verified Listing
              </span>
            </div>
          )}
        </Link>

        {/* Carousel Previous / Next Arrows (Appear on Hover if Multiple Photos) */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/90 hover:bg-surface text-foreground shadow-md backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/90 hover:bg-surface text-foreground shadow-md backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm pointer-events-auto">
              {validImages.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => handleDotClick(e, dotIdx)}
                  aria-label={`Jump to photo ${dotIdx + 1}`}
                  className={`transition-all duration-200 rounded-full cursor-pointer ${
                    dotIdx === safeIndex
                      ? "w-2 h-2 bg-white shadow-xs"
                      : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top-Left Category & Verification Badges */}
        <div className="absolute top-3 left-3 z-10 flex gap-1.5 items-center pointer-events-none">
          <span className="px-2.5 py-1 rounded-xl bg-surface/95 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-foreground border border-border shadow-2xs">
            {getCategoryLabel(category)}
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#3F8A68] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-2xs">
              <ShieldCheckIcon className="w-3 h-3" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Top-Right Wishlist Heart Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from wishlist" : "Save to wishlist"}
            title={isFavorite ? "Remove from wishlist" : "Save to wishlist"}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-surface/95 backdrop-blur-md border border-border/80 text-foreground hover:scale-110 active:scale-95 transition-all duration-200 shadow-2xs cursor-pointer focus-ring"
          >
            <HeartIcon
              className={`w-4 h-4 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground/75 hover:text-red-500"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Card Content: Editorial Hierarchy */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-surface">
        <div className="space-y-1.5">
          {/* Row 1: Location & Star Rating */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground line-clamp-1 flex items-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{location || "Delhi NCR"}</span>
            </p>
            {hasValidRating ? (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-foreground shrink-0">
                <StarIcon className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{rating.toFixed(1)}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-muted border border-border/60 shrink-0">
                New
              </span>
            )}
          </div>

          {/* Row 2: Property Title */}
          <Link
            href={targetPath}
            className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1 block leading-snug"
          >
            {title}
          </Link>

          {/* Row 3: Category-Specific Specifications */}
          <div className="pt-0.5">
            {renderCategorySpecs()}
          </div>
        </div>

        {/* Row 4: Pricing & Action Footer */}
        <div className="mt-4 pt-3 border-t border-border/70 flex items-baseline justify-between gap-3">
          <div className="leading-none">
            {rawPrice > 0 ? (
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  {formatCurrency(rawPrice)}
                </span>
                <span className="text-xs font-normal text-muted">
                  {priceUnit}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Price on request</span>
            )}
          </div>

          <Link
            href={targetPath}
            aria-label={`View details for ${title}`}
            className="text-xs font-bold text-[#111716] group-hover:text-primary transition-colors inline-flex items-center gap-1 group/link focus-ring rounded"
          >
            <span>View stay</span>
            <ArrowRightIcon className="w-3 h-3 group-hover/link:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </div>
  );
}
