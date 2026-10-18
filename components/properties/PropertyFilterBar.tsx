"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ACCOMMODATION_CATEGORIES,
  normalizeCategoryKey,
  PG_OCCUPANCY_OPTIONS,
  GENDER_OPTIONS,
  HOSTEL_ROOM_OPTIONS,
  HOTEL_ROOM_OPTIONS,
  BNB_SPACE_OPTIONS,
  formatOccupancyLabel,
  formatGenderLabel,
  formatRoomTypeLabel,
} from "@/lib/categories";
import { CloseIcon, MapPinIcon, ChevronDownIcon, CheckIcon } from "@/components/ui/Icons";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";

export const SORT_OPTIONS = [
  { id: "relevance", label: "Recommended" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "rating_desc", label: "Top Rated" },
  { id: "newest", label: "Newest Added" },
];

interface PropertyFilterBarProps {
  city: string;
  setCity: (city: string) => void;
  area: string;
  setArea: (area: string) => void;
  stayType: string;
  setStayType: (stayType: string) => void;
  propertyType: string;
  setPropertyType: (category: string) => void;
  minPrice?: number;
  setMinPrice?: (price: number) => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  minBedrooms: number;
  setMinBedrooms: (beds: number) => void;
  furnished: boolean | undefined;
  setFurnished: (furnished: boolean | undefined) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onReset: () => void;
  occupancyType?: string;
  setOccupancyType?: (val: string) => void;
  genderCategory?: string;
  setGenderCategory?: (val: string) => void;
  roomType?: string;
  setRoomType?: (val: string) => void;
  maxGuests?: number;
  setMaxGuests?: (val: number) => void;
}

export default function PropertyFilterBar({
  city,
  setCity,
  area,
  stayType,
  setStayType,
  propertyType,
  setPropertyType,
  minPrice = 0,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minBedrooms,
  setMinBedrooms,
  furnished,
  setFurnished,
  sortBy = "relevance",
  setSortBy,
  onReset,
  occupancyType = "",
  setOccupancyType,
  genderCategory = "",
  setGenderCategory,
  roomType = "",
  setRoomType,
  maxGuests = 0,
  setMaxGuests,
}: PropertyFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const barContainerRef = useRef<HTMLDivElement>(null);
  const activePopoverRef = useRef<HTMLDivElement>(null);

  const activeCategory = propertyType ? normalizeCategoryKey(propertyType) : "ALL";

  // Robust popover lifecycle: outside click, escape key, and scroll dismissal
  useEffect(() => {
    if (!openDropdown) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        barContainerRef.current &&
        !barContainerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    function handleScroll(event: Event) {
      const target = event.target as Node | null;
      // If the scroll target is inside the open popover container itself, preserve it
      if (
        activePopoverRef.current &&
        target &&
        (activePopoverRef.current === target || activePopoverRef.current.contains(target))
      ) {
        return;
      }
      // If the main window or an outer container scrolled, dismiss promptly
      setOpenDropdown(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [openDropdown]);

  // Auto-align popovers if they would overflow the viewport right edge
  useEffect(() => {
    if (!openDropdown || !activePopoverRef.current) return;
    const popover = activePopoverRef.current;
    const rect = popover.getBoundingClientRect();
    if (rect.right > window.innerWidth - 16) {
      popover.style.left = "auto";
      popover.style.right = "0px";
    }
  }, [openDropdown]);

  const DESKTOP_PRICE_POINTS = [1000, 2500, 5000, 10000, 20000, 40000, 60000] as const;

  const getDesktopPriceIndex = (val: number): number => {
    const exact = DESKTOP_PRICE_POINTS.indexOf(val as (typeof DESKTOP_PRICE_POINTS)[number]);
    if (exact !== -1) return exact;
    let closest = 6;
    let minDiff = Infinity;
    DESKTOP_PRICE_POINTS.forEach((p, idx) => {
      const diff = Math.abs(p - val);
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx;
      }
    });
    return closest;
  };

  const desktopPriceIndex = getDesktopPriceIndex(maxPrice);
  const isPriceActive = (minPrice !== undefined && minPrice > 0) || maxPrice < 60000;

  let priceTriggerLabel = "Budget";
  if (minPrice && minPrice > 0 && maxPrice < 60000) {
    priceTriggerLabel = `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`;
  } else if (minPrice && minPrice > 0) {
    priceTriggerLabel = `From ₹${minPrice.toLocaleString()}`;
  } else if (maxPrice < 60000) {
    priceTriggerLabel = `Under ₹${maxPrice.toLocaleString()}`;
  }

  const isOccupancyActive = Boolean(occupancyType && occupancyType !== "");
  const isGenderActive = Boolean(genderCategory && genderCategory !== "");
  const isRoomTypeActive = Boolean(roomType && roomType !== "");
  const isGuestsActive = Boolean(maxGuests !== undefined && maxGuests > 0);

  const hasActiveFilters =
    city !== "" ||
    area !== "" ||
    (propertyType !== "all" && propertyType !== "") ||
    stayType !== "" ||
    isPriceActive ||
    minBedrooms > 0 ||
    furnished !== undefined ||
    isOccupancyActive ||
    isGenderActive ||
    isRoomTypeActive ||
    isGuestsActive ||
    (sortBy !== "relevance" && sortBy !== "");

  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdown((current) => (current === name ? null : name));
  }, []);

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || "Sort";

  // Category-Adaptive Dropdown Definitions
  // Slot 1
  let slot1Label = "Bedrooms";
  let slot1IsActive = minBedrooms > 0;
  let slot1Header = "Bedrooms / Capacity";
  let slot1Options: { label: string; active: boolean; onClick: () => void }[] = [];

  if (activeCategory === "PG") {
    slot1Label = occupancyType ? formatOccupancyLabel(occupancyType) : "Sharing";
    slot1IsActive = Boolean(occupancyType);
    slot1Header = "Room Occupancy";
    slot1Options = [
      {
        label: "All Sharing Types",
        active: !occupancyType,
        onClick: () => {
          if (setOccupancyType) setOccupancyType("");
          setOpenDropdown(null);
        },
      },
      ...PG_OCCUPANCY_OPTIONS.map((opt) => ({
        label: opt.label,
        active: occupancyType === opt.id,
        onClick: () => {
          if (setOccupancyType) setOccupancyType(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else if (activeCategory === "HOSTEL") {
    slot1Label = roomType ? formatRoomTypeLabel(roomType) : "Room Setup";
    slot1IsActive = Boolean(roomType);
    slot1Header = "Hostel Structure";
    slot1Options = [
      {
        label: "All Room Types",
        active: !roomType,
        onClick: () => {
          if (setRoomType) setRoomType("");
          setOpenDropdown(null);
        },
      },
      ...HOSTEL_ROOM_OPTIONS.map((opt) => ({
        label: opt.label,
        active: roomType === opt.id,
        onClick: () => {
          if (setRoomType) setRoomType(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else if (activeCategory === "HOTEL") {
    slot1Label = roomType ? formatRoomTypeLabel(roomType) : "Room Tier";
    slot1IsActive = Boolean(roomType);
    slot1Header = "Room Category";
    slot1Options = [
      {
        label: "All Room Categories",
        active: !roomType,
        onClick: () => {
          if (setRoomType) setRoomType("");
          setOpenDropdown(null);
        },
      },
      ...HOTEL_ROOM_OPTIONS.map((opt) => ({
        label: opt.label,
        active: roomType === opt.id,
        onClick: () => {
          if (setRoomType) setRoomType(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else if (activeCategory === "BNB") {
    slot1Label = roomType ? formatRoomTypeLabel(roomType) : "Space Type";
    slot1IsActive = Boolean(roomType);
    slot1Header = "BNB Space Type";
    slot1Options = [
      {
        label: "All Space Types",
        active: !roomType,
        onClick: () => {
          if (setRoomType) setRoomType("");
          setOpenDropdown(null);
        },
      },
      ...BNB_SPACE_OPTIONS.map((opt) => ({
        label: opt.label,
        active: roomType === opt.id,
        onClick: () => {
          if (setRoomType) setRoomType(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else {
    // FLAT or ALL
    slot1Label = minBedrooms > 0 ? `${minBedrooms}+ BHK / Beds` : "Bedrooms";
    slot1IsActive = minBedrooms > 0;
    slot1Header = "Bedrooms / Capacity";
    slot1Options = [
      { label: "Any Bedrooms", val: 0 },
      { label: "1+ BHK / Bed", val: 1 },
      { label: "2+ BHK / Beds", val: 2 },
      { label: "3+ BHK / Beds", val: 3 },
      { label: "4+ BHK / Beds", val: 4 },
    ].map((b) => ({
      label: b.label,
      active: minBedrooms === b.val,
      onClick: () => {
        setMinBedrooms(b.val);
        setOpenDropdown(null);
      },
    }));
  }

  // Slot 2
  let slot2Label = "Furnishing";
  let slot2IsActive = furnished !== undefined;
  let slot2Header = "Furnishing Status";
  let slot2Options: { label: string; active: boolean; onClick: () => void }[] = [];

  if (activeCategory === "PG") {
    slot2Label = genderCategory ? formatGenderLabel(genderCategory) : "Gender";
    slot2IsActive = Boolean(genderCategory);
    slot2Header = "Tenant Preference";
    slot2Options = [
      {
        label: "All Tenants",
        active: !genderCategory,
        onClick: () => {
          if (setGenderCategory) setGenderCategory("");
          setOpenDropdown(null);
        },
      },
      ...GENDER_OPTIONS.map((opt) => ({
        label: opt.label,
        active: genderCategory === opt.id,
        onClick: () => {
          if (setGenderCategory) setGenderCategory(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else if (activeCategory === "HOSTEL") {
    slot2Label = genderCategory ? formatGenderLabel(genderCategory) : "Hostel Audience";
    slot2IsActive = Boolean(genderCategory);
    slot2Header = "Audience / Gender";
    slot2Options = [
      {
        label: "All Hostels",
        active: !genderCategory,
        onClick: () => {
          if (setGenderCategory) setGenderCategory("");
          setOpenDropdown(null);
        },
      },
      ...GENDER_OPTIONS.map((opt) => ({
        label: opt.label,
        active: genderCategory === opt.id,
        onClick: () => {
          if (setGenderCategory) setGenderCategory(opt.id);
          setOpenDropdown(null);
        },
      })),
    ];
  } else if (activeCategory === "HOTEL" || activeCategory === "BNB") {
    slot2Label = maxGuests && maxGuests > 0 ? `${maxGuests}+ Guests` : "Guests";
    slot2IsActive = Boolean(maxGuests && maxGuests > 0);
    slot2Header = "Guest Capacity";
    const guestCounts = activeCategory === "BNB" ? [0, 1, 2, 4, 6] : [0, 1, 2, 3, 4];
    slot2Options = guestCounts.map((g) => ({
      label: g === 0 ? "Any Guests" : `${g}+ Guest${g > 1 ? "s" : ""}`,
      active: maxGuests === g,
      onClick: () => {
        if (setMaxGuests) setMaxGuests(g);
        setOpenDropdown(null);
      },
    }));
  } else {
    // FLAT or ALL
    slot2Label = furnished === true ? "Furnished" : furnished === false ? "Unfurnished" : "Furnishing";
    slot2IsActive = furnished !== undefined;
    slot2Header = "Furnishing Status";
    slot2Options = [
      { label: "Any Status", val: undefined },
      { label: "Fully Furnished", val: true },
      { label: "Unfurnished", val: false },
    ].map((f) => ({
      label: f.label,
      active: furnished === f.val,
      onClick: () => {
        setFurnished(f.val);
        setOpenDropdown(null);
      },
    }));
  }

  return (
    <div
      ref={barContainerRef}
      className="sticky top-[68px] z-[30] bg-surface/98 backdrop-blur-md border-b border-border shadow-subtle py-2.5 px-4 sm:px-6 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Left Side: Horizontal Scrollable Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-0.5 scroll-smooth max-w-full shrink-0">
          <button
            type="button"
            onClick={() => setPropertyType("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 shrink-0 cursor-pointer focus-ring ${
              activeCategory === "ALL" || activeCategory === ""
                ? "bg-[#111716] text-white font-semibold shadow-subtle"
                : "bg-surface border border-border text-foreground/80 hover:border-foreground/30 hover:bg-surface-muted/60 font-medium"
            }`}
          >
            All Stays
          </button>
          {ACCOMMODATION_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPropertyType(cat.id.toLowerCase())}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 shrink-0 flex items-center gap-1.5 cursor-pointer focus-ring ${
                  isActive
                    ? "bg-[#111716] text-white font-semibold shadow-subtle"
                    : "bg-surface border border-border text-foreground/80 hover:border-foreground/30 hover:bg-surface-muted/60 font-medium"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Quick Dropdown Filters & Sorting */}
        <div className="flex items-center flex-wrap gap-2 shrink-0 pt-1 xl:pt-0 relative overflow-visible">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("location")}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                city
                  ? "border-primary/50 bg-primary/10 text-primary-dark font-semibold shadow-2xs"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <MapPinIcon className={`w-3.5 h-3.5 shrink-0 ${city ? "text-primary-dark" : "text-muted"}`} />
              <span>{city || "All NCR Cities"}</span>
              {city && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "location" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "location" && (
              <div
                ref={activePopoverRef}
                className="absolute left-0 mt-2 w-56 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
              >
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1">
                  Delhi NCR Region
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCity("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                    !city
                      ? "bg-primary/10 text-primary-dark font-semibold"
                      : "hover:bg-surface-muted text-foreground font-medium"
                  }`}
                >
                  <span>All Delhi NCR</span>
                  {!city && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                </button>
                {SUPPORTED_LOCATIONS.map((loc) => {
                  const isSelected = city.toLowerCase() === loc.name.toLowerCase();
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setCity(loc.name);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary-dark font-semibold"
                          : "hover:bg-surface-muted text-foreground font-medium"
                      }`}
                    >
                      <span>{loc.name}</span>
                      {isSelected && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Price Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("price")}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                isPriceActive
                  ? "border-primary/50 bg-primary/10 text-primary-dark font-semibold shadow-2xs"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{priceTriggerLabel}</span>
              {isPriceActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "price" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "price" && (
              <div
                ref={activePopoverRef}
                className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-4 z-[50] animate-in fade-in zoom-in-95"
              >
                <div className="text-xs font-semibold text-foreground mb-2 flex justify-between items-center">
                  <span>Maximum Budget</span>
                  <span className="text-primary-dark font-bold text-sm">
                    {maxPrice >= 60000 ? "Any Budget (₹60k+)" : `Under ₹${maxPrice.toLocaleString()}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={desktopPriceIndex}
                  onChange={(e) => setMaxPrice(DESKTOP_PRICE_POINTS[Number(e.target.value)])}
                  className="w-full accent-primary cursor-pointer focus-ring rounded"
                  aria-label="Maximum budget slider"
                />
                <div className="flex justify-between text-[11px] text-muted font-medium mt-1">
                  <span>₹1,000</span>
                  <span>₹60,000+</span>
                </div>
                <div className="mt-3.5">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                    Quick Presets
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[2500, 5000, 10000, 20000, 40000].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (setMinPrice && minPrice && minPrice >= p) {
                            setMinPrice(0);
                          }
                          setMaxPrice(p);
                          setOpenDropdown(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium text-center cursor-pointer focus-ring transition-colors ${
                          maxPrice === p && (!minPrice || minPrice === 0)
                            ? "bg-[#111716] text-white border-[#111716] font-semibold"
                            : "border-border hover:bg-surface-muted text-foreground"
                        }`}
                      >
                        Under ₹{p.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (setMinPrice) setMinPrice(0);
                        setMaxPrice(60000);
                        setOpenDropdown(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium text-center cursor-pointer focus-ring transition-colors ${
                        maxPrice >= 60000 && (!minPrice || minPrice === 0)
                          ? "bg-[#111716] text-white border-[#111716] font-semibold"
                          : "border-border hover:bg-surface-muted text-foreground"
                      }`}
                    >
                      Any Budget
                    </button>
                  </div>
                </div>
                {isPriceActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (setMinPrice) setMinPrice(0);
                      setMaxPrice(60000);
                      setOpenDropdown(null);
                    }}
                    className="mt-3 w-full text-center py-1.5 rounded-lg text-xs font-semibold text-primary hover:underline border border-border/80 hover:bg-surface-muted transition-colors cursor-pointer focus-ring"
                  >
                    Reset Budget (₹60,000+)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Category-Adaptive Filter Slot 1 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("slot1")}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                slot1IsActive
                  ? "border-primary/50 bg-primary/10 text-primary-dark font-semibold shadow-2xs"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{slot1Label}</span>
              {slot1IsActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "slot1" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "slot1" && (
              <div
                ref={activePopoverRef}
                className="absolute left-0 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
              >
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1">
                  {slot1Header}
                </div>
                {slot1Options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={opt.onClick}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                      opt.active
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.active && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category-Adaptive Filter Slot 2 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("slot2")}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                slot2IsActive
                  ? "border-primary/50 bg-primary/10 text-primary-dark font-semibold shadow-2xs"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{slot2Label}</span>
              {slot2IsActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "slot2" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "slot2" && (
              <div
                ref={activePopoverRef}
                className="absolute left-0 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
              >
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1">
                  {slot2Header}
                </div>
                {slot2Options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={opt.onClick}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                      opt.active
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.active && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stay Model Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("stayType")}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                stayType
                  ? "border-primary/50 bg-primary/10 text-primary-dark font-semibold shadow-2xs"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{stayType ? stayType.charAt(0).toUpperCase() + stayType.slice(1) : "Stay Duration"}</span>
              {stayType && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "stayType" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "stayType" && (
              <div
                ref={activePopoverRef}
                className="absolute left-0 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
              >
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1">
                  Booking Model
                </div>
                {[
                  { label: "All Models", val: "" },
                  { label: "Daily Stay", val: "daily" },
                  { label: "Monthly Stay", val: "monthly" },
                  { label: "Hourly Stay", val: "hourly" },
                ].map((st) => {
                  const isSelected = stayType === st.val;
                  return (
                    <button
                      key={st.val}
                      type="button"
                      onClick={() => {
                        setStayType(st.val);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary-dark font-semibold"
                          : "hover:bg-surface-muted text-foreground font-medium"
                      }`}
                    >
                      <span>{st.label}</span>
                      {isSelected && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort By Dropdown */}
          {setSortBy && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("sort")}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                  sortBy && sortBy !== "relevance"
                    ? "border-[#111716] bg-[#111716] text-white font-semibold shadow-2xs"
                    : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
                }`}
              >
                <span className="text-muted">Sort:</span>
                <span>{activeSortLabel}</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    sortBy && sortBy !== "relevance" ? "text-white/80" : "text-muted"
                  } ${openDropdown === "sort" ? "rotate-180" : ""}`}
                />
              </button>
              {openDropdown === "sort" && (
                <div
                  ref={activePopoverRef}
                  className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
                >
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1">
                    Sort Listings
                  </div>
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary-dark font-semibold"
                            : "hover:bg-surface-muted text-foreground font-medium"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <CheckIcon className="w-3.5 h-3.5 text-primary-dark" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-muted text-muted hover:text-foreground hover:bg-border/60 border border-border transition-all flex items-center gap-1 shrink-0 cursor-pointer focus-ring"
              title="Reset all filters to defaults"
            >
              <CloseIcon className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
