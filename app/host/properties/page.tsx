"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import Link from "next/link";
import { getMyProperties, deleteProperty } from "@/lib/api";
import { Property, getPropertyId } from "@/types/property";

export default function HostPropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const fetchProperties = () => {
    setLoading(true);
    getMyProperties()
      .then((data) => {
        if (data && Array.isArray(data)) setProperties(data);
        else setProperties([]);
      })
      .catch((err) => console.warn("Failed to fetch host properties:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (propId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    setDeleteLoadingId(propId);
    try {
      await deleteProperty(propId);
      alert("Property deleted successfully.");
      fetchProperties();
    } catch (err: any) {
      alert("Failed to delete property: " + err.message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

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
            {properties.map((p, idx) => {
              const propId = getPropertyId(p) || `host-prop-${idx}`;
              const hasValidId = Boolean(getPropertyId(p));
              const primaryImage = p.images && p.images.length > 0 ? p.images[0] : null;

              return (
                <GlassCard key={propId} hoverEffect className="border border-zinc-200 p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Property Cover Thumbnail */}
                    <div className="h-40 w-full rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden relative">
                      {primaryImage ? (
                        <img src={primaryImage} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏢</div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                          {p.propertyType || "Flat"}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm ${
                          p.verificationStatus === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.verificationStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {p.verificationStatus || "Pending"}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-950 line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-zinc-500">📍 {p.city}, {p.area}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-xs font-bold">
                    <span>₹{(p.dailyPrice || p.pricePerNight || p.monthlyPrice || p.pricePerMonth || p.hourlyPrice || p.pricePerHour || p.price || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-3">
                      {hasValidId ? (
                        <>
                          <Link href={`/host/properties/${propId}`} className="text-zinc-700 hover:text-black font-bold">
                            Edit
                          </Link>
                          <Link href={`/properties/${propId}`} className="text-emerald-600 hover:underline font-bold">
                            Public Page →
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(propId, p.title)}
                            disabled={deleteLoadingId === propId}
                            className="text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-50"
                            title="Delete Property"
                          >
                            {deleteLoadingId === propId ? "..." : "🗑️"}
                          </button>
                        </>
                      ) : (
                        <span className="text-zinc-400 text-[10px]">Processing ID...</span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
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
