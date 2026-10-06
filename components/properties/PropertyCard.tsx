"use client";

import { useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/utils";
import { Property } from "@/types/property";
import { getCategoryLabel } from "@/lib/categories";
import { ArrowRightIcon, HeartIcon, MapPinIcon, StarIcon } from "@/components/ui/Icons";

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
}

export default function PropertyCard(props: PropertyCardProps) {
  const p = props.property;
  const [imageError, setImageError] = useState(false);
  
  const id = p?.id || (p as any)?.propertyId || props.id || "";
  const title = p?.title || props.title || "StayTrack Property";
  const location = p
    ? [p.area, p.city].filter(Boolean).join(", ")
    : (props.location || "");
  const category = p?.propertyType || props.category || "Flat";
  
  const rawPrice = p
    ? (p.dailyPrice ?? p.pricePerNight ?? p.monthlyPrice ?? p.pricePerMonth ?? p.hourlyPrice ?? p.pricePerHour ?? p.price ?? 0)
    : (props.price || 0);

  const bookingTypeStr = p?.bookingType || (p as any)?.stayTypes?.[0] || props.stayType || "daily";
  const displayStayType = bookingTypeStr.toLowerCase() === "monthly" ? "month" : bookingTypeStr.toLowerCase() === "hourly" ? "hour" : "night";
  const rating = p?.rating || props.rating || 4.8;
  const bedrooms = p?.bedrooms ?? props.bedrooms;
  const bathrooms = p?.bathrooms ?? props.bathrooms;
  const furnished = p?.furnished ?? props.furnished;

  const targetPath = `/properties/${id}`;

  return (
    <div className="group flex flex-col justify-between overflow-hidden border border-border/80 rounded-2xl bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full">
      {/* 55-65% Height Image Container with Hover Scale */}
      <Link href={targetPath} className="relative aspect-[4/3] w-full overflow-hidden bg-background block">
        <div className="h-full w-full overflow-hidden bg-background">
          {p?.images && p.images.length > 0 && !imageError ? (
            <img
              src={p.images[0]}
              alt={title}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-[#111716] flex flex-col items-center justify-center p-4 border-b border-border/40 text-center relative overflow-hidden">
              <img src="/logo.png" alt="StayTrack" className="h-6 w-auto object-contain opacity-80 mb-2 brightness-200" />
              <span className="text-[11px] font-bold text-primary-light">Verified Accommodation</span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Delhi NCR</span>
            </div>
          )}
        </div>

        {/* Top Badges & Wishlist Heart */}
        <div className="absolute top-3 left-3 z-10 flex gap-2 items-center">
          <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-[#111716] border border-border/50 shadow-xs">
            {getCategoryLabel(category)}
          </span>
          <span className="rounded-md bg-[#3F8A68] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs">
            Verified
          </span>
        </div>

        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-white/95 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-[#111716] border border-border/50 shadow-xs">
            <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" /> {rating}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex items-center justify-center h-7 w-7 rounded-md bg-white/90 backdrop-blur-md border border-border/50 text-[#111716] hover:text-[#C85050] hover:scale-105 transition-all duration-200 shadow-xs cursor-pointer"
            title="Save to wishlist"
          >
            <HeartIcon className="w-3.5 h-3.5 text-foreground/80 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </Link>

      {/* Card Content Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-surface">
        <div>
          <Link href={targetPath} className="text-sm sm:text-base font-bold text-[#111716] group-hover:text-primary transition-colors duration-200 line-clamp-1 block">
            {title}
          </Link>
          <p className="text-xs font-semibold text-muted mt-1 flex items-center gap-1 line-clamp-1">
            <MapPinIcon className="w-3 h-3 text-muted shrink-0" />
            <span>{location || "Delhi NCR"}</span>
          </p>

          {/* Bedrooms, Bathrooms, Furnished indicators */}
          <div className="flex items-center gap-2 mt-2.5 text-[11px] font-semibold text-muted">
            {bedrooms !== undefined && <span>{bedrooms} BHK</span>}
            {bedrooms !== undefined && (bathrooms !== undefined || furnished !== undefined) && <span>·</span>}
            {bathrooms !== undefined && <span>{bathrooms} Bath</span>}
            {bathrooms !== undefined && furnished !== undefined && <span>·</span>}
            {furnished !== undefined && (
              <span className={furnished ? "text-[#3F8A68] font-bold" : ""}>
                {furnished ? "Furnished" : "Unfurnished"}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center justify-between">
          <div>
            <span className="text-base sm:text-lg font-black text-[#111716]">{formatCurrency(rawPrice)}</span>
            <span className="text-[11px] font-semibold text-muted"> /{displayStayType}</span>
          </div>

          <Link
            href={targetPath}
            className="rounded-xl bg-primary hover:bg-[#111716] px-3.5 py-1.5 text-xs font-bold text-white transition-all duration-200 shadow-xs inline-flex items-center gap-1 group/btn"
          >
            <span>View details</span>
            <ArrowRightIcon className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </div>
  );
}
