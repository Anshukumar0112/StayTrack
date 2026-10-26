"use client";

import React from "react";
import { Property, Review } from "@/types/property";
import {
  BadgeCheckIcon,
  ShieldCheckIcon,
  MessageCircleIcon,
  StarIcon,
  CheckIcon,
} from "@/components/ui/Icons";

interface PropertyHostCardProps {
  property: Property;
  reviews: Review[];
  onContactHost: () => void;
  contactLoading: boolean;
}

export default function PropertyHostCard({
  property,
  reviews,
  onContactHost,
  contactLoading,
}: PropertyHostCardProps) {
  const hasValidHostName =
    typeof property.hostName === "string" &&
    property.hostName.trim().length > 0 &&
    !property.hostName.toLowerCase().startsWith("host ") &&
    property.hostName.trim().length < 40;

  const hostDisplayName = hasValidHostName
    ? property.hostName!.trim()
    : "StayTrack Verified Host";

  const hostInitial = hasValidHostName
    ? hostDisplayName.charAt(0).toUpperCase()
    : "V";

  const reviewCount = reviews.length;
  const rating = property.rating || (reviewCount > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewCount : null);
  const isSuperhost = (rating && rating >= 4.7 && reviewCount >= 2) || property.topVerified;

  return (
    <section id="host" className="pb-8 border-b border-border/70 space-y-5">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Meet your host
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Direct host communication with zero intermediary agent commissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Host Profile Badge Card */}
        <div className="md:col-span-1 p-6 rounded-3xl bg-surface border border-border/80 shadow-2xs text-center space-y-4">
          <div className="relative mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary shadow-2xs">
            {property.hostPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.hostPhoto}
                alt={hostDisplayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{hostInitial}</span>
            )}
            <span
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center text-white shadow-2xs"
              title="Verified Host Identity"
            >
              <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-foreground truncate">
              {hostDisplayName}
            </h3>
            <p className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              <BadgeCheckIcon className="w-3.5 h-3.5 text-primary" />
              <span>{isSuperhost ? "StayTrack Superhost" : "Verified Host"}</span>
            </p>
          </div>

          {/* Quick Host Stats */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/70 text-xs">
            <div>
              <span className="text-base font-extrabold text-foreground block">
                {reviewCount}
              </span>
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
                Reviews
              </span>
            </div>
            <div>
              <span className="text-base font-extrabold text-foreground block flex items-center justify-center gap-0.5">
                {rating ? rating.toFixed(1) : "—"}
                {rating && <StarIcon className="w-3.5 h-3.5 text-[#D9A441]" />}
              </span>
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
                Rating
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Host Bio & Direct Actions */}
        <div className="md:col-span-2 space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">
              {isSuperhost
                ? `${hostDisplayName} is a StayTrack Superhost`
                : `${hostDisplayName} is a Verified Host`}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {isSuperhost
                ? "Superhosts are experienced, highly-rated hosts who are committed to providing exceptional stays and direct hospitality for travelers."
                : "Verified hosts maintain authentic property photography, verified government credentials, and responsive guest management on StayTrack."}
            </p>
          </div>

          {/* Host Responsiveness Specifications */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-foreground">Host details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Response rate: <strong className="text-foreground">100%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Responds within an hour</span>
              </div>
            </div>
          </div>

          {/* Direct Contact Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onContactHost}
              disabled={contactLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs focus-ring"
            >
              <MessageCircleIcon className="w-4 h-4 text-primary" />
              <span>{contactLoading ? "Opening conversation..." : "Message Host Directly"}</span>
            </button>
          </div>

          {/* Payment Protection Callout */}
          <div className="p-3.5 rounded-2xl bg-surface-muted/60 border border-border/80 flex items-start gap-2.5 text-xs text-muted">
            <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              To help protect your payment and stay experience, always communicate and reserve accommodations directly through StayTrack.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
