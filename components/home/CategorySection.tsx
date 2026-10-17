"use client";

import Link from "next/link";
import PropertyCard from "@/components/properties/PropertyCard";
import { getPropertyId, Property } from "@/types/property";
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
    <section id={pluralId} className="stay-container py-10 sm:py-12 w-full border-b border-border/70 last:border-0 scroll-mt-28 sm:scroll-mt-32">
      <div className="flex justify-between items-start sm:items-end mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {category.icon?.startsWith("/") ? (
                <img src={category.icon} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Building2Icon className="w-4 h-4 text-primary" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {category.label}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1.5 font-normal max-w-xl">
            {category.description}
          </p>
        </div>
        <Link
          href={exploreUrl}
          className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 group focus-ring rounded-lg px-2 py-1"
        >
          <span>View all {category.label}</span>
          <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-5 overflow-x-auto no-scrollbar py-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="w-[min(280px,82vw)] sm:w-[310px] h-[350px] flex-shrink-0 rounded-2xl bg-surface-muted/60 animate-pulse border border-border/60"
            />
          ))}
        </div>
      ) : properties.length > 0 ? (
        /* Horizontal Content Rail */
        <div className="flex gap-5 overflow-x-auto no-scrollbar py-2 scroll-smooth">
          {properties.map((stay, idx) => (
            <div key={getPropertyId(stay) || `${category.id}-stay-${idx}`} className="w-[min(280px,82vw)] sm:w-[310px] flex-shrink-0">
              <PropertyCard property={stay} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 px-6 text-center border border-border/70 bg-surface rounded-2xl flex flex-col items-center justify-center shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
            {category.icon?.startsWith("/") ? (
              <img src={category.icon} alt="" className="w-6 h-6 object-contain opacity-60" />
            ) : (
              <Building2Icon className="w-6 h-6 text-muted opacity-60" />
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground">
            No {category.label} listed yet in Delhi NCR
          </h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto font-normal leading-relaxed">
            We are onboarding verified {category.label.toLowerCase()} across Delhi NCR. You can list your property or explore other categories.
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Link
              href="/host/application"
              className="rounded-xl bg-[#111716] hover:bg-[#232D2B] text-white px-5 py-2.5 text-xs font-semibold transition-all duration-200 shadow-2xs focus-ring"
            >
              List Your Property
            </Link>
            <Link
              href={exploreUrl}
              className="rounded-xl border border-border bg-surface text-foreground hover:bg-surface-muted px-5 py-2.5 text-xs font-semibold transition-all duration-200 focus-ring"
            >
              Browse All Stays
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
