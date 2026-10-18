"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PropertyCard from "@/components/properties/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";
import { StarIcon } from "@/components/ui/Icons";
import { getTopVerifiedProperties } from "@/lib/api";
import { Property } from "@/types/property";
import { isSupportedLocation } from "@/lib/locations";

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopVerifiedProperties()
      .then((data) => {
        if (data && Array.isArray(data)) {
          const ncrOnly = data.filter((stay) => isSupportedLocation(stay.city));
          setProperties(ncrOnly);
        } else {
          setProperties([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch top verified properties:", err);
        setProperties([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Top Verified Stays</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Direct owner listings verified by StayTrack</p>
        </div>
        <Link href="/properties" className="text-xs font-bold text-black hover:underline">
          Browse All Stays →
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 rounded-3xl bg-zinc-100 animate-pulse border border-zinc-200" />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {properties.map((stay, idx) => (
            <PropertyCard key={stay.id || (stay as any).propertyId || `featured-stay-${idx}`} property={stay} />
          ))}
        </div>
      ) : (
        <GlassCard className="py-12 text-center border border-zinc-200">
          <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 flex items-center justify-center mx-auto mb-3">
            <StarIcon className="w-6 h-6 text-[#D9A441]" />
          </div>
          <h3 className="text-base font-bold text-zinc-950 mt-3">No properties assigned as Top Verified</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Properties explicitly marked as Top Verified by admin will appear in this section.
          </p>
          <Link
            href="/host/application"
            className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold"
          >
            List Your Property
          </Link>
        </GlassCard>
      )}
    </section>
  );
}
