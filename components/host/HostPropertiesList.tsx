"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import {
  Building2Icon,
  MapPinIcon,
  EditIcon,
  ExternalLinkIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import type { Property } from "@/types/property";
import { getPropertyId } from "@/types/property";
import { formatCurrency } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categories";
import type { BadgeVariant } from "@/components/ui/Badge";

function getStatusVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case "approved":
      return "verified";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

function getPriceDisplay(p: Property): string {
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
  if (
    rawType.includes("month") ||
    ((cat === "FLAT" || cat === "PG") && !p.dailyPrice && !p.pricePerNight)
  ) {
    period = "/ month";
  } else if (rawType.includes("hour")) {
    period = "/ hour";
  }

  return `${formatCurrency(price)} ${period}`;
}

interface HostPropertiesListProps {
  properties: Property[];
  loading: boolean;
}

export default function HostPropertiesList({ properties, loading }: HostPropertiesListProps) {
  return (
    <div className="bg-white border border-border rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header with dot indicator */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">
              My Listed Properties ({properties.length})
            </h2>
            <p className="text-xs text-muted">
              Live accommodations, occupancy models, and verification status
            </p>
          </div>
        </div>
        <Link
          href="/host/properties"
          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Manage All</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex-1 min-w-[280px] rounded-2xl border border-border bg-surface-muted/60 animate-pulse h-56"
            />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {properties.slice(0, 4).map((p, idx) => {
            const propId = getPropertyId(p) || `my-prop-${idx}`;
            const primaryImage =
              Array.isArray(p.images) && p.images.length > 0
                ? p.images[0]
                : (p as any).imageUrl;
            const category = p.propertyType || p.category || "Stay";
            const status = p.verificationStatus || "pending";

            return (
              <div
                key={propId}
                className="flex-1 min-w-[260px] max-w-full sm:max-w-[calc(50%-0.5rem)] p-4 rounded-2xl border border-border bg-white hover:border-border-hover transition-all flex flex-col justify-between space-y-3 shadow-2xs"
              >
                <div className="space-y-2.5">
                  {/* Thumbnail */}
                  <div className="h-32 w-full rounded-xl bg-surface-muted border border-border overflow-hidden relative">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#F6F5F1] to-[#E3E0D6] flex flex-col items-center justify-center p-2 text-center">
                        <Building2Icon className="w-6 h-6 text-muted stroke-[1.5]" />
                        <span className="text-[10px] font-bold text-foreground mt-1 uppercase tracking-wider">
                          {getCategoryLabel(category)}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <Badge variant="sage" size="sm">
                        {getCategoryLabel(category)}
                      </Badge>
                    </div>

                    <div className="absolute top-2 right-2">
                      <Badge variant={getStatusVariant(status)} size="sm">
                        {status}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-xs font-bold text-foreground truncate">{p.title}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
                    <span className="truncate">
                      {[p.area, p.city].filter(Boolean).join(", ") || "Delhi NCR"}
                    </span>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="pt-2.5 border-t border-border flex justify-between items-center text-xs">
                  <span className="font-extrabold text-foreground">
                    {getPriceDisplay(p)}
                  </span>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/host/properties/${propId}`}
                      className="text-muted hover:text-foreground font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Edit Property"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <Link
                      href={`/properties/${propId}`}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1 transition-colors"
                      title="View Public Page"
                    >
                      <span>View</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-border rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto border border-border">
            <Building2Icon className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No properties listed yet</h3>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            List your BNB, Hostel, PG, Hotel or Flat on StayTrack with zero brokerage fees.
          </p>
          <Link
            href="/host/properties/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 py-2.5 shadow-2xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>List Your First Property</span>
          </Link>
        </div>
      )}
    </div>
  );
}
