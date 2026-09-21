"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getPropertyDetails } from "@/lib/api";
import { Property } from "@/types/property";

export default function HostPropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPropertyDetails(propertyId)
      .then((data) => setProperty(data))
      .catch((err) => console.warn("Failed to fetch host property details:", err))
      .finally(() => setLoading(false));
  }, [propertyId]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/host/properties" className="hover:text-black">My Properties</Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold">Property #{propertyId}</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading property...</div>
        ) : !property ? (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">🏢</span>
            <h3 className="text-base font-bold text-zinc-950 mt-3">Property Not Found</h3>
            <Link href="/host/properties" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
              Back to Properties
            </Link>
          </GlassCard>
        ) : (
          <GlassCard className="border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex justify-between items-start flex-wrap gap-4 pb-6 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                    {property.propertyType || "Flat"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    property.verificationStatus === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {property.verificationStatus || "Pending Verification"}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-zinc-950">{property.title}</h1>
                <p className="text-xs text-zinc-500 mt-1">📍 {property.city}, {property.area}</p>
              </div>

              <Link
                href={`/properties/${property.id}`}
                className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2.5"
              >
                View Public Page →
              </Link>
            </div>

            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-zinc-900 uppercase tracking-wider">Property Information</h3>
              <p className="text-zinc-700 leading-relaxed">{property.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-100 font-semibold">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Bedrooms</span>
                  <span>{property.bedrooms || 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Bathrooms</span>
                  <span>{property.bathrooms || 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Furnished</span>
                  <span>{property.furnished ? "Yes" : "No"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Stay Model</span>
                  <span>{property.bookingType || "daily"}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
