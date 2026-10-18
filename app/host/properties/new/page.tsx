"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { AlertTriangleIcon } from "@/components/ui/Icons";
import PropertyImageUploader from "@/components/property/PropertyImageUploader";
import { createProperty, getEligibility } from "@/lib/api";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";

import CategorySpecificFormFields, { CategoryFormState } from "@/components/property/CategorySpecificFormFields";

export default function CreateNewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("BNB");
  const [bookingType, setBookingType] = useState("daily");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Gurugram");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [furnished, setFurnished] = useState(true);
  const [areaSqFt, setAreaSqFt] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Category-specific states
  // BNB
  const [spaceType, setSpaceType] = useState("entire_place");
  const [maxGuests, setMaxGuests] = useState(2);
  const [bedsCount, setBedsCount] = useState(1);
  const [checkInTime, setCheckInTime] = useState("02:00 PM");
  const [checkOutTime, setCheckOutTime] = useState("11:00 AM");
  const [houseRules, setHouseRules] = useState<string[]>(["No smoking inside", "Quiet hours after 10 PM"]);

  // PG
  const [occupancyType, setOccupancyType] = useState("single");
  const [genderCategory, setGenderCategory] = useState("unisex");
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [foodOptions, setFoodOptions] = useState<string[]>(["Breakfast", "Dinner"]);
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [gateClosingTime, setGateClosingTime] = useState("10:30 PM");

  // Hostel
  const [roomType, setRoomType] = useState("dormitory");
  const [totalBeds, setTotalBeds] = useState(4);
  const [availableBeds, setAvailableBeds] = useState(2);
  const [priceModel, setPriceModel] = useState("per_bed");
  const [studentOrWorking, setStudentOrWorking] = useState("open_to_all");
  const [sharedFacilities, setSharedFacilities] = useState<string[]>(["Common Study Room", "Wi-Fi", "Personal Lockers"]);

  // Flat
  const [bhkConfig, setBhkConfig] = useState("1 BHK");
  const [maintenanceCharges, setMaintenanceCharges] = useState("");
  const [tenantPreference, setTenantPreference] = useState("any");
  const [floorNumber, setFloorNumber] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [parkingType, setParkingType] = useState("covered");

  // Hotel
  const [bedType, setBedType] = useState("queen");
  const [breakfastIncluded, setBreakfastIncluded] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<{ eligible?: boolean; status?: string; subscriptionMode?: string; reason?: string } | null>(null);

  useEffect(() => {
    getEligibility()
      .then((res) => setEligibility(res))
      .catch((err) => console.warn("Failed to check eligibility:", err));
  }, []);

  const handleCategoryChange = (newCat: string) => {
    setPropertyType(newCat);
    const upper = newCat.trim().toUpperCase();
    if (upper === "PG") {
      setBookingType("monthly");
      setOccupancyType("single");
      setGenderCategory("unisex");
    } else if (upper === "FLAT" || upper === "APARTMENT" || upper === "HOUSE") {
      setBookingType("monthly");
      setBhkConfig("1 BHK");
    } else if (upper === "HOSTEL") {
      setBookingType("monthly");
      setRoomType("dormitory");
      setPriceModel("per_bed");
    } else if (upper === "HOTEL") {
      setBookingType("daily");
      setRoomType("standard");
    } else if (upper === "BNB" || upper === "VACATIONSTAY" || upper === "VACATION_STAY") {
      setBookingType("daily");
      setSpaceType("entire_place");
    }
  };

  const formState: CategoryFormState = {
    bedrooms,
    setBedrooms,
    bathrooms,
    setBathrooms,
    furnished,
    setFurnished,
    areaSqFt,
    setAreaSqFt,

    spaceType,
    setSpaceType,
    maxGuests,
    setMaxGuests,
    bedsCount,
    setBedsCount,
    checkInTime,
    setCheckInTime,
    checkOutTime,
    setCheckOutTime,
    houseRules,
    setHouseRules,

    occupancyType,
    setOccupancyType,
    genderCategory,
    setGenderCategory,
    foodIncluded,
    setFoodIncluded,
    foodOptions,
    setFoodOptions,
    securityDeposit,
    setSecurityDeposit,
    noticePeriodDays,
    setNoticePeriodDays,
    gateClosingTime,
    setGateClosingTime,

    roomType,
    setRoomType,
    totalBeds,
    setTotalBeds,
    availableBeds,
    setAvailableBeds,
    priceModel,
    setPriceModel,
    studentOrWorking,
    setStudentOrWorking,
    sharedFacilities,
    setSharedFacilities,

    bhkConfig,
    setBhkConfig,
    maintenanceCharges,
    setMaintenanceCharges,
    tenantPreference,
    setTenantPreference,
    floorNumber,
    setFloorNumber,
    totalFloors,
    setTotalFloors,
    parkingType,
    setParkingType,

    bedType,
    setBedType,
    breakfastIncluded,
    setBreakfastIncluded,
    cancellationPolicy,
    setCancellationPolicy,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !description || !area || !price) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (!isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }

    setLoading(true);
    try {
      const priceNum = parseFloat(price);
      const stayTypeVal = bookingType.toLowerCase();
      const normCat = propertyType.trim().toUpperCase();

      await createProperty({
        title,
        description,
        propertyType,
        category: propertyType,
        bookingType,
        stayTypes: [stayTypeVal],
        pricePerNight: stayTypeVal === "daily" ? priceNum : undefined,
        pricePerMonth: stayTypeVal === "monthly" ? priceNum : undefined,
        pricePerHour: stayTypeVal === "hourly" ? priceNum : undefined,
        dailyPrice: stayTypeVal === "daily" ? priceNum : undefined,
        monthlyPrice: stayTypeVal === "monthly" ? priceNum : undefined,
        hourlyPrice: stayTypeVal === "hourly" ? priceNum : undefined,
        price: priceNum,
        city,
        area,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        furnished,
        areaSqFt: areaSqFt ? parseFloat(areaSqFt) : undefined,
        images,

        // BNB
        spaceType: normCat === "BNB" || normCat === "VACATIONSTAY" ? spaceType : undefined,
        maxGuests: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? Number(maxGuests) : undefined,
        bedsCount: normCat === "BNB" || normCat === "VACATIONSTAY" ? Number(bedsCount) : undefined,
        checkInTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkInTime : undefined,
        checkOutTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkOutTime : undefined,
        houseRules: normCat === "BNB" || normCat === "VACATIONSTAY" ? houseRules : undefined,

        // PG
        occupancyType: normCat === "PG" ? occupancyType : undefined,
        genderCategory: normCat === "PG" ? genderCategory : undefined,
        foodIncluded: normCat === "PG" ? foodIncluded : undefined,
        foodOptions: normCat === "PG" && foodIncluded ? foodOptions : undefined,
        securityDeposit: (normCat === "PG" || normCat === "FLAT") && securityDeposit ? parseFloat(securityDeposit) : undefined,
        noticePeriodDays: normCat === "PG" && noticePeriodDays ? parseInt(noticePeriodDays) : undefined,
        gateClosingTime: normCat === "PG" ? gateClosingTime : undefined,

        // Hostel
        roomType: normCat === "HOSTEL" || normCat === "HOTEL" ? roomType : undefined,
        totalBeds: normCat === "HOSTEL" ? Number(totalBeds) : undefined,
        availableBeds: normCat === "HOSTEL" ? Number(availableBeds) : undefined,
        priceModel: normCat === "HOSTEL" ? priceModel : undefined,
        studentOrWorking: normCat === "HOSTEL" ? studentOrWorking : undefined,
        sharedFacilities: normCat === "HOSTEL" ? sharedFacilities : undefined,

        // Flat
        bhkConfig: normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE" ? bhkConfig : undefined,
        maintenanceCharges: (normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE") && maintenanceCharges ? parseFloat(maintenanceCharges) : undefined,
        tenantPreference: normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE" ? tenantPreference : undefined,
        floorNumber: (normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE") && floorNumber ? parseInt(floorNumber) : undefined,
        totalFloors: (normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE") && totalFloors ? parseInt(totalFloors) : undefined,
        parkingType: normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE" ? parkingType : undefined,

        // Hotel
        bedType: normCat === "HOTEL" ? bedType : undefined,
        breakfastIncluded: normCat === "HOTEL" ? breakfastIncluded : undefined,
        cancellationPolicy: normCat === "HOTEL" ? cancellationPolicy : undefined,
      });

      alert("Property submitted successfully for admin verification!");
      router.push("/host/properties");
    } catch (err: any) {
      setError(err.message || "Failed to create property.");
    } finally {
      setLoading(false);
    }
  };

  const getPriceLabel = () => {
    const norm = propertyType.trim().toUpperCase();
    if (bookingType === "hourly") return "Hourly Price (₹)";
    if (norm === "HOSTEL" && priceModel === "per_bed") return "Monthly Bed Rate (₹)";
    if (norm === "PG") return "Monthly Rent / Bed (₹)";
    if (bookingType === "monthly") return "Monthly Rent (₹)";
    return "Nightly Price (₹)";
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28 md:py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">Add New Property</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            List your Delhi NCR accommodation on StayTrack
          </p>
        </div>

        {eligibility && !eligibility.eligible && eligibility.subscriptionMode === "paid" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Active Subscription Required</span>
              </p>
              <p className="font-medium">
                Platform billing mode is set to Paid. You need an active Host Subscription (Status: {eligibility.status || "Inactive"}) to publish properties.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/host/subscription")}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer transition-all"
            >
              Manage Subscription
            </button>
          </div>
        )}

        <GlassCard className="border border-zinc-200 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                Property Title
              </label>
              <input
                type="text"
                placeholder="e.g. Furnished 2BHK Apartment in Cyber City, Gurugram"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe key features, amenities, food availability, Wi-Fi speed, etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-xs font-medium border border-zinc-200 focus:border-black outline-none bg-zinc-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  {ACCOMMODATION_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.id} ({cat.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Stay Model
                </label>
                <select
                  value={bookingType}
                  onChange={(e) => setBookingType(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  <option value="daily">Nightly / Daily</option>
                  <option value="monthly">Monthly Stay</option>
                  <option value="hourly">Hourly Stay</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  {getPriceLabel()}
                </label>
                <input
                  type="number"
                  placeholder="2500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  City (Delhi NCR)
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                >
                  {SUPPORTED_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Area / Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cyber City, Sector 62"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <CategorySpecificFormFields category={propertyType} form={formState} />

            <div className="pt-4 border-t border-zinc-100">
              <PropertyImageUploader images={images} onChange={setImages} />
            </div>

            <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Property Listing"}
              </button>
            </div>
          </form>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

