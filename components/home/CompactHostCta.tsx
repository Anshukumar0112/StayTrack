"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

export default function CompactHostCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full">
      <GlassCard className="rounded-2xl p-6 sm:p-8 bg-zinc-950 text-white border border-zinc-900 shadow-xl overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src="/icons/house-plus.png"
              alt=""
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0"
            />
            <div>
              <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                HOST ON STAYTRACK
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                HAVE A PROPERTY TO LIST?
              </h2>
              <p className="text-xs text-zinc-300 mt-1 font-medium max-w-xl">
                List your BNB, Hostel, PG, Hotel or Flat on StayTrack. Connect directly with guests with zero commission fees.
              </p>
            </div>
          </div>

          <Link
            href="/host/application"
            className="flex-shrink-0 rounded-xl bg-white text-black hover:bg-zinc-200 px-5 py-3 text-xs font-bold transition-all shadow-md flex items-center gap-2 group cursor-pointer"
          >
            <img src="/icons/house-plus.png" alt="" className="w-4 h-4 object-contain" />
            <span>List Your Property</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </GlassCard>
    </section>
  );
}
