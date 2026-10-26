"use client";

import React, { useEffect } from "react";
import {
  CloseIcon,
  WifiIcon,
  WindIcon,
  TvIcon,
  CarIcon,
  ZapIcon,
  UtensilsIcon,
  CoffeeIcon,
  ShieldCheckIcon,
  BedDoubleIcon,
  BathIcon,
  CheckCircleIcon,
  Building2Icon,
  LockIcon,
} from "@/components/ui/Icons";

interface PropertyAmenitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  amenities: string[];
  propertyName?: string;
}

export function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase();
  if (lower.includes("wifi") || lower.includes("internet") || lower.includes("broadband") || lower.includes("wi-fi") || lower.includes("desk") || lower.includes("workspace")) {
    return <WifiIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("ac") || lower.includes("air condition") || lower.includes("cooling") || lower.includes("air-conditioning")) {
    return <WindIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("tv") || lower.includes("television") || lower.includes("cable") || lower.includes("ott")) {
    return <TvIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("parking") || lower.includes("car") || lower.includes("garage") || lower.includes("vehicle")) {
    return <CarIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("power") || lower.includes("generator") || lower.includes("backup") || lower.includes("geyser") || lower.includes("electricity")) {
    return <ZapIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("kitchen") || lower.includes("cooking") || lower.includes("fridge") || lower.includes("refrigerator") || lower.includes("microwave") || lower.includes("food") || lower.includes("mess") || lower.includes("dining")) {
    return <UtensilsIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("breakfast") || lower.includes("coffee") || lower.includes("tea")) {
    return <CoffeeIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("security") || lower.includes("cctv") || lower.includes("guard") || lower.includes("biometric") || lower.includes("smoke") || lower.includes("alarm") || lower.includes("fire") || lower.includes("safety")) {
    return <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("lock") || lower.includes("keybox") || lower.includes("safe")) {
    return <LockIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("bed") || lower.includes("mattress") || lower.includes("linen") || lower.includes("pillow") || lower.includes("wardrobe")) {
    return <BedDoubleIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("bath") || lower.includes("shower") || lower.includes("washroom") || lower.includes("toilet") || lower.includes("hot water")) {
    return <BathIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (lower.includes("lift") || lower.includes("elevator") || lower.includes("balcony") || lower.includes("terrace")) {
    return <Building2Icon className="w-4 h-4 text-primary shrink-0" />;
  }
  return <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />;
}

interface AmenityCategory {
  title: string;
  items: string[];
}

function categorizeAmenities(amenities: string[]): AmenityCategory[] {
  const living: string[] = [];
  const kitchen: string[] = [];
  const safety: string[] = [];
  const work: string[] = [];
  const facilities: string[] = [];
  const additional: string[] = [];

  for (const item of amenities) {
    const l = item.toLowerCase();
    if (l.includes("wifi") || l.includes("internet") || l.includes("desk") || l.includes("workspace") || l.includes("broadband") || l.includes("power") || l.includes("generator") || l.includes("backup")) {
      work.push(item);
    } else if (l.includes("kitchen") || l.includes("fridge") || l.includes("cooking") || l.includes("microwave") || l.includes("dining") || l.includes("mess") || l.includes("breakfast") || l.includes("coffee") || l.includes("tea")) {
      kitchen.push(item);
    } else if (l.includes("cctv") || l.includes("security") || l.includes("guard") || l.includes("lock") || l.includes("smoke") || l.includes("alarm") || l.includes("fire") || l.includes("first aid") || l.includes("carbon monoxide")) {
      safety.push(item);
    } else if (l.includes("parking") || l.includes("lift") || l.includes("elevator") || l.includes("laundry") || l.includes("washing") || l.includes("housekeeping") || l.includes("gym") || l.includes("pool")) {
      facilities.push(item);
    } else if (l.includes("ac") || l.includes("air condition") || l.includes("tv") || l.includes("bath") || l.includes("shower") || l.includes("geyser") || l.includes("bed") || l.includes("linen") || l.includes("wardrobe") || l.includes("balcony") || l.includes("sofa")) {
      living.push(item);
    } else {
      additional.push(item);
    }
  }

  const result: AmenityCategory[] = [];
  if (living.length > 0) result.push({ title: "Living & Comfort", items: living });
  if (kitchen.length > 0) result.push({ title: "Kitchen & Dining", items: kitchen });
  if (work.length > 0) result.push({ title: "Connectivity & Work", items: work });
  if (safety.length > 0) result.push({ title: "Safety & Security", items: safety });
  if (facilities.length > 0) result.push({ title: "Facilities & Services", items: facilities });
  if (additional.length > 0) result.push({ title: "Additional Features", items: additional });

  return result;
}

export default function PropertyAmenitiesModal({
  isOpen,
  onClose,
  amenities,
  propertyName,
}: PropertyAmenitiesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = categorizeAmenities(amenities);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="amenities-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] bg-surface rounded-3xl border border-border shadow-elevated flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 id="amenities-modal-title" className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
              What this place offers
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {amenities.length} verified amenities {propertyName ? `at ${propertyName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close amenities dialog"
            className="p-2 rounded-xl border border-border bg-surface-muted hover:bg-border text-foreground transition-colors cursor-pointer focus-ring"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Categories List */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-7 flex-1 divide-y divide-border/60">
          {categories.map((cat, idx) => (
            <div key={cat.title} className={idx > 0 ? "pt-6" : ""}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3.5">
                {cat.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-surface-muted/40 border border-border/70 text-foreground font-semibold"
                  >
                    <div className="w-8 h-8 rounded-xl bg-surface border border-border/70 flex items-center justify-center shrink-0 shadow-2xs">
                      {getAmenityIcon(item)}
                    </div>
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-muted/30 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer focus-ring shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
