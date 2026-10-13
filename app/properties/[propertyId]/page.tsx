"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import PropertyGallery from "@/components/properties/PropertyGallery";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { getPropertyDetails, getPropertyReviews, createConversation, createReview } from "@/lib/api";
import { Property, Review } from "@/types/property";

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

  const handleBookNow = () => {
    router.push(`/booking?propertyId=${propertyId}`);
  };

  const handleContactHost = async () => {
    try {
      await createConversation({
        propertyId,
      });
      router.push("/chat");
    } catch {
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

  const displayTitle = property?.title || "Property Listing";
  const displayLocation = property ? `${property.area || ""}, ${property.city || ""}` : "";
  const displayPrice = property?.pricePerNight || property?.pricePerMonth || property?.pricePerHour || property?.price || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full flex-1">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/properties" className="hover:text-black">Stays</Link>
          <span>/</span>
          <span className="text-zinc-900 font-bold">{displayTitle}</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Loading property details...
          </div>
        ) : !property ? (
          <GlassCard className="py-16 text-center border border-zinc-200">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-lg font-bold text-zinc-950 mt-3">Property Not Found</h3>
            <p className="text-xs text-zinc-500 mt-1">This property listing may have been removed or updated.</p>
            <Link href="/properties" className="mt-4 inline-block rounded-xl bg-black text-white px-5 py-2.5 text-xs font-bold">
              Back to Properties
            </Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Details Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <PropertyGallery images={property.images} title={property.title} />

              {/* Header Info */}
              <GlassCard className="border border-zinc-200">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">{displayTitle}</h1>
                    <p className="text-xs font-semibold text-zinc-500 mt-2 flex items-center gap-1">
                      📍 {displayLocation} • Property ID: {property.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-300">
                      ★ {property.rating || 4.8} ({reviews.length} Reviews)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-zinc-100 text-xs font-bold text-zinc-800">
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px] uppercase">Type</span>
                    <span>{property.propertyType || "Flat"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px] uppercase">Bedrooms</span>
                    <span>{property.bedrooms ? `${property.bedrooms} Bedrooms` : "N/A"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px] uppercase">Bathrooms</span>
                    <span>{property.bathrooms ? `${property.bathrooms} Bathrooms` : "N/A"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px] uppercase">Furnishing</span>
                    <span>{property.furnished ? "Furnished" : "Unfurnished"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                    {property.description}
                  </p>
                </div>
              </GlassCard>

              {/* Pricing Breakdown */}
              <ClayCard>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4">Pricing Models</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {property.pricePerNight && (
                    <div className="p-3 rounded-xl bg-white border border-zinc-200">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Daily Rate</span>
                      <span className="text-base font-black text-black">{formatCurrency(property.pricePerNight)}</span>
                      <span className="text-[10px] text-zinc-500"> / night</span>
                    </div>
                  )}
                  {property.pricePerMonth && (
                    <div className="p-3 rounded-xl bg-white border border-zinc-200">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Monthly Rent</span>
                      <span className="text-base font-black text-black">{formatCurrency(property.pricePerMonth)}</span>
                      <span className="text-[10px] text-zinc-500"> / month</span>
                    </div>
                  )}
                  {property.pricePerHour && (
                    <div className="p-3 rounded-xl bg-white border border-zinc-200">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Hourly Slot</span>
                      <span className="text-base font-black text-black">{formatCurrency(property.pricePerHour)}</span>
                      <span className="text-[10px] text-zinc-500"> / hour</span>
                    </div>
                  )}
                </div>
              </ClayCard>

              {/* Reviews Section */}
              <GlassCard className="border border-zinc-200">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4">
                  Guest Reviews ({reviews.length})
                </h3>

                {/* Add Review Form */}
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

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <GlassCard className="lg:sticky lg:top-24 border border-border shadow-xl space-y-5 bg-surface">
                <div className="flex justify-between items-baseline pb-4 border-b border-border">
                  <div>
                    <span className="text-3xl font-black text-foreground">{formatCurrency(displayPrice)}</span>
                    <span className="text-xs text-muted font-semibold"> / {property.bookingType || "night"}</span>
                  </div>
                  <span className="clay-badge px-2.5 py-1 text-[10px] font-extrabold uppercase">
                    ₹0 Brokerage
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleBookNow}
                    className="w-full py-4 rounded-xl bg-primary hover:bg-[#111716] text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>BOOK NOW</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleContactHost}
                    className="w-full py-3.5 rounded-xl border border-border bg-background hover:bg-surface text-xs font-bold text-foreground transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    💬 Chat with Host
                  </button>
                </div>

                <p className="text-[11px] text-center text-muted font-medium leading-relaxed">
                  Direct host approval. Spring Boot backend calculates authoritative price during booking creation.
                </p>
              </GlassCard>
            </div>
          </div>
        )}

        {/* Fixed Mobile Floating Booking Bar */}
        {property && (
          <div className="lg:hidden fixed bottom-[calc(3.8rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border p-3 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xl font-black text-foreground block leading-tight">{formatCurrency(displayPrice)}</span>
              <span className="text-[10px] text-muted font-bold">/{property.bookingType || "night"}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleContactHost}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-foreground font-bold text-xs cursor-pointer"
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={handleBookNow}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-xs shadow-md cursor-pointer"
              >
                BOOK NOW →
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
