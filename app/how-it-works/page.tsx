import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How StayTrack Works | Guest & Host Guide",
  description: "Learn how StayTrack works for guests finding stays and hosts listing properties in Delhi NCR. Discover daily, monthly, and hourly stay models.",
  alternates: {
    canonical: "https://staytrack.in/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-[11px] uppercase tracking-wider border border-primary/20">
            Simple & Transparent
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight mt-4">
            How StayTrack Works
          </h1>
          <p className="text-sm sm:text-base text-muted font-semibold mt-3">
            Connecting guests seeking verified stays with property owners across Delhi NCR.
          </p>
        </div>

        {/* Steps for Guests */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b border-border">
            For Guests Seeking Stays
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center mb-3">1</span>
              <h3 className="text-base font-bold text-foreground">Search by City or Category</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Filter by Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, or Faridabad across BNBs, PGs, Hostels, Hotels, and Flats.
              </p>
            </GlassCard>

            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center mb-3">2</span>
              <h3 className="text-base font-bold text-foreground">Select Stay Duration</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Choose between daily stays, monthly long-term rentals, or hourly transit stays tailored to your schedule.
              </p>
            </GlassCard>

            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center mb-3">3</span>
              <h3 className="text-base font-bold text-foreground">Connect & Book Directly</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Confirm your booking securely with verified host profiles and instant status notifications.
              </p>
            </GlassCard>
          </div>
        </div>

        {/* Steps for Hosts */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b border-border">
            For Property Hosts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-[#3F8A68] text-white font-black text-sm flex items-center justify-center mb-3">1</span>
              <h3 className="text-base font-bold text-foreground">Apply as a Host</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Submit your host registration and property details for StayTrack admin verification.
              </p>
            </GlassCard>

            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-[#3F8A68] text-white font-black text-sm flex items-center justify-center mb-3">2</span>
              <h3 className="text-base font-bold text-foreground">Manage Listings & Rates</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Set custom daily, monthly, and hourly rates, manage amenities, and upload property photos.
              </p>
            </GlassCard>

            <GlassCard className="p-6 border border-border bg-surface">
              <span className="h-8 w-8 rounded-full bg-[#3F8A68] text-white font-black text-sm flex items-center justify-center mb-3">3</span>
              <h3 className="text-base font-bold text-foreground">Receive Bookings</h3>
              <p className="text-xs text-muted font-medium mt-2">
                Get direct guest inquiries and booking requests with transparent payout options.
              </p>
            </GlassCard>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/host/application"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-white hover:bg-[#111716] px-6 py-3 text-xs font-bold transition-all shadow-sm"
          >
            <span>List Your Property Today</span>
            <span>→</span>
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
