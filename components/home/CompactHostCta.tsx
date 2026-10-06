"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

export default function CompactHostCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 w-full">
      <div className="rounded-3xl p-8 sm:p-12 bg-[#111716] text-white border border-white/10 shadow-2xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block rounded-full bg-primary/20 border border-primary/40 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-primary-light">
              FOR PROPERTY OWNERS & HOSTS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Have a property to list?
            </h2>
            <p className="text-sm sm:text-base font-semibold text-zinc-300">
              Reach verified guests across Delhi NCR.
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              List your BNB, hostel, PG, hotel or flat on StayTrack. Connect directly with guests with zero commission fees.
            </p>
          </div>

          <Link
            href="/host/application"
            className="flex-shrink-0 rounded-xl bg-primary hover:bg-white hover:text-[#111716] text-white px-6 py-3.5 text-xs font-extrabold transition-all duration-200 shadow-lg flex items-center gap-2 group cursor-pointer"
          >
            <span>List Your Property</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
