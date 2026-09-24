"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyProperties } from "@/lib/api";
import { Property } from "@/types/property";

export default function HostPropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProperties()
      .then((data) => {
        if (data && Array.isArray(data)) setProperties(data);
        else setProperties([]);
      })
      .catch((err) => console.warn("Failed to fetch host properties:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">My Listed Properties</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Manage your accommodations and admin verification status</p>
          </div>

          <Link
            href="/host/properties/new"
            className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-5 py-3 shadow-md flex items-center gap-2"
          >
            <span>+ List New Property</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading your properties...</div>
        ) : properties.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p, idx) => (
              <GlassCard key={p.id || (p as any).propertyId || `host-prop-${idx}`} hoverEffect className="border border-zinc-200 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                    {p.propertyType || "Flat"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    p.verificationStatus === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : p.verificationStatus === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {p.verificationStatus || "Pending"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-950 line-clamp-1">{p.title}</h3>
                <p className="text-xs text-zinc-500">📍 {p.city}, {p.area}</p>

                <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-xs font-bold">
                  <span>₹{p.pricePerNight || p.pricePerMonth || p.pricePerHour || p.price || 0}</span>
                  <div className="flex gap-2">
                    <Link href={`/host/properties/${p.id}`} className="text-zinc-600 hover:text-black">
                      Edit
                    </Link>
                    <Link href={`/properties/${p.id}`} className="text-emerald-600 hover:underline">
                      Public Page →
                    </Link>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">🏢</span>
            <h3 className="text-base font-bold text-zinc-950 mt-3">No properties listed yet</h3>
            <p className="text-xs text-zinc-500 mt-1">Add your first property listing to connect directly with guests.</p>
            <Link
              href="/host/properties/new"
              className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold"
            >
              + Add Property
            </Link>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
