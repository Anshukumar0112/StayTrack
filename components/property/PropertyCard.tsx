"use client";

import GlassCard from "../ui/GlassCard";
import { formatCurrency } from "@/lib/utils";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  category: string;
  price: number;
  rating?: number;
  image?: string;
  stayType?: string;
}

export default function PropertyCard({
  id,
  title,
  location,
  category,
  price,
  rating = 4.9,
  stayType = "per night",
}: PropertyCardProps) {
  const { handleProtectedAction } = useAuthGuard();

  function handleViewStay() {
    handleProtectedAction(`/property/${id}`, "customer");
  }

  return (
    <GlassCard hoverEffect className="group flex flex-col justify-between overflow-hidden border border-zinc-200 p-0">
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100 cursor-pointer" onClick={handleViewStay}>
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 group-hover:scale-105 transition-transform duration-500">
          <span className="text-4xl">🏡</span>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          <span className="clay-badge px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
            {category}
          </span>
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
            ₹0 Brokerage
          </span>
        </div>

        <div className="absolute top-3 right-3 z-20">
          <span className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-zinc-900 border border-zinc-200 shadow-sm">
            ★ {rating}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4
            onClick={handleViewStay}
            className="text-base font-bold text-zinc-950 group-hover:text-black transition-colors line-clamp-1 cursor-pointer"
          >
            {title}
          </h4>
          <p className="text-xs font-semibold text-zinc-500 mt-1 flex items-center gap-1">
            📍 {location}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
          <div>
            <span className="text-lg font-black text-black">{formatCurrency(price)}</span>
            <span className="text-[11px] font-semibold text-zinc-500"> /{stayType}</span>
          </div>

          <button
            type="button"
            onClick={handleViewStay}
            className="rounded-xl bg-black hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
          >
            Select & View PG
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
