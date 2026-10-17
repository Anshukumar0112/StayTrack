"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { getPublicProperties } from "@/lib/api";
import { Property } from "@/types/property";
import { ArrowRightIcon, MapPinIcon } from "@/components/ui/Icons";

export default function ExploreDelhiNCR() {
  const [propertyCounts, setPropertyCounts] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPublicProperties()
      .then((data) => {
        if (data && Array.isArray(data)) {
          const counts: Record<string, number> = {};
          data.forEach((prop: Property) => {
            const locName = (prop.city || prop.area || "").toLowerCase();
            SUPPORTED_LOCATIONS.forEach((loc) => {
              if (locName.includes(loc.name.toLowerCase())) {
                counts[loc.id] = (counts[loc.id] || 0) + 1;
              }
            });
          });
          setPropertyCounts(counts);
        }
      })
      .catch(() => setPropertyCounts({}));
  }, []);

  return (
    <section className="stay-container py-10 sm:py-12 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block mb-1">
            Destinations
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Explore Delhi NCR
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl">
            Discover verified accommodations across major landmark hubs and business corridors.
          </p>
        </div>
        <Link
          href="/properties"
          className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group focus-ring rounded-lg px-1 py-1"
        >
          <span>Browse All Destinations</span>
          <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {/* Destination Cards Responsive Grid / Mobile Horizontal Rail */}
      <div className="grid grid-flow-col auto-cols-[clamp(150px,44vw,190px)] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible no-scrollbar pb-2 pt-1">
        {SUPPORTED_LOCATIONS.map((loc) => {
          const count = propertyCounts[loc.id] || 0;
          const hasImageFailed = failedImages[loc.id];
          return (
            <Link
              key={loc.id}
              href={`/properties?city=${encodeURIComponent(loc.name)}`}
              className="group relative aspect-[16/11] min-h-[130px] w-full rounded-2xl overflow-hidden border border-border/70 bg-surface shadow-subtle hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 focus-ring block"
            >
              {/* Background Landmark Image with calibrated hover zoom */}
              {!hasImageFailed ? (
                <img
                  src={loc.image}
                  alt={loc.name}
                  onError={() => setFailedImages((prev) => ({ ...prev, [loc.id]: true }))}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-[#111716] flex items-center justify-center p-3">
                  <MapPinIcon className="w-7 h-7 text-primary/70" />
                </div>
              )}

              {/* Scrim Gradient for WCAG Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5 group-hover:from-black/90 transition-colors duration-300" />

              {/* Optional Real Property Count Badge */}
              {count > 0 && (
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="px-2 py-0.5 rounded-md bg-black/45 backdrop-blur-xs text-[10px] font-medium text-white/90 border border-white/10 shadow-2xs">
                    {count} {count === 1 ? "stay" : "stays"}
                  </span>
                </div>
              )}

              {/* Bottom Content: Destination Name & Landmark */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 z-10 text-white">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-primary-light shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold tracking-tight text-white line-clamp-1">
                    {loc.name}
                  </h3>
                </div>
                <p className="text-[11px] font-normal text-white/75 line-clamp-1">
                  {loc.landmark}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

