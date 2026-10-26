"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import Badge, { BadgeVariant } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categories";
import { getMyProperties, deleteProperty } from "@/lib/api";
import { Property, getPropertyId } from "@/types/property";
import {
  Building2Icon,
  MapPinIcon,
  PlusIcon,
  EditIcon,
  ExternalLinkIcon,
  TrashIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  SearchIcon,
} from "@/components/ui/Icons";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

function getPropertyPriceDisplay(p: Property): string {
  const price =
    p.dailyPrice ??
    p.pricePerNight ??
    p.monthlyPrice ??
    p.pricePerMonth ??
    p.hourlyPrice ??
    p.pricePerHour ??
    p.price ??
    0;

  const rawType = (p.bookingType || p.stayTypes?.[0] || "").toLowerCase();
  const cat = String(p.propertyType || p.category || "").toUpperCase();

  let period = "/ night";
  if (rawType.includes("month") || (cat === "FLAT" && !p.dailyPrice && !p.pricePerNight) || (cat === "PG" && !p.dailyPrice && !p.pricePerNight)) {
    period = "/ month";
  } else if (rawType.includes("hour")) {
    period = "/ hour";
  }

  return `${formatCurrency(price)} ${period}`;
}

function getStatusBadgeVariant(status?: string): BadgeVariant {
  switch ((status || "pending").toLowerCase()) {
    case "approved":
      return "verified";
    case "pending":
      return "warning";
    case "changes_required":
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

function getCategorySummary(p: Property): string | null {
  const cat = String(p.propertyType || p.category || "").toUpperCase();
  if (cat === "FLAT" || cat === "APARTMENT" || cat === "HOUSE") {
    const parts: string[] = [];
    if (p.bhkConfig) parts.push(p.bhkConfig);
    else if (p.bedrooms) parts.push(`${p.bedrooms} BHK`);
    if (p.furnished !== undefined) parts.push(p.furnished ? "Furnished" : "Unfurnished");
    if (p.areaSqFt) parts.push(`${p.areaSqFt} sq.ft`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (cat === "PG") {
    const parts: string[] = [];
    if (p.occupancyType) {
      const occMap: Record<string, string> = {
        single: "Single Room",
        double: "Double Sharing",
        triple: "Triple Sharing",
        four_plus: "4+ Sharing",
      };
      parts.push(occMap[p.occupancyType] || p.occupancyType);
    }
    if (p.genderCategory) {
      const gMap: Record<string, string> = {
        boys: "Boys PG",
        girls: "Girls PG",
        unisex: "Coliving",
        coliving: "Coliving",
      };
      parts.push(gMap[p.genderCategory] || p.genderCategory);
    }
    if (p.foodIncluded !== undefined) {
      parts.push(p.foodIncluded ? "Meals Included" : "Self Cooking");
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (cat === "HOSTEL") {
    const parts: string[] = [];
    if (p.roomType) parts.push(p.roomType === "dormitory" ? "Dormitory" : "Private Room");
    if (p.totalBeds) parts.push(`${p.totalBeds} Beds`);
    if (p.priceModel === "per_bed") parts.push("Per Bed");
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (cat === "BNB") {
    const parts: string[] = [];
    if (p.spaceType) {
      const sMap: Record<string, string> = {
        entire_place: "Entire Place",
        private_room: "Private Room",
        shared_room: "Shared Room",
      };
      parts.push(sMap[p.spaceType] || p.spaceType);
    }
    if (p.maxGuests) parts.push(`${p.maxGuests} Guests`);
    if (p.bedsCount) parts.push(`${p.bedsCount} Beds`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (cat === "HOTEL") {
    const parts: string[] = [];
    if (p.roomType) parts.push(p.roomType);
    if (p.bedType) parts.push(`${p.bedType} Bed`);
    if (p.breakfastIncluded) parts.push("Breakfast Included");
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  return null;
}

export default function HostPropertiesListPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProperties = () => {
    setLoading(true);
    setFetchError("");
    getMyProperties()
      .then((data) => {
        if (data && Array.isArray(data)) setProperties(data);
        else setProperties([]);
      })
      .catch((err) => {
        console.warn("Failed to fetch host properties:", err);
        setFetchError("Unable to load your properties. Please check your connection and try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (propId: string, title: string) => {
    setDeleteLoadingId(propId);
    try {
      await deleteProperty(propId);
      setBannerMessage({
        type: "success",
        text: `"${title}" has been removed from your listings.`,
      });
      setConfirmDeleteId(null);
      fetchProperties();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete property.";
      setBannerMessage({ type: "error", text: msg });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Counts for filter tabs
  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const p of properties) {
      const st = (p.verificationStatus || "pending").toLowerCase();
      if (st === "approved") approved++;
      else if (st === "rejected" || st === "changes_required") rejected++;
      else pending++;
    }
    return { all: properties.length, approved, pending, rejected };
  }, [properties]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const st = (p.verificationStatus || "pending").toLowerCase();
      if (statusFilter === "approved" && st !== "approved") return false;
      if (statusFilter === "pending" && st !== "pending") return false;
      if (statusFilter === "rejected" && st !== "rejected" && st !== "changes_required") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (p.title || "").toLowerCase().includes(q);
        const matchesCity = (p.city || "").toLowerCase().includes(q);
        const matchesArea = (p.area || "").toLowerCase().includes(q);
        const matchesCat = (p.propertyType || p.category || "").toLowerCase().includes(q);
        return matchesTitle || matchesCity || matchesArea || matchesCat;
      }

      return true;
    });
  }, [properties, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back to Dashboard */}
      <BackButton
        fallbackUrl="/host"
        label="Back to Dashboard"
        ariaLabel="Return to Host Dashboard"
        className="mb-2"
      />

        {/* Banner Alert Feedback */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 ${
              bannerMessage.type === "success"
                ? "bg-success-light border-success/25 text-success"
                : "bg-error-light border-error/25 text-error"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {bannerMessage.type === "success" ? (
                <CheckCircleIcon className="w-4 h-4 shrink-0 text-success" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-error" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-muted hover:text-foreground cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              My Listed Properties
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Manage your accommodations, edit listing fields, and check verification status
            </p>
          </div>

          <Link
            href="/host/properties/new"
            className="rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors flex items-center gap-1.5 focus-ring shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>List New Property</span>
          </Link>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "approved"
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === "pending"
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Pending ({counts.pending})
            </button>
            {counts.rejected > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("rejected")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === "rejected"
                    ? "bg-foreground text-background shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Needs Action ({counts.rejected})
              </button>
            )}
          </div>

          {/* Quick Search Input */}
          {properties.length > 0 && (
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <SearchIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search your listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3.5 py-1.5 text-xs font-medium text-foreground placeholder:text-muted/60 focus-ring"
              />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {loading ? (
          /* Loading Skeletons */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-3xl border border-border bg-surface shadow-2xs space-y-4 animate-pulse">
                <div className="h-44 w-full rounded-2xl bg-surface-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-surface-muted rounded" />
                  <div className="h-3 w-1/2 bg-surface-muted rounded" />
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <div className="h-4 w-20 bg-surface-muted rounded" />
                  <div className="h-4 w-16 bg-surface-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          /* Error State */
          <div className="py-16 text-center border border-dashed border-error/30 bg-surface rounded-3xl p-8 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-error-light text-error flex items-center justify-center mx-auto">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">Failed to Load Properties</h2>
            <p className="text-xs text-muted leading-relaxed">{fetchError}</p>
            <button
              type="button"
              onClick={fetchProperties}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : properties.length === 0 ? (
          /* Zero Properties Empty State */
          <div className="py-20 text-center border border-dashed border-border bg-surface rounded-3xl p-8 max-w-md mx-auto space-y-3 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto border border-border">
              <Building2Icon className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-bold text-foreground">No properties listed yet</h2>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
              Add your first accommodation to connect directly with guests across Delhi NCR with zero platform commission.
            </p>
            <Link
              href="/host/properties/new"
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-2xs"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>List Your First Property</span>
            </Link>
          </div>
        ) : filteredProperties.length === 0 ? (
          /* Filter Mismatch Empty State */
          <div className="py-16 text-center border border-dashed border-border bg-surface rounded-3xl p-8 max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-muted mx-auto">
              <SearchIcon className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No matching properties found</h3>
            <p className="text-xs text-muted">
              {searchQuery ? `No properties matched "${searchQuery}"` : "No properties in this category"}
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Properties Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((p, idx) => {
              const propId = getPropertyId(p) || `host-prop-${idx}`;
              const hasValidId = Boolean(getPropertyId(p));
              const primaryImage =
                Array.isArray(p.images) && p.images.length > 0
                  ? p.images[0]
                  : (p as any).imageUrl;

              const isConfirmingDelete = confirmDeleteId === propId;
              const isDeleting = deleteLoadingId === propId;
              const categorySummary = getCategorySummary(p);

              return (
                <div
                  key={propId}
                  className="rounded-3xl border border-border bg-surface hover:border-border-hover transition-all duration-200 p-5 flex flex-col justify-between shadow-2xs space-y-4"
                >
                  <div className="space-y-3">
                    {/* Cover Thumbnail with Fallback & Status Badges */}
                    <div className="aspect-[16/10] w-full rounded-2xl bg-surface-muted border border-border/80 overflow-hidden relative">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#F6F5F1] via-[#EFECE5] to-[#E3E0D6] flex flex-col items-center justify-center p-3 text-center">
                          <Building2Icon className="w-6 h-6 text-muted stroke-[1.5]" />
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider mt-1.5">
                            {getCategoryLabel(p.propertyType || p.category || "Stay")}
                          </span>
                        </div>
                      )}

                      {/* Top-left Category Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="sage" size="sm">
                          {getCategoryLabel(p.propertyType || p.category || "Stay")}
                        </Badge>
                      </div>

                      {/* Top-right Verification Status Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <Badge variant={getStatusBadgeVariant(p.verificationStatus)} size="sm">
                          {p.verificationStatus === "approved"
                            ? "Approved"
                            : p.verificationStatus === "rejected"
                            ? "Rejected"
                            : p.verificationStatus === "changes_required"
                            ? "Action Needed"
                            : "Pending Review"}
                        </Badge>
                      </div>
                    </div>

                    {/* Property Title & Location */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {p.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-muted">
                        <MapPinIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="line-clamp-1">
                          {[p.area, p.city].filter(Boolean).join(", ") || "Delhi NCR"}
                        </span>
                      </div>

                      {categorySummary && (
                        <p className="text-[11px] text-muted-light line-clamp-1 pt-0.5">
                          {categorySummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Management Action Bar */}
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted">Rate</span>
                      <span className="text-sm font-extrabold text-foreground">
                        {getPropertyPriceDisplay(p)}
                      </span>
                    </div>

                    {/* Inline Delete Confirmation or Action Row */}
                    {isConfirmingDelete ? (
                      <div className="p-3 rounded-2xl bg-error-light border border-error/25 space-y-2">
                        <p className="text-[11px] font-semibold text-error text-center">
                          Permanently delete this listing?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(propId, p.title)}
                            disabled={isDeleting}
                            className="flex-1 py-1.5 rounded-xl bg-error hover:bg-error/90 text-white font-semibold text-xs cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="flex-1 py-1.5 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {hasValidId ? (
                          <>
                            <Link
                              href={`/host/properties/${propId}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-surface-muted/60 hover:bg-surface text-foreground text-xs font-semibold transition-colors focus-ring"
                            >
                              <EditIcon className="w-3.5 h-3.5 text-muted" />
                              <span>Edit</span>
                            </Link>

                            <Link
                              href={`/properties/${propId}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-surface hover:bg-surface-muted text-primary text-xs font-semibold transition-colors focus-ring"
                            >
                              <span>View</span>
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(propId)}
                              className="p-2 rounded-xl border border-border hover:border-error/40 hover:bg-error-light text-muted hover:text-error transition-colors cursor-pointer focus-ring"
                              title="Delete Property"
                              aria-label="Delete property"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted font-medium">Processing listing ID...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
