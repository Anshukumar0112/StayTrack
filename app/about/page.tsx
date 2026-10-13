import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { ShieldCheckIcon, HandshakeIcon, MapPinIcon, BadgeCheckIcon } from "@/components/ui/Icons";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About StayTrack | Direct Property & Stay Marketplace in Delhi NCR",
  description: "Learn about StayTrack, India's direct accommodation marketplace connecting verified hosts with guests across Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad with zero middleman fees.",
  alternates: {
    canonical: "https://staytrack.in/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 flex-1 w-full">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-3 py-1 rounded-full bg-[#3F8A68]/15 text-[#3F8A68] font-extrabold text-[11px] uppercase tracking-wider border border-[#3F8A68]/30">
            Delhi NCR Stay Marketplace
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight mt-4">
            Direct, Transparent & Verified Accommodation
          </h1>
          <p className="text-sm sm:text-base text-muted font-semibold mt-3 leading-relaxed">
            StayTrack is redefining how guests discover and book BNBs, hostels, PGs, hotels, and flats across Delhi NCR without middleman inflation or hidden charges.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <GlassCard className="p-6 border border-border bg-surface flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <HandshakeIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Direct Host Connectivity</h3>
              <p className="text-xs text-muted font-medium mt-2 leading-relaxed">
                Connect directly with property owners and hosts across Delhi, Gurugram, Noida, and Greater Noida for fair pricing and instant communication.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border border-border bg-surface flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-[#3F8A68]/10 text-[#3F8A68] flex items-center justify-center mb-4">
                <BadgeCheckIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">100% Verified Properties</h3>
              <p className="text-xs text-muted font-medium mt-2 leading-relaxed">
                Every listing undergoes physical or digital verification to ensure location accuracy, amenity standards, and guest safety.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border border-border bg-surface flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <MapPinIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delhi NCR Focused</h3>
              <p className="text-xs text-muted font-medium mt-2 leading-relaxed">
                Hyper-local coverage across Knowledge Park, Cyber City, Indirapuram, Golf Course Road, Pari Chowk, and expressways.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Our Mission Section */}
        <GlassCard className="p-8 border border-border bg-surface mb-12">
          <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
          <p className="text-xs sm:text-sm text-muted font-medium mt-3 leading-relaxed">
            Whether you are a student moving to Knowledge Park Greater Noida, a tech professional working in Gurugram Cyber City, or a family seeking a short stay in South Delhi, StayTrack provides a seamless platform for daily stays, monthly rentals, and hourly transit stays.
          </p>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
