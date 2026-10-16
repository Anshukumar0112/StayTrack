"use client";

import GlassCard from "@/components/ui/GlassCard";
import { ACCOMMODATION_CATEGORIES, normalizeCategoryKey } from "@/lib/categories";

interface PropertyFiltersProps {
  city: string;
  setCity: (c: string) => void;
  area: string;
  setArea: (a: string) => void;
  stayType: string;
  setStayType: (st: string) => void;
  propertyType: string;
  setPropertyType: (pt: string) => void;
  maxPrice: number;
  setMaxPrice: (p: number) => void;
  minBedrooms: number;
  setMinBedrooms: (b: number) => void;
  furnished: boolean | undefined;
  setFurnished: (f: boolean | undefined) => void;
  onReset: () => void;
  className?: string;
  hideHeader?: boolean;
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
  maxPrice,
  setMaxPrice,
  minBedrooms,
  setMinBedrooms,
  furnished,
  setFurnished,
  onReset,
  className = "",
  hideHeader = false,
}: PropertyFiltersProps) {
  return (
    <GlassCard className={`border border-border ${className}`}>
      {!hideHeader && (
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
          Filter Stays
        </h3>
      )}

      {/* City */}
      <div className="space-y-1 mb-5">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          City
        </label>
        <input
          type="text"
          placeholder="e.g. Delhi, Gurugram, Noida"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm font-normal bg-surface border border-border text-foreground placeholder:text-muted/60 focus-ring"
        />
      </div>

      {/* Area */}
      <div className="space-y-1 mb-5">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          Area / Locality
        </label>
        <input
          type="text"
          placeholder="e.g. Cyber City, Sector 62, Connaught Place"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm font-normal bg-surface border border-border text-foreground placeholder:text-muted/60 focus-ring"
        />
      </div>

      {/* Property Category */}
      <div className="space-y-1.5 mb-5">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          Property Type
        </label>
        {[
          { id: "all", label: "All Categories" },
          ...ACCOMMODATION_CATEGORIES,
        ].map((cat) => {
          const isSelected =
            cat.id === "all"
              ? propertyType === "all" || !propertyType
              : normalizeCategoryKey(propertyType) === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setPropertyType(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer focus-ring ${
                isSelected
                  ? "bg-[#111716] text-white font-semibold shadow-subtle"
                  : "text-foreground hover:bg-surface-muted font-medium"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Stay Model */}
      <div className="space-y-2 mb-5">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          Stay Model
        </label>
        <div className="grid grid-cols-3 gap-1 bg-surface-muted p-1 rounded-lg border border-border">
          {[
            { label: "Daily", value: "daily" },
            { label: "Monthly", value: "monthly" },
            { label: "Hourly", value: "hourly" },
          ].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStayType(stayType === st.value ? "" : st.value)}
              className={`py-1.5 text-xs rounded-md transition-all cursor-pointer focus-ring ${
                stayType === st.value ? "bg-surface text-foreground font-semibold shadow-2xs" : "text-muted hover:text-foreground font-medium"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max Price Slider */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-foreground uppercase tracking-wider">
            Max Price
          </label>
          <span className="text-xs font-semibold text-foreground">₹{maxPrice.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="500"
          max="60000"
          step="500"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-primary bg-border rounded-lg cursor-pointer focus-ring"
        />
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2 mb-5">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          Min Bedrooms
        </label>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setMinBedrooms(num)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-all cursor-pointer focus-ring ${
                minBedrooms === num
                  ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-subtle"
                  : "border-border text-foreground hover:bg-surface-muted font-medium"
              }`}
            >
              {num === 0 ? "Any" : `${num}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Furnished Status */}
      <div className="space-y-2 mb-6">
        <label className="block text-xs font-medium text-foreground uppercase tracking-wider">
          Furnished Status
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFurnished(furnished === true ? undefined : true)}
            className={`flex-1 py-1.5 text-xs rounded-lg border cursor-pointer focus-ring transition-colors ${
              furnished === true ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-subtle" : "border-border text-foreground hover:bg-surface-muted font-medium"
            }`}
          >
            Furnished
          </button>
          <button
            type="button"
            onClick={() => setFurnished(furnished === false ? undefined : false)}
            className={`flex-1 py-1.5 text-xs rounded-lg border cursor-pointer focus-ring transition-colors ${
              furnished === false ? "bg-[#111716] text-white border-[#111716] font-semibold shadow-subtle" : "border-border text-foreground hover:bg-surface-muted font-medium"
            }`}
          >
            Unfurnished
          </button>
        </div>
      </div>

      {/* Reset Filter Button */}
      <button
        onClick={onReset}
        className="w-full py-2.5 rounded-lg border border-border bg-surface text-xs font-medium text-muted hover:text-foreground hover:bg-surface-muted transition-all cursor-pointer focus-ring"
      >
        Reset All Filters
      </button>
    </GlassCard>
  );
}
