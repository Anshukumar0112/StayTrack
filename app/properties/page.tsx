"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyFilterBar from "@/components/properties/PropertyFilterBar";
import PropertyMap from "@/components/properties/PropertyMap";
import MobileSearchHeader from "@/components/properties/MobileSearchHeader";
import MobileBottomSheet from "@/components/properties/MobileBottomSheet";
import GlassCard from "@/components/ui/GlassCard";
import { searchProperties, searchWithAi, getStayProperties } from "@/lib/api";
import { Property, SearchRequest } from "@/types/property";
import { isSupportedLocation } from "@/lib/locations";
import { getCategoryLabel, normalizeCategoryKey, getCategoryConfig } from "@/lib/categories";

function PropertySearchContent() {
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city") || searchParams.get("location") || "";
  const areaParam = searchParams.get("area") || "";
  const rawCat = searchParams.get("category") || searchParams.get("propertyType") || "all";
  const categoryParam = rawCat !== "all" ? normalizeCategoryKey(rawCat) : "all";
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

  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mobileSheetState, setMobileSheetState] = useState<"collapsed" | "expanded" | "map">("collapsed");
  const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);

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
          pageSize: 50,
        };
        const res = await searchProperties(requestPayload);
        if (res && Array.isArray(res.results)) {
          setProperties(res.results);
        } else if (res && Array.isArray(res.content)) {
          setProperties(res.content);
        } else if (Array.isArray(res)) {
          setProperties(res);
        } else {
          setProperties([]);
        }
      } else {
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

  const handleSelectProperty = (id: string) => {
    setHoveredPropertyId(id);
    const cardEl = document.getElementById(`property-card-${id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isUnsupported = city && !isSupportedLocation(city);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <Header />

      {/* Mobile Top Compact Search Bar Pill (< lg) */}
      <MobileSearchHeader
        city={city}
        area={area}
        category={propertyType}
        stayType={stayType}
        maxPrice={maxPrice}
        onOpenFilters={() => setShowMobileFilterModal(true)}
      />

      {/* Desktop Horizontal Filter Bar (>= lg) */}
      <div className="hidden lg:block">
        <PropertyFilterBar
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

      {/* Mobile Full Viewport Interactive Map Background (< lg) */}
      <div className="lg:hidden relative w-full h-[calc(100vh-140px)] z-10">
        <PropertyMap
          properties={properties}
          activeCity={city}
          hoveredPropertyId={hoveredPropertyId}
          onHoverProperty={setHoveredPropertyId}
          onSelectProperty={handleSelectProperty}
          className="w-full h-full min-h-[400px]"
        />
      </div>

      {/* Desktop Main Content Layout (>= lg) */}
      <main className="hidden lg:block w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Header & Dynamic Result Count */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {aiPromptParam
                ? "✨ AI Recommended Stays"
                : propertyType !== "all"
                ? `Discover ${getCategoryLabel(propertyType)} ${city ? `in ${city}` : "in Delhi NCR"}`
                : city
                ? `Stays in ${city}`
                : "Explore Stays in Delhi NCR"}
            </h1>
            <p className="text-xs font-semibold text-muted mt-1">
              {aiPromptParam
                ? `Matched properties for: "${aiPromptParam}"`
                : propertyType !== "all"
                ? getCategoryConfig(propertyType)?.description || `Verified ${getCategoryLabel(propertyType).toLowerCase()} across Delhi NCR`
                : "Explore verified accommodations, hostels, BNBs, and flats across Delhi NCR"}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs font-bold text-[#111716] bg-surface px-3 py-1.5 rounded-xl border border-border/80 shadow-xs">
              {loading ? "Searching stays..." : `${properties.length} ${properties.length === 1 ? "stay" : "stays"} available`}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-[#3F8A68]/15 text-[#3F8A68] border border-[#3F8A68]/30">
              Verified Marketplace
            </span>
          </div>
        </div>

        {/* Unsupported Location Warning */}
        {isUnsupported ? (
          <GlassCard className="py-16 text-center border border-border bg-warning/10 my-6">
            <span className="text-5xl">📍</span>
            <h3 className="text-lg font-bold text-foreground mt-4">StayTrack Currently Operates in Delhi NCR Only</h3>
            <p className="text-xs text-muted mt-2 max-w-md mx-auto leading-relaxed">
              We do not currently serve <strong className="text-foreground font-bold">{city}</strong>. StayTrack is available in Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-5 rounded-xl bg-primary text-white hover:bg-primary-dark px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
            >
              Explore Delhi NCR Stays
            </button>
          </GlassCard>
        ) : (
          /* Desktop Split View Container: Left Column (60%) List + Right Column (40%) Sticky Map */
          <div className="flex flex-col lg:flex-row gap-6 items-start relative">
            {/* Left Property List Column */}
            <div className="w-full lg:w-[58%] xl:w-[60%] flex-1">
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-80 rounded-2xl bg-surface animate-pulse border border-border" />
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {properties.map((prop, idx) => {
                    const propId = prop.id || (prop as any).propertyId || `prop-item-${idx}`;
                    return (
                      <PropertyCard
                        key={propId}
                        property={prop}
                        isHovered={hoveredPropertyId === propId}
                        onHover={setHoveredPropertyId}
                        onSelect={handleSelectProperty}
                      />
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="py-20 text-center border border-border bg-surface">
                  <span className="text-5xl">🏡</span>
                  <h3 className="text-lg font-bold text-foreground mt-4">No verified stays match your criteria</h3>
                  <p className="text-xs text-muted mt-2 max-w-md mx-auto">
                    Try adjusting your budget, bedroom filters, or selecting a different category across Delhi NCR.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-5 rounded-xl bg-primary text-white hover:bg-[#111716] px-5 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </GlassCard>
              )}
            </div>

            {/* Right Sticky Map Column */}
            <div className="w-full lg:w-[42%] xl:w-[40%] lg:sticky lg:top-[140px] lg:h-[calc(100vh-170px)]">
              <PropertyMap
                properties={properties}
                activeCity={city}
                hoveredPropertyId={hoveredPropertyId}
                onHoverProperty={setHoveredPropertyId}
                onSelectProperty={handleSelectProperty}
                className="w-full h-full min-h-[450px]"
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Draggable Bottom Results Sheet (< lg) */}
      <MobileBottomSheet
        properties={properties}
        selectedPropertyId={hoveredPropertyId}
        onSelectProperty={handleSelectProperty}
        onHoverProperty={setHoveredPropertyId}
        loading={loading}
        sheetState={mobileSheetState}
        setSheetState={setMobileSheetState}
        cityName={city}
        onResetFilters={handleResetFilters}
      />

      {/* Mobile Filter Modal Sheet */}
      {showMobileFilterModal && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-surface rounded-t-3xl border-t border-border p-6 max-h-[85vh] overflow-y-auto space-y-6 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h3 className="text-sm font-black text-foreground">Filter & Refine Stays</h3>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="text-xs font-bold text-muted hover:text-foreground"
              >
                ✕ Close
              </button>
            </div>

            {/* Filter Options Controls */}
            <PropertyFilterBar
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

            <button
              type="button"
              onClick={() => setShowMobileFilterModal(false)}
              className="w-full py-3.5 rounded-2xl bg-[#111716] text-white text-xs font-bold text-center cursor-pointer shadow-md"
            >
              Apply Filters ({properties.length} stays)
            </button>
          </div>
        </div>
      )}

      <Footer />
      <MobileNav />
    </div>
  );
}

export default function PropertySearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-muted">Loading Marketplace...</div>}>
      <PropertySearchContent />
    </Suspense>
  );
}
