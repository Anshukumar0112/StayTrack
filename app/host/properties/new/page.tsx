"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import { createProperty } from "@/lib/api";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";

export default function CreateNewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("BNB");
  const [bookingType, setBookingType] = useState("daily");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Gurugram");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [furnished, setFurnished] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !description || !area || !price) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (!isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }

    setLoading(true);
    try {
      const priceNum = parseFloat(price);
      await createProperty({
        title,
        description,
        propertyType,
        bookingType,
        pricePerNight: bookingType === "daily" ? priceNum : undefined,
        pricePerMonth: bookingType === "monthly" ? priceNum : undefined,
        pricePerHour: bookingType === "hourly" ? priceNum : undefined,
        price: priceNum,
        city,
        area,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        furnished,
      });

      alert("Property submitted successfully for admin verification! 🎉");
      router.push("/host/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create property.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-3xl px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">Add New Property</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            List your Delhi NCR accommodation on StayTrack
          </p>
        </div>

        <GlassCard className="border border-zinc-200 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                Property Title
              </label>
              <input
                type="text"
                placeholder="e.g. Furnished 2BHK Apartment in Cyber City, Gurugram"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe key features, amenities, food availability, Wi-Fi speed, etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-xs font-medium border border-zinc-200 focus:border-black outline-none bg-zinc-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  {ACCOMMODATION_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.id} ({cat.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Stay Model
                </label>
                <select
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  <option value="daily">Nightly / Daily</option>
                  <option value="monthly">Monthly Stay</option>
                  <option value="hourly">Hourly Stay</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="2500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  City (Delhi NCR)
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  {SUPPORTED_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Area / Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cyber City, Sector 62"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Bedrooms</label>
                <input
                  type="number"
                  min={1}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Bathrooms</label>
                <input
                  type="number"
                  min={1}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Furnished</label>
                <button
                  type="button"
                  onClick={() => setFurnished(!furnished)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    furnished ? "bg-black text-white border-black" : "bg-zinc-100 text-zinc-700 border-zinc-300"
                  }`}
                >
                  {furnished ? "✓ Furnished" : "Unfurnished"}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Property Listing"}
              </button>
            </div>
          </form>
        </GlassCard>
      </main>

      <Footer />
    </div>
  );
}

