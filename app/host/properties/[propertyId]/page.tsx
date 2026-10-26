"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { TrashIcon, ArrowLeftIcon, ShieldCheckIcon } from "@/components/ui/Icons";
import PropertyImageUploader from "@/components/property/PropertyImageUploader";
import PropertyLocationPicker from "@/components/property/PropertyLocationPicker";
import Link from "next/link";
import { getPropertyDetails, updateProperty, deleteProperty } from "@/lib/api";
import { Property, getPropertyId, OccupancyOption } from "@/types/property";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import {
  ACCOMMODATION_CATEGORIES,
  getAllowedStayModels,
  getDefaultStayModel,
  isStayModelAllowedForCategory,
} from "@/lib/categories";

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
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
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

  // Stay Terms (PG & Hostel)
  const [contractDuration, setContractDuration] = useState("3_months");
  const [customDurationValue, setCustomDurationValue] = useState("");
  const [customDurationUnit, setCustomDurationUnit] = useState("months");
  const [monthlyRentPerBed, setMonthlyRentPerBed] = useState("");
  const [securityDepositEnabled, setSecurityDepositEnabled] = useState(true);

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
  const [occupancyOptions, setOccupancyOptions] = useState<OccupancyOption[]>([]);

  const populateForm = (data: Property) => {
    setTitle(data.title || "");
    setDescription(data.description || "");
    const loadedCat = data.propertyType || data.category || "BNB";
    setPropertyType(loadedCat);
    let bType = data.bookingType || (data.stayTypes && data.stayTypes[0]) || "";
    if (!isStayModelAllowedForCategory(loadedCat, bType)) {
      bType = getDefaultStayModel(loadedCat);
    }
    setBookingType(bType.toLowerCase());

    const extractedPrice =
      data.pricePerNight != null
        ? data.pricePerNight
        : data.pricePerMonth != null
        ? data.pricePerMonth
        : data.pricePerHour != null
        ? data.pricePerHour
        : data.dailyPrice != null
        ? data.dailyPrice
        : data.monthlyPrice != null
        ? data.monthlyPrice
        : data.hourlyPrice != null
        ? data.hourlyPrice
        : data.price != null
        ? data.price
        : "";
    setPrice(extractedPrice !== "" ? String(extractedPrice) : "");

    setCity(data.city || "Gurugram");
    setArea(data.area || "");
    setAddress(data.address || "");
    setLatitude(data.latitude != null ? data.latitude : undefined);
    setLongitude(data.longitude != null ? data.longitude : undefined);
    setBedrooms(data.bedrooms != null ? data.bedrooms : 1);
    setBathrooms(data.bathrooms != null ? data.bathrooms : 1);
    setFurnished(data.furnished ?? true);
    setAreaSqFt(data.areaSqFt != null ? String(data.areaSqFt) : "");
    setImages(Array.isArray(data.images) ? data.images : []);
    setVerificationStatus(data.verificationStatus || "pending");

    // BNB
    if (data.spaceType) setSpaceType(data.spaceType);
    if (data.maxGuests != null) setMaxGuests(data.maxGuests);
    if (data.bedsCount != null) setBedsCount(data.bedsCount);
    if (data.checkInTime) setCheckInTime(data.checkInTime);
    if (data.checkOutTime) setCheckOutTime(data.checkOutTime);
    if (Array.isArray(data.houseRules) && data.houseRules.length > 0) setHouseRules(data.houseRules);

    // Stay Terms (PG & Hostel)
    if (data.contractDuration) setContractDuration(data.contractDuration);
    if (data.customDurationValue != null) setCustomDurationValue(String(data.customDurationValue));
    if (data.customDurationUnit) setCustomDurationUnit(data.customDurationUnit);

    const normLoaded = loadedCat.trim().toUpperCase();
    if (data.monthlyRentPerBed != null) {
      setMonthlyRentPerBed(String(data.monthlyRentPerBed));
      if (normLoaded === "PG" || (normLoaded === "HOSTEL" && data.priceModel === "per_bed")) {
        setPrice(String(data.monthlyRentPerBed));
      }
    } else if (normLoaded === "PG" && extractedPrice) {
      setMonthlyRentPerBed(String(extractedPrice));
    } else {
      setMonthlyRentPerBed("");
    }

    if (data.securityDepositEnabled != null) {
      setSecurityDepositEnabled(Boolean(data.securityDepositEnabled));
    } else if (data.securityDeposit != null) {
      setSecurityDepositEnabled(Number(data.securityDeposit) > 0);
    }

    // PG
    if (data.occupancyType) {
      const rawOcc = String(data.occupancyType).toLowerCase();
      if (rawOcc.includes("single")) setOccupancyType("single");
      else if (rawOcc.includes("double")) setOccupancyType("double");
      else if (rawOcc.includes("triple")) setOccupancyType("triple");
      else if (rawOcc.includes("four")) setOccupancyType("four_plus");
      else setOccupancyType(rawOcc);
    }
    if (data.genderCategory) {
      setGenderCategory(String(data.genderCategory).toLowerCase());
    }
    if (data.foodIncluded != null) setFoodIncluded(Boolean(data.foodIncluded));
    if (Array.isArray(data.foodOptions) && data.foodOptions.length > 0) setFoodOptions(data.foodOptions);
    if (data.securityDeposit != null) setSecurityDeposit(String(data.securityDeposit));
    if (data.noticePeriodDays != null) setNoticePeriodDays(String(data.noticePeriodDays));
    if (data.gateClosingTime) setGateClosingTime(data.gateClosingTime);

    // Hostel
    if (data.roomType) setRoomType(data.roomType);
    if (data.totalBeds != null) setTotalBeds(data.totalBeds);
    if (data.availableBeds != null) setAvailableBeds(data.availableBeds);
    if (data.priceModel) setPriceModel(data.priceModel);
    if (data.studentOrWorking) setStudentOrWorking(data.studentOrWorking);
    if (Array.isArray(data.sharedFacilities) && data.sharedFacilities.length > 0) setSharedFacilities(data.sharedFacilities);

    // Flat
    if (data.bhkConfig) {
      setBhkConfig(data.bhkConfig);
    } else if (data.bedrooms) {
      setBhkConfig(`${data.bedrooms} BHK`);
    }
    if (data.maintenanceCharges != null) setMaintenanceCharges(String(data.maintenanceCharges));
    if (data.tenantPreference) setTenantPreference(data.tenantPreference);
    if (data.floorNumber != null) setFloorNumber(String(data.floorNumber));
    if (data.totalFloors != null) setTotalFloors(String(data.totalFloors));
    if (data.parkingType) setParkingType(data.parkingType);

    // Hotel
    if (data.bedType) setBedType(data.bedType);
    if (data.breakfastIncluded != null) setBreakfastIncluded(Boolean(data.breakfastIncluded));
    if (data.cancellationPolicy) setCancellationPolicy(data.cancellationPolicy);

    // Occupancy Options (PG, Hostel & Hotel)
    if (Array.isArray(data.occupancyOptions)) {
      setOccupancyOptions(
        data.occupancyOptions.map((opt) => ({
          ...opt,
          name: opt.name || "",
          occupancyType: opt.occupancyType || "single",
          roomCount: opt.roomCount != null ? opt.roomCount : 1,
          bedsCount: opt.bedsCount != null ? opt.bedsCount : 1,
          monthlyRentPerBed: opt.monthlyRentPerBed != null ? opt.monthlyRentPerBed : 0,
          securityDeposit: opt.securityDeposit != null ? opt.securityDeposit : undefined,
          bathroomType: opt.bathroomType || "attached",
          bathrooms: opt.bathrooms != null ? opt.bathrooms : 1,
          furnished: opt.furnished ?? true,
          amenities: Array.isArray(opt.amenities) ? opt.amenities : [],
          roomDetails: opt.roomDetails || "",
          price: opt.price != null ? opt.price : undefined,
          nightlyPrice: opt.nightlyPrice != null ? opt.nightlyPrice : undefined,
          maxOccupancy: opt.maxOccupancy != null ? opt.maxOccupancy : 2,
        }))
      );
    } else {
      setOccupancyOptions([]);
    }
  };

  const loadPropertyData = async () => {
    try {
      const data = await getPropertyDetails(propertyId);
      if (data) {
        populateForm(data);
        return data;
      }
    } catch (err: any) {
      console.error("Failed to load property details:", err);
      setError("Failed to load property details.");
    }
    return null;
  };

  useEffect(() => {
    setLoading(true);
    loadPropertyData().finally(() => setLoading(false));
  }, [propertyId]);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    const norm = propertyType.trim().toUpperCase();
    if (norm === "PG" || (norm === "HOSTEL" && priceModel === "per_bed")) {
      setMonthlyRentPerBed(val);
    }
  };

  const handleMonthlyRentPerBedChange = (val: string) => {
    setMonthlyRentPerBed(val);
    const norm = propertyType.trim().toUpperCase();
    if (norm === "PG" || (norm === "HOSTEL" && priceModel === "per_bed")) {
      setPrice(val);
    }
  };

  const handleCategoryChange = (newCat: string) => {
    setPropertyType(newCat);
    if (!isStayModelAllowedForCategory(newCat, bookingType)) {
      setBookingType(getDefaultStayModel(newCat));
    }
    const upper = newCat.trim().toUpperCase();
    if (upper === "PG") {
      setOccupancyType("single");
      setGenderCategory("unisex");
      if (!monthlyRentPerBed && price) {
        setMonthlyRentPerBed(price);
      }
    } else if (upper === "FLAT" || upper === "APARTMENT" || upper === "HOUSE") {
      setBhkConfig("1 BHK");
    } else if (upper === "HOSTEL") {
      setRoomType("dormitory");
      setPriceModel("per_bed");
      if (!monthlyRentPerBed && price) {
        setMonthlyRentPerBed(price);
      }
    } else if (upper === "HOTEL") {
      setRoomType("standard");
    } else if (upper === "BNB" || upper === "VACATIONSTAY" || upper === "VACATION_STAY") {
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

    // Stay Terms
    contractDuration,
    setContractDuration,
    customDurationValue,
    setCustomDurationValue,
    customDurationUnit,
    setCustomDurationUnit,
    monthlyRentPerBed,
    setMonthlyRentPerBed: handleMonthlyRentPerBedChange,
    securityDepositEnabled,
    setSecurityDepositEnabled,

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

    occupancyOptions,
    setOccupancyOptions,
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

    if ((latitude !== undefined && longitude === undefined) || (latitude === undefined && longitude !== undefined)) {
      setError("Both latitude and longitude must be provided together, or leave both empty.");
      return;
    }

    const normCat = propertyType.trim().toUpperCase();
    const stayTypeVal = bookingType.toLowerCase();
    const isHostelDaily = normCat === "HOSTEL" && stayTypeVal !== "monthly";
    const isLeaseCategory = normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily) || normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE";

    if (isLeaseCategory && securityDepositEnabled) {
      const depNum = parseFloat(securityDeposit);
      if (isNaN(depNum) || depNum <= 0) {
        setError("Please enter a valid security deposit amount (greater than 0), or disable the security deposit toggle.");
        return;
      }
    }

    if ((normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) && contractDuration === "custom") {
      const custVal = parseInt(customDurationValue);
      if (isNaN(custVal) || custVal <= 0) {
        setError("Please enter a valid custom contract duration value (greater than 0).");
        return;
      }
    }

    setSaving(true);
    try {
      const isBedRentModel = normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily && priceModel === "per_bed");
      let effectiveBedRent: number | undefined = undefined;
      if (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) {
        if (monthlyRentPerBed && !isNaN(parseFloat(monthlyRentPerBed))) {
          effectiveBedRent = parseFloat(monthlyRentPerBed);
        } else if (price && !isNaN(parseFloat(price))) {
          effectiveBedRent = parseFloat(price);
        }
      }

      if ((normCat === "PG" || normCat === "HOSTEL") && occupancyOptions.length > 0) {
        const rents = occupancyOptions.map((o) => o.monthlyRentPerBed).filter((r) => r > 0);
        if (rents.length > 0 && (!effectiveBedRent || isNaN(effectiveBedRent))) {
          effectiveBedRent = Math.min(...rents);
        }
      }

      const effectivePriceNum = (isBedRentModel && effectiveBedRent !== undefined)
        ? effectiveBedRent
        : parseFloat(price);

      const saved = await updateProperty(propertyId, {
        title,
        description,
        propertyType,
        category: propertyType,
        bookingType: stayTypeVal,
        stayTypes: [stayTypeVal],
        pricePerNight: stayTypeVal === "daily" ? effectivePriceNum : undefined,
        pricePerMonth: stayTypeVal === "monthly" ? effectivePriceNum : undefined,
        pricePerHour: stayTypeVal === "hourly" ? effectivePriceNum : undefined,
        dailyPrice: stayTypeVal === "daily" ? effectivePriceNum : undefined,
        monthlyPrice: stayTypeVal === "monthly" ? effectivePriceNum : undefined,
        hourlyPrice: stayTypeVal === "hourly" ? effectivePriceNum : undefined,
        price: effectivePriceNum,
        city,
        area,
        address: address.trim(),
        latitude,
        longitude,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        furnished,
        areaSqFt: areaSqFt ? parseFloat(areaSqFt) : undefined,
        images,

        // Occupancy Options (PG & Hostel)
        occupancyOptions: (normCat === "PG" || normCat === "HOSTEL") ? occupancyOptions : undefined,

        // BNB
        spaceType: normCat === "BNB" || normCat === "VACATIONSTAY" ? spaceType : undefined,
        maxGuests: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? Number(maxGuests) : undefined,
        bedsCount: normCat === "BNB" || normCat === "VACATIONSTAY" ? Number(bedsCount) : undefined,
        checkInTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkInTime : undefined,
        checkOutTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkOutTime : undefined,
        houseRules: normCat === "BNB" || normCat === "VACATIONSTAY" ? houseRules : undefined,

        // Category stay terms
        contractDuration: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) ? contractDuration : undefined,
        customDurationValue: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) && contractDuration === "custom" && customDurationValue ? parseInt(customDurationValue) : undefined,
        customDurationUnit: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) && contractDuration === "custom" ? customDurationUnit : undefined,
        monthlyRentPerBed: effectiveBedRent,
        securityDepositEnabled: isLeaseCategory ? securityDepositEnabled : undefined,
        securityDeposit: isLeaseCategory && securityDepositEnabled && securityDeposit ? parseFloat(securityDeposit) : undefined,
        noticePeriodDays: isLeaseCategory && noticePeriodDays ? parseInt(noticePeriodDays) : undefined,

        // PG
        occupancyType: normCat === "PG" && occupancyType ? occupancyType.toLowerCase() : undefined,
        genderCategory: normCat === "PG" && genderCategory ? genderCategory.toLowerCase() : undefined,
        foodIncluded: normCat === "PG" ? foodIncluded : undefined,
        foodOptions: normCat === "PG" && foodIncluded ? foodOptions : undefined,
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

      // Update form directly with confirmed saved data from backend
      if (saved) {
        populateForm(saved);
      }

      setSuccess("Property details updated successfully!");
      setError("");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error("Failed to update property:", err);
      setError(err.message || "Failed to update property.");
      setSuccess("");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
    <div className="space-y-6 max-w-5xl mx-auto w-full">
        {/* Navigation / Breadcrumbs */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link
              href="/host/properties"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>My Properties</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-semibold">Edit Property</span>
          </div>

          {!loading && (
            <Link
              href={`/properties/${propertyId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border shadow-2xs transition-all"
            >
              <span>View Public Listing</span>
              <span className="text-muted-foreground">↗</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium text-muted-foreground">Loading property details...</p>
          </div>
        ) : (
          <div>
            {/* Header / Meta Banner */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-muted text-[11px] font-mono text-muted-foreground border border-border/70">
                      ID: {propertyId}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        verificationStatus === "approved"
                          ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                          : verificationStatus === "rejected"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-amber-500/10 text-amber-800 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          verificationStatus === "approved"
                            ? "bg-emerald-600"
                            : verificationStatus === "rejected"
                            ? "bg-destructive"
                            : "bg-amber-600 animate-pulse"
                        }`}
                      />
                      {verificationStatus === "approved"
                        ? "Verified & Active"
                        : verificationStatus === "rejected"
                        ? "Rejected"
                        : "Pending Verification"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Edit Property
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Update listing specifications, pricing structure, category rules, and gallery assets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <TrashIcon className="w-3.5 h-3.5 text-destructive" />
                  <span>{deleting ? "Deleting..." : "Delete Property"}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div
                  data-testid="error-banner"
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start gap-2"
                >
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  data-testid="success-banner"
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5"
                >
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p>{success}</p>
                    <p className="text-[11px] font-normal text-emerald-700 mt-0.5">
                      Your changes have been safely persisted to StayTrack.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">1. Basic Information</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Core identity, narrative description, and accommodation model.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Property Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Furnished 2BHK Apartment in Cyber City, Gurugram"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe key features, amenities, food availability, Wi-Fi speed, surrounding landmarks..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-normal border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-background transition-all resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        Category
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-foreground border border-border focus:border-primary outline-none"
                      >
                        {ACCOMMODATION_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.id} ({cat.label})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        Stay Model
                      </label>
                      <select
                        value={bookingType}
                        onChange={(e) => setBookingType(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-foreground border border-border focus:border-primary outline-none"
                      >
                        {getAllowedStayModels(propertyType).map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Location */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">2. Pricing & Location</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Rate structure and regional coordinates for guests to discover.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        {getPriceLabel()}
                      </label>
                      <input
                        type="number"
                        placeholder="2500"
                        value={price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        City (Delhi NCR)
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-foreground border border-border focus:border-primary outline-none"
                      >
                        {SUPPORTED_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.name}>
                            {loc.name} ({loc.state})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        Area / Locality
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cyber City, Sector 62"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tower B, Flat 402, Cyber City Residency, Phase 2"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 text-[11px] text-muted-foreground">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        <strong className="text-foreground">StayTrack Privacy Protection:</strong> Your exact street address is never displayed publicly. It is only shared with guests after you confirm their booking.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <PropertyLocationPicker
                      city={city}
                      latitude={latitude}
                      longitude={longitude}
                      onChange={({ latitude: newLat, longitude: newLng }) => {
                        setLatitude(newLat);
                        setLongitude(newLng);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Accommodation Details */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">3. Category Specifications</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Room options, occupancy rates, security deposits, and amenities for {propertyType}.
                  </p>
                </div>

                <CategorySpecificFormFields category={propertyType} stayModel={bookingType} form={formState} />
              </div>

              {/* Section 4: Property Photos */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">4. Property Gallery</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload crisp interior, exterior, and amenity photos to boost occupancy.
                  </p>
                </div>

                <PropertyImageUploader images={images} onChange={setImages} />
              </div>

              {/* Section 5: Save Controls (Sticky Action Footer) */}
              <div className="sticky bottom-4 z-20 p-4 sm:p-5 rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-xs min-h-[1.25rem]">
                  {error && <span className="font-semibold text-destructive">{error}</span>}
                  {success && <span className="font-semibold text-emerald-700">{success}</span>}
                  {!error && !success && (
                    <span className="text-muted-foreground">Ensure all required fields are filled before saving.</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <Link
                    href="/host/properties"
                    className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors text-center"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                    <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
    </div>
  );
}
