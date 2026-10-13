import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "StayTrack Sitemap | Full Navigation Directory",
  description: "Browse the complete StayTrack site directory, including Delhi NCR location pages, stay types, property categories, host resources, and help links.",
  alternates: {
    canonical: "https://staytrack.in/sitemap",
  },
};

export default function SitemapPage() {
  const sections = [
    {
      title: "Explore Stays",
      links: [
        { label: "All Stays across Delhi NCR", href: "/properties" },
        { label: "Daily Stays & Short Visits", href: "/properties?stayType=daily" },
        { label: "Monthly Rentals & Long-term PGs", href: "/properties?stayType=monthly" },
        { label: "Hourly Transit Stays", href: "/properties?stayType=hourly" },
      ],
    },
    {
      title: "Delhi NCR Locations",
      links: [
        { label: "Stays in Delhi", href: "/stays/delhi" },
        { label: "Stays in Gurugram", href: "/stays/gurugram" },
        { label: "Stays in Noida", href: "/stays/noida" },
        { label: "Stays in Greater Noida", href: "/stays/greater-noida" },
        { label: "Stays in Ghaziabad", href: "/stays/ghaziabad" },
        { label: "Stays in Faridabad", href: "/stays/faridabad" },
      ],
    },
    {
      title: "Property Types",
      links: [
        { label: "Bed & Breakfasts (BNBs)", href: "/properties?category=BNB" },
        { label: "Hostels & Student Living", href: "/properties?category=HOSTEL" },
        { label: "Paying Guest Accommodations (PGs)", href: "/properties?category=PG" },
        { label: "Verified Hotels", href: "/properties?category=HOTEL" },
        { label: "Independent Flats & BHKs", href: "/properties?category=FLAT" },
      ],
    },
    {
      title: "For Hosts",
      links: [
        { label: "List Your Property", href: "/host/application" },
        { label: "Host Dashboard", href: "/host" },
        { label: "Host Pro Subscription", href: "/host/subscription" },
      ],
    },
    {
      title: "Company & Legal",
      links: [
        { label: "About StayTrack", href: "/about" },
        { label: "How StayTrack Works", href: "/how-it-works" },
        { label: "Contact Us", href: "/contact" },
        { label: "Help Center & FAQs", href: "/help" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-[11px] uppercase tracking-wider border border-primary/20">
            Site Navigation Directory
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mt-3">
            StayTrack Sitemap
          </h1>
          <p className="text-xs sm:text-sm text-muted font-semibold mt-2">
            Explore all verified location hubs, property stay models, host resources, and support pages.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sections.map((section, idx) => (
            <GlassCard key={idx} className="p-6 border border-border bg-surface flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground pb-2 border-b border-border/80">
                  {section.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link
                        href={link.href}
                        className="text-xs font-semibold text-muted hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span className="text-primary text-[10px]">›</span>
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          ))}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
