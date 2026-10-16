"use client";

import Link from "next/link";
import PropertyCard from "@/components/properties/PropertyCard";
import GlassCard from "@/components/ui/GlassCard";
import { Property } from "@/types/property";
import { CategoryConfig } from "@/lib/categories";
import { ArrowRightIcon, Building2Icon } from "@/components/ui/Icons";

interface CategorySectionProps {
  category: CategoryConfig;
  properties: Property[];
  loading: boolean;
}

export default function CategorySection({ category, properties, loading }: CategorySectionProps) {
  const exploreUrl = `/properties?category=${category.id}`;
  const sectionId = category.id.toLowerCase();
  const pluralId = sectionId === "bnb" ? "bnbs" : sectionId === "hostel" ? "hostels" : sectionId === "pg" ? "pgs" : sectionId === "hotel" ? "hotels" : "flats";

  return (
    <section id={pluralId} className="stay-container py-8 w-full border-b border-border/60 last:border-0 scroll-mt-28 sm:scroll-mt-32">
      <div className="flex justify-between items-baseline mb-5 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            {category.icon?.startsWith("/") ? (
              <img src={category.icon} alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
            ) : (
              <Building2Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            )}
            <h2 className="text-xl sm:text-2xl font-black text-[#111716] tracking-tight">{category.label}</h2>
          </div>
          <p className="text-xs text-muted font-medium mt-0.5">
            {category.description}
          </p>
        </div>
        <Link
          href={exploreUrl}
          className="text-xs font-bold text-primary hover:text-[#111716] transition-colors duration-200 flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-5 overflow-x-auto no-scrollbar py-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="w-[min(280px,82vw)] sm:w-[310px] h-[340px] flex-shrink-0 rounded-2xl bg-surface animate-pulse border border-border/60" />
          ))}
        </div>
      ) : properties.length > 0 ? (
        /* Horizontal Content Rail */
        <div className="flex gap-5 overflow-x-auto no-scrollbar py-2 scroll-smooth">
          {properties.map((stay, idx) => (
            <div key={stay.id || (stay as any).propertyId || `${category.id}-stay-${idx}`} className="w-[min(280px,82vw)] sm:w-[310px] flex-shrink-0">
              <PropertyCard property={stay} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 px-6 text-center border border-border/60 bg-surface rounded-2xl flex flex-col items-center justify-center">
          {category.icon?.startsWith("/") ? (
            <img src={category.icon} alt="" className="w-10 h-10 object-contain opacity-60" />
          ) : (
            <Building2Icon className="w-8 h-8 text-muted opacity-60" />
          )}
          <h3 className="text-sm font-bold text-[#111716] mt-2">
            No {category.label} listed yet in Delhi NCR
          </h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto font-medium">
            We are onboarding verified {category.label.toLowerCase()} across Delhi NCR.
          </p>
          <div className="mt-4 flex justify-center gap-3 flex-wrap">
            <Link
              href="/host/application"
              className="rounded-xl bg-primary text-white hover:bg-[#111716] px-4 py-2 text-xs font-bold transition-all duration-200 shadow-xs"
            >
              List Your Property
            </Link>
            <Link
              href={exploreUrl}
              className="rounded-xl border border-border/80 bg-surface text-[#111716] hover:bg-background px-4 py-2 text-xs font-bold transition-all duration-200"
            >
              Browse All Stays
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
