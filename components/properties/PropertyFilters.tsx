"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ACCOMMODATION_CATEGORIES,
  normalizeCategoryKey,
  PG_OCCUPANCY_OPTIONS,
  GENDER_OPTIONS,
  HOSTEL_ROOM_OPTIONS,
  HOTEL_ROOM_OPTIONS,
  BNB_SPACE_OPTIONS,
} from "@/lib/categories";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { ChevronDownIcon } from "@/components/ui/Icons";

export const SUPPORTED_PRICES = [1000, 2500, 5000, 10000, 20000, 40000, 60000] as const;
export const PRICE_SCALE = [0, 1000, 2500, 5000, 10000, 20000, 40000, 60000] as const;

interface PropertyFiltersProps {
  city: string;
  setCity: (c: string) => void;
  area: string;
  setArea: (a: string) => void;
  stayType: string;
  setStayType: (st: string) => void;
  propertyType: string;
  setPropertyType: (pt: string) => void;
  minPrice?: number;
  setMinPrice?: (p: number) => void;
  maxPrice: number;
  setMaxPrice: (p: number) => void;
  minBedrooms: number;
  setMinBedrooms: (b: number) => void;
  furnished: boolean | undefined;
  setFurnished: (f: boolean | undefined) => void;
  onReset: () => void;
  className?: string;
  hideHeader?: boolean;
  occupancyType?: string;
  setOccupancyType?: (val: string) => void;
  genderCategory?: string;
  setGenderCategory?: (val: string) => void;
  roomType?: string;
  setRoomType?: (val: string) => void;
  maxGuests?: number;
  setMaxGuests?: (val: number) => void;
}

export default function PropertyFilters({
  city,
  setCity,
  area,
  setArea,
  stayType,
  setStayType,
  propertyType,
  setPropertyType,
  minPrice = 0,
  setMinPrice = () => {},
  maxPrice,
  setMaxPrice,
  minBedrooms,
  setMinBedrooms,
  furnished,
  setFurnished,
  onReset,
  className = "",
  hideHeader = false,
  occupancyType = "",
  setOccupancyType = () => {},
  genderCategory = "",
  setGenderCategory = () => {},
  roomType = "",
  setRoomType = () => {},
  maxGuests = 0,
  setMaxGuests = () => {},
}: PropertyFiltersProps) {
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);
  const [openPriceDropdown, setOpenPriceDropdown] = useState<"min" | "max" | null>(null);
  const minDropdownRef = useRef<HTMLDivElement>(null);
  const maxDropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = propertyType ? normalizeCategoryKey(propertyType) : "ALL";

  // Close custom dropdowns on click-outside or escape
  useEffect(() => {
    if (!openPriceDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openPriceDropdown === "min" &&
        minDropdownRef.current &&
        !minDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenPriceDropdown(null);
      } else if (
        openPriceDropdown === "max" &&
        maxDropdownRef.current &&
        !maxDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenPriceDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPriceDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPriceDropdown]);

  // Derive discrete scale indices (0 to 7) matching PRICE_SCALE
  const getScaleIndex = (val: number, fallbackIdx: number): number => {
    const exact = PRICE_SCALE.indexOf(val as (typeof PRICE_SCALE)[number]);
    if (exact !== -1) return exact;
    let closest = fallbackIdx;
    let minDiff = Infinity;
    PRICE_SCALE.forEach((p, idx) => {
      const diff = Math.abs(p - val);
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx;
      }
    });
    return closest;
  };

  const rawMinIdx = getScaleIndex(minPrice, 0);
  const rawMaxIdx = getScaleIndex(maxPrice, 7);
  const minScaleIndex = Math.max(0, Math.min(rawMinIdx, rawMaxIdx - 1));
  const maxScaleIndex = Math.min(7, Math.max(rawMaxIdx, rawMinIdx + 1));

  const effectiveMin = PRICE_SCALE[minScaleIndex];
  const effectiveMax = PRICE_SCALE[maxScaleIndex];

  // Percent calculation across the 8 discrete points (0 to 7)
  const minPercent = (minScaleIndex / 7) * 100;
  const maxPercent = (maxScaleIndex / 7) * 100;

  const minOptions = PRICE_SCALE.slice(0, 7).filter((p) => p < effectiveMax);
  const maxOptions = PRICE_SCALE.slice(1).filter((p) => p > effectiveMin);

  const handleMinSliderChange = (scaleIdx: number) => {
    const nextIdx = Math.max(0, Math.min(scaleIdx, maxScaleIndex - 1));
    setMinPrice(PRICE_SCALE[nextIdx]);
  };

  const handleMaxSliderChange = (scaleIdx: number) => {
    const nextIdx = Math.min(7, Math.max(minScaleIndex + 1, scaleIdx));
    setMaxPrice(PRICE_SCALE[nextIdx]);
  };
  return (
    <div className={`space-y-5 ${className}`}>
      {!hideHeader && (
        <div className="flex justify-between items-center pb-3 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Filter Stays
          </h3>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* City & Destination */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
          Destination City
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCity("")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !city
                ? "bg-[#111716] text-white font-semibold shadow-2xs"
                : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-muted"
            }`}
          >
            All NCR
          </button>
          {SUPPORTED_LOCATIONS.map((loc) => {
            const isSel = city?.toLowerCase() === loc.name.toLowerCase();
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setCity(isSel ? "" : loc.name)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSel
                    ? "bg-[#111716] text-white font-semibold shadow-2xs"
                    : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                {loc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Area / Locality */}
      <div className="space-y-1.5 pt-3 border-t border-border/80">
        <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
          Area / Locality
        </label>
        <input
          type="text"
          placeholder="e.g. Cyber City, Saket, Sector 62..."
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Property Type (Compact 2-Column Grid) */}
      <div className="space-y-2 pt-3 border-t border-border/80">
        <div className="flex justify-between items-center">
          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
            Property Type
          </label>
          <span className="text-[10px] text-muted font-medium">
            {propertyType === "all" || !propertyType ? "All" : "1 selected"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPropertyType("all");
              setOccupancyType("");
              setGenderCategory("");
              setRoomType("");
              setMaxGuests(0);
            }}
            className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
              propertyType === "all" || !propertyType
                ? "bg-[#111716] text-white font-semibold shadow-2xs"
                : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
            }`}
          >
            All Categories
          </button>
          {ACCOMMODATION_CATEGORIES.map((cat) => {
            const isSelected = normalizeCategoryKey(propertyType) === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setPropertyType(cat.id);
                  setOccupancyType("");
                  setGenderCategory("");
                  setRoomType("");
                  setMaxGuests(0);
                }}
                className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#111716] text-white font-semibold shadow-2xs"
                    : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                }`}
                title={cat.label}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stay Model */}
      <div className="space-y-2 pt-3 border-t border-border/80">
        <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
          Stay Model
        </label>
        <div className="grid grid-cols-3 gap-1 bg-surface-muted p-1 rounded-xl border border-border">
          {[
            { label: "Daily", value: "daily" },
            { label: "Monthly", value: "monthly" },
            { label: "Hourly", value: "hourly" },
          ].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStayType(stayType === st.value ? "" : st.value)}
              className={`py-1.5 text-xs rounded-lg transition-all cursor-pointer font-medium ${
                stayType === st.value
                  ? "bg-surface text-foreground font-semibold shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter (Matching Reference Layout) */}
      <div className="space-y-2 pt-3 border-t border-border/80">
        <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
          Price
        </label>

        {/* Dual-Handle Discrete Slider with Selected Range Track */}
        <div className="relative pt-1 pb-1">
          {/* Shaded Track Box */}
          <div className="relative h-7 w-full bg-[#E2E8F0]/80 rounded-t-sm flex items-end overflow-hidden">
            {/* Gray base track line */}
            <div className="relative w-full h-1 bg-[#CBD5E1]">
              {/* Highlighted active blue range line */}
              <div
                className="absolute top-0 h-full bg-[#2563EB]"
                style={{
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                }}
              />
            </div>
          </div>

          {/* Overlaid Min & Max Discrete Range Slider Inputs */}
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={minScaleIndex}
            onChange={(e) => handleMinSliderChange(Number(e.target.value))}
            onMouseDown={() => setActiveThumb("min")}
            onTouchStart={() => setActiveThumb("min")}
            aria-label="Minimum price filter"
            aria-valuemin={0}
            aria-valuemax={40000}
            aria-valuenow={effectiveMin}
            aria-valuetext={effectiveMin === 0 ? "Min (₹0)" : `₹${effectiveMin.toLocaleString()}`}
            className={`pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent ${
              activeThumb === "min" || minScaleIndex >= 5 ? "z-30" : "z-20"
            }
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-[#2563EB]
              [&::-webkit-slider-thumb]:shadow-xs
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:active:scale-105
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-[#2563EB]
              [&::-moz-range-thumb]:shadow-xs
              [&::-moz-range-thumb]:cursor-pointer`}
          />

          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={maxScaleIndex}
            onChange={(e) => handleMaxSliderChange(Number(e.target.value))}
            onMouseDown={() => setActiveThumb("max")}
            onTouchStart={() => setActiveThumb("max")}
            aria-label="Maximum price filter"
            aria-valuemin={1000}
            aria-valuemax={60000}
            aria-valuenow={effectiveMax}
            aria-valuetext={effectiveMax >= 60000 ? "₹60,000+" : `₹${effectiveMax.toLocaleString()}`}
            className={`pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent ${
              activeThumb === "max" ? "z-30" : "z-20"
            }
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-[#2563EB]
              [&::-webkit-slider-thumb]:shadow-xs
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:active:scale-105
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-[#2563EB]
              [&::-moz-range-thumb]:shadow-xs
              [&::-moz-range-thumb]:cursor-pointer`}
          />
        </div>

        {/* Subtle Dots / Ticks Row (matching discrete 8 points) */}
        <div className="flex justify-between px-2 pt-0.5 pb-1" aria-hidden="true">
          {PRICE_SCALE.map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                dotIdx >= minScaleIndex && dotIdx <= maxScaleIndex
                  ? "bg-[#2563EB]"
                  : "bg-border-hover/60"
              }`}
            />
          ))}
        </div>

        {/* Custom Anchored Dropdowns: [ Min ▼ ]  to  [ ₹60,000+ ▼ ] */}
        <div className="flex items-center gap-2 pt-0.5 relative">
          {/* Min Price Custom Dropdown */}
          <div className="relative flex-1 min-w-0" ref={minDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenPriceDropdown((prev) => (prev === "min" ? null : "min"))}
              aria-expanded={openPriceDropdown === "min"}
              aria-haspopup="listbox"
              aria-label="Minimum price"
              className={`w-full h-10 px-3 rounded-lg bg-surface border text-xs font-semibold text-foreground flex items-center justify-between cursor-pointer transition-all ${
                openPriceDropdown === "min"
                  ? "border-[#2563EB] ring-1 ring-[#2563EB]/20"
                  : "border-border hover:border-border-hover"
              }`}
            >
              <span className="truncate">
                {effectiveMin === 0 ? "Min" : `₹${effectiveMin.toLocaleString()}`}
              </span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted shrink-0 ml-1 transition-transform duration-200 ${
                  openPriceDropdown === "min" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openPriceDropdown === "min" && (
              <div
                role="listbox"
                className="absolute left-0 top-full mt-1.5 w-full min-w-[130px] max-h-52 overflow-y-auto rounded-xl bg-surface border border-border shadow-elevated p-1 z-40 animate-in fade-in zoom-in-95"
              >
                <button
                  role="option"
                  aria-selected={effectiveMin === 0}
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setOpenPriceDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    effectiveMin === 0
                      ? "bg-primary/10 text-primary-dark font-bold"
                      : "hover:bg-surface-muted text-foreground font-medium"
                  }`}
                >
                  <span>Min</span>
                  {effectiveMin === 0 && <span className="text-primary-dark text-xs font-bold">✓</span>}
                </button>
                {minOptions
                  .filter((p) => p > 0)
                  .map((p) => {
                    const isSelected = effectiveMin === p;
                    return (
                      <button
                        key={`min-${p}`}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                        onClick={() => {
                          setMinPrice(p);
                          setOpenPriceDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary-dark font-bold"
                            : "hover:bg-surface-muted text-foreground font-medium"
                        }`}
                      >
                        <span>₹{p.toLocaleString()}</span>
                        {isSelected && <span className="text-primary-dark text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <span className="text-xs text-muted font-medium px-1 shrink-0 select-none">
            to
          </span>

          {/* Max Price Custom Dropdown */}
          <div className="relative flex-1 min-w-0" ref={maxDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenPriceDropdown((prev) => (prev === "max" ? null : "max"))}
              aria-expanded={openPriceDropdown === "max"}
              aria-haspopup="listbox"
              aria-label="Maximum price"
              className={`w-full h-10 px-3 rounded-lg bg-surface border text-xs font-semibold text-foreground flex items-center justify-between cursor-pointer transition-all ${
                openPriceDropdown === "max"
                  ? "border-[#2563EB] ring-1 ring-[#2563EB]/20"
                  : "border-border hover:border-border-hover"
              }`}
            >
              <span className="truncate">
                {effectiveMax >= 60000 ? "₹60,000+" : `₹${effectiveMax.toLocaleString()}`}
              </span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted shrink-0 ml-1 transition-transform duration-200 ${
                  openPriceDropdown === "max" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openPriceDropdown === "max" && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-1.5 w-full min-w-[130px] max-h-52 overflow-y-auto rounded-xl bg-surface border border-border shadow-elevated p-1 z-40 animate-in fade-in zoom-in-95"
              >
                {maxOptions.map((p) => {
                  const isSelected = effectiveMax === p;
                  return (
                    <button
                      key={`max-${p}`}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => {
                        setMaxPrice(p);
                        setOpenPriceDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary-dark font-bold"
                          : "hover:bg-surface-muted text-foreground font-medium"
                      }`}
                    >
                      <span>{p >= 60000 ? "₹60,000+" : `₹${p.toLocaleString()}`}</span>
                      {isSelected && <span className="text-primary-dark text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category-Adaptive Specifications */}
      {activeCategory === "PG" && (
        <>
          {/* Room Occupancy / Sharing */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                Room Sharing / Occupancy
              </label>
              {occupancyType && (
                <button
                  type="button"
                  onClick={() => setOccupancyType("")}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOccupancyType("")}
                className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                  !occupancyType
                    ? "bg-[#111716] text-white font-semibold shadow-2xs"
                    : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                }`}
              >
                All Sharing Types
              </button>
              {PG_OCCUPANCY_OPTIONS.map((opt) => {
                const isSel = occupancyType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOccupancyType(isSel ? "" : opt.id)}
                    className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                      isSel
                        ? "bg-[#111716] text-white font-semibold shadow-2xs"
                        : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender Preference */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Tenant Preference
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {GENDER_OPTIONS.map((opt) => {
                const isSel = genderCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGenderCategory(isSel ? "" : opt.id)}
                    className={`py-2 text-xs rounded-xl border text-center truncate transition-all cursor-pointer font-medium ${
                      isSel
                        ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                        : "bg-surface border-border text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeCategory === "HOSTEL" && (
        <>
          {/* Hostel Room Setup */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Room Structure
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setRoomType("")}
                className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                  !roomType
                    ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                    : "bg-surface border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                All Rooms
              </button>
              {HOSTEL_ROOM_OPTIONS.map((opt) => {
                const isSel = roomType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoomType(isSel ? "" : opt.id)}
                    className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                      isSel
                        ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                        : "bg-surface border-border text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender / Audience */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Hostel Audience
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {GENDER_OPTIONS.map((opt) => {
                const isSel = genderCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGenderCategory(isSel ? "" : opt.id)}
                    className={`py-2 text-xs rounded-xl border text-center truncate transition-all cursor-pointer font-medium ${
                      isSel
                        ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                        : "bg-surface border-border text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeCategory === "HOTEL" && (
        <>
          {/* Hotel Room Category */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Room Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setRoomType("")}
                className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                  !roomType
                    ? "bg-[#111716] text-white font-semibold shadow-2xs"
                    : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                }`}
              >
                All Room Types
              </button>
              {HOTEL_ROOM_OPTIONS.map((opt) => {
                const isSel = roomType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoomType(isSel ? "" : opt.id)}
                    className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                      isSel
                        ? "bg-[#111716] text-white font-semibold shadow-2xs"
                        : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Capacity */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Guest Capacity
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxGuests(num)}
                  className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                    maxGuests === num
                      ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                      : "bg-surface border-border text-foreground hover:bg-surface-muted font-medium"
                  }`}
                >
                  {num === 0 ? "Any" : `${num}+`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeCategory === "BNB" && (
        <>
          {/* BNB Space Type */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Space Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setRoomType("")}
                className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                  !roomType
                    ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                    : "bg-surface border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                All Spaces
              </button>
              {BNB_SPACE_OPTIONS.map((opt) => {
                const isSel = roomType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoomType(isSel ? "" : opt.id)}
                    className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                      isSel
                        ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                        : "bg-surface border-border text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Capacity */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Guest Capacity
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 4, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxGuests(num)}
                  className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                    maxGuests === num
                      ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                      : "bg-surface border-border text-foreground hover:bg-surface-muted font-medium"
                  }`}
                >
                  {num === 0 ? "Any" : `${num}+`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(activeCategory === "FLAT" || activeCategory === "ALL" || !activeCategory) && (
        <>
          {/* Bedrooms filter */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Bedrooms (BHK)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMinBedrooms(num)}
                  className={`py-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                    minBedrooms === num
                      ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                      : "bg-surface border-border text-foreground hover:bg-surface-muted font-medium"
                  }`}
                >
                  {num === 0 ? "Any" : `${num}+ BHK`}
                </button>
              ))}
            </div>
          </div>

          {/* Furnished Status */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
              Furnished Status
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setFurnished(undefined)}
                className={`py-2 text-xs rounded-xl border transition-all cursor-pointer font-medium text-center ${
                  furnished === undefined
                    ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                    : "bg-surface border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                Any
              </button>
              <button
                type="button"
                onClick={() => setFurnished(true)}
                className={`py-2 text-xs rounded-xl border transition-all cursor-pointer font-medium text-center ${
                  furnished === true
                    ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                    : "bg-surface border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                Furnished
              </button>
              <button
                type="button"
                onClick={() => setFurnished(false)}
                className={`py-2 text-xs rounded-xl border transition-all cursor-pointer font-medium text-center ${
                  furnished === false
                    ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-2xs"
                    : "bg-surface border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                Unfurnished
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
