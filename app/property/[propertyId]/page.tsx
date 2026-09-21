"use client";

import { useEffect, useState, use } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { getPropertyDetails, getPropertyReviews, createBooking, createConversation, createReview } from "@/lib/api";
import { Property, Review } from "@/lib/types";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = use(params);
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("2026-10-15");
  const [endDate, setEndDate] = useState("2026-10-17");
  const [bookingLoading, setBookingLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getPropertyDetails(propertyId),
      getPropertyReviews(propertyId),
    ]).then(([propRes, revRes]) => {
      if (propRes.status === "fulfilled" && propRes.value) {
        setProperty(propRes.value);
      }
      if (revRes.status === "fulfilled" && Array.isArray(revRes.value)) {
        setReviews(revRes.value);
      }
    }).finally(() => setLoading(false));
  }, [propertyId]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await createBooking({
        propertyId,
        startDate,
        endDate,
      });
      alert("Booking request submitted! Host will review your request. 🎉");
      router.push("/booking");
    } catch (err: any) {
      alert("Booking failed: " + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleContactHost = async () => {
    if (!property?.hostId) {
      alert("Host details unavailable");
      return;
    }
    try {
      await createConversation({
        participantId: property.hostId,
        propertyId: property.id,
      });
      router.push("/chat");
    } catch (err: any) {
      router.push("/chat");
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setReviewLoading(true);
    try {
      const newRev = await createReview({
        propertyId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviews((prev) => [newRev, ...prev]);
      setReviewComment("");
      alert("Thank you for submitting your review!");
    } catch (err: any) {
      alert("Failed to submit review: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const displayTitle = property?.title || "Luxury 2BHK Glass Suite";
  const displayLocation = property ? `${property.area || ""}, ${property.city || "Bangalore"}` : "Koramangala, Bangalore";
  const displayPrice = property?.pricePerNight || property?.pricePerMonth || property?.price || 2400;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-1">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/search" className="hover:text-black">Search</Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold">Property Details</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading property details...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Details Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gallery Image Box */}
              <div className="h-80 w-full rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center relative overflow-hidden">
                <div className="relative z-10 text-center">
                  <span className="text-6xl">🏡</span>
                  <p className="text-xs font-bold text-zinc-700 mt-3">Verified Property Photo</p>
                </div>

                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <span className="clay-badge px-3 py-1 text-xs font-bold">Verified Listing</span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">₹0 Brokerage</span>
                </div>
              </div>

              {/* Header Info */}
              <GlassCard className="border border-zinc-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">{displayTitle}</h1>
                    <p className="text-xs font-semibold text-zinc-500 mt-2 flex items-center gap-1">
                      📍 {displayLocation} • Property ID: {propertyId}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full border border-zinc-300">
                      ★ {property?.rating || 4.9} ({reviews.length} Reviews)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-700 font-medium mt-4 leading-relaxed border-t border-zinc-100 pt-4">
                  {property?.description || "High-speed Wi-Fi, 24/7 security, fully equipped kitchen, direct owner communication with zero brokerage fees."}
                </p>
              </GlassCard>

              {/* Amenities Grid */}
              <ClayCard>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4">Included Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-zinc-800">
                  <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center gap-2">
                    <span>📶</span> Wi-Fi Enabled
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center gap-2">
                    <span>❄️</span> Air Conditioner
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center gap-2">
                    <span>🍳</span> Kitchen Setup
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center gap-2">
                    <span>🛡️</span> Security & CCTV
                  </div>
                </div>
              </ClayCard>

              {/* Reviews Section */}
              <GlassCard className="border border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">
                  Guest Reviews ({reviews.length})
                </h3>

                {/* Review Form */}
                <form onSubmit={handleAddReview} className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-800">Leave a Review</h4>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-zinc-600">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-sm cursor-pointer ${star <= reviewRating ? "text-amber-500" : "text-zinc-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Write your review here..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs border border-zinc-200 focus:border-black outline-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={reviewLoading || !reviewComment.trim()}
                    className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                  >
                    {reviewLoading ? "Posting..." : "Submit Review"}
                  </button>
                </form>

                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-zinc-900">{r.userName || "Guest"}</span>
                          <span className="text-amber-500 font-bold">★ {r.rating}</span>
                        </div>
                        <p className="text-zinc-600">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 font-medium text-center py-4">No reviews yet for this stay.</p>
                )}
              </GlassCard>
            </div>

            {/* Booking Summary Sidebar */}
            <div className="lg:col-span-1">
              <GlassCard className="sticky top-24 border border-zinc-300 shadow-xl space-y-5">
                <div className="flex justify-between items-baseline pb-4 border-b border-zinc-200">
                  <div>
                    <span className="text-3xl font-black text-black">{formatCurrency(displayPrice)}</span>
                    <span className="text-xs text-zinc-500 font-semibold"> / {property?.bookingType || "night"}</span>
                  </div>
                  <span className="clay-badge px-2.5 py-1 text-[11px] font-bold">
                    No Brokerage
                  </span>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="space-y-3 text-xs font-semibold text-zinc-700">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-zinc-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-zinc-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="glass-button w-full py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{bookingLoading ? "Submitting..." : "Reserve Stay Directly"}</span>
                    <span>→</span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleContactHost}
                  className="w-full py-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-900 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  💬 Chat with Host Directly
                </button>

                <p className="text-[11px] text-center text-zinc-500 font-medium">
                  Direct connection with verified host upon booking request.
                </p>
              </GlassCard>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

