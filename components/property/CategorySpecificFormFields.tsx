"use client";

import React from "react";
import { CheckIcon, PlusIcon } from "@/components/ui/Icons";

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
  form: CategoryFormState;
}

export default function CategorySpecificFormFields({
  category,
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
    const rulesList = [
      "No smoking inside",
      "No parties or events",
      "Pets allowed",
      "Quiet hours after 10 PM",
      "Self check-in",
    ];

    return (
      <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              BNB & Homestay Specifications
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specific details for travelers and guests booking your stay
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
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="entire_place">Entire Place / Villa</option>
              <option value="private_room">Private Room</option>
              <option value="shared_room">Shared Space</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Max Guests Capacity
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.maxGuests || 2}
              onChange={(e) => form.setMaxGuests(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Beds Count
            </label>
            <input
              type="number"
              min={1}
              value={form.bedsCount || 1}
              onChange={(e) => form.setBedsCount(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bedrooms
            </label>
            <input
              type="number"
              min={1}
              value={form.bedrooms}
              onChange={(e) => form.setBedrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Bathrooms
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms}
              onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Check-In Time
            </label>
            <input
              type="text"
              placeholder="e.g. 02:00 PM"
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
              placeholder="e.g. 11:00 AM"
              value={form.checkOutTime || "11:00 AM"}
              onChange={(e) => form.setCheckOutTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-2">
            House Rules & Stay Policies
          </label>
          <div className="flex flex-wrap gap-2">
            {rulesList.map((rule) => {
              const active = (form.houseRules || []).includes(rule);
              return (
                <button
                  type="button"
                  key={rule}
                  onClick={() => toggleArrayItem(form.houseRules || [], rule, form.setHouseRules)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    active
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {active ? <CheckIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
                  <span>{rule}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. PG (PAYING GUEST / COLIVING)
  if (normCategory === "PG") {
    const foodList = ["Breakfast", "Lunch", "Dinner", "Evening Tea / Snacks"];

    return (
      <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              PG & Coliving Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specify sharing arrangement, gender preference, meals, and house guidelines
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full">
            PG Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Occupancy / Sharing
            </label>
            <select
              value={form.occupancyType || "single"}
              onChange={(e) => {
                form.setOccupancyType(e.target.value);
                if (e.target.value === "single") form.setBedrooms(1);
                else if (e.target.value === "double") form.setBedrooms(2);
                else if (e.target.value === "triple") form.setBedrooms(3);
                else form.setBedrooms(4);
              }}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="single">Single Private Room</option>
              <option value="double">Double Sharing (2 Beds)</option>
              <option value="triple">Triple Sharing (3 Beds)</option>
              <option value="four_plus">Four+ Sharing (Dorm/Group)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Gender Category
            </label>
            <select
              value={form.genderCategory || "unisex"}
              onChange={(e) => form.setGenderCategory(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="boys">Boys Only PG</option>
              <option value="girls">Girls Only PG</option>
              <option value="unisex">Unisex / Coliving</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Security Deposit (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={form.securityDeposit}
              onChange={(e) => form.setSecurityDeposit(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Notice Period (Days)
            </label>
            <select
              value={form.noticePeriodDays || "30"}
              onChange={(e) => form.setNoticePeriodDays(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
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

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Attached Bathrooms
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms}
              onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="border-t border-zinc-200/80 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-700 uppercase">
              Meals & Mess Facility
            </span>
            <button
              type="button"
              onClick={() => form.setFoodIncluded(!form.foodIncluded)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all border ${
                form.foodIncluded
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-600 border-zinc-300"
              }`}
            >
              {form.foodIncluded && <CheckIcon className="w-3 h-3" />}
              <span>{form.foodIncluded ? "Meals Included in Rent" : "Food Not Included / Optional"}</span>
            </button>
          </div>

          {form.foodIncluded && (
            <div className="mt-2 flex flex-wrap gap-2">
              {foodList.map((meal) => {
                const active = (form.foodOptions || []).includes(meal);
                return (
                  <button
                    type="button"
                    key={meal}
                    onClick={() =>
                      toggleArrayItem(form.foodOptions || [], meal, form.setFoodOptions)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
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
          )}
        </div>
      </div>
    );
  }

  // 3. HOSTEL
  if (normCategory === "HOSTEL") {
    const facilitiesList = [
      "Common Study Room",
      "Wi-Fi",
      "Mess / Cafeteria",
      "Personal Lockers",
      "Laundry Facility",
      "Biometric Access",
      "24/7 Power Backup",
    ];

    return (
      <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Hostel Accommodation Details
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Specify dorm beds, pricing model, student/working eligibility, and shared facilities
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
            Hostel Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Room / Dorm Structure
            </label>
            <select
              value={form.roomType || "dormitory"}
              onChange={(e) => form.setRoomType(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="dormitory">Dormitory (Bunk Beds)</option>
              <option value="private">Private Single / Twin Room</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Pricing Model
            </label>
            <select
              value={form.priceModel || "per_bed"}
              onChange={(e) => form.setPriceModel(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="per_bed">Price Per Bed (Monthly)</option>
              <option value="per_room">Price Per Room (Entire Dorm)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Eligible Residents
            </label>
            <select
              value={form.studentOrWorking || "open_to_all"}
              onChange={(e) => form.setStudentOrWorking(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="students">Students Only</option>
              <option value="working_professionals">Working Professionals</option>
              <option value="open_to_all">Open to All</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Total Beds in Room
            </label>
            <input
              type="number"
              min={1}
              value={form.totalBeds || 4}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                form.setTotalBeds(val);
                form.setBedrooms(val);
                if (form.availableBeds > val) form.setAvailableBeds(val);
              }}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Available Beds Now
            </label>
            <input
              type="number"
              min={0}
              max={form.totalBeds || 4}
              value={form.availableBeds || 2}
              onChange={(e) => form.setAvailableBeds(Number(e.target.value))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Washrooms Available
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms}
              onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-2">
            Shared Hostel Facilities
          </label>
          <div className="flex flex-wrap gap-2">
            {facilitiesList.map((fac) => {
              const active = (form.sharedFacilities || []).includes(fac);
              return (
                <button
                  type="button"
                  key={fac}
                  onClick={() =>
                    toggleArrayItem(form.sharedFacilities || [], fac, form.setSharedFacilities)
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    active
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {active ? <CheckIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
                  <span>{fac}</span>
                </button>
              );
            })}
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
              Specify configuration, carpet area, deposit, floor, and tenant preferences
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
            Flat Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              BHK Configuration
            </label>
            <select
              value={form.bhkConfig || `${form.bedrooms || 1} BHK`}
              onChange={(e) => {
                form.setBhkConfig(e.target.value);
                const num = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 1;
                form.setBedrooms(num);
              }}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
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
              Bathrooms
            </label>
            <input
              type="number"
              min={1}
              value={form.bathrooms}
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
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center justify-center gap-1.5 ${
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
              placeholder="e.g. 1150"
              value={form.areaSqFt}
              onChange={(e) => form.setAreaSqFt(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Security Deposit (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={form.securityDeposit}
              onChange={(e) => form.setSecurityDeposit(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Monthly Maintenance (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 2000 (0 if included)"
              value={form.maintenanceCharges}
              onChange={(e) => form.setMaintenanceCharges(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Tenant Preference
            </label>
            <select
              value={form.tenantPreference || "any"}
              onChange={(e) => form.setTenantPreference(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="any">Family or Bachelors (Any)</option>
              <option value="family">Families Only</option>
              <option value="bachelors">Bachelors / Working Professionals</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Floor Number
            </label>
            <input
              type="number"
              placeholder="e.g. 4"
              value={form.floorNumber}
              onChange={(e) => form.setFloorNumber(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Total Floors in Building
            </label>
            <input
              type="number"
              placeholder="e.g. 14"
              value={form.totalFloors}
              onChange={(e) => form.setTotalFloors(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
              Parking Space
            </label>
            <select
              value={form.parkingType || "covered"}
              onChange={(e) => form.setParkingType(e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="covered">Dedicated Covered Car Parking</option>
              <option value="open">Open Society Parking</option>
              <option value="two_wheeler">Two-Wheeler Only</option>
              <option value="none">No Parking</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // 5. HOTEL
  return (
    <div className="space-y-5 rounded-2xl bg-zinc-50/70 p-5 border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Hotel Room Specifications
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Details for hotel room booking: room category, bed arrangement, check-in, and breakfast
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full">
          Hotel Profile
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Room Category
          </label>
          <select
            value={form.roomType || "standard"}
            onChange={(e) => form.setRoomType(e.target.value)}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
          >
            <option value="standard">Standard Classic Room</option>
            <option value="deluxe">Deluxe Room</option>
            <option value="executive">Executive Room</option>
            <option value="suite">Luxury Suite</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Bed Type
          </label>
          <select
            value={form.bedType || "queen"}
            onChange={(e) => form.setBedType(e.target.value)}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
          >
            <option value="king">1 King Bed</option>
            <option value="queen">1 Queen Bed</option>
            <option value="twin">2 Twin Beds</option>
            <option value="single">1 Single Bed</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Max Occupancy
          </label>
          <input
            type="number"
            min={1}
            max={6}
            value={form.maxGuests || 2}
            onChange={(e) => form.setMaxGuests(Math.max(1, Number(e.target.value)))}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Bathrooms
          </label>
          <input
            type="number"
            min={1}
            value={form.bathrooms}
            onChange={(e) => form.setBathrooms(Math.max(1, Number(e.target.value)))}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Breakfast
          </label>
          <button
            type="button"
            onClick={() => form.setBreakfastIncluded(!form.breakfastIncluded)}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border inline-flex items-center justify-center gap-1.5 ${
              form.breakfastIncluded
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-zinc-700 border-zinc-300"
            }`}
          >
            {form.breakfastIncluded && <CheckIcon className="w-3.5 h-3.5" />}
            <span>{form.breakfastIncluded ? "Free Breakfast" : "Breakfast Extra"}</span>
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
            Check-In
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
            Check-Out
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
          className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-900"
        >
          <option value="flexible">Flexible: Free cancellation up to 24h before check-in</option>
          <option value="moderate">Moderate: Free cancellation up to 5 days before check-in</option>
          <option value="non_refundable">Non-refundable: No refund on cancellation</option>
        </select>
      </div>
    </div>
  );
}
