"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";
import { getPublicProperties } from "@/lib/api";
import { Property } from "@/types/property";

export default function PopularDestinations() {
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
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Explore Delhi NCR</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Discover stays across the areas we currently serve.</p>
        </div>
        <Link href="/properties" className="text-xs font-bold text-black hover:underline">
          Browse All Locations →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {SUPPORTED_LOCATIONS.map((loc) => {
          const count = propertyCounts[loc.id] || 0;
          return (
            <Link key={loc.id} href={`/properties?city=${encodeURIComponent(loc.name)}`}>
              <GlassCard hoverEffect className="p-4 text-center border border-zinc-200 group cursor-pointer h-full flex flex-col justify-between">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{loc.image}</div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 group-hover:text-black">{loc.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-semibold">{loc.state}</p>
                </div>
                <div className="mt-3">
                  {count > 0 ? (
                    <span className="inline-block rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[10px] font-extrabold border border-emerald-300">
                      {count} {count === 1 ? "Stay" : "Stays"}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-zinc-100 text-zinc-500 px-2.5 py-0.5 text-[10px] font-bold border border-zinc-200">
                      Coming soon
                    </span>
                  )}
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
