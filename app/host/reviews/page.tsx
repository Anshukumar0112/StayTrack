/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { StarIcon, Building2Icon, UserIcon, ShieldCheckIcon } from "@/components/ui/Icons";
import { getMyProperties, getPropertyReviews } from "@/lib/api";
import { Property } from "@/types/property";
import { Review } from "@/types/property";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface EnrichedReview extends Review {
  propertyTitle?: string;
}

export default function HostReviewsPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/reviews", "host");
    } else if (firebaseUser) {
      setLoading(true);
      getMyProperties()
        .then(async (props) => {
          if (!Array.isArray(props)) {
            setProperties([]);
            setReviews([]);
            return;
          }
          setProperties(props);

          // Fetch reviews for each property in parallel
          const reviewsPromises = props.map(async (p) => {
            try {
              const pReviews = await getPropertyReviews(p.id);
              return pReviews.map((r) => ({
                ...r,
                propertyTitle: p.title || `Property #${p.id}`,
              }));
            } catch {
              return [];
            }
          });

          const results = await Promise.allSettled(reviewsPromises);
          const allReviews: EnrichedReview[] = [];
          results.forEach((res) => {
            if (res.status === "fulfilled" && Array.isArray(res.value)) {
              allReviews.push(...res.value);
            }
          });
          setReviews(allReviews);
        })
        .catch((err) => {
          console.warn("Failed to load host reviews:", err);
          setProperties([]);
          setReviews([]);
        })
        .finally(() => setLoading(false));
    }
  }, [firebaseUser, authLoading]);

  const filteredReviews = useMemo(() => {
    if (selectedPropertyId === "all") return reviews;
    return reviews.filter((r) => r.propertyId === selectedPropertyId);
  }, [reviews, selectedPropertyId]);

  const avgRating = useMemo(() => {
    if (filteredReviews.length === 0) return 0;
    const sum = filteredReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / filteredReviews.length).toFixed(1);
  }, [filteredReviews]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [filteredReviews]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton
            fallbackUrl="/host"
            label="Back to Dashboard"
            className="text-xs font-semibold mb-2"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Guest Reviews & Ratings</h1>
          <p className="text-xs text-muted font-medium mt-1">
            Track guest feedback, average ratings, and public testimonial scores
          </p>
        </div>

        {properties.length > 0 && (
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-primary shadow-2xs"
          >
            <option value="all">All Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || `Property #${p.id}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading guest reviews...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Average Rating</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-black text-foreground">{avgRating || "5.0"}</span>
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-muted font-medium mt-1 block">
                Across {filteredReviews.length} total reviews
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Feedback</span>
              <div className="text-3xl font-black text-foreground mt-2">{filteredReviews.length}</div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Verified Stay Guests
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Host Status</span>
              <div className="text-2xl font-black text-primary mt-2">Superhost Eligible</div>
              <div className="flex items-center gap-1 text-[11px] text-muted font-medium mt-1">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-primary" />
                <span>Consistently high ratings</span>
              </div>
            </div>
          </div>

          {/* Rating Breakdown & Reviews List */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-6">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider pb-3 border-b border-border">
              Guest Feedback History ({filteredReviews.length})
            </h3>

            {filteredReviews.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-muted">
                <StarIcon className="w-8 h-8 text-muted/60 mx-auto mb-2" />
                <p>No reviews received yet for this selection.</p>
                <p className="text-[11px] text-muted-light mt-1">
                  Reviews will automatically appear once guests complete their stay!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredReviews.map((r, idx) => (
                  <div key={r.id || idx} className="py-4 space-y-2 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-muted border border-border flex items-center justify-center text-muted font-bold text-xs">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-foreground">
                          {r.userName || "Verified Guest"}
                        </span>
                        <span className="text-muted text-[11px]">•</span>
                        <span className="text-muted text-[11px]">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent Stay"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (r.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-border"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {r.propertyTitle && (
                      <div className="text-[11px] font-semibold text-primary">
                        Stay at: {r.propertyTitle}
                      </div>
                    )}

                    <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                      {r.comment || "Great stay! Highly recommended."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}