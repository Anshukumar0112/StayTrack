"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import HeroSearch from "@/components/home/HeroSearch";
import ExploreDelhiNCR from "@/components/home/ExploreDelhiNCR";
import CategoryNavigation from "@/components/home/CategoryNavigation";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import WhyStayTrack from "@/components/home/WhyStayTrack";
import CompactHostCta from "@/components/home/CompactHostCta";

export default function RootHomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* 1. Cinematic Hero / Search Section */}
        <section className="relative w-full bg-brand-deep text-white">
          {/* Background Image with Dark Gradient Overlay */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
              alt="StayTrack Property Marketplace"
              className="w-full h-full object-cover opacity-45 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111716] via-[#111716]/60 to-black/40" />
          </div>

          <div className="relative z-10 stay-container pt-[clamp(3rem,6vw,5rem)] pb-[clamp(2.5rem,5vw,4rem)] text-center">
            <h1 className="fluid-heading-hero font-black text-white max-w-4xl mx-auto">
              Find Your Next Stay in Delhi NCR
            </h1>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto font-medium leading-relaxed">
              Verified stays, flexible booking options, and direct communication with property owners.
            </p>

            {/* Unified Search Bar Over Lower Portion of Hero */}
            <div className="mt-10 max-w-5xl mx-auto">
              <HeroSearch />
            </div>
          </div>
        </section>

        {/* 2. Compact Explore Delhi NCR Locations Section */}
        <ExploreDelhiNCR />

        {/* 3. Accommodation Discovery Area (Sticky Category Nav + 5 Category Sections) */}
        {/* Enclosed in a relative container so CategoryNavigation sticks strictly within the stay discovery area and un-sticks before Why Choose StayTrack */}
        <section className="relative">
          <CategoryNavigation />
          <CategoryShowcase />
        </section>

        {/* 4. Why Choose StayTrack Section */}
        <WhyStayTrack />

        {/* 5. Compact Host CTA Banner */}
        <CompactHostCta />
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}