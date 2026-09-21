"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

const popularCities = [
  { name: "Gurugram", state: "Haryana", stays: "250+ Stays", image: "🏙️" },
  { name: "Bangalore", state: "Karnataka", stays: "480+ Stays", image: "🌳" },
  { name: "Mumbai", state: "Maharashtra", stays: "390+ Stays", image: "🌊" },
  { name: "Delhi NCR", state: "Delhi", stays: "520+ Stays", image: "🏛️" },
  { name: "Pune", state: "Maharashtra", stays: "180+ Stays", image: "🎓" },
  { name: "Hyderabad", state: "Telangana", stays: "310+ Stays", image: "🏰" },
];

export default function PopularDestinations() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Popular Destinations</h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Discover verified stays in top Indian tech hubs & cities</p>
        </div>
        <Link href="/properties" className="text-xs font-bold text-black hover:underline">
          Explore All Cities →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {popularCities.map((city) => (
          <Link key={city.name} href={`/properties?city=${encodeURIComponent(city.name)}`}>
            <GlassCard hoverEffect className="p-4 text-center border border-zinc-200 group cursor-pointer h-full flex flex-col justify-between">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{city.image}</div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950 group-hover:text-black">{city.name}</h3>
                <p className="text-[10px] text-zinc-500 font-semibold">{city.state}</p>
              </div>
              <span className="mt-3 inline-block rounded-full bg-zinc-100 text-zinc-800 px-2.5 py-0.5 text-[10px] font-extrabold">
                {city.stays}
              </span>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
