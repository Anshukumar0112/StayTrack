"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSearch from "@/components/home/HeroSearch";
import PropertyCard from "@/components/property/PropertyCard";
import ClayCard from "@/components/ui/ClayCard";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getPublicProperties } from "@/lib/api";
import { Property } from "@/lib/types";

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackStays = [
    {
      id: "prop-101",
      title: "Luxury 2BHK Glass Suite",
      location: "Koramangala, Bangalore",
      category: "Flat",
      price: 2400,
      rating: 4.9,
      stayType: "night",
    },
    {
      id: "prop-102",
      title: "Executive Single Room PG (AC + Food)",
      location: "HSR Layout, Bangalore",
      category: "PG",
      price: 8500,
      rating: 4.8,
      stayType: "month",
    },
    {
      id: "prop-103",
      title: "Hourly Transit Studio Room",
      location: "Indiranagar, Bangalore",
      category: "Room",
      price: 490,
      rating: 4.7,
      stayType: "hour",
    },
    {
      id: "prop-104",
      title: "Boutique Heritage Villa & BNB",
      location: "MG Road, Bangalore",
      category: "Hotel",
      price: 3800,
      rating: 4.95,
      stayType: "night",
    },
  ];

  useEffect(() => {
    getPublicProperties()
      .then((data) => {
        if (data && data.length > 0) {
          setProperties(data);
        } else {
          setProperties([]);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch public properties:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const displayProperties = properties.length > 0 ? properties.map((p, idx) => ({
    id: (p as any).propertyId || p.id || `stay-item-${idx}`,
    title: p.title,
    location: `${p.area || ""}, ${p.city || "Bangalore"}`,
    category: p.propertyType || "Flat",
    price: p.pricePerNight || p.pricePerMonth || p.pricePerHour || p.price || 2000,
    rating: p.rating || 4.8,
    stayType: p.bookingType === "monthly" ? "month" : p.bookingType === "hourly" ? "hour" : "night",
  })) : fallbackStays;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 py-20 text-center max-w-7xl mx-auto w-full">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 px-4 py-1.5 text-xs font-bold text-zinc-900">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Direct Host Connect • ₹0 Brokerage Guaranteed
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-950 max-w-3xl mx-auto leading-tight">
          Find your perfect stay without paying <span className="underline decoration-zinc-400 decoration-wavy">Brokerage</span>.
        </h1>

        <p className="mt-4 text-base sm:text-lg text-zinc-600 max-w-xl mx-auto font-medium">
          Connect directly with verified owners, dealers, and hotel managers for hourly, daily, or monthly stays.
        </p>

        {/* Hero Search Glass Card */}
        <div className="mt-12">
          <HeroSearch />
        </div>
      </section>

      {/* Claymorphic Category Showcase */}
      <section className="mx-auto max-w-7xl px-6 py-16 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Explore Categories</h2>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Select stay type that fits your exact routine</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-black hover:underline">
            View All Categories →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ClayCard className="hover:scale-[1.02] cursor-pointer">
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-lg font-bold text-zinc-950">Homes & Flats</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Full apartments, 1BHK/2BHK flats with direct contact details.
            </p>
          </ClayCard>

          <ClayCard className="hover:scale-[1.02] cursor-pointer">
            <div className="text-4xl mb-3">🛏️</div>
            <h3 className="text-lg font-bold text-zinc-950">Rooms & PGs</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Fully furnished single & sharing rooms with food & Wi-Fi.
            </p>
          </ClayCard>

          <ClayCard className="hover:scale-[1.02] cursor-pointer">
            <div className="text-4xl mb-3">⏱️</div>
            <h3 className="text-lg font-bold text-zinc-950">Hourly Stays</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Flexible 3h, 6h, or 12h slots for transit and work privacy.
            </p>
          </ClayCard>

          <ClayCard className="hover:scale-[1.02] cursor-pointer">
            <div className="text-4xl mb-3">🏨</div>
            <h3 className="text-lg font-bold text-zinc-950">Hotels & BNBs</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Boutique hotels & luxury villas for weekend vacations.
            </p>
          </ClayCard>
        </div>
      </section>

      {/* Featured Properties Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Top Verified Stays</h2>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Highest rated accommodations available right now</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-black hover:underline">
            Browse All Stays →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-zinc-500">
            Loading stays...
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayProperties.map((stay, idx) => (
              <PropertyCard key={stay.id || `stay-card-${idx}`} {...stay} />
            ))}
          </div>
        )}
      </section>

      {/* Zero Brokerage Glass Feature Card */}
      <section className="mx-auto max-w-7xl px-6 py-16 w-full">
        <GlassCard className="rounded-3xl p-8 sm:p-12 bg-black text-white text-center relative overflow-hidden border border-black">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white">
              ₹0 BROKERAGE GUARANTEE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4">
              Direct Host Communication
            </h2>
            <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
              Why pay hefty middleman fees? On StayTrack, you get direct access to property owners with transparent pricing and instant booking approval.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/search" className="rounded-xl bg-white text-black hover:bg-zinc-200 px-6 py-3 text-xs font-bold transition-all">
                Find A Stay Now
              </Link>
              <Link href="/host" className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-xs font-bold text-white hover:bg-zinc-800 transition-all">
                List Property As Host
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>

      <Footer />
    </div>
  );
}