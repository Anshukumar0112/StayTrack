"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCities, searchWithAi } from "@/lib/api";
import { LocationArea } from "@/types/user";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";
import { ArrowRightIcon, MapPinIcon, SearchIcon, SparklesIcon } from "@/components/ui/Icons";

export default function HeroSearch() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<"standard" | "ai">("standard");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<LocationArea[]>([]);
  const [propertyType, setPropertyType] = useState("all");
  const [stayType, setStayType] = useState("daily");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    getCities()
      .then((data) => setCities(data || []))
      .catch((err) => console.warn("Could not fetch cities:", err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === "ai" && aiPrompt.trim()) {
      setAiLoading(true);
      searchWithAi({ prompt: aiPrompt })
        .then(() => {
          router.push(`/properties?aiPrompt=${encodeURIComponent(aiPrompt)}`);
        })
        .catch(() => {
          router.push(`/properties?aiPrompt=${encodeURIComponent(aiPrompt)}`);
        })
        .finally(() => setAiLoading(false));
      return;
    }

    const queryParams = new URLSearchParams();
    if (city.trim()) queryParams.set("city", city.trim());
    if (stayType) queryParams.set("stayType", stayType);
    if (propertyType && propertyType !== "all") {
      queryParams.set("category", propertyType);
      queryParams.set("propertyType", propertyType);
    }

    router.push(`/properties?${queryParams.toString()}`);
  };

  return (
    <div className="bg-surface/95 backdrop-blur-md max-w-5xl mx-auto rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 transition-all duration-200">
      {/* Mode Selector Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
        {/* Segmented Control for Stay Types */}
        <div className="flex gap-1 p-1 bg-background rounded-xl border border-border/70 w-fit">
          {[
            { label: "Hourly", value: "hourly" },
            { label: "Daily", value: "daily" },
            { label: "Monthly", value: "monthly" },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setStayType(type.value)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                stayType === type.value
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {type.label} Stay
            </button>
          ))}
        </div>

        {/* Standard Search vs AI Search Mode Selector */}
        <div className="flex gap-1 p-1 bg-background rounded-xl border border-border/70">
          <button
            type="button"
            onClick={() => setSearchMode("standard")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              searchMode === "standard"
                ? "bg-surface text-foreground shadow-xs border border-border/80"
                : "text-muted hover:text-foreground"
            }`}
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Standard</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("ai")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              searchMode === "ai"
                ? "bg-primary text-white shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>AI Search</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch}>
        {searchMode === "standard" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Location Input */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 px-1">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="city-suggestions"
                  placeholder="Delhi, Gurugram, Noida..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold placeholder-muted/60 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-md outline-none transition-all duration-200"
                />
                <MapPinIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none opacity-70" />
              </div>
              <datalist id="city-suggestions">
                {SUPPORTED_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.name} />
                ))}
              </datalist>
            </div>

            {/* Stay Type Display */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 px-1">
                Stay Type
              </label>
              <select
                value={stayType}
                onChange={(e) => setStayType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-foreground bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-md outline-none transition-all duration-200"
              >
                <option value="hourly">Hourly Transit Stay</option>
                <option value="daily">Daily Stay</option>
                <option value="monthly">Monthly Stay</option>
              </select>
            </div>

            {/* Property Type Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 px-1">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-foreground bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-md outline-none transition-all duration-200"
              >
                <option value="all">All Property Types</option>
                {ACCOMMODATION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group cursor-pointer bg-primary hover:bg-primary-dark text-white transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99]"
              >
                <span>Search Stays</span>
                <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-primary-dark uppercase tracking-wider mb-1 px-1">
                AI Stay Assistant
              </label>
              <textarea
                rows={2}
                placeholder="Describe your ideal stay in Delhi NCR (e.g., 'Fully furnished 2BHK flat in Gurugram under ₹30,000 for monthly stay')"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-xs font-medium border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-md outline-none bg-background text-foreground placeholder-muted/70 transition-all duration-200"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={aiLoading}
                className="rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs py-2.5 px-5 shadow-md transition-all duration-200 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>{aiLoading ? "Searching..." : "Find Stays with AI"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
