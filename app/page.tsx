"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import HeroSearch from "@/components/home/HeroSearch";
import PopularDestinations from "@/components/home/PopularDestinations";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import Offers from "@/components/home/Offers";
import WhyStayTrack from "@/components/home/WhyStayTrack";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";

export default function RootHomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-6 pt-16 pb-12 text-center max-w-7xl mx-auto w-full">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Direct Host Connect • ₹0 Brokerage Guaranteed
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-950 max-w-4xl mx-auto leading-tight">
            Find Your <span className="underline decoration-emerald-500 decoration-wavy">Perfect Stay</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Hotels, homes, rooms, PGs and flexible stays. Connect directly with verified owners with zero brokerage fees.
          </p>

          {/* Search Module */}
          <div className="mt-10">
            <HeroSearch />
          </div>
        </section>

        {/* Popular Destinations */}
        <PopularDestinations />

        {/* Featured Properties (Real Backend Data) */}
        <FeaturedProperties />

        {/* Stay Type & Features Explanation */}
        <WhyStayTrack />

        {/* Promotions & Offers */}
        <Offers />

        {/* Host CTA Banner */}
        <section className="mx-auto max-w-7xl px-6 py-16 w-full">
          <GlassCard className="rounded-3xl p-8 sm:p-12 bg-black text-white text-center relative overflow-hidden border border-black shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white">
                BECOME A HOST ON STAYTRACK
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-4">
                List Your Property With ₹0 Brokerage
              </h2>
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed font-medium">
                Connect directly with guests, set your own stay terms, and manage bookings effortlessly with direct payouts.
              </p>
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                <Link
                  href="/host/application"
                  className="rounded-xl bg-white text-black hover:bg-zinc-200 px-6 py-3.5 text-xs font-bold transition-all shadow-md"
                >
                  Apply To List Property
                </Link>
                <Link
                  href="/properties"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all"
                >
                  Find A Stay Now
                </Link>
              </div>
            </div>
          </GlassCard>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}