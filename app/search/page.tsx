"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyCard from "@/components/property/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";
import { searchProperties, searchWithAi } from "@/lib/api";
import { Property, SearchRequest } from "@/lib/types";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location") || "";
  const categoryParam = searchParams.get("propertyType") || "all";
  const stayTypeParam = searchParams.get("stayType") || "";
  const aiPromptParam = searchParams.get("aiPrompt") || "";

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [maxPrice, setMaxPrice] = useState(40000);
  const [stayType, setStayType] = useState(stayTypeParam);
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [aiPrompt, setAiPrompt] = useState(aiPromptParam);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mockFallback = [
    {
      id: "p1",
      title: "Cozy 1BHK Serviced Apartment",
      location: "Indiranagar 100ft Road",
      category: "Flat",
      price: 2800,
      rating: 4.9,
      stayType: "night",
    },
    {
      id: "p2",
      title: "Student Single Room PG (AC)",
      location: "Koramangala 5th Block",
      category: "PG",
      price: 9000,
      rating: 4.8,
      stayType: "month",
    },
    {
      id: "p3",
      title: "Transit Hourly Studio Suite",
      location: "Near Airport Road",
      category: "Room",
      price: 550,
      rating: 4.75,
      stayType: "hour",
    },
    {
      id: "p4",
      title: "Grand Boutique Hotel Deluxe Room",
      location: "MG Road Commercial Area",
      category: "Hotel",
      price: 4200,
      rating: 4.92,
      stayType: "night",
    },
  ];

  const fetchSearchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (aiPromptParam) {
        const res = await searchWithAi({ prompt: aiPromptParam });
        if (res && Array.isArray(res.properties)) {
          setProperties(res.properties);
        } else if (Array.isArray(res)) {
          setProperties(res);
        }
      } else {
        const requestPayload: SearchRequest = {
          city: locationParam || undefined,
          propertyType: selectedCategory !== "all" ? selectedCategory : undefined,
          bookingType: stayType ? stayType.toLowerCase() : undefined,
          maxPrice: maxPrice,
          minBedrooms: minBedrooms > 0 ? minBedrooms : undefined,
          page: 1,
          pageSize: 20,
        };
        const res = await searchProperties(requestPayload);
        if (res && Array.isArray(res.content)) {
          setProperties(res.content);
        } else if (Array.isArray(res)) {
          setProperties(res);
        } else {
          setProperties([]);
        }
      }
    } catch (err: any) {
      console.warn("Search fetch failed, using fallback display:", err);
      setError(err.message || "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchData();
  }, [selectedCategory, maxPrice, stayType, minBedrooms, aiPromptParam, locationParam]);

  const displayProperties = properties.length > 0
    ? properties.map((p) => ({
        id: p.id,
        title: p.title,
        location: `${p.area || ""}, ${p.city || "Bangalore"}`,
        category: p.propertyType || "Flat",
        price: p.pricePerNight || p.pricePerMonth || p.pricePerHour || p.price || 2000,
        rating: p.rating || 4.8,
        stayType: p.bookingType === "monthly" ? "month" : p.bookingType === "hourly" ? "hour" : "night",
      }))
    : mockFallback.filter((prop) => {
        if (selectedCategory !== "all" && prop.category !== selectedCategory) return false;
        if (prop.price > maxPrice) return false;
        return true;
      });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">
              {aiPromptParam ? "✨ AI Recommended Stays" : "Search Accommodation"}
            </h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              {aiPromptParam
                ? `Matched results for prompt: "${aiPromptParam}"`
                : "Filter by price, category, bedrooms, and stay model without brokerage"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Side Filter Panel */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="border border-zinc-200">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200">
                Filter Options
              </h3>

              {/* Category */}
              <div className="space-y-2 mb-6">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Category
                </label>
                {["all", "Flat", "PG", "Room", "Hotel"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-black text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>

              {/* Stay Type */}
              <div className="space-y-2 mb-6">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Stay Model
                </label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-xl">
                  {["Daily", "Monthly", "Hourly"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStayType(stayType === st ? "" : st)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        stayType === st ? "bg-black text-white" : "text-zinc-600"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Max Price
                  </label>
                  <span className="text-xs font-bold text-black">₹{maxPrice}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="60000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-black bg-zinc-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Bedrooms filter */}
              <div className="space-y-2 mb-6">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Min Bedrooms
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMinBedrooms(num)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                        minBedrooms === num
                          ? "bg-black text-white border-black"
                          : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {num === 0 ? "Any" : `${num}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filter Button */}
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setMaxPrice(60000);
                  setStayType("");
                  setMinBedrooms(0);
                }}
                className="w-full py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </GlassCard>
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex justify-between items-center text-xs text-zinc-500 font-semibold">
              <span>Showing {displayProperties.length} verified stays</span>
              <span className="clay-badge px-3 py-1 font-bold">₹0 Brokerage</span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs font-bold text-zinc-500">
                Searching verified stays...
              </div>
            ) : displayProperties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayProperties.map((prop) => (
                  <PropertyCard key={prop.id} {...prop} />
                ))}
              </div>
            ) : (
              <GlassCard className="py-16 text-center border border-zinc-200">
                <span className="text-4xl">🔍</span>
                <h3 className="text-lg font-bold text-zinc-950 mt-4">No stays match your criteria</h3>
                <p className="text-xs text-zinc-500 mt-2">Try adjusting the max price slider or selecting another category.</p>
              </GlassCard>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-zinc-500">Loading Search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

