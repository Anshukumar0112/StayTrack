"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { searchWithAi } from "@/lib/api";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES, getCategoryLabel } from "@/lib/categories";
import {
  BankIcon,
  Building2Icon,
  CalendarDaysIcon,
  CloseIcon,
  CompassIcon,
  HousePlusIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
  UserRoundIcon,
} from "@/components/ui/Icons";

export default function HeroSearch() {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const desktopBarRef = useRef<HTMLDivElement>(null);
  const whereBtnRef = useRef<HTMLButtonElement>(null);
  const whenBtnRef = useRef<HTMLButtonElement>(null);
  const stayTypeBtnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Portal mount state via useSyncExternalStore for hydration-safe rendering
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Search Mode & Active Panel State
  const [searchMode, setSearchMode] = useState<"standard" | "ai">("standard");
  const [activePanel, setActivePanel] = useState<"where" | "when" | "stayType" | null>(null);

  // Computed Viewport Position for Floating Popup
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Search Filter Criteria
  const [city, setCity] = useState("");
  const [whereFilter, setWhereFilter] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [stayType, setStayType] = useState<"daily" | "hourly" | "monthly">("daily");

  // Date/Time States
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [hourlyDate, setHourlyDate] = useState("");
  const [hourlyTime, setHourlyTime] = useState("10:00");
  const [hourlyDuration, setHourlyDuration] = useState("4");
  const [monthlyMoveIn, setMonthlyMoveIn] = useState("");
  const [monthlyDuration, setMonthlyDuration] = useState("1");

  // AI & Mobile States
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Calculate viewport coordinates relative to active search field/container
  const computeAndSetPosition = useCallback((panel: "where" | "when" | "stayType") => {
    if (!desktopBarRef.current) return;
    const barRect = desktopBarRef.current.getBoundingClientRect();
    const top = barRect.bottom + 8;
    const viewportWidth = window.innerWidth;

    if (panel === "where") {
      const fieldRect = whereBtnRef.current?.getBoundingClientRect() || barRect;
      let left = fieldRect.left;
      if (left + 420 > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - 436);
      }
      setPopupPos({ top, left: Math.max(16, left), width: 420 });
    } else if (panel === "when") {
      const fieldRect = whenBtnRef.current?.getBoundingClientRect() || barRect;
      let left = fieldRect.left + fieldRect.width / 2 - 240;
      if (left + 480 > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - 496);
      }
      setPopupPos({ top, left: Math.max(16, left), width: 480 });
    } else if (panel === "stayType") {
      const fieldRect = stayTypeBtnRef.current?.getBoundingClientRect() || barRect;
      let left = fieldRect.right - 380;
      if (left < 16) left = 16;
      if (left + 380 > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - 396);
      }
      setPopupPos({ top, left: Math.max(16, left), width: 380 });
    }
  }, []);

  // Open or toggle active panel while computing position synchronously
  const openPanel = useCallback(
    (panel: "where" | "when" | "stayType") => {
      setActivePanel((current) => {
        if (current === panel) {
          return null;
        }
        computeAndSetPosition(panel);
        return panel;
      });
    },
    [computeAndSetPosition]
  );

  // Switch search mode and ensure all popovers are immediately closed
  const handleModeChange = useCallback((mode: "standard" | "ai") => {
    setActivePanel(null);
    setSearchMode(mode);
  }, []);

  // Position synchronization, responsive resize, and scroll dismissal
  useEffect(() => {
    if (!activePanel) return;

    computeAndSetPosition(activePanel);

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setActivePanel(null);
      } else {
        computeAndSetPosition(activePanel);
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      // Allow internal scrolling inside the popover itself (e.g. destinations list)
      if (popupRef.current && target && (popupRef.current === target || popupRef.current.contains(target))) {
        return;
      }
      // If the page or an outside container scrolled, dismiss the popover promptly
      setActivePanel(null);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [activePanel, computeAndSetPosition]);

  // Click outside & Escape key handling
  useEffect(() => {
    if (!activePanel) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInsideBar = desktopBarRef.current?.contains(target);
      const isInsidePopup = popupRef.current?.contains(target);

      if (!isInsideBar && !isInsidePopup) {
        setActivePanel(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanel(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePanel]);

  const handleSelectNearby = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setCity("Delhi");
          openPanel("when");
        },
        () => {
          setCity("Delhi NCR");
          openPanel("when");
        }
      );
    } else {
      setCity("Delhi NCR");
      openPanel("when");
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActivePanel(null);
    setMobileSearchOpen(false);

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
    if (stayType === "daily" && checkIn) queryParams.set("checkIn", checkIn);
    if (stayType === "daily" && checkOut) queryParams.set("checkOut", checkOut);
    if (stayType === "hourly" && hourlyDate) queryParams.set("checkIn", hourlyDate);
    if (stayType === "monthly" && monthlyMoveIn) queryParams.set("checkIn", monthlyMoveIn);

    router.push(`/properties?${queryParams.toString()}`);
  };

  // Filtered location suggestions based on user input inside panel
  const filteredLocations = SUPPORTED_LOCATIONS.filter(
    (loc) =>
      !whereFilter.trim() ||
      loc.name.toLowerCase().includes(whereFilter.toLowerCase()) ||
      loc.landmark.toLowerCase().includes(whereFilter.toLowerCase())
  );

  // Helper formatting for main bar display values
  const getWhenLabel = () => {
    if (stayType === "hourly") {
      return hourlyDate ? `${hourlyDate} • ${hourlyDuration} hrs` : "Select time & hours";
    }
    if (stayType === "monthly") {
      return monthlyMoveIn ? `${monthlyMoveIn} • ${monthlyDuration} mo` : "Select move-in date";
    }
    if (checkIn && checkOut) return `${checkIn} - ${checkOut}`;
    if (checkIn) return `From ${checkIn}`;
    return "Add dates";
  };

  const getCategoryDisplayLabel = () => {
    if (propertyType === "all") return "Any property";
    return getCategoryLabel(propertyType);
  };

  return (
    <div ref={searchContainerRef} className="max-w-4xl mx-auto w-full relative z-30 px-2 sm:px-0">
      {/* Search Mode Toggle (Standard Search vs AI Search) */}
      <div className="flex justify-center mb-4 sm:mb-5">
        <div className="inline-flex gap-1 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/15 shadow-subtle select-none">
          <button
            type="button"
            onClick={() => handleModeChange("standard")}
            className={`px-4 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer focus-ring ${
              searchMode === "standard"
                ? "bg-white text-[#111716] shadow-2xs font-semibold"
                : "text-white/75 hover:text-white font-medium"
            }`}
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Standard Search</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("ai")}
            className={`px-4 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer focus-ring ${
              searchMode === "ai"
                ? "bg-primary text-white shadow-2xs font-semibold"
                : "text-white/75 hover:text-white font-medium"
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>AI Search</span>
          </button>
        </div>
      </div>

      {searchMode === "ai" ? (
        /* AI Search Bar — Compact horizontal search bar matching simple search bar size */
        <div className="relative border border-border bg-surface rounded-2xl shadow-subtle p-2 flex items-center transition-all duration-300">
          <div className="flex-1 flex items-center gap-3 px-4 py-2 overflow-hidden">
            <SparklesIcon className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              placeholder="Describe your ideal stay in Delhi NCR (e.g. 'Furnished 2BHK in Gurugram under ₹35,000')..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              autoFocus
              className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted/60 focus:outline-none truncate"
            />
            {aiPrompt && (
              <button
                type="button"
                onClick={() => setAiPrompt("")}
                className="text-muted hover:text-foreground cursor-pointer p-1 rounded-md transition-colors shrink-0"
                aria-label="Clear AI prompt"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AI Search Submit Button */}
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={aiLoading}
            className="ml-2 bg-[#111716] hover:bg-[#232D2B] text-white rounded-xl px-7 py-3 font-semibold text-sm flex items-center gap-2 shadow-subtle hover:shadow-elevated transition-all duration-200 cursor-pointer shrink-0 group focus-ring select-none disabled:opacity-50"
          >
            <SparklesIcon className="w-4 h-4 text-primary-light" />
            <span>{aiLoading ? "Searching..." : "Find with AI"}</span>
          </button>
        </div>
      ) : (
        /* Standard Connected Expandable Search Bar */
        <>
          {/* Mobile Search Button (< md screens) */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setMobileSearchOpen(true);
              }}
              className="w-full bg-surface border border-border rounded-xl p-2.5 sm:p-3 shadow-subtle flex items-center justify-between text-left transition-all active:scale-[0.99] focus-ring min-h-[52px]"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <SearchIcon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {city || "Where are you staying?"}
                  </div>
                  <div className="text-xs font-normal text-muted truncate">
                    {getWhenLabel()} • {getCategoryDisplayLabel()}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-white bg-[#111716] px-4 py-2 rounded-lg shrink-0 shadow-2xs">
                Search
              </span>
            </button>
          </div>

          {/* Desktop Connected Search Bar Container (md+ screens) */}
          <div className="hidden md:block relative">
            <div
              ref={desktopBarRef}
              className="relative border border-border bg-surface rounded-2xl shadow-subtle p-2 flex items-center transition-all duration-300"
            >
              {/* WHERE Section */}
              <button
                ref={whereBtnRef}
                type="button"
                onClick={() => openPanel("where")}
                aria-expanded={activePanel === "where"}
                aria-haspopup="dialog"
                aria-controls="hero-search-popover"
                className={`flex-[1.2] flex items-center gap-3 px-5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative z-10 focus-ring ${
                  activePanel === "where"
                    ? "bg-surface shadow-subtle border border-border ring-2 ring-primary/20 scale-[1.005] text-foreground"
                    : "hover:bg-surface-muted/60 text-foreground"
                }`}
              >
                <MapPinIcon className="w-4 h-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-dark leading-tight">
                    WHERE
                  </span>
                  <span className="block text-sm font-semibold text-foreground truncate leading-snug">
                    {city || <span className="font-normal text-muted">Search destinations</span>}
                  </span>
                </div>
              </button>

              {/* Separator 1 */}
              <div className={`h-8 w-px bg-border/60 transition-opacity duration-200 ${activePanel === "where" || activePanel === "when" ? "opacity-0" : "opacity-100"}`} />

              {/* WHEN Section */}
              <button
                ref={whenBtnRef}
                type="button"
                onClick={() => openPanel("when")}
                aria-expanded={activePanel === "when"}
                aria-haspopup="dialog"
                aria-controls="hero-search-popover"
                className={`flex-1 flex items-center gap-3 px-5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative z-10 focus-ring ${
                  activePanel === "when"
                    ? "bg-surface shadow-subtle border border-border ring-2 ring-primary/20 scale-[1.005] text-foreground"
                    : "hover:bg-surface-muted/60 text-foreground"
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-dark leading-tight">
                    WHEN ({stayType.toUpperCase()})
                  </span>
                  <span className="block text-sm font-semibold text-foreground truncate leading-snug">
                    {getWhenLabel()}
                  </span>
                </div>
              </button>

              {/* Separator 2 */}
              <div className={`h-8 w-px bg-border/60 transition-opacity duration-200 ${activePanel === "when" || activePanel === "stayType" ? "opacity-0" : "opacity-100"}`} />

              {/* STAY TYPE Section */}
              <button
                ref={stayTypeBtnRef}
                type="button"
                onClick={() => openPanel("stayType")}
                aria-expanded={activePanel === "stayType"}
                aria-haspopup="dialog"
                aria-controls="hero-search-popover"
                className={`flex-1 flex items-center gap-3 px-5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative z-10 focus-ring ${
                  activePanel === "stayType"
                    ? "bg-surface shadow-subtle border border-border ring-2 ring-primary/20 scale-[1.005] text-foreground"
                    : "hover:bg-surface-muted/60 text-foreground"
                }`}
              >
                <Building2Icon className="w-4 h-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-dark leading-tight">
                    STAY TYPE
                  </span>
                  <span className="block text-sm font-semibold text-foreground truncate leading-snug">
                    {getCategoryDisplayLabel()}
                  </span>
                </div>
              </button>

              {/* Search Submit Button */}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="ml-2 bg-[#111716] hover:bg-[#232D2B] text-white rounded-xl px-7 py-3 font-semibold text-sm flex items-center gap-2 shadow-subtle hover:shadow-elevated transition-all duration-200 cursor-pointer shrink-0 group focus-ring select-none"
              >
                <SearchIcon className="w-4 h-4 group-hover:scale-105 transition-transform" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* PORTAL MOUNTED FLOATING ACTIVE SEARCH POPUP */}
      {mounted && searchMode === "standard" && activePanel && popupPos && createPortal(
        <div
          ref={popupRef}
          id="hero-search-popover"
          role="dialog"
          aria-modal="false"
          aria-label={
            activePanel === "where"
              ? "Search location and destinations"
              : activePanel === "when"
              ? "Choose stay dates and booking model"
              : "Choose property and accommodation type"
          }
          style={{
            position: "fixed",
            top: `${popupPos.top}px`,
            left: `${popupPos.left}px`,
            width: `${popupPos.width}px`,
            zIndex: 50,
            backgroundColor: "#ffffff",
            color: "#111716",
          }}
          className="border border-border shadow-floating rounded-2xl p-5 text-foreground bg-surface animate-in fade-in duration-150"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. WHERE / LOCATION PANEL */}
          {activePanel === "where" && (
            <div>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search city or landmark..."
                  value={whereFilter}
                  onChange={(e) => setWhereFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filteredLocations.length > 0) {
                        setCity(filteredLocations[0].name);
                        openPanel("when");
                      }
                    }
                  }}
                  autoFocus
                  className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm font-normal bg-surface border border-border text-foreground focus-ring outline-none"
                />
                <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {whereFilter && (
                  <button
                    type="button"
                    onClick={() => setWhereFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer focus-ring rounded"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                {/* Nearby Option */}
                <button
                  type="button"
                  onClick={handleSelectNearby}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-muted transition-colors text-left cursor-pointer group border border-transparent hover:border-border focus-ring"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CompassIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Nearby</div>
                    <div className="text-xs font-normal text-muted">Find stays around you</div>
                  </div>
                </button>

                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1 pt-2 pb-1">
                  Suggested Destinations (Delhi NCR)
                </div>

                {filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setCity(loc.name);
                      openPanel("when");
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer group border focus-ring ${
                      city.toLowerCase() === loc.name.toLowerCase()
                        ? "bg-primary/10 border-primary/30 shadow-2xs"
                        : "border-transparent bg-surface hover:bg-surface-muted hover:border-border"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-muted shrink-0 group-hover:text-primary transition-colors">
                      <MapPinIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground flex items-center justify-between">
                        <span>{loc.name}</span>
                        <span className="text-xs text-muted font-normal">{loc.state}</span>
                      </div>
                      <div className="text-xs font-normal text-muted truncate">
                        {loc.landmark}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. WHEN / DATE & STAY TYPE PANEL */}
          {activePanel === "when" && (
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="text-sm font-semibold text-foreground">Booking Model</div>
                <div className="flex gap-1 p-1 bg-surface-muted rounded-xl border border-border">
                  {(["daily", "hourly", "monthly"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStayType(mode)}
                      className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer focus-ring ${
                        stayType === mode
                          ? "bg-surface text-foreground font-semibold shadow-2xs"
                          : "text-muted hover:text-foreground font-medium"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {stayType === "daily" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Check-out Date
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        min={checkIn || undefined}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {stayType === "hourly" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Stay Date
                      </label>
                      <input
                        type="date"
                        value={hourlyDate}
                        onChange={(e) => setHourlyDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Start Time
                      </label>
                      <select
                        value={hourlyTime}
                        onChange={(e) => setHourlyTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      >
                        {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Duration
                      </label>
                      <select
                        value={hourlyDuration}
                        onChange={(e) => setHourlyDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      >
                        <option value="2">2 Hours</option>
                        <option value="4">4 Hours</option>
                        <option value="6">6 Hours</option>
                        <option value="12">12 Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {stayType === "monthly" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Move-in Date
                      </label>
                      <input
                        type="date"
                        value={monthlyMoveIn}
                        onChange={(e) => setMonthlyMoveIn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Duration
                      </label>
                      <select
                        value={monthlyDuration}
                        onChange={(e) => setMonthlyDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
                      >
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => openPanel("stayType")}
                  className="px-4 py-2 bg-[#111716] hover:bg-[#232D2B] text-white text-xs font-medium rounded-lg transition-all cursor-pointer focus-ring"
                >
                  Next: Property Type →
                </button>
              </div>
            </div>
          )}

          {/* 3. STAY TYPE / PROPERTY CATEGORY PANEL */}
          {activePanel === "stayType" && (
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">What are you looking for?</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPropertyType("all");
                    setActivePanel(null);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer focus-ring ${
                    propertyType === "all"
                      ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                      : "border-border bg-surface hover:border-border-hover text-foreground/80"
                  }`}
                >
                  <Building2Icon className="w-4 h-4 text-primary" />
                  <span>Any property</span>
                </button>

                {ACCOMMODATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setPropertyType(cat.id);
                      setActivePanel(null);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer focus-ring ${
                      propertyType === cat.id
                        ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                        : "border-border bg-surface hover:border-border-hover text-foreground/80"
                    }`}
                  >
                    {cat.id === "BNB" && <HousePlusIcon className="w-4 h-4 text-primary" />}
                    {cat.id === "HOSTEL" && <UserRoundIcon className="w-4 h-4 text-primary" />}
                    {cat.id === "PG" && <Building2Icon className="w-4 h-4 text-primary" />}
                    {cat.id === "HOTEL" && <BankIcon className="w-4 h-4 text-primary" />}
                    {cat.id === "FLAT" && <Building2Icon className="w-4 h-4 text-primary" />}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="px-5 py-2.5 bg-[#111716] hover:bg-[#232D2B] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-subtle focus-ring"
                >
                  Apply & Search
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Mobile Search Bottom Sheet / Modal */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200">
          <div className="bg-surface rounded-t-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-border max-h-[85vh] overflow-y-auto space-y-4 z-[70] shadow-floating">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Search Stays
              </h3>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer focus-ring"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Where Mobile */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">Where</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Delhi, Gurugram, Noida..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm font-normal bg-surface border border-border text-foreground focus-ring outline-none"
                />
                <MapPinIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {SUPPORTED_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setCity(loc.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border cursor-pointer focus-ring ${
                      city === loc.name ? "bg-[#111716] text-white border-[#111716] font-semibold" : "bg-surface border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stay Model Mobile */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">Booking Model</label>
              <div className="grid grid-cols-3 gap-2">
                {(["daily", "hourly", "monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStayType(mode)}
                    className={`py-2 text-xs font-medium rounded-lg border cursor-pointer focus-ring ${
                      stayType === mode ? "bg-[#111716] text-white border-[#111716] font-semibold" : "bg-surface border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Type Mobile */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm font-medium bg-surface border border-border text-foreground focus-ring outline-none"
              >
                <option value="all">Any property type</option>
                {ACCOMMODATION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Submit CTA */}
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="w-full py-3 bg-[#111716] hover:bg-[#232D2B] text-white font-semibold text-sm rounded-xl shadow-subtle flex items-center justify-center gap-2 cursor-pointer focus-ring"
            >
              <SearchIcon className="w-4 h-4" />
              <span>Search Stays</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
