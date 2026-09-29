"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { getPublicProperties } from "@/lib/api";
import { Property } from "@/types/property";

export default function ExploreDelhiNCR() {
  const [propertyCounts, setPropertyCounts] = useState<Record<string, number>>({});

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
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 w-full">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xs sm:text-sm font-black tracking-wider text-zinc-900 uppercase">
            Explore Delhi NCR
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
            Where do you want to stay?
          </p>
        </div>
        <Link href="/properties" className="text-[11px] font-bold text-black hover:underline">
          Browse All →
        </Link>
      </div>

      {/* Compact Location Chips - Horizontally scrollable on mobile, flex-wrap on desktop */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {SUPPORTED_LOCATIONS.map((loc) => {
          const count = propertyCounts[loc.id] || 0;
          return (
            <Link
              key={loc.id}
              href={`/properties?city=${encodeURIComponent(loc.name)}`}
              className="group flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:border-black hover:bg-zinc-50 transition-all shadow-xs"
            >
              <img
                src={loc.image || "/icons/location-pin.png"}
                alt=""
                className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain group-hover:scale-110 transition-transform"
              />
              <span className="text-xs font-bold text-zinc-900 group-hover:text-black whitespace-nowrap">
                {loc.name}
              </span>
              {count > 0 ? (
                <span className="ml-0.5 rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-extrabold">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
