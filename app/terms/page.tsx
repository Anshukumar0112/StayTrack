import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | StayTrack",
  description: "StayTrack Terms of Service governing platform usage, guest booking policies, and host listing terms across Delhi NCR.",
  alternates: {
    canonical: "https://staytrack.in/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-foreground mb-6">Terms of Service</h1>
        <GlassCard className="p-8 border border-border bg-surface text-xs text-muted font-medium leading-relaxed space-y-4">
          <p>
            Welcome to StayTrack. By accessing or using our platform, you agree to comply with and be bound by the following Terms of Service governing accommodation bookings and property listings in Delhi NCR.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">1. Guest Booking Terms</h2>
          <p>
            Guests agree to provide accurate identification upon check-in and adhere to individual property house rules established by verified hosts.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">2. Host Listing Responsibilities</h2>
          <p>
            Property hosts warrant that listed properties comply with local housing regulations, safety standards, and pricing accuracy.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">3. Platform Role</h2>
          <p>
            StayTrack provides direct marketplace discovery and verified booking infrastructure. Hosts and guests maintain direct communication for stay execution.
          </p>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
