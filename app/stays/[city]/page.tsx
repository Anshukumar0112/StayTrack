import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyMap from "@/components/properties/PropertyMap";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { SUPPORTED_LOCATIONS, SupportedLocation } from "@/lib/locations";
import { getStayProperties } from "@/lib/api";
import { Property } from "@/types/property";

interface PageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ area?: string; category?: string }>;
}

function getLocationBySlug(slug: string): SupportedLocation | undefined {
  const clean = slug.trim().toLowerCase();
  return SUPPORTED_LOCATIONS.find((loc) => {
    const locSlug = loc.name.toLowerCase().replace(/\s+/g, "-");
    return loc.id === clean || locSlug === clean;
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const location = getLocationBySlug(city);

  if (!location) {
    return {
      title: "Location Not Found | StayTrack",
    };
  }

  const name = location.name;
  const canonicalUrl = `https://staytrack.in/stays/${location.id}`;

  let desc = `Find verified stays in ${name}, including BNBs, PGs, hotels, and monthly rentals across ${location.landmark} and major Delhi NCR transit hubs.`;
  if (location.id === "greater-noida") {
    desc = `Find verified stays in Greater Noida, including BNBs, PGs, hotels and monthly rentals near Knowledge Park, Pari Chowk and Noida-Greater Noida Expressway.`;
  }

  return {
    title: `Stays in ${name} | Verified BNBs, PGs & Hotels | StayTrack`,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Stays in ${name} | StayTrack Delhi NCR`,
      description: desc,
      url: canonicalUrl,
      siteName: "StayTrack",
      type: "website",
    },
  };
}

export default async function LocationStaysPage({ params, searchParams }: PageProps) {
  const { city } = await params;
  const { area } = await searchParams;
  const location = getLocationBySlug(city);

  if (!location) {
    notFound();
  }

  // Fetch real properties from API
  let allStays: Property[] = [];
  try {
    const fetched = await getStayProperties();
    allStays = Array.isArray(fetched) ? fetched : [];
  } catch (err) {
    console.warn("Failed to load stays for location page:", err);
  }

  // Filter for current city
  const cityStays = allStays.filter((s) => {
    if (!s.city) return false;
    const cNorm = s.city.toLowerCase().trim();
    const lNorm = location.name.toLowerCase().trim();
    return cNorm === lNorm || cNorm.includes(lNorm) || lNorm.includes(cNorm);
  });

  // Further area filtering if specified (e.g. Knowledge Park)
  const filteredStays = area
    ? cityStays.filter((s) => s.area && s.area.toLowerCase().includes(area.toLowerCase()))
    : cityStays;

  const isGreaterNoida = location.id === "greater-noida";

  // Structured Data (Schema.org Breadcrumb & ItemList)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://staytrack.in" },
      { "@type": "ListItem", position: 2, name: "Delhi NCR Stays", item: "https://staytrack.in/properties" },
      { "@type": "ListItem", position: 3, name: location.name, item: `https://staytrack.in/stays/${location.id}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Verified Stays in ${location.name}`,
    numberOfItems: filteredStays.length,
    itemListElement: filteredStays.map((prop, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Accommodation",
        name: prop.title,
        address: {
          "@type": "PostalAddress",
          addressLocality: prop.area || location.name,
          addressRegion: location.state,
          addressCountry: "IN",
        },
        url: `https://staytrack.in/properties/${prop.id || (prop as any).propertyId}`,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Breadcrumbs Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-muted mb-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/properties" className="hover:text-foreground">Delhi NCR</Link>
          <span>/</span>
          <span className="text-foreground font-bold">{location.name}</span>
        </nav>

        {/* Hero Header Section */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-xs">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#3F8A68]/15 text-[#3F8A68] font-extrabold text-[10px] uppercase tracking-wider border border-[#3F8A68]/30">
                Verified Location Hub • {location.state}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mt-2">
                Stays in {location.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted font-medium mt-1 max-w-2xl leading-relaxed">
                {location.description || `Explore verified BNBs, hostels, PGs, hotels, and flats across ${location.name}.`}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-foreground bg-background px-3.5 py-2 rounded-xl border border-border">
                {filteredStays.length} {filteredStays.length === 1 ? "Property" : "Properties"} Found
              </span>
            </div>
          </div>

          {/* Greater Noida Locality Highlights */}
          {isGreaterNoida && (
            <div className="mt-6 pt-6 border-t border-border/80">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3">
                Greater Noida Locality & Transit Hubs
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/stays/greater-noida"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    !area
                      ? "bg-[#111716] text-white border-[#111716]"
                      : "bg-background border-border text-foreground hover:border-[#111716]"
                  }`}
                >
                  All Greater Noida
                </Link>
                <Link
                  href="/stays/greater-noida?area=Knowledge+Park"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    area === "Knowledge Park"
                      ? "bg-[#111716] text-white border-[#111716]"
                      : "bg-background border-border text-foreground hover:border-[#111716]"
                  }`}
                >
                  Knowledge Park (I, II, III)
                </Link>
                <Link
                  href="/stays/greater-noida?area=Pari+Chowk"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    area === "Pari Chowk"
                      ? "bg-[#111716] text-white border-[#111716]"
                      : "bg-background border-border text-foreground hover:border-[#111716]"
                  }`}
                >
                  Pari Chowk Hub
                </Link>
                <Link
                  href="/stays/greater-noida?area=Expressway"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    area === "Expressway"
                      ? "bg-[#111716] text-white border-[#111716]"
                      : "bg-background border-border text-foreground hover:border-[#111716]"
                  }`}
                >
                  Noida-Greater Noida Expressway
                </Link>
              </div>
              <p className="text-[11px] text-muted font-medium mt-3 leading-relaxed">
                🚆 <strong>Aqua Line Metro Connectivity:</strong> Knowledge Park II and Pari Chowk metro stations connect Greater Noida directly to Sector 51 Noida and central NCR corridors.
              </p>
            </div>
          )}
        </div>

        {/* Results Grid + Map Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            {filteredStays.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredStays.map((prop, idx) => (
                  <PropertyCard
                    key={prop.id || (prop as any).propertyId || `loc-prop-${idx}`}
                    property={prop}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="py-16 text-center border border-border bg-surface">
                <span className="text-4xl">🏡</span>
                <h3 className="text-base font-bold text-foreground mt-3">
                  No verified stays currently listed in {area ? `${area}, ` : ""}{location.name}
                </h3>
                <p className="text-xs text-muted mt-2 max-w-sm mx-auto">
                  We are actively onboarding verified property hosts across {location.name}. Check back soon or explore all Delhi NCR stays.
                </p>
                <Link
                  href="/properties"
                  className="mt-4 inline-block rounded-xl bg-primary text-white px-4 py-2 text-xs font-bold hover:bg-[#111716] transition-all"
                >
                  Explore All Delhi NCR Stays
                </Link>
              </GlassCard>
            )}
          </div>

          {/* Interactive Location Map */}
          <div className="lg:col-span-5 sticky top-[100px]">
            <PropertyMap
              properties={filteredStays}
              activeCity={location.name}
              className="w-full h-[500px]"
            />
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
