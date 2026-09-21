"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PropertyCard from "@/components/properties/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";
import { getPublicProperties } from "@/lib/api";
import { Property } from "@/types/property";

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProperties()
      .then((data) => {
        if (data && Array.isArray(data)) {
          setProperties(data.slice(0, 8));
        } else {
          setProperties([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch public properties:", err);
        setProperties([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Top Verified Stays</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Direct owner listings with instant approval</p>
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
          {properties.map((stay) => (
            <PropertyCard key={stay.id} property={stay} />
          ))}
        </div>
      ) : (
        <GlassCard className="py-12 text-center border border-zinc-200">
          <span className="text-4xl">🏡</span>
          <h3 className="text-base font-bold text-zinc-950 mt-3">No properties listed yet</h3>
          <p className="text-xs text-zinc-500 mt-1">Be the first host to list a property on StayTrack!</p>
          <Link
            href="/host/application"
            className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold"
          >
            Become a Host
          </Link>
        </GlassCard>
      )}
    </section>
  );
}
