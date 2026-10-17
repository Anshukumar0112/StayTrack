"use client";

import React from "react";
import { SearchIcon, FilterIcon, MapIcon, ListIcon } from "@/components/ui/Icons";
import { getCategoryLabel } from "@/lib/categories";

interface MobileSearchHeaderProps {
  city?: string;
  area?: string;
  category?: string;
  stayType?: string;
  minPrice?: number;
  maxPrice?: number;
  activeFilterCount?: number;
  mobileView?: "list" | "map";
  onToggleView?: () => void;
  onOpenSearch?: () => void;
  onOpenFilters?: () => void;
}

export default function MobileSearchHeader({
  city,
  area,
  category,
  stayType,
  minPrice,
  maxPrice,
  activeFilterCount = 0,
  mobileView = "list",
  onToggleView,
  onOpenSearch,
  onOpenFilters,
}: MobileSearchHeaderProps) {
  const displayCity = city || "Delhi NCR";
  const displayArea = area ? `· ${area}` : "";
  const displayCat = category && category !== "all" ? `· ${getCategoryLabel(category)}` : "";
  const displayStayType = stayType ? `· ${stayType.charAt(0).toUpperCase() + stayType.slice(1)}` : "";
  const displayPrice =
    minPrice && minPrice > 0 && maxPrice && maxPrice < 60000
      ? `· ₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`
      : minPrice && minPrice > 0
      ? `· From ₹${minPrice.toLocaleString()}`
      : maxPrice && maxPrice < 60000
      ? `· Max ₹${maxPrice.toLocaleString()}`
      : "";

  const subtitle = [displayArea, displayCat, displayStayType, displayPrice].filter(Boolean).join(" ");

  return (
    <div className="lg:hidden sticky top-0 z-[25] bg-surface/98 backdrop-blur-md border-b border-border px-3.5 py-2.5 shadow-subtle">
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        {/* Main Compact Search Bar Pill: Triggers Search Modal */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2.5 bg-background border border-border rounded-full py-1.5 px-3.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer text-left overflow-hidden min-w-0"
          aria-label="Search destination and locations"
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SearchIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>

          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1">
              <span>{displayCity}</span>
            </div>
            <div className="text-[10px] font-medium text-muted truncate">
              {subtitle || "Any dates · Any stay type · Verified NCR"}
            </div>
          </div>
        </button>

        {/* Map / List Integrated View Toggle Button */}
        {onToggleView && (
          <button
            type="button"
            onClick={onToggleView}
            className="h-9 px-3 rounded-full border border-border bg-surface hover:bg-surface-muted text-foreground flex items-center gap-1.5 shrink-0 active:scale-95 transition-all text-xs font-semibold cursor-pointer shadow-2xs"
            aria-label={mobileView === "map" ? "Switch to list view" : "Switch to map view"}
          >
            {mobileView === "map" ? (
              <>
                <ListIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px]">List</span>
              </>
            ) : (
              <>
                <MapIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px]">Map</span>
              </>
            )}
          </button>
        )}

        {/* Dedicated Filter Button: Triggers Filter Panel Modal */}
        <button
          type="button"
          onClick={onOpenFilters}
          className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-2xs cursor-pointer relative ${
            activeFilterCount > 0
              ? "bg-[#111716] border-[#111716] text-white"
              : "border-border bg-surface text-foreground hover:bg-surface-muted"
          }`}
          title="Filter Stays"
          aria-label="Filter Stays"
        >
          <FilterIcon className="w-4 h-4 stroke-[2]" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
