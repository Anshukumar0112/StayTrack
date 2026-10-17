"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import PropertyImageUploader from "@/components/property/PropertyImageUploader";
import Link from "next/link";
import { getPropertyDetails, updateProperty, deleteProperty } from "@/lib/api";
import { Property, getPropertyId } from "@/types/property";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";

import CategorySpecificFormFields, { CategoryFormState } from "@/components/property/CategorySpecificFormFields";

export default function HostPropertyEditPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const router = useRouter();
  const { propertyId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");

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

  useEffect(() => {
    setLoading(true);
    getPropertyDetails(propertyId)
      .then((data) => {
        if (data) {
          setTitle(data.title || "");
          setDescription(data.description || "");
          setPropertyType(data.propertyType || data.category || "BNB");
          const bType = data.bookingType || (data.stayTypes && data.stayTypes[0]) || "daily";
          setBookingType(bType.toLowerCase());

          const extractedPrice =
            data.pricePerNight ||
            data.pricePerMonth ||
            data.pricePerHour ||
            data.dailyPrice ||
            data.monthlyPrice ||
            data.hourlyPrice ||
            data.price ||
            "";
          setPrice(String(extractedPrice));

          setCity(data.city || "Gurugram");
          setArea(data.area || "");
          setBedrooms(data.bedrooms || 1);
          setBathrooms(data.bathrooms || 1);
          setFurnished(data.furnished ?? true);
          setAreaSqFt(data.areaSqFt ? String(data.areaSqFt) : "");
          setImages(Array.isArray(data.images) ? data.images : []);
          setVerificationStatus(data.verificationStatus || "pending");

          // BNB
          if (data.spaceType) setSpaceType(data.spaceType);
          if (data.maxGuests) setMaxGuests(data.maxGuests);
          if (data.bedsCount) setBedsCount(data.bedsCount);
          if (data.checkInTime) setCheckInTime(data.checkInTime);
          if (data.checkOutTime) setCheckOutTime(data.checkOutTime);
          if (Array.isArray(data.houseRules) && data.houseRules.length > 0) setHouseRules(data.houseRules);

          // PG
          if (data.occupancyType) setOccupancyType(data.occupancyType);
          if (data.genderCategory) setGenderCategory(data.genderCategory);
          if (data.foodIncluded !== undefined) setFoodIncluded(data.foodIncluded);
          if (Array.isArray(data.foodOptions) && data.foodOptions.length > 0) setFoodOptions(data.foodOptions);
          if (data.securityDeposit !== undefined && data.securityDeposit !== null) setSecurityDeposit(String(data.securityDeposit));
          if (data.noticePeriodDays !== undefined && data.noticePeriodDays !== null) setNoticePeriodDays(String(data.noticePeriodDays));
          if (data.gateClosingTime) setGateClosingTime(data.gateClosingTime);

          // Hostel
          if (data.roomType) setRoomType(data.roomType);
          if (data.totalBeds) setTotalBeds(data.totalBeds);
          if (data.availableBeds !== undefined && data.availableBeds !== null) setAvailableBeds(data.availableBeds);
          if (data.priceModel) setPriceModel(data.priceModel);
          if (data.studentOrWorking) setStudentOrWorking(data.studentOrWorking);
          if (Array.isArray(data.sharedFacilities) && data.sharedFacilities.length > 0) setSharedFacilities(data.sharedFacilities);

          // Flat
          if (data.bhkConfig) {
            setBhkConfig(data.bhkConfig);
          } else if (data.bedrooms) {
            setBhkConfig(`${data.bedrooms} BHK`);
          }
          if (data.maintenanceCharges !== undefined && data.maintenanceCharges !== null) setMaintenanceCharges(String(data.maintenanceCharges));
          if (data.tenantPreference) setTenantPreference(data.tenantPreference);
          if (data.floorNumber !== undefined && data.floorNumber !== null) setFloorNumber(String(data.floorNumber));
          if (data.totalFloors !== undefined && data.totalFloors !== null) setTotalFloors(String(data.totalFloors));
          if (data.parkingType) setParkingType(data.parkingType);

          // Hotel
          if (data.bedType) setBedType(data.bedType);
          if (data.breakfastIncluded !== undefined) setBreakfastIncluded(data.breakfastIncluded);
          if (data.cancellationPolicy) setCancellationPolicy(data.cancellationPolicy);
        }
      })
      .catch((err) => {
        console.error("Failed to load property details:", err);
        setError("Failed to load property details.");
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

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
    setSuccess("");

    if (!title || !description || !area || !price) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (!isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }

    setSaving(true);
    try {
      const priceNum = parseFloat(price);
      const stayTypeVal = bookingType.toLowerCase();
      const normCat = propertyType.trim().toUpperCase();

      await updateProperty(propertyId, {
        title,
        description,
        propertyType,
        category: propertyType,
        bookingType: stayTypeVal,
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

      setSuccess("Property details updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update property.");
    } finally {
      setSaving(false);
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

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${title || propertyId}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await deleteProperty(propertyId);
      alert("Property deleted successfully.");
      router.push("/host/properties");
    } catch (err: any) {
      setError(err.message || "Failed to delete property.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Link href="/host/properties" className="hover:text-black">My Properties</Link>
            <span>/</span>
            <span className="text-zinc-900 font-bold">Edit Property</span>
          </div>

          {!loading && (
            <Link
              href={`/properties/${propertyId}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
            >
              <span>View Public Page</span> ↗
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading property data...</div>
        ) : (
          <GlassCard className="border border-zinc-200 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200 flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="clay-badge px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                    ID: {propertyId}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    verificationStatus === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : verificationStatus === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {verificationStatus === "approved"
                      ? "Verified & Active"
                      : verificationStatus === "rejected"
                      ? "Rejected"
                      : "Pending Verification"}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-zinc-950">Edit Property</h1>
              </div>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "🗑️ Delete Property"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
                  {success}
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
                <Link
                  href="/host/properties"
                  className="px-5 py-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-100 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </GlassCard>
        )}
      </main>

      <Footer />
    </div>
  );
}
