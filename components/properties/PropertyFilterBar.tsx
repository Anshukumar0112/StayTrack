"use client";

import React, { useState, useRef, useEffect } from "react";
import { ACCOMMODATION_CATEGORIES, normalizeCategoryKey } from "@/lib/categories";
import { FilterIcon, CloseIcon, MapPinIcon } from "@/components/ui/Icons";
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
  setArea,
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="sticky top-[72px] z-30 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs py-3 px-4 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Horizontal Scrollable Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-0.5 scroll-smooth max-w-full">
          <button
            type="button"
            onClick={() => setPropertyType("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer ${
              activeCategory === "ALL" || activeCategory === ""
                ? "bg-[#111716] text-white shadow-xs"
                : "bg-surface border border-border text-foreground/80 hover:border-[#111716] hover:bg-surface/80"
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-[#111716] text-white shadow-xs"
                    : "bg-surface border border-border text-foreground/80 hover:border-[#111716] hover:bg-surface/80"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Quick Dropdown Filters */}
        <div ref={dropdownRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x shrink-0 pt-1 md:pt-0 max-w-full">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("location")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                city
                  ? "border-[#3F8A68] bg-[#3F8A68]/10 text-[#3F8A68]"
                  : "border-border bg-surface text-foreground/80 hover:border-border/80"
              }`}
            >
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{city || "City"}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {openDropdown === "location" && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-extrabold text-muted uppercase px-2 py-1">Select City</div>
                <button
                  onClick={() => {
                    setCity("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                    !city ? "bg-primary/10 text-primary font-bold" : "hover:bg-background text-foreground"
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      city.toLowerCase() === loc.name.toLowerCase()
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-background text-foreground"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                maxPrice < 60000
                  ? "border-[#3F8A68] bg-[#3F8A68]/10 text-[#3F8A68]"
                  : "border-border bg-surface text-foreground/80 hover:border-border/80"
              }`}
            >
              <span>{maxPrice < 60000 ? `Max ₹${maxPrice.toLocaleString()}` : "Price"}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {openDropdown === "price" && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold text-foreground mb-2 flex justify-between">
                  <span>Max Budget</span>
                  <span className="text-primary font-black">₹{maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={60000}
                  step={1000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted font-semibold mt-1">
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
                      className="px-2 py-1 rounded-lg border border-border text-[11px] font-semibold hover:bg-background text-center"
                    >
                      Under ₹{p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bedrooms Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("bedrooms")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                minBedrooms > 0
                  ? "border-[#3F8A68] bg-[#3F8A68]/10 text-[#3F8A68]"
                  : "border-border bg-surface text-foreground/80 hover:border-border/80"
              }`}
            >
              <span>{minBedrooms > 0 ? `${minBedrooms}+ BHK` : "Bedrooms"}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {openDropdown === "bedrooms" && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-extrabold text-muted uppercase px-2 py-1">Bedrooms</div>
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      minBedrooms === b.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-background text-foreground"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                furnished !== undefined
                  ? "border-[#3F8A68] bg-[#3F8A68]/10 text-[#3F8A68]"
                  : "border-border bg-surface text-foreground/80 hover:border-border/80"
              }`}
            >
              <span>{furnished === true ? "Furnished" : furnished === false ? "Unfurnished" : "Furnishing"}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {openDropdown === "furnished" && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-surface border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-extrabold text-muted uppercase px-2 py-1">Furnishing Status</div>
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      furnished === f.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-background text-foreground"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                stayType
                  ? "border-[#3F8A68] bg-[#3F8A68]/10 text-[#3F8A68]"
                  : "border-border bg-surface text-foreground/80 hover:border-border/80"
              }`}
            >
              <span>{stayType ? stayType.charAt(0).toUpperCase() + stayType.slice(1) : "Stay Duration"}</span>
              <span className="text-[10px]">▼</span>
            </button>
            {openDropdown === "stayType" && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-surface border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-extrabold text-muted uppercase px-2 py-1">Booking Model</div>
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      stayType === st.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-background text-foreground"
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
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20 border border-border/60 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <CloseIcon className="w-3.0 h-3.0" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
