import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | StayTrack Delhi NCR Accommodation Support",
  description: "Frequently asked questions and help guides for StayTrack guests and hosts regarding booking verification, stay types, and host policies.",
  alternates: {
    canonical: "https://staytrack.in/help",
  },
};

export default function HelpPage() {
  const faqs = [
    {
      q: "What regions does StayTrack cover?",
      a: "StayTrack operates exclusively within Delhi NCR, including Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.",
    },
    {
      q: "What types of stays are available on StayTrack?",
      a: "We support Daily Stays (nightly bookings), Monthly Rentals (long-term PGs and flats), and Hourly Transit Stays for flexible short rests.",
    },
    {
      q: "How are properties verified?",
      a: "StayTrack administrators review host verification credentials, address accuracy, and property documentation before activating a listing.",
    },
    {
      q: "How can I become a StayTrack host?",
      a: "Click 'List Your Property' in the menu or footer, complete the host application form, and our onboarding team will guide you through verification.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Help Center & FAQs
          </h1>
          <p className="text-xs sm:text-sm text-muted font-semibold mt-2">
            Answers to common questions for guests and property hosts on StayTrack.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          {faqs.map((faq, idx) => (
            <GlassCard key={idx} className="p-5 border border-border bg-surface">
              <h3 className="text-sm font-bold text-foreground">{faq.q}</h3>
              <p className="text-xs text-muted font-medium mt-2 leading-relaxed">{faq.a}</p>
            </GlassCard>
          ))}
        </div>

        <div className="text-center bg-surface p-6 rounded-2xl border border-border">
          <h3 className="text-sm font-bold text-foreground">Need direct assistance?</h3>
          <p className="text-xs text-muted font-medium mt-1">Our customer support team is ready to help.</p>
          <Link
            href="/contact"
            className="inline-block mt-3 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#111716] transition-all"
          >
            Contact Support Desk
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
