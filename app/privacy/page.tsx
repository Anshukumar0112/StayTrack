import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StayTrack",
  description: "StayTrack Privacy Policy outlining data protection, user account security, and guest information privacy for Delhi NCR stay bookings.",
  alternates: {
    canonical: "https://staytrack.in/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-foreground mb-6">Privacy Policy</h1>
        <GlassCard className="p-8 border border-border bg-surface text-xs text-muted font-medium leading-relaxed space-y-4">
          <p>
            StayTrack values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard user data when you access our property marketplace across Delhi NCR.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">1. Information Collection</h2>
          <p>
            We collect personal details essential for user authentication, booking communication, and property hosting, including phone numbers, email addresses, and verification documents.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">2. Data Security & Usage</h2>
          <p>
            Your information is stored securely using encrypted backend infrastructure. We do not sell your personal data to third-party advertisers. Data is strictly used for booking processing and account verification.
          </p>
          <h2 className="text-sm font-bold text-foreground pt-2">3. Updates to Policy</h2>
          <p>
            StayTrack may update this Privacy Policy periodically. Users will be notified of significant updates through our web platform.
          </p>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
