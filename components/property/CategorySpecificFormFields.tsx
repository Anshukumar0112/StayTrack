"use client";

import React from "react";
import { CheckIcon, PlusIcon } from "@/components/ui/Icons";
import { OccupancyOption, BathroomType } from "@/types/property";

export interface CategoryFormState {
  bedrooms: number;
  setBedrooms: (val: number) => void;
  bathrooms: number;
  setBathrooms: (val: number) => void;
  furnished: boolean;
  setFurnished: (val: boolean) => void;
  areaSqFt: string;
  setAreaSqFt: (val: string) => void;

  // BNB
  spaceType: string;
  setSpaceType: (val: string) => void;
  maxGuests: number;
  setMaxGuests: (val: number) => void;
  bedsCount: number;
  setBedsCount: (val: number) => void;
  checkInTime: string;
  setCheckInTime: (val: string) => void;
  checkOutTime: string;
  setCheckOutTime: (val: string) => void;
  houseRules: string[];
  setHouseRules: (val: string[]) => void;

  // Stay Terms (PG & Hostel)
  contractDuration: string;
  setContractDuration: (val: string) => void;
  customDurationValue: string;
  setCustomDurationValue: (val: string) => void;
  customDurationUnit: string;
  setCustomDurationUnit: (val: string) => void;
  monthlyRentPerBed: string;
  setMonthlyRentPerBed: (val: string) => void;
  securityDepositEnabled: boolean;
  setSecurityDepositEnabled: (val: boolean) => void;

  // PG
  occupancyType: string;
  setOccupancyType: (val: string) => void;
  genderCategory: string;
  setGenderCategory: (val: string) => void;
  foodIncluded: boolean;
  setFoodIncluded: (val: boolean) => void;
  foodOptions: string[];
  setFoodOptions: (val: string[]) => void;
  securityDeposit: string;
  setSecurityDeposit: (val: string) => void;
  noticePeriodDays: string;
  setNoticePeriodDays: (val: string) => void;
  gateClosingTime: string;
  setGateClosingTime: (val: string) => void;

  // Multiple Occupancy Options (PG & Hostel & Hotel)
  occupancyOptions?: OccupancyOption[];
  setOccupancyOptions?: (options: OccupancyOption[]) => void;

  // Hostel
  roomType: string;
  setRoomType: (val: string) => void;
  totalBeds: number;
  setTotalBeds: (val: number) => void;
  availableBeds: number;
  setAvailableBeds: (val: number) => void;
  priceModel: string;
  setPriceModel: (val: string) => void;
  studentOrWorking: string;
  setStudentOrWorking: (val: string) => void;
  sharedFacilities: string[];
  setSharedFacilities: (val: string[]) => void;

  // Flat
  bhkConfig: string;
  setBhkConfig: (val: string) => void;
  maintenanceCharges: string;
  setMaintenanceCharges: (val: string) => void;
  tenantPreference: string;
  setTenantPreference: (val: string) => void;
  floorNumber: string;
  setFloorNumber: (val: string) => void;
  totalFloors: string;
  setTotalFloors: (val: string) => void;
  parkingType: string;
  setParkingType: (val: string) => void;

  // Hotel
  bedType: string;
  setBedType: (val: string) => void;
  breakfastIncluded: boolean;
  setBreakfastIncluded: (val: boolean) => void;
  cancellationPolicy: string;
  setCancellationPolicy: (val: string) => void;
}

interface CategorySpecificFormFieldsProps {
  category: string;
  stayModel?: string;
  form: CategoryFormState;
}

export const PG_HOSTEL_ROOM_AMENITIES = [
  "Air Conditioning",
  "Geyser / Hot Water",
  "Study Table & Chair",
  "Personal Wardrobe",
  "Private Balcony",
  "High-Speed Wi-Fi",
  "Television",
];

export const HOTEL_ROOM_AMENITIES = [
  "Air Conditioning",
  "Flat-screen TV",
  "High-Speed Wi-Fi",
  "Electric Kettle",
  "Mini Fridge",
  "Work Desk",
  "Hair Dryer",
  "Balcony / View",
];

export const SHARED_PROPERTY_FACILITIES = [
  "Common Kitchen / Dining",
  "Mess / Meal Facility",
  "Laundry / Washing Machine",
  "24/7 Power Backup",
  "CCTV & Security Guard",
  "Common Study Room",
  "Biometric Access",
  "Personal Lockers",
  "Water Purifier / RO",
];

export const BNB_AMENITIES = [
  "High-Speed Wi-Fi",
  "Air Conditioning",
  "Television",
  "Fully Equipped Kitchen",
  "Refrigerator",
  "Washing Machine",
  "Geyser / Hot Water",
  "Power Backup",
  "Private Balcony",
  "Free Parking",
];

export const FLAT_AMENITIES = [
  "High-Speed Wi-Fi",
  "Air Conditioning",
  "Television",
  "Modular Kitchen",
  "Refrigerator",
  "Washing Machine",
  "Geyser / Hot Water",
  "100% Power Backup",
  "Lift / Elevator",
  "Covered Parking",
  "Gated Society / Security",
];

export const HOTEL_PROPERTY_FACILITIES = [
  "24/7 Front Desk",
  "High-Speed Wi-Fi",
  "100% Power Backup",
  "Lift / Elevator",
  "Daily Housekeeping",
  "CCTV & Security Guard",
  "Luggage Storage",
  "Car Parking",
  "Room Service",
];

/**
 * Multiple room configurations editor for Hostel & PG
 */
function SharingOptionsEditor({
  options,
  onChange,
  onAutoSyncRent,
  categoryLabel,
}: {
  options: OccupancyOption[];
  onChange: (opts: OccupancyOption[]) => void;
  onAutoSyncRent?: (val: string) => void;
  categoryLabel: string;
}) {
  const addOption = (
    occupancyType: string,
    defaultName: string,
    defaultBeds: number,
    defaultBathType: BathroomType
  ) => {
    const newOpt: OccupancyOption = {
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: defaultName,
      occupancyType,
      roomCount: 1,
      bedsCount: defaultBeds,
      monthlyRentPerBed: 0,
      securityDeposit: undefined,
      bathroomType: defaultBathType,
      bathrooms: defaultBathType === "not_available" ? 0 : 1,
      furnished: true,
      amenities: ["Air Conditioning", "Study Table & Chair", "Personal Wardrobe"],
      roomDetails: "",
    };
    const updated = [...options, newOpt];
    onChange(updated);
  };

  const updateOption = (id: string, updates: Partial<OccupancyOption>) => {
    const updated = options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt));
    onChange(updated);
    if (onAutoSyncRent && updates.monthlyRentPerBed !== undefined) {
      const rents = updated.map((o) => o.monthlyRentPerBed).filter((r) => r > 0);
      if (rents.length > 0) {
        onAutoSyncRent(String(Math.min(...rents)));
      }
    }
  };

  const removeOption = (id: string) => {
    const updated = options.filter((opt) => opt.id !== id);
    onChange(updated);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/70">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-[11px] font-black text-foreground uppercase tracking-wider">
            Room Configurations & Sharing Options <span className="text-rose-600">*</span>
          </label>
          <p className="text-[11px] text-muted">
            Define multiple room types in your {categoryLabel}. Configure beds, bathroom, monthly rent, and room amenities for each.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => addOption("single", "Single Private Room", 1, "attached")}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Single Sharing
          </button>
          <button
            type="button"
            onClick={() => addOption("double", "Double Sharing Room", 2, "attached")}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Double Sharing
          </button>
          <button
            type="button"
            onClick={() => addOption("triple", "Triple Sharing Room", 3, "shared")}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Triple Sharing
          </button>
          <button
            type="button"
            onClick={() => addOption("four_sharing", "Four Sharing Room", 4, "shared")}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Four Sharing
          </button>
          <button
            type="button"
            onClick={() => addOption("custom", "Custom Sharing Room", 1, "attached")}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-surface border border-border text-foreground hover:bg-surface-muted transition-colors cursor-pointer shadow-2xs"
          >
            + Custom
          </button>
        </div>
      </div>

      {options.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-muted/30 text-center space-y-1">
          <p className="text-xs font-bold text-foreground">
            No room configurations added yet.
          </p>
          <p className="text-[11px] text-muted">
            Click one of the buttons above to add Single, Double, Triple, or Four Sharing configurations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt, idx) => (
            <div
              key={opt.id || idx}
              className="p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-black uppercase text-foreground tracking-wider">
                  Configuration #{idx + 1}: {opt.name || "Unnamed Option"}
                </span>
                <button
                  type="button"
                  onClick={() => removeOption(opt.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Remove Room Type
                </button>
              </div>

              {/* Row 1: Label, Sharing Type, Room Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Room / Configuration Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={opt.name || ""}
                    onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                    placeholder="e.g. Single Private Room with Balcony"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Sharing Configuration
                  </label>
                  <select
                    value={opt.occupancyType || "single"}
                    onChange={(e) => {
                      const occ = e.target.value;
                      let defaultBeds = 1;
                      if (occ === "double") defaultBeds = 2;
                      else if (occ === "triple") defaultBeds = 3;
                      else if (occ === "four_sharing") defaultBeds = 4;
                      updateOption(opt.id, { occupancyType: occ, bedsCount: defaultBeds });
                    }}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="single">Single Sharing (1 Bed/Room)</option>
                    <option value="double">Double Sharing (2 Beds)</option>
                    <option value="triple">Triple Sharing (3 Beds)</option>
                    <option value="four_sharing">Four Sharing (4 Beds)</option>
                    <option value="custom">Custom Sharing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Number of Rooms (This Config)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.roomCount ?? 1}
                    onChange={(e) =>
                      updateOption(opt.id, { roomCount: Math.max(1, Number(e.target.value) || 1) })
                    }
                    placeholder="1"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Beds Capacity, Monthly Rent, Security Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Beds / Occupancy Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.bedsCount ?? 1}
                    onChange={(e) =>
                      updateOption(opt.id, { bedsCount: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Monthly Rent / Bed (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.monthlyRentPerBed || ""}
                    onChange={(e) =>
                      updateOption(opt.id, { monthlyRentPerBed: Number(e.target.value) || 0 })
                    }
                    placeholder="e.g. 12000"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Security Deposit (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={opt.securityDeposit != null ? opt.securityDeposit : ""}
                    onChange={(e) =>
                      updateOption(opt.id, {
                        securityDeposit: e.target.value !== "" ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 5000"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Row 3: Bathroom Configuration & Furnishing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Bathroom Configuration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={opt.bathroomType || "attached"}
                    onChange={(e) => {
                      const bType = e.target.value;
                      updateOption(opt.id, {
                        bathroomType: bType,
                        bathrooms: bType === "not_available" ? 0 : 1,
                      });
                    }}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="attached">Attached</option>
                    <option value="shared">Shared</option>
                    <option value="not_available">Not available</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id={`furn_${opt.id}`}
                    checked={opt.furnished ?? true}
                    onChange={(e) => updateOption(opt.id, { furnished: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 cursor-pointer"
                  />
                  <label htmlFor={`furn_${opt.id}`} className="text-xs font-bold text-zinc-700 cursor-pointer">
                    Fully Furnished Living Space
                  </label>
                </div>
              </div>

              {/* Row 4: Room-Specific Amenities */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1.5">
                  Room-Specific Amenities
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PG_HOSTEL_ROOM_AMENITIES.map((amenity) => {
                    const active = (opt.amenities || []).includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const current = opt.amenities || [];
                          const next = current.includes(amenity)
                            ? current.filter((a) => a !== amenity)
                            : [...current, amenity];
                          updateOption(opt.id, { amenities: next });
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 ${
                          active
                            ? "bg-zinc-950 text-white border-zinc-950"
                            : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {active && <CheckIcon className="w-3 h-3 text-white" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Room Details & Notes */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Room Notes & Specifications (Optional)
                </label>
                <input
                  type="text"
                  value={opt.roomDetails || ""}
                  onChange={(e) => updateOption(opt.id, { roomDetails: e.target.value })}
                  placeholder="e.g. Attached washroom, study table, corner room with natural ventilation"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Multiple hotel room types editor for Hotel
 */
function HotelRoomTypesEditor({
  options,
  onChange,
}: {
  options: OccupancyOption[];
  onChange: (opts: OccupancyOption[]) => void;
}) {
  const addRoomType = (
    roomType: string,
    defaultName: string,
    defaultBedType: string,
    defaultGuests: number
  ) => {
    const newOpt: OccupancyOption = {
      id: `hotel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: defaultName,
      occupancyType: roomType,
      roomCategory: roomType,
      roomCount: 1,
      bedType: defaultBedType,
      bedsCount: 1,
      maxOccupancy: defaultGuests,
      monthlyRentPerBed: 0,
      bathroomType: "attached",
      bathrooms: 1,
      furnished: true,
      amenities: ["Air Conditioning", "Flat-screen TV", "High-Speed Wi-Fi"],
      roomDetails: "",
    };
    onChange([...options, newOpt]);
  };

  const updateOption = (id: string, updates: Partial<OccupancyOption>) => {
    const updated = options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt));
    onChange(updated);
  };

  const removeOption = (id: string) => {
    onChange(options.filter((opt) => opt.id !== id));
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/70">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-[11px] font-black text-foreground uppercase tracking-wider">
            Hotel Room Types <span className="text-rose-600">*</span>
          </label>
          <p className="text-[11px] text-muted">
            Define multiple room categories offered by your hotel (e.g. Standard, Deluxe, Suite).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => addRoomType("standard", "Standard Classic Room", "queen", 2)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Standard
          </button>
          <button
            type="button"
            onClick={() => addRoomType("deluxe", "Deluxe Room", "king", 2)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Deluxe
          </button>
          <button
            type="button"
            onClick={() => addRoomType("executive", "Executive Room", "king", 3)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Executive
          </button>
          <button
            type="button"
            onClick={() => addRoomType("suite", "Luxury Suite", "king", 4)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#111716] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
          >
            + Suite
          </button>
          <button
            type="button"
            onClick={() => addRoomType("custom", "Custom Hotel Room", "queen", 2)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-surface border border-border text-foreground hover:bg-surface-muted transition-colors cursor-pointer shadow-2xs"
          >
            + Custom
          </button>
        </div>
      </div>

      {options.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-muted/30 text-center space-y-1">
          <p className="text-xs font-bold text-foreground">
            No hotel room types added yet.
          </p>
          <p className="text-[11px] text-muted">
            Click one of the buttons above to add Standard, Deluxe, Executive, or Suite room types.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt, idx) => (
            <div
              key={opt.id || idx}
              className="p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-black uppercase text-foreground tracking-wider">
                  Room Type #{idx + 1}: {opt.name || "Unnamed Room Type"}
                </span>
                <button
                  type="button"
                  onClick={() => removeOption(opt.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Remove Room Type
                </button>
              </div>

              {/* Row 1: Name, Room Category, Room Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Room Name / Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={opt.name || ""}
                    onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                    placeholder="e.g. Deluxe King Room with City View"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Room Category
                  </label>
                  <select
                    value={opt.occupancyType || "standard"}
                    onChange={(e) => updateOption(opt.id, { occupancyType: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="standard">Standard Classic</option>
                    <option value="deluxe">Deluxe Room</option>
                    <option value="executive">Executive Room</option>
                    <option value="suite">Luxury Suite</option>
                    <option value="custom">Custom Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Number of Rooms (This Type)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.roomCount ?? 1}
                    onChange={(e) =>
                      updateOption(opt.id, { roomCount: Math.max(1, Number(e.target.value) || 1) })
                    }
                    placeholder="1"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Bed Type, Beds Count, Max Occupancy, Nightly Price */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Bed Type
                  </label>
                  <select
                    value={opt.bedType || "queen"}
                    onChange={(e) => updateOption(opt.id, { bedType: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="king">1 King Bed</option>
                    <option value="queen">1 Queen Bed</option>
                    <option value="twin">2 Twin Beds</option>
                    <option value="single">1 Single Bed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Beds Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.bedsCount != null ? opt.bedsCount : 1}
                    onChange={(e) =>
                      updateOption(opt.id, { bedsCount: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Max Guests Occupancy
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={opt.maxOccupancy != null ? opt.maxOccupancy : 2}
                    onChange={(e) =>
                      updateOption(opt.id, { maxOccupancy: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Nightly Price (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={opt.nightlyPrice != null ? opt.nightlyPrice : opt.price != null ? opt.price : ""}
                    onChange={(e) =>
                      updateOption(opt.id, {
                        nightlyPrice: e.target.value !== "" ? Number(e.target.value) : undefined,
                        price: e.target.value !== "" ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 2500"
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900"
                  />
                </div>
              </div>

              {/* Row 3: Bathroom Configuration & Furnished */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                    Bathroom Configuration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={opt.bathroomType || "attached"}
                    onChange={(e) => {
                      const bType = e.target.value;
                      updateOption(opt.id, {
                        bathroomType: bType,
                        bathrooms: bType === "not_available" ? 0 : 1,
                      });
                    }}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="attached">Attached</option>
                    <option value="shared">Shared</option>
                    <option value="not_available">Not available</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id={`furn_hotel_${opt.id}`}
                    checked={opt.furnished ?? true}
                    onChange={(e) => updateOption(opt.id, { furnished: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 cursor-pointer"
                  />
                  <label htmlFor={`furn_hotel_${opt.id}`} className="text-xs font-bold text-zinc-700 cursor-pointer">
                    Furnished Guest Room
                  </label>
                </div>
              </div>

              {/* Row 4: Room-Specific Amenities */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1.5">
                  Room-Specific Amenities
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HOTEL_ROOM_AMENITIES.map((amenity) => {
                    const active = (opt.amenities || []).includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const current = opt.amenities || [];
                          const next = current.includes(amenity)
                            ? current.filter((a) => a !== amenity)
                            : [...current, amenity];
                          updateOption(opt.id, { amenities: next });
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 ${
                          active
                            ? "bg-zinc-950 text-white border-zinc-950"
                            : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {active && <CheckIcon className="w-3 h-3 text-white" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Room Details & Notes */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">
                  Room Notes & Description (Optional)
                </label>
                <input
                  type="text"
                  value={opt.roomDetails || ""}
                  onChange={(e) => updateOption(opt.id, { roomDetails: e.target.value })}
                  placeholder="e.g. Premium orthopaedic mattress with soundproof glass and private balcony"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategorySpecificFormFields({
  category,
  stayModel,
  form,
}: CategorySpecificFormFieldsProps) {
  const normCategory = (category || "").trim().toUpperCase();

  const toggleArrayItem = (
    currentList: string[],
    item: string,
    setter: (list: string[]) => void
  ) => {
    if (currentList.includes(item)) {
      setter(currentList.filter((x) => x !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  // 1. BNB / VACATION STAY
  if (normCategory === "BNB" || normCategory === "VACATIONSTAY" || normCategory === "VACATION_STAY") {
    return (
      <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              BNB Accommodation Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specific details for travelers booking your holiday stay or homestay
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
            BNB Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Space Type
            </label>
            <select
              value={form.spaceType || "entire_place"}
              onChange={(e) => form.setSpaceType(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="entire_place">Entire Place / Villa</option>
              <option value="private_room">Private Room</option>
              <option value="shared_room">Shared Space</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Max Guests Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.maxGuests != null ? form.maxGuests : 2}
              onChange={(e) => form.setMaxGuests(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Beds Count <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.bedsCount != null ? form.bedsCount : 1}
              onChange={(e) => form.setBedsCount(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bedrooms <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.bedrooms != null ? form.bedrooms : 1}
              onChange={(e) => form.setBedrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bathrooms <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms != null ? form.bathrooms : 1}
              onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Furnishing
            </label>
            <button
              type="button"
              onClick={() => form.setFurnished(!form.furnished)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                form.furnished
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300"
              }`}
            >
              {form.furnished && <CheckIcon className="w-3.5 h-3.5" />}
              <span>{form.furnished ? "Fully Furnished" : "Semi / Unfurnished"}</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Area (Sq. Ft)
            </label>
            <input
              type="number"
              placeholder="e.g. 1200"
              value={form.areaSqFt != null ? form.areaSqFt : ""}
              onChange={(e) => form.setAreaSqFt(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Check-In Time
            </label>
            <input
              type="text"
              placeholder="02:00 PM"
              value={form.checkInTime || "02:00 PM"}
              onChange={(e) => form.setCheckInTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Check-Out Time
            </label>
            <input
              type="text"
              placeholder="11:00 AM"
              value={form.checkOutTime || "11:00 AM"}
              onChange={(e) => form.setCheckOutTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. PG (PAYING GUEST / COLIVING)
  if (normCategory === "PG") {
    const foodList = ["Breakfast", "Lunch", "Dinner", "Evening Tea / Snacks"];

    return (
      <div className="space-y-6 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              PG & Coliving Accommodation Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specify multiple room sharing configurations, gender preference, food availability, and property facilities
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full">
            PG Profile
          </span>
        </div>

        {/* SECTION 1: Multiple Room Configurations */}
        {form.setOccupancyOptions && (
          <SharingOptionsEditor
            options={form.occupancyOptions || []}
            onChange={form.setOccupancyOptions}
            onAutoSyncRent={(val) => form.setMonthlyRentPerBed(val)}
            categoryLabel="PG"
          />
        )}

        {/* SECTION 2: Common Property-Level Details */}
        <div className="pt-4 border-t border-zinc-200/80 space-y-4">
          <div className="pb-2 border-b border-zinc-200/60">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">
              Common Property-Level Specifications
            </h4>
            <p className="text-[11px] text-zinc-500">
              These settings apply to the entire property rather than individual room configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Gender Preference <span className="text-red-500">*</span>
              </label>
              {(() => {
                const rawGen = (form.genderCategory || "unisex").toLowerCase().trim();
                const normGen = rawGen.includes("boy") || rawGen.includes("male")
                  ? "boys"
                  : rawGen.includes("girl") || rawGen.includes("female")
                  ? "girls"
                  : "unisex";
                return (
                  <select
                    value={normGen}
                    onChange={(e) => form.setGenderCategory(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="boys">Boys Only PG</option>
                    <option value="girls">Girls Only PG</option>
                    <option value="unisex">Unisex / Co-living</option>
                  </select>
                );
              })()}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Contractual Stay Duration
              </label>
              <select
                value={form.contractDuration || "3_months"}
                onChange={(e) => form.setContractDuration(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="3_months">3 Months Minimum</option>
                <option value="4_months">4 Months Minimum</option>
                <option value="6_months">6 Months Minimum</option>
                <option value="10_months">10 Months Academic Term</option>
                <option value="12_months">12 Months (1 Year Lease)</option>
                <option value="custom">Custom Duration...</option>
              </select>
            </div>
          </div>

          {/* Meals & Mess Facilities */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-800 uppercase block">
                  Food Availability & Mess Facility
                </span>
                <span className="text-[11px] text-zinc-500">
                  Are daily meals prepared and included for residents?
                </span>
              </div>
              <button
                type="button"
                onClick={() => form.setFoodIncluded(!form.foodIncluded)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer ${
                  form.foodIncluded
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-zinc-600 border-zinc-300"
                }`}
              >
                {form.foodIncluded && <CheckIcon className="w-3 h-3" />}
                <span>{form.foodIncluded ? "Meals Included in Rent" : "Food Optional / Self"}</span>
              </button>
            </div>

            {form.foodIncluded && (
              <div className="pt-2 border-t border-zinc-100">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">
                  Select Included Daily Meals
                </span>
                <div className="flex flex-wrap gap-2">
                  {foodList.map((meal) => {
                    const active = (form.foodOptions || []).includes(meal);
                    return (
                      <button
                        type="button"
                        key={meal}
                        onClick={() =>
                          toggleArrayItem(form.foodOptions || [], meal, form.setFoodOptions)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          active
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {active ? <CheckIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
                        <span>{meal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shared Property Facilities */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-2">
              Shared Property Facilities
            </label>
            <div className="flex flex-wrap gap-2">
              {SHARED_PROPERTY_FACILITIES.map((fac) => {
                const active = (form.sharedFacilities || []).includes(fac);
                return (
                  <button
                    type="button"
                    key={fac}
                    onClick={() =>
                      toggleArrayItem(form.sharedFacilities || [], fac, form.setSharedFacilities)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      active
                        ? "bg-zinc-950 text-white border-zinc-950"
                        : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {active ? <CheckIcon className="w-3 h-3 text-white" /> : <PlusIcon className="w-3 h-3" />}
                    <span>{fac}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Notice Period (Days)
              </label>
              <select
                value={form.noticePeriodDays || "30"}
                onChange={(e) => form.setNoticePeriodDays(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="15">15 Days</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="60">60 Days (2 Months)</option>
                <option value="0">No Notice Required</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Gate Closing Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:30 PM or No Curfew"
                value={form.gateClosingTime || "10:30 PM"}
                onChange={(e) => form.setGateClosingTime(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. HOSTEL
  if (normCategory === "HOSTEL") {
    const foodList = ["Breakfast", "Lunch", "Dinner", "Evening Tea / Snacks"];

    return (
      <div className="space-y-6 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Hostel Accommodation Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specify multiple room sharing configurations, gender preference, food availability, and shared facilities
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
            Hostel Profile
          </span>
        </div>

        {/* SECTION 1: Multiple Room Configurations */}
        {form.setOccupancyOptions && (
          <SharingOptionsEditor
            options={form.occupancyOptions || []}
            onChange={form.setOccupancyOptions}
            onAutoSyncRent={(val) => form.setMonthlyRentPerBed(val)}
            categoryLabel="Hostel"
          />
        )}

        {/* SECTION 2: Common Property-Level Details */}
        <div className="pt-4 border-t border-zinc-200/80 space-y-4">
          <div className="pb-2 border-b border-zinc-200/60">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">
              Common Property-Level Specifications
            </h4>
            <p className="text-[11px] text-zinc-500">
              These settings apply across the entire hostel facility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Gender Preference <span className="text-red-500">*</span>
              </label>
              {(() => {
                const rawGen = (form.genderCategory || "unisex").toLowerCase().trim();
                const normGen = rawGen.includes("boy") || rawGen.includes("male")
                  ? "boys"
                  : rawGen.includes("girl") || rawGen.includes("female")
                  ? "girls"
                  : "unisex";
                return (
                  <select
                    value={normGen}
                    onChange={(e) => form.setGenderCategory(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
                  >
                    <option value="boys">Boys Only Hostel</option>
                    <option value="girls">Girls Only Hostel</option>
                    <option value="unisex">Co-living / Mixed Hostel</option>
                  </select>
                );
              })()}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Eligible Residents
              </label>
              <select
                value={form.studentOrWorking || "open_to_all"}
                onChange={(e) => form.setStudentOrWorking(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="students">Students Only</option>
                <option value="working_professionals">Working Professionals</option>
                <option value="open_to_all">Open to All</option>
              </select>
            </div>
          </div>

          {/* Meals & Mess Facilities */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-800 uppercase block">
                  Food Availability & Mess Facility
                </span>
                <span className="text-[11px] text-zinc-500">
                  Are cafeteria/mess meals provided for hostel residents?
                </span>
              </div>
              <button
                type="button"
                onClick={() => form.setFoodIncluded(!form.foodIncluded)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer ${
                  form.foodIncluded
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-zinc-600 border-zinc-300"
                }`}
              >
                {form.foodIncluded && <CheckIcon className="w-3 h-3" />}
                <span>{form.foodIncluded ? "Meals Included" : "Food Optional / Self"}</span>
              </button>
            </div>

            {form.foodIncluded && (
              <div className="pt-2 border-t border-zinc-100">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">
                  Select Included Meals
                </span>
                <div className="flex flex-wrap gap-2">
                  {foodList.map((meal) => {
                    const active = (form.foodOptions || []).includes(meal);
                    return (
                      <button
                        type="button"
                        key={meal}
                        onClick={() =>
                          toggleArrayItem(form.foodOptions || [], meal, form.setFoodOptions)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          active
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {active ? <CheckIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
                        <span>{meal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shared Hostel Facilities */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-2">
              Shared Hostel Facilities
            </label>
            <div className="flex flex-wrap gap-2">
              {SHARED_PROPERTY_FACILITIES.map((fac) => {
                const active = (form.sharedFacilities || []).includes(fac);
                return (
                  <button
                    type="button"
                    key={fac}
                    onClick={() =>
                      toggleArrayItem(form.sharedFacilities || [], fac, form.setSharedFacilities)
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      active
                        ? "bg-zinc-950 text-white border-zinc-950"
                        : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {active ? <CheckIcon className="w-3 h-3 text-white" /> : <PlusIcon className="w-3 h-3" />}
                    <span>{fac}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Contractual Stay Duration
              </label>
              <select
                value={form.contractDuration || "3_months"}
                onChange={(e) => form.setContractDuration(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="3_months">3 Months Minimum</option>
                <option value="4_months">4 Months Minimum</option>
                <option value="6_months">6 Months Minimum</option>
                <option value="10_months">10 Months Academic Term</option>
                <option value="12_months">12 Months (1 Year Lease)</option>
                <option value="custom">Custom Duration...</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                Notice Period (Days)
              </label>
              <select
                value={form.noticePeriodDays || "30"}
                onChange={(e) => form.setNoticePeriodDays(e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="15">15 Days</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="60">60 Days (2 Months)</option>
                <option value="0">No Notice Required</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. FLAT / APARTMENT / HOUSE
  if (normCategory === "FLAT" || normCategory === "APARTMENT" || normCategory === "HOUSE") {
    return (
      <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Residential Flat & Apartment Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specify BHK layout, carpet area, furnishings, floor level, and tenant preference
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
            Flat Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              BHK Configuration <span className="text-red-500">*</span>
            </label>
            <select
              value={form.bhkConfig || `${form.bedrooms || 1} BHK`}
              onChange={(e) => {
                form.setBhkConfig(e.target.value);
                const num = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 1;
                form.setBedrooms(num);
              }}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="1 RK">1 RK (Room Kitchen)</option>
              <option value="1 BHK">1 BHK</option>
              <option value="2 BHK">2 BHK</option>
              <option value="3 BHK">3 BHK</option>
              <option value="4+ BHK">4+ BHK / Penthouse</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bedrooms <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.bedrooms != null ? form.bedrooms : 1}
              onChange={(e) => form.setBedrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bathrooms <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms != null ? form.bathrooms : 1}
              onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Furnishing
            </label>
            <button
              type="button"
              onClick={() => form.setFurnished(!form.furnished)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                form.furnished
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300"
              }`}
            >
              {form.furnished && <CheckIcon className="w-3.5 h-3.5" />}
              <span>{form.furnished ? "Fully Furnished" : "Semi / Unfurnished"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Carpet Area (Sq. Ft)
            </label>
            <input
              type="number"
              placeholder="e.g. 1150"
              value={form.areaSqFt != null ? form.areaSqFt : ""}
              onChange={(e) => form.setAreaSqFt(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Floor Number
            </label>
            <input
              type="number"
              placeholder="e.g. 4"
              value={form.floorNumber != null ? form.floorNumber : ""}
              onChange={(e) => form.setFloorNumber(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Total Floors
            </label>
            <input
              type="number"
              placeholder="e.g. 14"
              value={form.totalFloors != null ? form.totalFloors : ""}
              onChange={(e) => form.setTotalFloors(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Parking Space
            </label>
            <select
              value={form.parkingType || "covered"}
              onChange={(e) => form.setParkingType(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="covered">Covered Car Parking</option>
              <option value="open">Open Society Parking</option>
              <option value="two_wheeler">Two-Wheeler Only</option>
              <option value="none">No Parking</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Tenant Preference
            </label>
            <select
              value={form.tenantPreference || "any"}
              onChange={(e) => form.setTenantPreference(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="any">Family or Bachelors (Any)</option>
              <option value="family">Families Only</option>
              <option value="bachelors">Bachelors / Working Professionals</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Monthly Maintenance (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 2000 (0 if included)"
              value={form.maintenanceCharges != null ? form.maintenanceCharges : ""}
              onChange={(e) => form.setMaintenanceCharges(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Notice Period (Days)
            </label>
            <select
              value={form.noticePeriodDays || "30"}
              onChange={(e) => form.setNoticePeriodDays(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="15">15 Days</option>
              <option value="30">30 Days (1 Month)</option>
              <option value="60">60 Days (2 Months)</option>
              <option value="0">No Notice Required</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // 5. HOTEL
  return (
    <div className="space-y-6 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Hotel Accommodation Details
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Configure multiple hotel room types, beds, separate bathroom settings, and breakfast policy
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full">
          Hotel Profile
        </span>
      </div>

      {/* SECTION 1: Multiple Hotel Room Types */}
      {form.setOccupancyOptions && (
        <HotelRoomTypesEditor
          options={form.occupancyOptions || []}
          onChange={form.setOccupancyOptions}
        />
      )}

      {/* SECTION 2: Common Hotel-Level Details */}
      <div className="pt-4 border-t border-zinc-200/80 space-y-4">
        <div className="pb-2 border-b border-zinc-200/60">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">
            Common Hotel Policies & Amenities
          </h4>
          <p className="text-[11px] text-zinc-500">
            These policies apply to all guests staying at this hotel property.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Breakfast Policy
            </label>
            <button
              type="button"
              onClick={() => form.setBreakfastIncluded(!form.breakfastIncluded)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                form.breakfastIncluded
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-700 border-zinc-300"
              }`}
            >
              {form.breakfastIncluded && <CheckIcon className="w-3.5 h-3.5" />}
              <span>{form.breakfastIncluded ? "Free Breakfast Included" : "Breakfast Extra / Not Included"}</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Check-In Time
            </label>
            <input
              type="text"
              placeholder="12:00 PM"
              value={form.checkInTime || "12:00 PM"}
              onChange={(e) => form.setCheckInTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Check-Out Time
            </label>
            <input
              type="text"
              placeholder="11:00 AM"
              value={form.checkOutTime || "11:00 AM"}
              onChange={(e) => form.setCheckOutTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Cancellation Policy
          </label>
          <select
            value={form.cancellationPolicy || "flexible"}
            onChange={(e) => form.setCancellationPolicy(e.target.value)}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
          >
            <option value="flexible">Flexible: Free cancellation up to 24h before check-in</option>
            <option value="moderate">Moderate: Free cancellation up to 5 days before check-in</option>
            <option value="non_refundable">Non-refundable: No refund on cancellation</option>
          </select>
        </div>
      </div>
    </div>
  );
}
