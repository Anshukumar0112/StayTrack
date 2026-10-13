"use client";

import React from "react";
import { SearchIcon, FilterIcon, MapPinIcon } from "@/components/ui/Icons";
import { getCategoryLabel } from "@/lib/categories";

interface MobileSearchHeaderProps {
  city?: string;
  area?: string;
  category?: string;
  stayType?: string;
  maxPrice?: number;
  onOpenFilters?: () => void;
}

export default function MobileSearchHeader({
  city,
  area,
  category,
  stayType,
  maxPrice,
  onOpenFilters,
}: MobileSearchHeaderProps) {
  const displayCity = city || "Delhi NCR";
  const displayArea = area ? `· ${area}` : "";
  const displayCat = category && category !== "all" ? `· ${getCategoryLabel(category)}` : "";
  const displayStayType = stayType ? `· ${stayType.charAt(0).toUpperCase() + stayType.slice(1)}` : "";
  const displayPrice = maxPrice && maxPrice < 60000 ? `· Max ₹${maxPrice.toLocaleString()}` : "";

  const subtitle = [displayArea, displayCat, displayStayType, displayPrice].filter(Boolean).join(" ");

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-2 max-w-md mx-auto">
        {/* Main Compact Search Bar Pill */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex-1 flex items-center gap-3 bg-background border border-border/90 rounded-full py-2 px-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer text-left overflow-hidden"
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SearchIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>

          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-xs font-black text-foreground truncate flex items-center gap-1">
              <span>{displayCity}</span>
            </div>
            <div className="text-[10px] font-semibold text-muted truncate">
              {subtitle || "Any dates · Any stay type · Verified NCR"}
            </div>
          </div>
        </button>

        {/* Quick Filter Icon Button */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="h-9 w-9 rounded-full border border-border/90 bg-background text-foreground flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer"
          title="Filter Stays"
          aria-label="Filter Stays"
        >
          <FilterIcon className="w-4 h-4 text-foreground/80 stroke-[2]" />
        </button>
      </div>
    </div>
  );
}
