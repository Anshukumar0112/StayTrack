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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* 1. Hero / Search Section */}
        <section className="relative px-4 sm:px-6 pt-12 pb-10 text-center max-w-7xl mx-auto w-full">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 max-w-4xl mx-auto leading-tight">
            Find Your <span className="underline decoration-emerald-500 decoration-wavy">Perfect Stay</span> in Delhi NCR
          </h1>

          <p className="mt-3 text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Hostels, rooms, PGs and flexible stays across Delhi NCR. Connect directly with verified owners.
          </p>

          {/* Search Module */}
          <div className="mt-8">
            <HeroSearch />
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