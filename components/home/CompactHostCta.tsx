"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/Icons";

export default function CompactHostCta() {
  return (
    <section className="stay-container py-12 sm:py-16 w-full">
      <div className="rounded-3xl p-8 sm:p-12 bg-[#111716] text-white border border-white/10 shadow-floating overflow-hidden relative">
        {/* Subtle decorative ambient backdrop */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block rounded-lg bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-primary-light">
              Property Owners & Hosts
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Have a property to list?
            </h2>
            <p className="text-sm sm:text-base font-medium text-white/90">
              Reach verified guests across Delhi NCR.
            </p>
            <p className="text-xs sm:text-sm text-white/70 font-normal leading-relaxed">
              List your BNB, hostel, PG, hotel, or flat on StayTrack. Connect directly with guests and manage your accommodations with transparent terms.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/host/application"
              className="rounded-xl bg-primary hover:bg-primary-hover text-white px-6 py-3.5 text-xs font-semibold transition-all duration-200 shadow-subtle flex items-center justify-center gap-2 group cursor-pointer focus-ring"
            >
              <span>List Your Property</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link
              href="/host"
              className="rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white px-5 py-3.5 text-xs font-semibold transition-all duration-200 flex items-center justify-center cursor-pointer focus-ring text-center"
            >
              <span>Learn More</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
