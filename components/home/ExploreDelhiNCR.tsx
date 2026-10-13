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
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full">
      <div className="flex justify-between items-baseline mb-5">
        <div>
          <h2 className="text-sm sm:text-base font-black tracking-wide text-foreground uppercase">
            Explore Delhi NCR
          </h2>
          <p className="text-xs text-muted font-medium mt-0.5">
            Discover verified accommodations across major landmark hubs
          </p>
        </div>
        <Link
          href="/properties"
          className="text-xs font-bold text-primary hover:text-primary-dark transition-colors duration-200 flex items-center gap-1.5 group"
        >
          <span>Browse All</span>
          <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {/* Visual Landmark Destination Cards Grid / Carousel */}
      <div className="grid grid-flow-col auto-cols-[160px] sm:auto-cols-[190px] md:grid-cols-6 gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 md:mx-0 md:px-0">
        {SUPPORTED_LOCATIONS.map((loc) => {
          const count = propertyCounts[loc.id] || 0;
          const hasImageFailed = failedImages[loc.id];
          return (
            <Link
              key={loc.id}
              href={`/properties?city=${encodeURIComponent(loc.name)}`}
              className="group relative h-[130px] w-full rounded-2xl overflow-hidden border border-border/60 bg-surface-muted shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:border-primary/40 block"
            >
              {/* Background Landmark Image with zoom effect */}
              {!hasImageFailed ? (
                <img
                  src={loc.image}
                  alt={loc.name}
                  onError={() => setFailedImages((prev) => ({ ...prev, [loc.id]: true }))}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center p-3">
                  <MapPinIcon className="w-8 h-8 text-primary opacity-60" />
                </div>
              )}

              {/* Dark Gradient Overlay for optimal legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 group-hover:from-black/90 transition-colors duration-300" />

              {/* Bottom Content: City Name & Landmark */}
              <div className="absolute bottom-0 left-0 right-0 p-3 z-10 text-white">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPinIcon className="w-3 h-3 text-primary-light shrink-0" />
                  <h3 className="text-sm font-bold tracking-tight text-white line-clamp-1">
                    {loc.name}
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-neutral-300 line-clamp-1">
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

