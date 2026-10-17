import Image from "next/image";
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
        <section className="relative w-full bg-brand-deep text-white overflow-hidden">
          {/* Background Image with Calibrated Dual-Layer Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
              alt="StayTrack Hospitality & Stays in Delhi NCR"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Layer 1: Warm-charcoal base tint for high WCAG contrast */}
            <div className="absolute inset-0 bg-[#111716]/65" />
            {/* Layer 2: Subtle vertical gradient to anchor top and gently blend bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#111716]/75 via-transparent to-[#111716]" />
          </div>

          <div className="relative z-10 stay-container pt-[clamp(3.5rem,7vw,5.5rem)] pb-[clamp(3rem,6vw,4.5rem)] text-center">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.14]">
              Find Your Next Stay in Delhi NCR
            </h1>

            {/* Supporting Copy */}
            <p className="mt-3.5 sm:mt-4 text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto font-normal leading-relaxed">
              Verified stays, flexible booking options, and direct communication with property owners.
            </p>

            {/* Unified Search Component */}
            <div className="mt-8 sm:mt-10 max-w-5xl mx-auto">
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