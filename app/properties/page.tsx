"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyFilterBar, { SORT_OPTIONS } from "@/components/properties/PropertyFilterBar";
import PropertyFilters from "@/components/properties/PropertyFilters";
import PropertyMap from "@/components/properties/PropertyMap";
import MobileSearchHeader from "@/components/properties/MobileSearchHeader";
import {
  ChevronDownIcon,
  CloseIcon,
  CheckIcon,
  MapPinIcon,
  Building2Icon,
  SparklesIcon,
} from "@/components/ui/Icons";
import { searchProperties, searchWithAi, getStayProperties } from "@/lib/api";
import { Property, SearchRequest } from "@/types/property";
import { isSupportedLocation, SUPPORTED_LOCATIONS } from "@/lib/locations";
import {
  getCategoryLabel,
  normalizeCategoryKey,
  getCategoryConfig,
  formatOccupancyLabel,
  formatGenderLabel,
  formatRoomTypeLabel,
} from "@/lib/categories";

function PropertySearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL search parameter extraction
  const cityParam = searchParams.get("city") || searchParams.get("location") || "";
  const areaParam = searchParams.get("area") || "";
  const rawCat = searchParams.get("category") || searchParams.get("propertyType") || "all";
  const categoryParam = rawCat !== "all" ? normalizeCategoryKey(rawCat) : "all";
  const stayTypeParam = searchParams.get("stayType") || "";
  const aiPromptParam = searchParams.get("aiPrompt") || "";
  const minPriceParam = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : 0;
  const maxPriceParam = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : 60000;
  const minBedroomsParam = searchParams.get("minBedrooms")
    ? Number(searchParams.get("minBedrooms"))
    : searchParams.get("bedrooms")
    ? Number(searchParams.get("bedrooms"))
    : 0;
  const furnishedParam =
    searchParams.get("furnished") !== null
      ? searchParams.get("furnished") === "true"
      : undefined;
  const sortByParam = searchParams.get("sortBy") || "relevance";
  const occupancyTypeParam = searchParams.get("occupancyType") || "";
  const genderCategoryParam = searchParams.get("genderCategory") || "";
  const roomTypeParam = searchParams.get("roomType") || "";
  const maxGuestsParam = searchParams.get("maxGuests") ? Number(searchParams.get("maxGuests")) : 0;

  // Derived filter state directly from URL searchParams (single source of truth)
  const city = cityParam;
  const area = areaParam;
  const propertyType = categoryParam;
  const stayType = stayTypeParam;
  const minPrice = minPriceParam;
  const maxPrice = maxPriceParam;
  const minBedrooms = minBedroomsParam;
  const furnished = furnishedParam;
  const sortBy = sortByParam;
  const occupancyType = occupancyTypeParam;
  const genderCategory = genderCategoryParam;
  const roomType = roomTypeParam;
  const maxGuests = maxGuestsParam;

  // Layout & UI states
  const [showMap, setShowMap] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);
  const [showMobileSearchModal, setShowMobileSearchModal] = useState(false);

  // Mobile sorting dropdown state & click-outside listener
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSortDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSortDropdown]);

  // Preserve current listing search URL in sessionStorage so back navigation can restore filtered search state
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const fullSearchPath = window.location.pathname + window.location.search;
        sessionStorage.setItem("staytrack_last_search", fullSearchPath);
      } catch {
        // Safe fallback if sessionStorage is inaccessible
      }
    }
  }, [searchParams]);

  // Search destination modal draft inputs
  const [searchCity, setSearchCity] = useState(city);
  const [searchArea, setSearchArea] = useState(area);
  const [searchStayType, setSearchStayType] = useState(stayType);

  const handleOpenSearchModal = () => {
    setSearchCity(city);
    setSearchArea(area);
    setSearchStayType(stayType);
    setShowMobileSearchModal(true);
  };

  // Lock body scroll when mobile modals are active
  useEffect(() => {
    if (showMobileFilterModal || showMobileSearchModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [showMobileFilterModal, showMobileSearchModal]);

  // URL query updater that preserves history and navigation
  const updateQuery = useCallback(
    (updates: Record<string, string | number | boolean | undefined>) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === "" ||
          val === "all" ||
          (key === "minPrice" && Number(val) <= 0) ||
          (key === "maxPrice" && Number(val) >= 60000) ||
          (key === "minBedrooms" && Number(val) === 0) ||
          (key === "sortBy" && val === "relevance")
        ) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, String(val));
        }
      });
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Handlers for filter controls that synchronize URL query
  const handleCityChange = useCallback((newCity: string) => {
    updateQuery({ city: newCity, area: undefined });
  }, [updateQuery]);

  const handleAreaChange = useCallback((newArea: string) => {
    updateQuery({ area: newArea || undefined });
  }, [updateQuery]);

  const handlePropertyTypeChange = useCallback(
    (newType: string) => {
      updateQuery({
        category: newType !== "all" ? newType : undefined,
        minBedrooms: undefined,
        furnished: undefined,
        occupancyType: undefined,
        genderCategory: undefined,
        roomType: undefined,
        maxGuests: undefined,
      });
    },
    [updateQuery]
  );

  const handleStayTypeChange = useCallback((newStay: string) => {
    updateQuery({ stayType: newStay || undefined });
  }, [updateQuery]);

  const handleMinPriceChange = useCallback((newPrice: number) => {
    updateQuery({ minPrice: newPrice > 0 ? newPrice : undefined });
  }, [updateQuery]);

  const handleMaxPriceChange = useCallback((newPrice: number) => {
    updateQuery({ maxPrice: newPrice < 60000 ? newPrice : undefined });
  }, [updateQuery]);

  const handleMinBedroomsChange = useCallback((newBeds: number) => {
    updateQuery({ minBedrooms: newBeds > 0 ? newBeds : undefined });
  }, [updateQuery]);

  const handleFurnishedChange = useCallback((newFurnished: boolean | undefined) => {
    updateQuery({ furnished: newFurnished });
  }, [updateQuery]);

  const handleOccupancyTypeChange = useCallback((val: string) => {
    updateQuery({ occupancyType: val || undefined });
  }, [updateQuery]);

  const handleGenderCategoryChange = useCallback((val: string) => {
    updateQuery({ genderCategory: val || undefined });
  }, [updateQuery]);

  const handleRoomTypeChange = useCallback((val: string) => {
    updateQuery({ roomType: val || undefined });
  }, [updateQuery]);

  const handleMaxGuestsChange = useCallback((val: number) => {
    updateQuery({ maxGuests: val > 0 ? val : undefined });
  }, [updateQuery]);

  const handleSortChange = useCallback((newSort: string) => {
    updateQuery({ sortBy: newSort !== "relevance" ? newSort : undefined });
  }, [updateQuery]);

  const handleResetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // Perform backend search whenever filter criteria change
  useEffect(() => {
    let isCancelled = false;

    const loadSearch = async () => {
      await Promise.resolve();
      if (isCancelled) return;

      setLoading(true);
      setError("");
      try {
        if (aiPromptParam) {
          const res = await searchWithAi({ prompt: aiPromptParam });
          if (isCancelled) return;
          if (res && Array.isArray(res.properties)) {
            setProperties(res.properties);
          } else if (Array.isArray(res)) {
            setProperties(res);
          } else {
            setProperties([]);
          }
        } else if (
          city ||
          area ||
          (propertyType !== "all" && propertyType !== "") ||
          stayType ||
          minPrice > 0 ||
          maxPrice < 60000 ||
          minBedrooms > 0 ||
          furnished !== undefined ||
          occupancyType ||
          genderCategory ||
          roomType ||
          maxGuests > 0 ||
          (sortBy !== "relevance" && sortBy !== "")
        ) {
          const requestPayload: SearchRequest = {
            city: city || undefined,
            area: area || undefined,
            propertyType: propertyType !== "all" ? propertyType : undefined,
            bookingType: stayType ? stayType.toLowerCase() : undefined,
            minPrice: minPrice > 0 ? minPrice : undefined,
            maxPrice: maxPrice < 60000 ? maxPrice : undefined,
            minBedrooms: minBedrooms > 0 ? minBedrooms : undefined,
            furnished: furnished,
            occupancyType: occupancyType || undefined,
            genderCategory: genderCategory || undefined,
            roomType: roomType || undefined,
            maxGuests: maxGuests > 0 ? maxGuests : undefined,
            sortBy: sortBy !== "relevance" ? sortBy : undefined,
            page: 1,
            pageSize: 50,
          };
          const res = await searchProperties(requestPayload);
          if (isCancelled) return;
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
          if (isCancelled) return;
          const ncrOnly = (Array.isArray(stayStays) ? stayStays : []).filter((s) => isSupportedLocation(s.city));
          setProperties(ncrOnly);
        }
      } catch (err: unknown) {
        console.warn("Search API notice:", err);
        try {
          const stayStays = await getStayProperties();
          if (isCancelled) return;
          const ncrOnly = (Array.isArray(stayStays) ? stayStays : []).filter((s) => isSupportedLocation(s.city));
          setProperties(ncrOnly);
        } catch {
          if (isCancelled) return;
          setProperties([]);
          const message = err instanceof Error ? err.message : "Failed to load properties";
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadSearch();

    return () => {
      isCancelled = true;
    };
  }, [
    city,
    area,
    propertyType,
    stayType,
    minPrice,
    maxPrice,
    minBedrooms,
    furnished,
    occupancyType,
    genderCategory,
    roomType,
    maxGuests,
    sortBy,
    aiPromptParam,
  ]);

  const handleSelectProperty = (id: string) => {
    setHoveredPropertyId(id);
    const cardEl = document.getElementById(`property-card-${id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isUnsupported = city && !isSupportedLocation(city);

  // Active filter chips list for quick dismissal
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (city) {
    activeChips.push({ label: city, onRemove: () => handleCityChange("") });
  }
  if (area) {
    activeChips.push({ label: area, onRemove: () => handleAreaChange("") });
  }
  if (propertyType !== "all" && propertyType !== "") {
    activeChips.push({ label: getCategoryLabel(propertyType), onRemove: () => handlePropertyTypeChange("all") });
  }
  if (stayType) {
    activeChips.push({
      label: `${stayType.charAt(0).toUpperCase() + stayType.slice(1)} Stay`,
      onRemove: () => handleStayTypeChange(""),
    });
  }
  if (minPrice > 0 && maxPrice < 60000) {
    activeChips.push({
      label: `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`,
      onRemove: () => {
        handleMinPriceChange(0);
        handleMaxPriceChange(60000);
      },
    });
  } else if (minPrice > 0) {
    activeChips.push({
      label: `From ₹${minPrice.toLocaleString()}`,
      onRemove: () => handleMinPriceChange(0),
    });
  } else if (maxPrice < 60000) {
    activeChips.push({
      label: `Under ₹${maxPrice.toLocaleString()}`,
      onRemove: () => handleMaxPriceChange(60000),
    });
  }
  if (minBedrooms > 0) {
    activeChips.push({
      label: `${minBedrooms}+ BHK`,
      onRemove: () => handleMinBedroomsChange(0),
    });
  }
  if (furnished !== undefined) {
    activeChips.push({
      label: furnished ? "Fully Furnished" : "Unfurnished",
      onRemove: () => handleFurnishedChange(undefined),
    });
  }
  if (occupancyType) {
    activeChips.push({
      label: formatOccupancyLabel(occupancyType),
      onRemove: () => handleOccupancyTypeChange(""),
    });
  }
  if (genderCategory) {
    activeChips.push({
      label: formatGenderLabel(genderCategory),
      onRemove: () => handleGenderCategoryChange(""),
    });
  }
  if (roomType) {
    activeChips.push({
      label: formatRoomTypeLabel(roomType),
      onRemove: () => handleRoomTypeChange(""),
    });
  }
  if (maxGuests > 0) {
    activeChips.push({
      label: `${maxGuests}+ Guests`,
      onRemove: () => handleMaxGuestsChange(0),
    });
  }
  if (sortBy && sortBy !== "relevance") {
    const sortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || sortBy;
    activeChips.push({
      label: `Sort: ${sortLabel}`,
      onRemove: () => handleSortChange("relevance"),
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-clip">
      <Header />

      {/* Mobile Top Compact Search Bar Pill (< lg) */}
      <MobileSearchHeader
        city={city}
        area={area}
        category={propertyType}
        stayType={stayType}
        minPrice={minPrice}
        maxPrice={maxPrice}
        activeFilterCount={activeChips.length}
        mobileView={mobileView}
        onToggleView={() => setMobileView((prev) => (prev === "list" ? "map" : "list"))}
        onOpenSearch={handleOpenSearchModal}
        onOpenFilters={() => setShowMobileFilterModal(true)}
      />

      {/* Desktop Horizontal Filter Bar (>= lg) */}
      <div className="hidden lg:block">
        <PropertyFilterBar
          city={city}
          setCity={handleCityChange}
          area={area}
          setArea={handleAreaChange}
          stayType={stayType}
          setStayType={handleStayTypeChange}
          propertyType={propertyType}
          setPropertyType={handlePropertyTypeChange}
          minPrice={minPrice}
          setMinPrice={handleMinPriceChange}
          maxPrice={maxPrice}
          setMaxPrice={handleMaxPriceChange}
          minBedrooms={minBedrooms}
          setMinBedrooms={handleMinBedroomsChange}
          furnished={furnished}
          setFurnished={handleFurnishedChange}
          occupancyType={occupancyType}
          setOccupancyType={handleOccupancyTypeChange}
          genderCategory={genderCategory}
          setGenderCategory={handleGenderCategoryChange}
          roomType={roomType}
          setRoomType={handleRoomTypeChange}
          maxGuests={maxGuests}
          setMaxGuests={handleMaxGuestsChange}
          sortBy={sortBy}
          setSortBy={handleSortChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Mobile Dedicated Content View (< lg) */}
      <div className="lg:hidden flex-1 flex flex-col">
        {mobileView === "list" ? (
          <div className="stay-container py-3 pb-24">
            {/* Active Filter Chips Bar */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-[11px] font-semibold text-muted mr-1">Active:</span>
                {activeChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground hover:bg-surface-muted transition-all cursor-pointer"
                  >
                    <span>{chip.label}</span>
                    <CloseIcon className="w-2.5 h-2.5 text-muted hover:text-foreground" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-primary hover:underline ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results Count & Sort Dropdown */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
              <span className="text-xs font-bold text-foreground">
                {loading
                  ? "Searching stays..."
                  : `${properties.length} ${properties.length === 1 ? "stay" : "stays"} ${
                      city ? `in ${city}` : "in Delhi NCR"
                    }`}
              </span>
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowSortDropdown((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted transition-colors cursor-pointer shadow-2xs focus-ring"
                  aria-expanded={showSortDropdown}
                  aria-haspopup="listbox"
                  aria-label="Sort stays"
                >
                  <span className="text-muted text-[11px]">Sort:</span>
                  <span className="font-semibold text-foreground truncate max-w-[110px] sm:max-w-none">
                    {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || "Recommended"}
                  </span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                      showSortDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showSortDropdown && (
                  <div
                    role="listbox"
                    className="absolute right-0 top-full mt-1.5 w-48 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-elevated p-1.5 z-[50] animate-in fade-in zoom-in-95"
                  >
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1 border-b border-border/60 mb-1">
                      Sort Stays
                    </div>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.id || (!sortBy && opt.id === "relevance");
                      return (
                        <button
                          key={opt.id}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => {
                            handleSortChange(opt.id);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary-dark font-bold"
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
            </div>

            {/* Unsupported Location Banner */}
            {isUnsupported ? (
              <div className="py-12 text-center rounded-2xl border border-border bg-surface my-4 p-5">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
                  <MapPinIcon className="w-6 h-6 text-muted" />
                </div>
                <h3 className="text-base font-bold text-foreground mt-3">StayTrack Operates in Delhi NCR Only</h3>
                <p className="text-xs text-muted mt-2 max-w-sm mx-auto leading-relaxed">
                  We do not currently serve <strong className="text-foreground">{city}</strong>. StayTrack is available in Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 rounded-xl bg-[#111716] text-white hover:bg-[#232D2B] px-4 py-2 text-xs font-bold shadow-subtle cursor-pointer transition-all"
                >
                  Explore Delhi NCR Stays
                </button>
              </div>
            ) : loading ? (
              /* Mobile Skeleton Loading List */
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-surface p-3.5 shadow-subtle space-y-3"
                  >
                    <div className="w-full aspect-[16/10] rounded-xl bg-surface-muted animate-pulse" />
                    <div className="space-y-2 pt-1">
                      <div className="h-4 w-3/4 bg-surface-muted rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-surface-muted rounded animate-pulse" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 w-24 bg-surface-muted rounded animate-pulse" />
                        <div className="h-8 w-24 bg-surface-muted rounded-xl animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : properties.length > 0 ? (
              /* Native Responsive Property Card Stream */
              <div className="space-y-4">
                {properties.map((prop, idx) => {
                  const propId = prop.id || (prop as { propertyId?: string }).propertyId || `mobile-prop-${idx}`;
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
              /* Empty Results */
              <div className="py-16 px-4 text-center rounded-2xl border border-border bg-surface">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
                  <Building2Icon className="w-6 h-6 text-muted" />
                </div>
                <h3 className="text-base font-bold text-foreground mt-3">No verified stays match your criteria</h3>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">
                  {error || "Try adjusting your budget, bedroom filters, or selecting a different category across Delhi NCR."}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 rounded-xl bg-[#111716] text-white hover:bg-[#232D2B] px-4 py-2 text-xs font-bold shadow-subtle cursor-pointer transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Mobile Interactive Map View */
          <div className="relative w-full h-[calc(100vh-110px)] overflow-hidden">
            <PropertyMap
              properties={properties}
              activeCity={city}
              hoveredPropertyId={hoveredPropertyId}
              onHoverProperty={setHoveredPropertyId}
              onSelectProperty={handleSelectProperty}
              className="w-full h-full min-h-[400px]"
            />

            {/* Selected Property Preview Floating Card */}
            {hoveredPropertyId && (
              (() => {
                const activeProp = properties.find(
                  (p) => (p.id || (p as { propertyId?: string }).propertyId) === hoveredPropertyId
                );
                if (!activeProp) return null;
                return (
                  <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
                    <div className="relative bg-surface rounded-2xl shadow-floating border border-border p-2">
                      <button
                        type="button"
                        onClick={() => setHoveredPropertyId(null)}
                        className="absolute -top-2.5 -right-2.5 z-40 w-7 h-7 rounded-full bg-[#111716] text-white text-xs font-bold flex items-center justify-center shadow-md cursor-pointer hover:bg-[#232D2B]"
                        aria-label="Close preview"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                      <PropertyCard
                        property={activeProp}
                        isHovered={true}
                        onHover={setHoveredPropertyId}
                        onSelect={handleSelectProperty}
                      />
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Desktop Main Content Layout (>= lg) */}
      <main className="hidden lg:block stay-container-wide py-6 flex-1">
        {/* Header & Dynamic Result Count */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border/70">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {aiPromptParam ? (
                <span className="inline-flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-accent shrink-0" />
                  <span>AI Recommended Stays</span>
                </span>
              ) : propertyType !== "all"
                ? `Discover ${getCategoryLabel(propertyType)} ${city ? `in ${city}` : "in Delhi NCR"}`
                : city
                ? `Verified Stays in ${city}`
                : "Explore Verified Stays across Delhi NCR"}
            </h1>
            <p className="text-xs font-medium text-muted mt-1 leading-relaxed">
              {aiPromptParam
                ? `Matched properties for: "${aiPromptParam}"`
                : propertyType !== "all"
                ? getCategoryConfig(propertyType)?.description || `Curated ${getCategoryLabel(propertyType).toLowerCase()} with authentic host verification`
                : "Curated apartments, student hostels, homestays, and flats across the capital region"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <span className="text-xs font-bold text-[#111716] bg-surface px-3 py-1.5 rounded-xl border border-border shadow-2xs">
              {loading ? "Searching stays..." : `${properties.length} ${properties.length === 1 ? "stay" : "stays"} available`}
            </span>
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-foreground hover:bg-surface-muted transition-colors cursor-pointer focus-ring"
              title={showMap ? "Hide Map split view" : "Show Map split view"}
            >
              <span>{showMap ? "Hide Map" : "Show Map"}</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-[#3F8A68]/15 text-[#3F8A68] border border-[#3F8A68]/30">
              Verified NCR
            </span>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in">
            <span className="text-xs font-semibold text-muted mr-1">Active filters:</span>
            {activeChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-foreground hover:border-[#111716] hover:bg-surface-muted transition-all cursor-pointer focus-ring"
                title={`Remove filter: ${chip.label}`}
              >
                <span>{chip.label}</span>
                <CloseIcon className="w-3 h-3 text-muted hover:text-foreground" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-primary-dark hover:underline ml-1 cursor-pointer focus-ring rounded"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Unsupported Location Warning */}
        {isUnsupported ? (
          <div className="py-16 text-center rounded-2xl border border-border bg-surface my-6 p-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
              <MapPinIcon className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-lg font-bold text-foreground mt-4">StayTrack Currently Operates in Delhi NCR Only</h3>
            <p className="text-xs text-muted mt-2 max-w-md mx-auto leading-relaxed">
              We do not currently serve <strong className="text-foreground font-bold">{city}</strong>. StayTrack is available in Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 rounded-xl bg-[#111716] text-white hover:bg-[#232D2B] px-5 py-2.5 text-xs font-bold shadow-subtle cursor-pointer focus-ring transition-all"
            >
              Explore Delhi NCR Stays
            </button>
          </div>
        ) : (
          /* Desktop Container: Left Column List + Optional Right Column Sticky Map */
          <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start relative">
            {/* Left Property List Column */}
            <div className={`w-full min-w-0 ${showMap ? "lg:flex-1" : "w-full"}`}>
              {loading ? (
                <div
                  className={`grid gap-6 xl:gap-7 ${
                    showMap
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-border bg-surface p-4 shadow-subtle space-y-3"
                    >
                      <div className="w-full aspect-[16/11] rounded-2xl bg-surface-muted animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-4 w-3/4 bg-surface-muted rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-surface-muted rounded animate-pulse" />
                        <div className="flex justify-between items-center pt-2">
                          <div className="h-5 w-24 bg-surface-muted rounded animate-pulse" />
                          <div className="h-8 w-24 bg-surface-muted rounded-xl animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div
                  className={`grid gap-6 xl:gap-7 ${
                    showMap
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                  {properties.map((prop, idx) => {
                    const propId = prop.id || (prop as { propertyId?: string }).propertyId || `prop-item-${idx}`;
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
                <div className="py-20 px-6 text-center rounded-2xl border border-border bg-surface">
                  <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
                    <Building2Icon className="w-7 h-7 text-muted" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-4">No verified stays match your criteria</h3>
                  <p className="text-xs text-muted mt-2 max-w-md mx-auto leading-relaxed">
                    {error || "Try adjusting your budget, bedroom filters, or selecting a different category across Delhi NCR."}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-5 rounded-xl bg-[#111716] text-white hover:bg-[#232D2B] px-5 py-2.5 text-xs font-bold shadow-subtle cursor-pointer focus-ring transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Right Sticky Map Column */}
            {showMap && (
              <div className="w-full lg:w-[42%] xl:w-[40%] shrink-0 lg:sticky lg:top-[128px] lg:h-[calc(100vh-146px)] transition-all duration-300">
                <PropertyMap
                  properties={properties}
                  activeCity={city}
                  hoveredPropertyId={hoveredPropertyId}
                  onHoverProperty={setHoveredPropertyId}
                  onSelectProperty={handleSelectProperty}
                  className="w-full h-full min-h-[450px]"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Filter Modal Sheet */}
      {showMobileFilterModal && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-surface rounded-t-3xl border-t border-border flex flex-col max-h-[88vh] shadow-floating animate-in slide-in-from-bottom duration-300">
            {/* Fixed Sticky Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Filters</h3>
                {activeChips.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111716] text-white">
                    {activeChips.length} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="w-8 h-8 rounded-full bg-surface-muted hover:bg-border text-foreground flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Filter Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <PropertyFilters
                city={city}
                setCity={handleCityChange}
                area={area}
                setArea={handleAreaChange}
                stayType={stayType}
                setStayType={handleStayTypeChange}
                propertyType={propertyType}
                setPropertyType={handlePropertyTypeChange}
                minPrice={minPrice}
                setMinPrice={handleMinPriceChange}
                maxPrice={maxPrice}
                setMaxPrice={handleMaxPriceChange}
                minBedrooms={minBedrooms}
                setMinBedrooms={handleMinBedroomsChange}
                furnished={furnished}
                setFurnished={handleFurnishedChange}
                occupancyType={occupancyType}
                setOccupancyType={handleOccupancyTypeChange}
                genderCategory={genderCategory}
                setGenderCategory={handleGenderCategoryChange}
                roomType={roomType}
                setRoomType={handleRoomTypeChange}
                maxGuests={maxGuests}
                setMaxGuests={handleMaxGuestsChange}
                onReset={handleResetFilters}
                hideHeader
                className="border-0 shadow-none p-0 bg-transparent"
              />
            </div>

            {/* Fixed Sticky Footer with Reset & Show Results */}
            <div className="px-5 py-3.5 border-t border-border bg-surface shrink-0 flex items-center gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-3 rounded-xl border border-border text-xs font-bold text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#111716] hover:bg-[#232D2B] text-white text-xs font-bold text-center cursor-pointer shadow-subtle transition-all active:scale-[0.99]"
              >
                Show {properties.length} {properties.length === 1 ? "Stay" : "Stays"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Destination Search Modal Sheet */}
      {showMobileSearchModal && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-surface rounded-t-3xl border-t border-border flex flex-col max-h-[88vh] shadow-floating animate-in slide-in-from-bottom duration-300">
            {/* Fixed Sticky Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Where to in Delhi NCR?</h3>
                <p className="text-[11px] text-muted">Select destination hub or locality</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileSearchModal(false)}
                className="w-8 h-8 rounded-full bg-surface-muted hover:bg-border text-foreground flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Search Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Locality Search Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Locality or Area
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchArea}
                    onChange={(e) => setSearchArea(e.target.value)}
                    placeholder="e.g. Saket, Cyber City, Sector 62, Indirapuram..."
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {searchArea && (
                    <button
                      type="button"
                      onClick={() => setSearchArea("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground p-1 cursor-pointer"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Delhi NCR Quick Hubs */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                    NCR Cities & Hubs
                  </label>
                  {searchCity && (
                    <button
                      type="button"
                      onClick={() => setSearchCity("")}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Clear city
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSearchCity("")}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      !searchCity
                        ? "bg-[#111716] text-white font-semibold shadow-2xs"
                        : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    All NCR
                  </button>
                  {SUPPORTED_LOCATIONS.map((loc) => {
                    const isSel = searchCity?.toLowerCase() === loc.name.toLowerCase();
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setSearchCity(isSel ? "" : loc.name)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSel
                            ? "bg-[#111716] text-white font-semibold shadow-2xs"
                            : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stay Model / Duration */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Stay Type / Model
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "", label: "Any Stay Duration" },
                    { id: "daily", label: "Daily Stay (Nightly)" },
                    { id: "monthly", label: "Monthly Stay" },
                    { id: "student", label: "Student Accommodation" },
                    { id: "coliving", label: "Co-Living Space" },
                  ].map((item) => {
                    const isSel = (searchStayType || "").toLowerCase() === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSearchStayType(item.id)}
                        className={`px-3 py-2 rounded-xl text-xs text-left truncate transition-all cursor-pointer ${
                          isSel
                            ? "bg-[#111716] text-white font-semibold shadow-2xs"
                            : "bg-surface border border-border text-foreground hover:bg-surface-muted font-medium"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fixed Sticky Footer */}
            <div className="px-5 py-3.5 border-t border-border bg-surface shrink-0 flex items-center gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setSearchCity("");
                  setSearchArea("");
                  setSearchStayType("");
                }}
                className="px-4 py-3 rounded-xl border border-border text-xs font-bold text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  updateQuery({
                    city: searchCity || undefined,
                    area: searchArea || undefined,
                    stayType: searchStayType || undefined,
                  });
                  setShowMobileSearchModal(false);
                }}
                className="flex-1 py-3 rounded-xl bg-[#111716] hover:bg-[#232D2B] text-white text-xs font-bold text-center cursor-pointer shadow-subtle transition-all active:scale-[0.99]"
              >
                Search Stays ({properties.length})
              </button>
            </div>
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

