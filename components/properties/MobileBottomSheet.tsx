"use client";

import React, { useState } from "react";
import { Property } from "@/types/property";
import PropertyCard from "@/components/properties/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";

interface MobileBottomSheetProps {
  properties: Property[];
  selectedPropertyId?: string | null;
  onSelectProperty?: (id: string) => void;
  onHoverProperty?: (id: string | null) => void;
  loading?: boolean;
  sheetState: "collapsed" | "expanded" | "map";
  setSheetState: (state: "collapsed" | "expanded" | "map") => void;
  cityName?: string;
  onResetFilters?: () => void;
}

export default function MobileBottomSheet({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onHoverProperty,
  loading,
  sheetState,
  setSheetState,
  cityName,
  onResetFilters,
}: MobileBottomSheetProps) {
  const [startY, setStartY] = useState<number | null>(null);

  const selectedProp = properties.find(
    (p) => (p.id || (p as { propertyId?: string }).propertyId) === selectedPropertyId
  ) || properties[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY === null) return;
    const endY = e.changedTouches[0].clientY;
    const diff = startY - endY;

    if (diff > 40) {
      // Swiped Up -> Expand
      if (sheetState === "collapsed") setSheetState("expanded");
      else if (sheetState === "map") setSheetState("collapsed");
    } else if (diff < -40) {
      // Swiped Down -> Collapse
      if (sheetState === "expanded") setSheetState("collapsed");
      else if (sheetState === "collapsed") setSheetState("map");
    }
    setStartY(null);
  };

  const toggleExpand = () => {
    if (sheetState === "expanded") {
      setSheetState("collapsed");
    } else {
      setSheetState("expanded");
    }
  };

  return (
    <>
      {/* Mobile Draggable Bottom Sheet Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`lg:hidden fixed left-0 right-0 z-[35] bg-surface border-t border-border rounded-t-2xl shadow-floating transition-all duration-300 ease-out flex flex-col ${
          sheetState === "expanded"
            ? "top-[130px] bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
            : sheetState === "collapsed"
            ? "h-[290px] bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
            : "h-[140px] bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {/* Drag Handle Bar */}
        <div
          onClick={toggleExpand}
          className="w-full py-2.5 flex flex-col items-center justify-center cursor-pointer shrink-0 select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-border/80 hover:bg-foreground/40 transition-colors" />
          <div className="flex justify-between items-center w-full px-5 mt-2">
            <span className="text-xs font-semibold text-foreground">
              {loading
                ? "Searching stays..."
                : `${properties.length} ${properties.length === 1 ? "stay" : "stays"} ${
                    cityName ? `in ${cityName}` : "available"
                  }`}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="text-xs font-medium text-primary hover:underline cursor-pointer focus-ring rounded"
            >
              {sheetState === "expanded" ? "Collapse Map ↓" : "View List ↑"}
            </button>
          </div>
        </div>

        {/* Content Body Based on Sheet State */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="py-12 text-center text-xs font-medium text-muted animate-pulse">
              Loading verified properties...
            </div>
          ) : properties.length === 0 ? (
            <GlassCard className="py-8 text-center border border-border bg-background">
              <span className="text-3xl">🏡</span>
              <h4 className="text-xs font-semibold text-foreground mt-2">No properties match filters</h4>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#111716] hover:bg-[#232D2B] text-white text-xs font-medium transition-all cursor-pointer focus-ring shadow-subtle"
                >
                  Reset Filters
                </button>
              )}
            </GlassCard>
          ) : sheetState === "expanded" ? (
            /* Vertical Scrollable List Grid */
            <div className="grid gap-4 grid-cols-1 pt-2">
              {properties.map((prop, idx) => {
                const pId = prop.id || (prop as { propertyId?: string }).propertyId || `sheet-prop-${idx}`;
                const isSel = pId === selectedPropertyId;
                return (
                  <PropertyCard
                    key={pId}
                    property={prop}
                    isHovered={isSel}
                    onHover={onHoverProperty}
                    onSelect={onSelectProperty}
                  />
                );
              })}
            </div>
          ) : (
            /* Horizontal Card Carousel or Active Property Preview */
            <div className="pt-1">
              {selectedProp && (
                <div className="max-w-md mx-auto">
                  <PropertyCard
                    property={selectedProp}
                    isHovered={true}
                    onHover={onHoverProperty}
                    onSelect={onSelectProperty}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
