"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCities, searchWithAi } from "@/lib/api";
import { LocationArea } from "@/types/user";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";

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
    if (propertyType && propertyType !== "all") queryParams.set("propertyType", propertyType);

    router.push(`/properties?${queryParams.toString()}`);
  };

  return (
    <div className="glass-card max-w-4xl mx-auto rounded-3xl p-4 sm:p-6 shadow-xl border border-zinc-200">
      {/* Mode Selector */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200 w-fit">
          {[
            { label: "Hourly", value: "hourly" },
            { label: "Daily", value: "daily" },
            { label: "Monthly", value: "monthly" },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setStayType(type.value)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                stayType === type.value
                  ? "bg-black text-white shadow-md"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              {type.label} Stay
            </button>
          ))}
        </div>

        <div className="flex gap-2 p-1 bg-zinc-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => setSearchMode("standard")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              searchMode === "standard"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-600"
            }`}
          >
            🔍 Standard Search
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("ai")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              searchMode === "ai"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-700 hover:text-black"
            }`}
          >
            ✨ AI Search
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch}>
        {searchMode === "standard" ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 px-1">
                City / Location (Delhi NCR)
              </label>
              <input
                type="text"
                list="city-suggestions"
                placeholder="Search Delhi NCR (e.g. Delhi, Gurugram, Noida)..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-semibold placeholder-zinc-400"
              />
              <datalist id="city-suggestions">
                {SUPPORTED_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 px-1">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-semibold text-zinc-900"
              >
                <option value="all">All Categories</option>
                <option value="Flat">Homes & Flats</option>
                <option value="PG">PGs & Hostels</option>
                <option value="Room">Private Rooms</option>
                <option value="Hotel">Hotels & BNBs</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="glass-button w-full py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>SEARCH</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 px-1">
                AI Stay Assistant
              </label>
              <textarea
                rows={2}
                placeholder="Describe your ideal stay in Delhi NCR (e.g., 'Fully furnished 2BHK flat in Gurugram under ₹30,000 for monthly stay')"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-emerald-50/30 text-zinc-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={aiLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-6 shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <span>{aiLoading ? "Searching AI..." : "✨ Find Stays with AI"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
