"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

const offers = [
  {
    code: "DIRECT100",
    title: "₹0 Brokerage Guaranteed",
    subtitle: "Book directly with property owners and save 100% middleman fees.",
    tag: "ALWAYS ACTIVE",
    bg: "bg-emerald-900 text-white",
  },
  {
    code: "HOURLYSLOT",
    title: "Flexible Hourly Transit Stays",
    subtitle: "Book 3h, 6h or 12h slots near airports, tech parks & stations.",
    tag: "HOURLY STAYS",
    bg: "bg-zinc-900 text-white",
  },
  {
    code: "MONTHLYDISCOUNT",
    title: "Long Term PG & Flat Savings",
    subtitle: "Special rates for monthly stays with food, Wi-Fi & security included.",
    tag: "MONTHLY RENTALS",
    bg: "bg-black text-white",
  },
];

export default function Offers() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Promotions & Offers</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Exclusive benefits for StayTrack guests and long-term renters</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {offers.map((offer) => (
          <GlassCard key={offer.code} className={`rounded-3xl p-6 relative overflow-hidden border border-zinc-800 ${offer.bg}`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white">
              {offer.tag}
            </span>
            <h3 className="text-xl font-black mt-4 leading-tight">{offer.title}</h3>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{offer.subtitle}</p>
            <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-lg">CODE: {offer.code}</span>
              <Link href="/properties" className="text-xs font-bold text-white underline hover:text-zinc-200">
                Book Now →
              </Link>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
