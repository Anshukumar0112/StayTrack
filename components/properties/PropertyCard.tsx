"use client";

import { useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/utils";
import { Property } from "@/types/property";
import { getCategoryLabel } from "@/lib/categories";

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
    <GlassCard hoverEffect className="group flex flex-col justify-between overflow-hidden border border-zinc-200 p-0 shadow-md">
      <Link href={targetPath} className="relative h-48 w-full overflow-hidden bg-zinc-100 block">
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 group-hover:scale-105 transition-transform duration-500">
          {p?.images && p.images.length > 0 && !imageError ? (
            <img
              src={p.images[0]}
              alt=""
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl">🏡</span>
          )}
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          <span className="clay-badge px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
            {getCategoryLabel(category)}
          </span>
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
            Verified
          </span>
        </div>

        <div className="absolute top-3 right-3 z-20">
          <span className="flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-zinc-900 border border-zinc-200 shadow-sm">
            ★ {rating}
          </span>
        </div>
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link href={targetPath} className="text-base font-bold text-zinc-950 group-hover:text-black transition-colors line-clamp-1 block">
            {title}
          </Link>
          <p className="text-xs font-semibold text-zinc-500 mt-1 flex items-center gap-1">
            📍 {location}
          </p>

          {/* Bedrooms, Bathrooms, Furnished indicators */}
          <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-zinc-600">
            {bedrooms !== undefined && <span>🛏️ {bedrooms} BHK</span>}
            {bathrooms !== undefined && <span>🚿 {bathrooms} Bath</span>}
            {furnished !== undefined && (
              <span className="text-emerald-700 font-extrabold">
                {furnished ? "✓ Furnished" : "Unfurnished"}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
          <div>
            <span className="text-lg font-black text-black">{formatCurrency(rawPrice)}</span>
            <span className="text-[11px] font-semibold text-zinc-500"> /{displayStayType}</span>
          </div>

          <Link
            href={targetPath}
            className="rounded-xl bg-black hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm inline-block"
          >
            View Details
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
