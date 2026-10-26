"use client";

import React from "react";
import { Property } from "@/types/property";
import {
  CalendarDaysIcon,
  ClockIcon,
  ShieldCheckIcon,
  PhoneIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/ui/Icons";

interface PropertyThingsToKnowProps {
  property: Property;
}

export default function PropertyThingsToKnow({ property }: PropertyThingsToKnowProps) {
  const catUpper = (property.propertyType || property.category || "").toUpperCase();

  // 1. Cancellation Policy
  const policyType = property.cancellationPolicy || "flexible";
  let policyTitle = "Flexible cancellation";
  let policyDesc = "Free cancellation up to 24 hours before scheduled check-in. Review full policy for booking terms.";

  if (policyType === "non_refundable") {
    policyTitle = "Non-refundable reservation";
    policyDesc = "This reservation is non-refundable once confirmed by the host. Check dates carefully.";
  } else if (policyType === "strict") {
    policyTitle = "Strict cancellation";
    policyDesc = "Full refund up to 7 days before check-in, 50% refund after that. Non-refundable within 48 hours.";
  } else if (policyType === "moderate") {
    policyTitle = "Moderate cancellation";
    policyDesc = "Free cancellation up to 48 hours before check-in. After that, cancellation fees apply.";
  }

  // 2. House Rules
  const checkIn = property.checkInTime || (catUpper === "HOTEL" ? "12:00 PM" : "02:00 PM");
  const checkOut = property.checkOutTime || "11:00 AM";
  const maxGuests = property.maxGuests || (property.bedrooms ? property.bedrooms * 2 : 2);
  const gateClosing = property.gateClosingTime;

  // 3. Safety & Property
  const amenitiesList = Array.isArray(property.amenities)
    ? property.amenities.map((a) => a.toLowerCase())
    : [];

  const hasCctv = amenitiesList.some((a) => a.includes("cctv") || a.includes("camera") || a.includes("security"));
  const hasSmokeAlarm = amenitiesList.some((a) => a.includes("smoke") || a.includes("alarm"));
  const hasFirstAid = amenitiesList.some((a) => a.includes("first aid") || a.includes("medical"));

  return (
    <section id="rules" className="pb-8 border-b border-border/70 space-y-5">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Things to know
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Important house policies, safety specifications, and support details
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Column 1: Cancellation Policy */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-foreground font-bold">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <CalendarDaysIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-foreground">Cancellation policy</span>
            </div>
            <p className="font-bold text-foreground text-xs pt-0.5">{policyTitle}</p>
            <p className="text-muted leading-relaxed text-[11px]">{policyDesc}</p>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Direct terms</span>
          </div>
        </div>

        {/* Column 2: House Rules */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-foreground font-bold">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <ClockIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-foreground">House rules</span>
            </div>
            <ul className="space-y-1.5 text-muted text-[11px] pt-0.5">
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>Check-in after {checkIn}</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>Checkout before {checkOut}</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>Up to {maxGuests} {maxGuests === 1 ? "guest" : "guests"} maximum</span>
              </li>
              {gateClosing && (
                <li className="flex items-center gap-1.5 font-medium text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                  <span>Gate closing: {gateClosing}</span>
                </li>
              )}
              {property.houseRules && property.houseRules.length > 0 && (
                <li className="pt-1.5 space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-muted">Host Rules</span>
                  {property.houseRules.slice(0, 3).map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-foreground/85 font-medium leading-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                      <span>{rule}</span>
                    </div>
                  ))}
                  {property.houseRules.length > 3 && (
                    <span className="text-[10px] text-muted italic block pl-3">
                      +{property.houseRules.length - 3} more house rules
                    </span>
                  )}
                </li>
              )}
            </ul>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Host guidelines</span>
          </div>
        </div>

        {/* Column 3: Safety & Property */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-foreground font-bold">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheckIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-foreground">Safety & property</span>
            </div>
            <ul className="space-y-2 text-muted text-[11px] pt-0.5">
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                {hasCctv ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                )}
                <span>{hasCctv ? "Security cameras on premises" : "Gated security building"}</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                {hasSmokeAlarm ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                )}
                <span>{hasSmokeAlarm ? "Smoke alarm installed" : "Smoke alarm not reported"}</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium text-foreground/90">
                {hasFirstAid ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                )}
                <span>{hasFirstAid ? "First aid kit on site" : "Emergency assistance on call"}</span>
              </li>
            </ul>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Stay safe</span>
          </div>
        </div>

        {/* Column 4: StayTrack Localized Support */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-foreground font-bold">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <PhoneIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-foreground">StayTrack support</span>
            </div>
            <p className="font-bold text-foreground text-xs pt-0.5">24/7 localized support</p>
            <p className="text-muted leading-relaxed text-[11px]">
              Direct booking with verified hosts. Backed by StayTrack team in India with 0% brokerage fee.
            </p>
          </div>
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Zero brokerage</span>
          </div>
        </div>
      </div>
    </section>
  );
}
