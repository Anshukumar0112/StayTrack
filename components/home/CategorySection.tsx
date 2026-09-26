"use client";

import Link from "next/link";
import PropertyCard from "@/components/properties/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";
import { Property } from "@/types/property";
import { CategoryConfig } from "@/lib/categories";

interface CategorySectionProps {
  category: CategoryConfig;
  properties: Property[];
  loading: boolean;
}

export default function CategorySection({ category, properties, loading }: CategorySectionProps) {
  const exploreUrl = `/properties?category=${category.id}`;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 w-full border-b border-zinc-100 last:border-0">
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon || "🏡"}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">{category.label}</h2>
          </div>
          <p className="text-xs text-zinc-500 font-semibold mt-1 max-w-xl">
            {category.description}
          </p>
        </div>
        <Link
          href={exploreUrl}
          className="text-xs font-bold text-black hover:underline flex items-center gap-1 group"
        >
          <span>View All {category.label}</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
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
          {properties.slice(0, 4).map((stay, idx) => (
            <PropertyCard
              key={stay.id || (stay as any).propertyId || `${category.id}-stay-${idx}`}
              property={stay}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="py-10 px-6 text-center border border-zinc-200 bg-zinc-50/40">
          <span className="text-4xl">{category.icon || "🏠"}</span>
          <h3 className="text-base font-bold text-zinc-950 mt-3">
            No {category.label} listed yet in Delhi NCR
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed font-medium">
            We are currently onboarding verified {category.label.toLowerCase()} across Delhi NCR. Are you a host or owner?
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Link
              href="/host/application"
              className="rounded-xl bg-black text-white hover:bg-zinc-800 px-5 py-2.5 text-xs font-bold transition-all shadow-sm"
            >
              List Your Property
            </Link>
            <Link
              href={exploreUrl}
              className="rounded-xl border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 px-5 py-2.5 text-xs font-bold transition-all"
            >
              Browse All Stays
            </Link>
          </div>
        </GlassCard>
      )}
    </section>
  );
}
