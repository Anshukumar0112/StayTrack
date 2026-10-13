"use client";

import { useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const navColumns = [
    {
      id: "explore",
      title: "EXPLORE STAYS",
      links: [
        { label: "All Stays", href: "/properties" },
        { label: "Daily Stays", href: "/properties?stayType=daily" },
        { label: "Monthly Rentals", href: "/properties?stayType=monthly" },
        { label: "Hourly Stays", href: "/properties?stayType=hourly" },
      ],
    },
    {
      id: "locations",
      title: "POPULAR LOCATIONS",
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
      id: "categories",
      title: "PROPERTY TYPES",
      links: [
        { label: "BNBs", href: "/properties?category=BNB" },
        { label: "Hostels", href: "/properties?category=HOSTEL" },
        { label: "PGs", href: "/properties?category=PG" },
        { label: "Hotels", href: "/properties?category=HOTEL" },
        { label: "Flats", href: "/properties?category=FLAT" },
      ],
    },
    {
      id: "company",
      title: "COMPANY & SUPPORT",
      links: [
        { label: "About StayTrack", href: "/about" },
        { label: "How StayTrack Works", href: "/how-it-works" },
        { label: "Contact Us", href: "/contact" },
        { label: "Help Center", href: "/help" },
        { label: "List Your Property", href: "/host/application" },
        { label: "Sitemap", href: "/sitemap" },
      ],
    },
  ];

  return (
    <footer className="mt-auto bg-[#111716] text-white py-12 pb-28 md:pb-12 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* 5-Column Layout Grid */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-5">
          {/* COLUMN 1: STAYTRACK BRANDING */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="StayTrack"
                className="h-8 w-auto object-contain brightness-0 invert opacity-95"
              />
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400 font-medium">
              India's direct property & stay marketplace connecting guests with verified hosts across Delhi NCR.
            </p>

            {/* Subtly Integrated Platform Integrity */}
            <div className="pt-2">
              <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#3F8A68] font-bold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-[#3F8A68] animate-pulse" />
                  <span>Verified REST Engine</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight font-medium">
                  Spring Boot security & Razorpay payments.
                </p>
              </div>
            </div>
          </div>

          {/* COLUMNS 2-5: NAVIGATION SECTIONS (Desktop static, Mobile accordion) */}
          {navColumns.map((col) => {
            const isOpen = openSection === col.id;
            return (
              <div key={col.id} className="border-b md:border-b-0 border-white/10 pb-4 md:pb-0">
                {/* Mobile Collapsible Header / Desktop Static Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(col.id)}
                  className="w-full flex justify-between items-center md:cursor-default text-left cursor-pointer py-1 md:py-0"
                >
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">
                    {col.title}
                  </h4>
                  <span className="md:hidden text-xs text-zinc-400 font-bold">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* List Items */}
                <ul
                  className={`mt-3 space-y-2 text-xs font-medium text-zinc-400 transition-all duration-200 ${
                    isOpen ? "block" : "hidden md:block"
                  }`}
                >
                  {col.links.map((link, idx) => (
                    <li key={idx}>
                      <Link
                        href={link.href}
                        className="hover:text-white hover:underline transition-colors duration-200 block py-0.5"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer Bottom Legal & Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-medium gap-3">
          <p>© {new Date().getFullYear()} StayTrack Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors duration-200">
              Terms of Service
            </Link>
            <Link href="/host/application" className="hover:text-white transition-colors duration-200">
              List Property
            </Link>
            <Link href="/sitemap" className="hover:text-white transition-colors duration-200">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
