"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { listAdminReviews, deleteAdminReview } from "@/lib/api";
import {
  MessageCircleIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  CloseIcon,
  Building2Icon,
} from "@/components/ui/Icons";

type RatingFilter = "all" | 5 | 4 | 3 | 2 | 1;

export default function AdminReviewsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteModalReview, setDeleteModalReview] = useState<any | null>(null);

  const fetchReviews = () => {
    if (!isAdmin) return;
    setLoading(true);
    setFetchError(null);
    listAdminReviews({
      rating: ratingFilter === "all" ? undefined : ratingFilter,
      pageSize: 100,
    })
      .then((res) => {
        const list = res?.reviews || res?.content || res?.data || (Array.isArray(res) ? res : []);
        setReviews(Array.isArray(list) ? list : []);
      })
      .catch((err: any) => {
        console.warn("Notice: fetch admin reviews:", err?.message);
        setFetchError(err?.message || "Unable to fetch reviews from server");
        setReviews([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReviews();
    }
  }, [isAdmin, ratingFilter]);

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase().trim();
    return reviews.filter((r) => {
      const comment = String(r.comment || "").toLowerCase();
      const reviewerName = String(r.reviewerName || "").toLowerCase();
      const propertyTitle = String(r.propertyTitle || "").toLowerCase();
      const propertyId = String(r.propertyId || "").toLowerCase();
      return (
        comment.includes(q) ||
        reviewerName.includes(q) ||
        propertyTitle.includes(q) ||
        propertyId.includes(q)
      );
    });
  }, [reviews, searchQuery]);

  const handleDelete = async () => {
    if (!deleteModalReview) return;
    const reviewId = deleteModalReview.reviewId || deleteModalReview.id;
    setActionLoadingId(reviewId);
    try {
      await deleteAdminReview(reviewId);
      setDeleteModalReview(null);
      fetchReviews();
    } catch (err: any) {
      alert(`Failed to delete review: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Review Moderation Console</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Monitor verified guest reviews, audit ratings across accommodations, and remove abusive or fraudulent content
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setRatingFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              ratingFilter === "all"
                ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatingFilter(r as RatingFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                ratingFilter === r
                  ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>{r}</span>
              <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search review, guest, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
          />
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-zinc-400">Loading reviews for moderation...</div>
      ) : fetchError ? (
        <GlassCard className="p-12 text-center border border-amber-200 bg-amber-50/20 space-y-3">
          <AlertTriangleIcon className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900">Reviews Sync Notice</h3>
          <p className="text-xs text-zinc-600 max-w-md mx-auto">{fetchError}</p>
          <button
            type="button"
            onClick={fetchReviews}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </GlassCard>
      ) : filteredReviews.length === 0 ? (
        <GlassCard className="p-12 text-center border border-zinc-200 space-y-2">
          <MessageCircleIcon className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No reviews found</p>
          <p className="text-xs text-zinc-500">
            {searchQuery
              ? `No guest reviews match "${searchQuery}"`
              : "No reviews submitted in this rating bracket"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => {
            const reviewId = r.reviewId || r.id;
            const rating = Number(r.rating || 5);
            const propertyId = r.propertyId;

            // Format date
            let dateStr = "Recent";
            if (r.createdAt) {
              if (r.createdAt._seconds) {
                dateStr = new Date(r.createdAt._seconds * 1000).toLocaleDateString();
              } else if (typeof r.createdAt === "string") {
                dateStr = new Date(r.createdAt).toLocaleDateString();
              }
            }

            return (
              <GlassCard
                key={reviewId}
                className="p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Rating Stars & Property */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-zinc-200 fill-zinc-200"
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-bold text-zinc-900">{rating}.0 / 5.0</span>

                    <span className="text-[11px] text-zinc-400">•</span>

                    <Link
                      href={`/properties/${propertyId}`}
                      target="_blank"
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Building2Icon className="w-3.5 h-3.5" />
                      <span>{r.propertyTitle || "View Property Listing"}</span>
                      <ExternalLinkIcon className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-zinc-800 leading-relaxed font-normal bg-zinc-50/70 p-3 rounded-2xl border border-zinc-100">
                    &quot;{r.comment || r.content || "No comment provided."}&quot;
                  </p>

                  {/* Reviewer & Meta */}
                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-500 pt-0.5">
                    <span>
                      Reviewer: <strong className="text-zinc-700">{r.reviewerName || "Verified Guest"}</strong>
                    </span>
                    <span>•</span>
                    <span>Stay Date: {dateStr}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">Review ID: #{reviewId}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeleteModalReview(r)}
                    disabled={actionLoadingId === reviewId}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Delete Review</span>
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalReview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-950">Delete Guest Review?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                This will permanently remove this review from the property listing and recalculate the property&apos;s average rating.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl text-xs text-zinc-700 italic border border-zinc-100">
              &quot;{deleteModalReview.comment || deleteModalReview.content || "No comment text"}&quot;
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalReview(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Keep Review
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoadingId !== null}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId !== null ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
