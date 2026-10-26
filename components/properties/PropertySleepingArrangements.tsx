"use client";

import React from "react";
import { Property } from "@/types/property";
import {
  BedDoubleIcon,
  BathIcon,
  Building2Icon,
  UsersIcon,
  DoorClosedIcon,
  SofaIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@/components/ui/Icons";

interface PropertySleepingArrangementsProps {
  property: Property;
}

export default function PropertySleepingArrangements({
  property,
}: PropertySleepingArrangementsProps) {
  const catUpper = (property.propertyType || property.category || "").toUpperCase();

  // ----------------------------------------------------
  // 1. BNB / VACATION STAY
  // ----------------------------------------------------
  if (catUpper === "BNB" || catUpper === "VACATIONSTAY" || catUpper === "VACATION_STAY" || catUpper === "VILLA") {
    const bedrooms = property.bedrooms || 1;
    const beds = property.bedsCount || bedrooms;
    const isEntire = property.spaceType === "entire_place" || !property.spaceType;

    const cards = [];

    // Master Bedroom
    cards.push({
      title: bedrooms > 1 ? "Bedroom 1 (Master)" : "Bedroom",
      subtitle: `${Math.max(1, Math.floor(beds / bedrooms))} queen or double bed`,
      detail: property.bathrooms ? "Attached washroom · Fresh linens" : "Linens & pillows provided",
      icon: <BedDoubleIcon className="w-5 h-5 text-primary" />,
    });

    // Secondary Bedrooms if more than 1
    if (bedrooms > 1) {
      for (let i = 2; i <= Math.min(bedrooms, 3); i++) {
        cards.push({
          title: `Bedroom ${i}`,
          subtitle: "1 double or twin bed",
          detail: "Wardrobe & side tables",
          icon: <BedDoubleIcon className="w-5 h-5 text-primary" />,
        });
      }
    }

    // Living Room / Common Space if entire place
    if (isEntire) {
      cards.push({
        title: "Living Room",
        subtitle: "1 sofa or seating lounge",
        detail: "Day relaxation & guest space",
        icon: <SofaIcon className="w-5 h-5 text-primary" />,
      });
    }

    return (
      <div className="pb-8 border-b border-border/70 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Sleeping Arrangements
          </h2>
          <p className="text-xs text-foreground font-semibold mt-0.5">
            Where you&apos;ll sleep during your stay
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {card.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                <p className="text-xs font-semibold text-foreground/90">{card.subtitle}</p>
                <p className="text-[11px] text-muted">{card.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. HOTEL
  // ----------------------------------------------------
  if (catUpper === "HOTEL" || catUpper === "ROOM") {
    let bedLabel = property.bedType ? `${property.bedType.charAt(0).toUpperCase() + property.bedType.slice(1)} Bed` : "Comfort Double Bed";
    let roomLabel = property.roomType ? `${property.roomType.charAt(0).toUpperCase() + property.roomType.slice(1)} Room` : "Hotel Room";

    return (
      <div className="pb-8 border-b border-border/70 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Room & Bedding Setup
          </h2>
          <p className="text-xs text-foreground font-semibold mt-0.5">
            Configured hotel room accommodations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <DoorClosedIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">{roomLabel}</h3>
              <p className="text-xs font-semibold text-foreground/90">
                Up to {property.maxGuests || 2} Guests
              </p>
              <p className="text-[11px] text-muted">Private keycard access · Daily housekeeping</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BedDoubleIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Bedding Arrangement</h3>
              <p className="text-xs font-semibold text-foreground/90">{bedLabel}</p>
              <p className="text-[11px] text-muted">Premium orthopaedic mattress with clean duvets</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. PG (PAYING GUEST)
  // ----------------------------------------------------
  if (catUpper === "PG") {
    const rawGender = (property.genderCategory || "").toLowerCase().trim();
    const gender =
      rawGender.includes("boy") || rawGender.includes("male")
        ? "Boys PG"
        : rawGender.includes("girl") || rawGender.includes("female")
        ? "Girls PG"
        : "Unisex / Coliving";

    const hasOptions = Array.isArray(property.occupancyOptions) && property.occupancyOptions.length > 0;
    let occLabel = "Occupancy";
    let occValue = property.occupancyType || "Single Room";
    let occSubtitle = "Bed, mattress & study table";

    if (hasOptions) {
      occLabel = "Sharing Types";
      occValue = property.occupancyOptions!.map((o) => o.name).join(" • ");
      occSubtitle = `${property.occupancyOptions!.length} room types available below`;
    } else {
      let occ = property.occupancyType || "Single Room";
      const occLower = occ.toLowerCase();
      if (occLower.includes("single")) occ = "Single Occupancy Room";
      else if (occLower.includes("double")) occ = "Double Sharing Setup";
      else if (occLower.includes("triple")) occ = "Triple Sharing Setup";
      else if (occLower.includes("four")) occ = "4+ Sharing Room";
      occValue = occ;
    }

    return (
      <div className="pb-8 border-b border-border/70 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Room Sharing & Allocation
          </h2>
          <p className="text-xs text-foreground font-semibold mt-0.5">
            Dedicated living space & personal furnishings
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BedDoubleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">{occLabel}</h3>
              <p className="text-xs font-semibold text-foreground/90">{occValue}</p>
              <p className="text-[10px] text-muted mt-0.5">{occSubtitle}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Community Type</h3>
              <p className="text-xs font-semibold text-foreground/90">{gender}</p>
              <p className="text-[10px] text-muted mt-0.5">Secure verified resident entry</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BathIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Washroom Setup</h3>
              <p className="text-xs font-semibold text-foreground/90">
                {property.bathrooms ? `${property.bathrooms} Washroom(s)` : "Hygiene Verified"}
              </p>
              <p className="text-[10px] text-muted mt-0.5">Geyser & hot water available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. HOSTEL
  // ----------------------------------------------------
  if (catUpper === "HOSTEL") {
    const totalBeds = property.totalBeds || property.bedrooms || 4;
    const availBeds = property.availableBeds !== undefined ? property.availableBeds : totalBeds;
    const roomType = property.roomType === "private" ? "Private Hostel Room" : "Dormitory Bunk Setup";

    return (
      <div className="pb-8 border-b border-border/70 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Hostel Bunk & Bed Arrangements
          </h2>
          <p className="text-xs text-foreground font-semibold mt-0.5">
            Dormitory configuration & bed capacity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Room Type</h3>
              <p className="text-xs font-semibold text-foreground/90">{roomType}</p>
              <p className="text-[10px] text-muted mt-0.5">Spacious well-ventilated dorm</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BedDoubleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Bed Capacity</h3>
              <p className="text-xs font-semibold text-foreground/90">
                {availBeds} of {totalBeds} Beds Free
              </p>
              <p className="text-[10px] text-muted mt-0.5">Individual reading light & charging point</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Storage & Locker</h3>
              <p className="text-xs font-semibold text-foreground/90">Personal Underbed Locker</p>
              <p className="text-[10px] text-muted mt-0.5">Lockable trunk for luggage safety</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 5. FLAT / APARTMENT
  // ----------------------------------------------------
  if (catUpper === "FLAT" || catUpper === "APARTMENT" || catUpper === "HOUSE") {
    const bhk = property.bhkConfig || (property.bedrooms ? `${property.bedrooms} BHK` : "Apartment Layout");
    const bedrooms = property.bedrooms || 1;

    return (
      <div className="pb-8 border-b border-border/70 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Apartment Configuration & Rooms
          </h2>
          <p className="text-xs text-foreground font-semibold mt-0.5">
            Verified architectural layout and private spaces
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BedDoubleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Master Bedroom</h3>
              <p className="text-xs font-semibold text-foreground/90">
                {property.furnished ? "Furnished with Double Bed" : "Unfurnished Space"}
              </p>
              <p className="text-[10px] text-muted mt-0.5">Spacious bedroom with wardrobe niche</p>
            </div>
          </div>

          {bedrooms > 1 && (
            <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <DoorClosedIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Secondary Bedroom(s)</h3>
                <p className="text-xs font-semibold text-foreground/90">
                  {bedrooms - 1} Additional {bedrooms - 1 === 1 ? "Room" : "Rooms"}
                </p>
                <p className="text-[10px] text-muted mt-0.5">Kids, guest, or home office setup</p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <SofaIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Living & Hall</h3>
              <p className="text-xs font-semibold text-foreground/90">
                {bhk}
              </p>
              <p className="text-[10px] text-muted mt-0.5">Family hall & dining space</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
