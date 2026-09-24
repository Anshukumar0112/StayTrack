"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyFilters from "@/components/properties/PropertyFilters";
import GlassCard from "@/components/ui/GlassCard";
import { searchProperties, searchWithAi, getStayProperties } from "@/lib/api";
import { Property, SearchRequest } from "@/types/property";
import { isSupportedLocation } from "@/lib/locations";

function PropertySearchContent() {
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city") || searchParams.get("location") || "";
  const areaParam = searchParams.get("area") || "";
  const categoryParam = searchParams.get("propertyType") || "all";
  const stayTypeParam = searchParams.get("stayType") || "";
  const aiPromptParam = searchParams.get("aiPrompt") || "";

  const [city, setCity] = useState(cityParam);
  const [area, setArea] = useState(areaParam);
  const [propertyType, setPropertyType] = useState(categoryParam);
  const [stayType, setStayType] = useState(stayTypeParam);
  const [maxPrice, setMaxPrice] = useState(60000);
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [furnished, setFurnished] = useState<boolean | undefined>(undefined);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        } else {
          setProperties([]);
        }
      } else if (city || area || propertyType !== "all" || stayType || minBedrooms > 0 || furnished !== undefined) {
        const requestPayload: SearchRequest = {
          city: city || undefined,
          area: area || undefined,
          propertyType: propertyType !== "all" ? propertyType : undefined,
          bookingType: stayType ? stayType.toLowerCase() : undefined,
          maxPrice: maxPrice,
          minBedrooms: minBedrooms > 0 ? minBedrooms : undefined,
          furnished: furnished,
          page: 1,
          pageSize: 30,
        };
        const res = await searchProperties(requestPayload);
        if (res && Array.isArray(res.content)) {
          setProperties(res.content);
        } else if (Array.isArray(res)) {
          setProperties(res);
        } else {
          setProperties([]);
        }
      } else {
        // Fetch strictly properties explicitly assigned to Stay section & filter for Delhi NCR scope
        const stayStays = await getStayProperties();
        const ncrOnly = (Array.isArray(stayStays) ? stayStays : []).filter((s) => isSupportedLocation(s.city));
        setProperties(ncrOnly);
      }
    } catch (err: any) {
      console.warn("Search API notice:", err);
      try {
        const stayStays = await getStayProperties();
        const ncrOnly = (Array.isArray(stayStays) ? stayStays : []).filter((s) => isSupportedLocation(s.city));
        setProperties(ncrOnly);
      } catch {
        setProperties([]);
        setError(err.message || "Failed to load properties");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchData();
  }, [city, area, propertyType, stayType, maxPrice, minBedrooms, furnished, aiPromptParam]);

  const handleResetFilters = () => {
    setCity("");
    setArea("");
    setPropertyType("all");
    setStayType("");
    setMaxPrice(60000);
    setMinBedrooms(0);
    setFurnished(undefined);
  };

  const isUnsupported = city && !isSupportedLocation(city);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">
              {aiPromptParam ? "✨ AI Recommended Stays" : "Discover Delhi NCR Stays"}
            </h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              {aiPromptParam
                ? `Matched properties for: "${aiPromptParam}"`
                : "Filter by location, stay model, price slider, and furnished status across Delhi NCR"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Side Filter Panel */}
          <div className="lg:col-span-1">
            <PropertyFilters
              city={city}
              setCity={setCity}
              area={area}
              setArea={setArea}
              stayType={stayType}
              setStayType={setStayType}
              propertyType={propertyType}
              setPropertyType={setPropertyType}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              minBedrooms={minBedrooms}
              setMinBedrooms={setMinBedrooms}
              furnished={furnished}
              setFurnished={setFurnished}
              onReset={handleResetFilters}
            />
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex justify-between items-center text-xs text-zinc-500 font-semibold">
              <span>Showing {properties.length} verified stays</span>
              <span className="clay-badge px-3 py-1 font-extrabold text-[10px] uppercase">
                Delhi NCR • Verified Stays
              </span>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-72 rounded-3xl bg-zinc-100 animate-pulse border border-zinc-200" />
                ))}
              </div>
            ) : isUnsupported ? (
              <GlassCard className="py-16 text-center border border-zinc-200 bg-amber-50/20">
                <span className="text-5xl">📍</span>
                <h3 className="text-lg font-bold text-zinc-950 mt-4">StayTrack Currently Operates in Delhi NCR Only</h3>
                <p className="text-xs text-zinc-600 mt-2 max-w-md mx-auto leading-relaxed">
                  We do not currently serve <strong className="text-black font-bold">{city}</strong>. StayTrack is available in Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad. We're expanding soon!
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold shadow-sm"
                >
                  Explore Delhi NCR Stays
                </button>
              </GlassCard>
            ) : properties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((prop, idx) => (
                  <PropertyCard key={prop.id || (prop as any).propertyId || `prop-item-${idx}`} property={prop} />
                ))}
              </div>
            ) : (
              <GlassCard className="py-16 text-center border border-zinc-200">
                <span className="text-5xl">🏡</span>
                <h3 className="text-lg font-bold text-zinc-950 mt-4">Verified stays are coming soon</h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto">
                  StayTrack is currently onboarding verified properties across Delhi NCR.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold"
                >
                  Reset All Filters
                </button>
              </GlassCard>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

export default function PropertySearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-zinc-500">Loading Stays...</div>}>
      <PropertySearchContent />
    </Suspense>
  );
}
