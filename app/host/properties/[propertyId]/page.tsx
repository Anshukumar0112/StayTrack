"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import PropertyImageUploader from "@/components/property/PropertyImageUploader";
import Link from "next/link";
import { getPropertyDetails, updateProperty, deleteProperty } from "@/lib/api";
import { Property, getPropertyId } from "@/types/property";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";

export default function HostPropertyEditPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const router = useRouter();
  const { propertyId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  const [images, setImages] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");

  useEffect(() => {
    setLoading(true);
    getPropertyDetails(propertyId)
      .then((data) => {
        if (data) {
          setTitle(data.title || "");
          setDescription(data.description || "");
          setPropertyType(data.propertyType || "BNB");
          const bType = data.bookingType || (data.stayTypes && data.stayTypes[0]) || "daily";
          setBookingType(bType.toLowerCase());

          const extractedPrice =
            data.pricePerNight ||
            data.pricePerMonth ||
            data.pricePerHour ||
            data.dailyPrice ||
            data.monthlyPrice ||
            data.hourlyPrice ||
            data.price ||
            "";
          setPrice(String(extractedPrice));

          setCity(data.city || "Gurugram");
          setArea(data.area || "");
          setBedrooms(data.bedrooms || 1);
          setBathrooms(data.bathrooms || 1);
          setFurnished(data.furnished ?? true);
          setImages(Array.isArray(data.images) ? data.images : []);
          setVerificationStatus(data.verificationStatus || "pending");
        }
      })
      .catch((err) => {
        console.error("Failed to load property details:", err);
        setError("Failed to load property details.");
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title || !description || !area || !price) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (!isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }

    setSaving(true);
    try {
      const priceNum = parseFloat(price);
      const stayTypeVal = bookingType.toLowerCase();

      await updateProperty(propertyId, {
        title,
        description,
        propertyType,
        bookingType: stayTypeVal,
        stayTypes: [stayTypeVal],
        pricePerNight: stayTypeVal === "daily" ? priceNum : undefined,
        pricePerMonth: stayTypeVal === "monthly" ? priceNum : undefined,
        pricePerHour: stayTypeVal === "hourly" ? priceNum : undefined,
        dailyPrice: stayTypeVal === "daily" ? priceNum : undefined,
        monthlyPrice: stayTypeVal === "monthly" ? priceNum : undefined,
        hourlyPrice: stayTypeVal === "hourly" ? priceNum : undefined,
        price: priceNum,
        city,
        area,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        furnished,
        images,
      });

      setSuccess("Property details updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update property.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${title || propertyId}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await deleteProperty(propertyId);
      alert("Property deleted successfully.");
      router.push("/host/properties");
    } catch (err: any) {
      setError(err.message || "Failed to delete property.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Link href="/host/properties" className="hover:text-black">My Properties</Link>
            <span>/</span>
            <span className="text-zinc-900 font-bold">Edit Property</span>
          </div>

          {!loading && (
            <Link
              href={`/properties/${propertyId}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
            >
              <span>View Public Page</span> ↗
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading property data...</div>
        ) : (
          <GlassCard className="border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200 flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                    ID: {propertyId}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    verificationStatus === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : verificationStatus === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {verificationStatus === "approved"
                      ? "Verified & Active"
                      : verificationStatus === "rejected"
                      ? "Rejected"
                      : "Pending Verification"}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-zinc-950">Edit Property</h1>
              </div>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "🗑️ Delete Property"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
                  {success}
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

              <div className="pt-4 border-t border-zinc-100">
                <PropertyImageUploader images={images} onChange={setImages} />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
                <Link
                  href="/host/properties"
                  className="px-5 py-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-100 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </GlassCard>
        )}
      </main>

      <Footer />
    </div>
  );
}
