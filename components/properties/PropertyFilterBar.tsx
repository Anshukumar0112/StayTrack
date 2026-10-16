"use client";

import React, { useState, useRef, useEffect } from "react";
import { ACCOMMODATION_CATEGORIES, normalizeCategoryKey } from "@/lib/categories";
import { CloseIcon, MapPinIcon, ChevronDownIcon } from "@/components/ui/Icons";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";

interface PropertyFilterBarProps {
  city: string;
  setCity: (city: string) => void;
  area: string;
  setArea: (area: string) => void;
  stayType: string;
  setStayType: (stayType: string) => void;
  propertyType: string;
  setPropertyType: (category: string) => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  minBedrooms: number;
  setMinBedrooms: (beds: number) => void;
  furnished: boolean | undefined;
  setFurnished: (furnished: boolean | undefined) => void;
  onReset: () => void;
}

export default function PropertyFilterBar({
  city,
  setCity,
  area,
  stayType,
  setStayType,
  propertyType,
  setPropertyType,
  maxPrice,
  setMaxPrice,
  minBedrooms,
  setMinBedrooms,
  furnished,
  setFurnished,
  onReset,
}: PropertyFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = propertyType ? normalizeCategoryKey(propertyType) : "ALL";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const hasActiveFilters =
    city !== "" ||
    area !== "" ||
    propertyType !== "all" ||
    stayType !== "" ||
    maxPrice < 60000 ||
    minBedrooms > 0 ||
    furnished !== undefined;

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <div className="sticky top-[68px] z-[30] bg-surface/98 backdrop-blur-md border-b border-border shadow-subtle py-3 px-4 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Horizontal Scrollable Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-0.5 scroll-smooth max-w-full">
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

        {/* Right Side: Quick Dropdown Filters */}
        <div ref={dropdownRef} className="flex items-center gap-2 shrink-0 pt-1 md:pt-0 relative overflow-visible">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("location")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                city
                  ? "border-primary/40 bg-primary/10 text-primary-dark font-semibold"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
              <span>{city || "City"}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "location" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "location" && (
              <div className="absolute left-0 mt-2 w-52 rounded-xl bg-surface border border-border shadow-elevated p-2 z-[50] animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2.5 py-1">
                  Select City
                </div>
                <button
                  onClick={() => {
                    setCity("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus-ring ${
                    !city
                      ? "bg-primary/10 text-primary-dark font-semibold"
                      : "hover:bg-surface-muted text-foreground font-medium"
                  }`}
                >
                  All Delhi NCR
                </button>
                {SUPPORTED_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setCity(loc.name);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus-ring ${
                      city.toLowerCase() === loc.name.toLowerCase()
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("price")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                maxPrice < 60000
                  ? "border-primary/40 bg-primary/10 text-primary-dark font-semibold"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{maxPrice < 60000 ? `Max ₹${maxPrice.toLocaleString()}` : "Price"}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "price" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "price" && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-surface border border-border shadow-elevated p-4 z-[50] animate-in fade-in zoom-in-95">
                <div className="text-xs font-semibold text-foreground mb-2 flex justify-between items-center">
                  <span>Max Budget</span>
                  <span className="text-primary-dark font-semibold text-sm">₹{maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={60000}
                  step={1000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer focus-ring rounded"
                />
                <div className="flex justify-between text-xs text-muted font-normal mt-1">
                  <span>₹1,000</span>
                  <span>₹60,000+</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {[3000, 5000, 15000, 30000].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setMaxPrice(p);
                        setOpenDropdown(null);
                      }}
                      className="px-2 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-surface-muted text-foreground text-center cursor-pointer focus-ring transition-colors"
                    >
                      Under ₹{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                {maxPrice < 60000 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMaxPrice(60000);
                      setOpenDropdown(null);
                    }}
                    className="mt-2.5 w-full text-center py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-surface-muted border border-border transition-colors cursor-pointer focus-ring"
                  >
                    Clear Budget Cap (₹60,000+)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bedrooms Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("bedrooms")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                minBedrooms > 0
                  ? "border-primary/40 bg-primary/10 text-primary-dark font-semibold"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{minBedrooms > 0 ? `${minBedrooms}+ BHK` : "Bedrooms"}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "bedrooms" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "bedrooms" && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-border shadow-elevated p-2 z-[50] animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2.5 py-1">Bedrooms</div>
                {[
                  { label: "Any Bedrooms", val: 0 },
                  { label: "1+ BHK", val: 1 },
                  { label: "2+ BHK", val: 2 },
                  { label: "3+ BHK", val: 3 },
                ].map((b) => (
                  <button
                    key={b.val}
                    onClick={() => {
                      setMinBedrooms(b.val);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus-ring ${
                      minBedrooms === b.val
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Furnished Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("furnished")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                furnished !== undefined
                  ? "border-primary/40 bg-primary/10 text-primary-dark font-semibold"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{furnished === true ? "Furnished" : furnished === false ? "Unfurnished" : "Furnishing"}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "furnished" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "furnished" && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-border shadow-elevated p-2 z-[50] animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2.5 py-1">Furnishing Status</div>
                {[
                  { label: "Any Status", val: undefined },
                  { label: "Fully Furnished", val: true },
                  { label: "Unfurnished", val: false },
                ].map((f, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFurnished(f.val);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus-ring ${
                      furnished === f.val
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    {f.label}
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
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 cursor-pointer focus-ring ${
                stayType
                  ? "border-primary/40 bg-primary/10 text-primary-dark font-semibold"
                  : "border-border bg-surface text-foreground/80 hover:border-border-hover hover:bg-surface-muted/40 font-medium"
              }`}
            >
              <span>{stayType ? stayType.charAt(0).toUpperCase() + stayType.slice(1) : "Stay Duration"}</span>
              <ChevronDownIcon
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                  openDropdown === "stayType" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "stayType" && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-border shadow-elevated p-2 z-[50] animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2.5 py-1">Booking Model</div>
                {[
                  { label: "All Models", val: "" },
                  { label: "Daily Stay", val: "daily" },
                  { label: "Monthly Stay", val: "monthly" },
                  { label: "Hourly Stay", val: "hourly" },
                ].map((st) => (
                  <button
                    key={st.val}
                    onClick={() => {
                      setStayType(st.val);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer focus-ring ${
                      stayType === st.val
                        ? "bg-primary/10 text-primary-dark font-semibold"
                        : "hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-muted text-muted hover:text-foreground hover:bg-surface-muted/80 border border-border transition-all flex items-center gap-1 shrink-0 cursor-pointer focus-ring"
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
