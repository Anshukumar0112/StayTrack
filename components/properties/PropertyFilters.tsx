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
}: PropertyFiltersProps) {
  return (
    <GlassCard className="border border-border">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
        Filter Stays
      </h3>

      {/* City */}
      <div className="space-y-1 mb-5">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          City
        </label>
        <input
          type="text"
          placeholder="e.g. Delhi, Gurugram, Noida"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold"
        />
      </div>

      {/* Area */}
      <div className="space-y-1 mb-5">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          Area / Locality
        </label>
        <input
          type="text"
          placeholder="e.g. Cyber City, Sector 62, Connaught Place"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold"
        />
      </div>

      {/* Property Category */}
      <div className="space-y-2 mb-5">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
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
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-white"
                  : "text-text hover:bg-primary-light/60 hover:text-primary-dark"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Stay Model */}
      <div className="space-y-2 mb-5">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          Stay Model
        </label>
        <div className="grid grid-cols-3 gap-1 bg-background p-1 rounded-xl border border-border">
          {[
            { label: "Daily", value: "daily" },
            { label: "Monthly", value: "monthly" },
            { label: "Hourly", value: "hourly" },
          ].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStayType(stayType === st.value ? "" : st.value)}
              className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                stayType === st.value ? "bg-primary text-white" : "text-muted hover:text-foreground"
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
          <label className="text-xs font-bold text-text uppercase tracking-wider">
            Max Price
          </label>
          <span className="text-xs font-bold text-foreground">₹{maxPrice.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="500"
          max="60000"
          step="500"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-primary bg-border rounded-lg cursor-pointer"
        />
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2 mb-5">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          Min Bedrooms
        </label>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setMinBedrooms(num)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                minBedrooms === num
                  ? "bg-primary text-white border-primary"
                  : "border-border text-text hover:bg-background"
              }`}
            >
              {num === 0 ? "Any" : `${num}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Furnished Status */}
      <div className="space-y-2 mb-6">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          Furnished Status
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFurnished(furnished === true ? undefined : true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
              furnished === true ? "bg-primary text-white border-primary" : "border-border text-text hover:bg-background"
            }`}
          >
            Furnished
          </button>
          <button
            type="button"
            onClick={() => setFurnished(furnished === false ? undefined : false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
              furnished === false ? "bg-primary text-white border-primary" : "border-border text-text hover:bg-background"
            }`}
          >
            Unfurnished
          </button>
        </div>
      </div>

      {/* Reset Filter Button */}
      <button
        onClick={onReset}
        className="w-full py-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-text hover:bg-background transition-all cursor-pointer"
      >
        Reset All Filters
      </button>
    </GlassCard>
  );
}
