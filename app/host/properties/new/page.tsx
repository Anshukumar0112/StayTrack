"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import { AlertTriangleIcon, ArrowRightIcon, CheckIcon, PlusIcon, CameraIcon, StarIcon, CloseIcon } from "@/components/ui/Icons";
import PropertyImageUploader from "@/components/property/PropertyImageUploader";
import PropertyLocationPicker from "@/components/property/PropertyLocationPicker";
import { createProperty, getEligibility } from "@/lib/api";
import { OccupancyOption } from "@/types/property";
import { SUPPORTED_LOCATIONS, isSupportedLocation } from "@/lib/locations";
import {
  ACCOMMODATION_CATEGORIES,
  getAllowedStayModels,
  getDefaultStayModel,
  isStayModelAllowedForCategory,
  formatContractDuration,
} from "@/lib/categories";

import CategorySpecificFormFields, {
  CategoryFormState,
  PG_HOSTEL_ROOM_AMENITIES,
  HOTEL_ROOM_AMENITIES,
  SHARED_PROPERTY_FACILITIES,
  BNB_AMENITIES,
  FLAT_AMENITIES,
  HOTEL_PROPERTY_FACILITIES,
} from "@/components/property/CategorySpecificFormFields";

export default function CreateNewPropertyPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
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
  const [amenities, setAmenities] = useState<string[]>([
    "High-Speed Wi-Fi",
    "Air Conditioning",
    "Television",
    "Geyser / Hot Water",
  ]);

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const toggleSharedFacility = (item: string) => {
    setSharedFacilities((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]
    );
  };

  const toggleRoomAmenity = (optId: string, amenity: string) => {
    setOccupancyOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        const current = opt.amenities || [];
        const next = current.includes(amenity)
          ? current.filter((a) => a !== amenity)
          : [...current, amenity];
        return { ...opt, amenities: next };
      })
    );
  };

  const [customRuleInput, setCustomRuleInput] = useState("");

  const updateOccupancyOptionRent = (optId: string, val: number) => {
    setOccupancyOptions((prev) =>
      prev.map((opt) => (opt.id === optId ? { ...opt, monthlyRentPerBed: val } : opt))
    );
  };

  const updateHotelRoomPrice = (optId: string, val: number) => {
    setOccupancyOptions((prev) =>
      prev.map((opt) => (opt.id === optId ? { ...opt, nightlyPrice: val, price: val } : opt))
    );
  };

  const toggleOccupancyOptionAvailability = (optId: string) => {
    setOccupancyOptions((prev) =>
      prev.map((opt) =>
        opt.id === optId ? { ...opt, isAvailable: opt.isAvailable === false ? true : false } : opt
      )
    );
  };

  const toggleHouseRule = (rule: string) => {
    setHouseRules((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]
    );
  };

  const addCustomHouseRule = () => {
    const trimmed = customRuleInput.trim();
    if (!trimmed) return;
    if (!houseRules.includes(trimmed)) {
      setHouseRules((prev) => [...prev, trimmed]);
    }
    setCustomRuleInput("");
  };

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<{ eligible?: boolean; status?: string; subscriptionMode?: string; reason?: string } | null>(null);

  useEffect(() => {
    getEligibility()
      .then((res) => setEligibility(res))
      .catch((err) => console.warn("Failed to check eligibility:", err));
  }, []);

  const handleCategoryChange = (newCat: string) => {
    if (error) setError("");
    setPropertyType(newCat);
    setBookingType(getDefaultStayModel(newCat));
    const upper = newCat.trim().toUpperCase();
    if (upper === "PG") {
      setOccupancyType("single");
      setGenderCategory("unisex");
      if (!monthlyRentPerBed && price) {
        setMonthlyRentPerBed(price);
      }
      if (occupancyOptions.length === 0 || occupancyOptions.some((o) => o.roomCategory)) {
        setOccupancyOptions([
          {
            id: `pg_single_${Date.now()}`,
            name: "Single Private Room",
            occupancyType: "single",
            roomCount: 1,
            bedsCount: 1,
            monthlyRentPerBed: price ? Number(price) || 12000 : 12000,
            bathroomType: "attached",
            bathrooms: 1,
            furnished: true,
            amenities: ["Air Conditioning", "Geyser / Hot Water", "Study Table & Chair", "Personal Wardrobe"],
          },
        ]);
      }
    } else if (upper === "FLAT" || upper === "APARTMENT" || upper === "HOUSE") {
      setBhkConfig("1 BHK");
    } else if (upper === "HOSTEL") {
      setRoomType("dormitory");
      setPriceModel("per_bed");
      if (!monthlyRentPerBed && price) {
        setMonthlyRentPerBed(price);
      }
      if (occupancyOptions.length === 0 || occupancyOptions.some((o) => o.roomCategory)) {
        setOccupancyOptions([
          {
            id: `hostel_dorm_${Date.now()}`,
            name: "4-Bed Mixed Dormitory",
            occupancyType: "four_sharing",
            roomCount: 2,
            bedsCount: 4,
            monthlyRentPerBed: price ? Number(price) || 8000 : 8000,
            bathroomType: "shared",
            bathrooms: 1,
            furnished: true,
            amenities: ["Air Conditioning", "High-Speed Wi-Fi", "Personal Wardrobe"],
          },
        ]);
      }
    } else if (upper === "HOTEL") {
      setRoomType("standard");
      if (occupancyOptions.length === 0 || occupancyOptions.some((o) => !o.roomCategory)) {
        setOccupancyOptions([
          {
            id: `hotel_std_${Date.now()}`,
            name: "Standard Classic Room",
            occupancyType: "standard",
            roomCategory: "standard",
            roomCount: 5,
            bedType: "queen",
            bedsCount: 1,
            maxOccupancy: 2,
            monthlyRentPerBed: 0,
            price: 2500,
            nightlyPrice: 2500,
            isAvailable: true,
            bathroomType: "attached",
            bathrooms: 1,
            amenities: ["Air Conditioning", "Flat-screen TV", "High-Speed Wi-Fi"],
          },
        ]);
      }
    } else if (upper === "BNB" || upper === "VACATIONSTAY" || upper === "VACATION_STAY") {
      setSpaceType("entire_place");
    }
  };

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

  const handleContinueToStep2 = () => {
    setError("");
    if (!title.trim()) {
      setError("Please enter a property title.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a property description.");
      return;
    }
    if (!propertyType.trim()) {
      setError("Please select an accommodation category.");
      return;
    }

    // Ensure category-appropriate occupancyOptions exist if PG, Hostel, or Hotel
    const upper = propertyType.trim().toUpperCase();
    if (upper === "PG" && (occupancyOptions.length === 0 || occupancyOptions.some((o) => o.roomCategory))) {
      setOccupancyOptions([
        {
          id: `pg_single_${Date.now()}`,
          name: "Single Private Room",
          occupancyType: "single",
          roomCount: 1,
          bedsCount: 1,
          monthlyRentPerBed: price ? Number(price) || 12000 : 12000,
          bathroomType: "attached",
          bathrooms: 1,
          furnished: true,
          amenities: ["Air Conditioning", "Geyser / Hot Water", "Study Table & Chair", "Personal Wardrobe"],
        },
      ]);
    } else if (upper === "HOSTEL" && (occupancyOptions.length === 0 || occupancyOptions.some((o) => o.roomCategory))) {
      setOccupancyOptions([
        {
          id: `hostel_dorm_${Date.now()}`,
          name: "4-Bed Mixed Dormitory",
          occupancyType: "four_sharing",
          roomCount: 2,
          bedsCount: 4,
          monthlyRentPerBed: price ? Number(price) || 8000 : 8000,
          bathroomType: "shared",
          bathrooms: 1,
          furnished: true,
          amenities: ["Air Conditioning", "High-Speed Wi-Fi", "Personal Wardrobe"],
        },
      ]);
    } else if (upper === "HOTEL" && (occupancyOptions.length === 0 || occupancyOptions.some((o) => !o.roomCategory))) {
      setOccupancyOptions([
        {
          id: `hotel_std_${Date.now()}`,
          name: "Standard Classic Room",
          occupancyType: "standard",
          roomCategory: "standard",
          roomCount: 5,
          bedType: "queen",
          bedsCount: 1,
          maxOccupancy: 2,
          monthlyRentPerBed: 0,
          price: 2500,
          nightlyPrice: 2500,
          isAvailable: true,
          bathroomType: "attached",
          bathrooms: 1,
          amenities: ["Air Conditioning", "Flat-screen TV", "High-Speed Wi-Fi"],
        },
      ]);
    }

    setCurrentStep(2);
  };

  const handleContinueToStep3 = () => {
    setError("");
    const normCat = propertyType.trim().toUpperCase();

    if (normCat === "PG") {
      if (occupancyOptions.length === 0) {
        setError("Please add at least one room configuration for your PG listing.");
        return;
      }
      for (let i = 0; i < occupancyOptions.length; i++) {
        const opt = occupancyOptions[i];
        if (!opt.name?.trim()) {
          setError(`Please enter a room configuration name for Option #${i + 1}.`);
          return;
        }
        if (!opt.monthlyRentPerBed || opt.monthlyRentPerBed <= 0) {
          setError(`Please enter a valid monthly rent per bed for "${opt.name}".`);
          return;
        }
        if (!opt.bathroomType) {
          setError(`Please select a bathroom configuration for "${opt.name}".`);
          return;
        }
      }
      if (contractDuration === "custom") {
        const custVal = parseInt(customDurationValue);
        if (isNaN(custVal) || custVal <= 0) {
          setError("Please enter a valid custom contract duration (greater than 0).");
          return;
        }
      }
    } else if (normCat === "HOSTEL") {
      if (occupancyOptions.length === 0) {
        setError("Please add at least one room configuration for your hostel listing.");
        return;
      }
      for (let i = 0; i < occupancyOptions.length; i++) {
        const opt = occupancyOptions[i];
        if (!opt.name?.trim()) {
          setError(`Please enter a room configuration name for Option #${i + 1}.`);
          return;
        }
        if (priceModel === "per_bed" && (!opt.monthlyRentPerBed || opt.monthlyRentPerBed <= 0)) {
          setError(`Please enter a valid monthly rent per bed for "${opt.name}".`);
          return;
        }
        if (!opt.bathroomType) {
          setError(`Please select a bathroom configuration for "${opt.name}".`);
          return;
        }
      }
      if (contractDuration === "custom") {
        const custVal = parseInt(customDurationValue);
        if (isNaN(custVal) || custVal <= 0) {
          setError("Please enter a valid custom contract duration (greater than 0).");
          return;
        }
      }
    } else if (normCat === "HOTEL") {
      if (occupancyOptions.length === 0) {
        setError("Please add at least one room type for your hotel listing.");
        return;
      }
      for (let i = 0; i < occupancyOptions.length; i++) {
        const opt = occupancyOptions[i];
        if (!opt.name?.trim()) {
          setError(`Please enter a room name for Room Type #${i + 1}.`);
          return;
        }
        if (!opt.bathroomType) {
          setError(`Please select a bathroom configuration for "${opt.name}".`);
          return;
        }
      }
    } else if (normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "VACATION_STAY") {
      if (!maxGuests || maxGuests < 1) {
        setError("Max guests must be at least 1.");
        return;
      }
      if (!bedsCount || bedsCount < 1) {
        setError("Beds count must be at least 1.");
        return;
      }
      if (!bedrooms || bedrooms < 1) {
        setError("Bedrooms count must be at least 1.");
        return;
      }
      if (bathrooms === undefined || bathrooms < 0) {
        setError("Bathrooms count must be at least 0.");
        return;
      }
    } else if (normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE") {
      if (!bhkConfig?.trim()) {
        setError("Please select a BHK configuration.");
        return;
      }
      if (!bedrooms || bedrooms < 1) {
        setError("Bedrooms count must be at least 1.");
        return;
      }
      if (!bathrooms || bathrooms < 1) {
        setError("Bathrooms count must be at least 1.");
        return;
      }
    }

    // Auto-sync price from room options if PG or Hostel
    if ((normCat === "PG" || normCat === "HOSTEL") && occupancyOptions.length > 0) {
      const rents = occupancyOptions.map((o) => o.monthlyRentPerBed).filter((r) => r > 0);
      if (rents.length > 0) {
        const minRent = Math.min(...rents);
        if (!price || parseFloat(price) === 0) {
          setPrice(String(minRent));
        }
        if (!monthlyRentPerBed) {
          setMonthlyRentPerBed(String(minRent));
        }
      }
    }

    setCurrentStep(3);
  };

  const handleContinueToStep4 = () => {
    setError("");
    if (!city?.trim()) {
      setError("Please select a city in Delhi NCR.");
      return;
    }
    if (!isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }
    if (!area?.trim()) {
      setError("Please enter the property area or locality.");
      return;
    }
    if (!address?.trim()) {
      setError("Please enter the property street address.");
      return;
    }
    if ((latitude !== undefined && longitude === undefined) || (latitude === undefined && longitude !== undefined)) {
      setError("Both latitude and longitude must be provided together, or clear the map pin.");
      return;
    }
    setCurrentStep(4);
  };

  const handleContinueToStep5 = () => {
    setError("");
    setCurrentStep(5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (currentStep === 1) {
      handleContinueToStep2();
      return;
    }

    if (currentStep === 2) {
      handleContinueToStep3();
      return;
    }

    if (currentStep === 3) {
      handleContinueToStep4();
      return;
    }

    if (currentStep === 4) {
      handleContinueToStep5();
      return;
    }

    if (!title || !title.trim()) {
      setError("Please enter a property title.");
      return;
    }

    if (!description || !description.trim()) {
      setError("Please enter a property description.");
      return;
    }

    if (!city || !city.trim() || !isSupportedLocation(city)) {
      setError("StayTrack currently operates only in Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad).");
      return;
    }

    if (!area || !area.trim()) {
      setError("Please enter the property area or locality.");
      return;
    }

    if (!address || !address.trim()) {
      setError("Please enter the property street address.");
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

    // Category Pricing Validation & Resolution
    let effectivePriceNum: number;
    let effectiveBedRent: number | undefined = undefined;

    if (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) {
      if (occupancyOptions.length === 0) {
        setError(`Please add at least one room configuration for your ${normCat} listing.`);
        return;
      }
      for (let i = 0; i < occupancyOptions.length; i++) {
        const opt = occupancyOptions[i];
        if (!opt.monthlyRentPerBed || opt.monthlyRentPerBed <= 0) {
          setError(`Please enter a valid monthly rent per bed (greater than 0) for "${opt.name}".`);
          return;
        }
      }
      const rents = occupancyOptions.map((o) => o.monthlyRentPerBed).filter((r) => r && r > 0);
      effectiveBedRent = Math.min(...rents);
      effectivePriceNum = effectiveBedRent;
    } else if (normCat === "HOTEL") {
      if (occupancyOptions.length === 0) {
        setError("Please add at least one hotel room type.");
        return;
      }
      for (let i = 0; i < occupancyOptions.length; i++) {
        const opt = occupancyOptions[i];
        const roomPrice = opt.nightlyPrice || opt.price;
        if (!roomPrice || roomPrice <= 0) {
          setError(`Please enter a valid nightly room price (greater than 0) for "${opt.name}".`);
          return;
        }
      }
      const prices = occupancyOptions.map((o) => o.nightlyPrice || o.price || 0).filter((p) => p > 0);
      effectivePriceNum = Math.min(...prices);
    } else if (normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "VACATION_STAY") {
      const pNum = parseFloat(price);
      if (isNaN(pNum) || pNum <= 0) {
        setError("Please enter a valid base nightly price (greater than 0) for your BNB listing.");
        return;
      }
      effectivePriceNum = pNum;
    } else if (normCat === "FLAT" || normCat === "APARTMENT" || normCat === "HOUSE") {
      const pNum = parseFloat(price);
      if (isNaN(pNum) || pNum <= 0) {
        setError("Please enter a valid monthly rent (greater than 0) for your Flat listing.");
        return;
      }
      effectivePriceNum = pNum;
    } else {
      const pNum = parseFloat(price);
      if (isNaN(pNum) || pNum <= 0) {
        setError("Please enter a valid price (greater than 0).");
        return;
      }
      effectivePriceNum = pNum;
    }

    if (isLeaseCategory && securityDepositEnabled) {
      const depNum = parseFloat(securityDeposit);
      if (isNaN(depNum) || depNum <= 0) {
        setError("Please provide a valid security deposit amount (greater than 0), or disable the security deposit requirement.");
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

    if (isLeaseCategory && noticePeriodDays) {
      const notVal = parseInt(noticePeriodDays);
      if (isNaN(notVal) || notVal < 0) {
        setError("Notice period days cannot be negative.");
        return;
      }
    }

    setLoading(true);
    try {
      await createProperty({
        title: title.trim(),
        description: description.trim(),
        propertyType,
        category: propertyType,
        bookingType,
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
        amenities: amenities.length > 0 ? amenities : undefined,
        propertyAmenities: amenities.length > 0 ? amenities : undefined,
        images,

        // Occupancy Options (PG, Hostel & Hotel)
        occupancyOptions: (normCat === "PG" || normCat === "HOSTEL" || normCat === "HOTEL")
          ? occupancyOptions.map((opt) => {
              const item: any = {
                ...opt,
                price: normCat === "HOTEL" ? (opt.nightlyPrice || opt.price || effectivePriceNum) : undefined,
                nightlyPrice: normCat === "HOTEL" ? (opt.nightlyPrice || opt.price || effectivePriceNum) : undefined,
                isAvailable: opt.isAvailable !== false,
              };
              if (normCat === "HOTEL") {
                delete item.monthlyRentPerBed;
              }
              return item as OccupancyOption;
            })
          : undefined,

        // BNB
        spaceType: normCat === "BNB" || normCat === "VACATIONSTAY" ? spaceType : undefined,
        maxGuests: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? Number(maxGuests) : undefined,
        bedsCount: normCat === "BNB" || normCat === "VACATIONSTAY" ? Number(bedsCount) : undefined,
        checkInTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkInTime : undefined,
        checkOutTime: normCat === "BNB" || normCat === "VACATIONSTAY" || normCat === "HOTEL" ? checkOutTime : undefined,
        houseRules: houseRules.length > 0 ? houseRules : undefined,

        // Category stay terms
        contractDuration: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) ? contractDuration : undefined,
        customDurationValue: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) && contractDuration === "custom" && customDurationValue ? parseInt(customDurationValue) : undefined,
        customDurationUnit: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) && contractDuration === "custom" ? customDurationUnit : undefined,
        monthlyRentPerBed: (normCat === "PG" || (normCat === "HOSTEL" && !isHostelDaily)) ? effectiveBedRent : undefined,
        securityDepositEnabled: isLeaseCategory ? securityDepositEnabled : undefined,
        securityDeposit: isLeaseCategory && securityDepositEnabled && securityDeposit ? parseFloat(securityDeposit) : undefined,
        noticePeriodDays: isLeaseCategory && noticePeriodDays ? parseInt(noticePeriodDays) : undefined,

        // PG
        occupancyType: normCat === "PG" && occupancyType ? occupancyType.toLowerCase() : undefined,
        genderCategory: normCat === "PG" && genderCategory ? genderCategory.toLowerCase() : undefined,
        foodIncluded: normCat === "PG" ? foodIncluded : undefined,
        foodOptions: normCat === "PG" && foodIncluded ? foodOptions : undefined,
        gateClosingTime: (normCat === "PG" || normCat === "HOSTEL") ? gateClosingTime : undefined,

        // Hostel
        roomType: normCat === "HOSTEL" || normCat === "HOTEL" ? roomType : undefined,
        totalBeds: normCat === "HOSTEL" ? Number(totalBeds) : undefined,
        availableBeds: normCat === "HOSTEL" ? Number(availableBeds) : undefined,
        priceModel: normCat === "HOSTEL" ? priceModel : undefined,
        studentOrWorking: normCat === "HOSTEL" ? studentOrWorking : undefined,
        sharedFacilities: (normCat === "HOSTEL" || normCat === "PG" || normCat === "HOTEL") ? (sharedFacilities.length > 0 ? sharedFacilities : undefined) : undefined,

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
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <BackButton
        fallbackUrl="/host/properties"
        label="Back to My Properties"
        ariaLabel="Return to My Properties"
        className="mb-2"
      />

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">List Your Property</h1>
        <p className="text-xs text-muted font-medium mt-1">
          Showcase your Delhi NCR accommodation to verified guests with zero broker commissions
        </p>
      </div>

        {eligibility && !eligibility.eligible && eligibility.subscriptionMode === "paid" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer transition-all shadow-xs"
            >
              Manage Subscription
            </button>
          </div>
        )}

        {/* Wizard Progress Stepper */}
        <div className="mb-8">
          {/* Desktop Stepper */}
          <div className="hidden sm:grid grid-cols-5 gap-3 mb-3">
            {[
              { step: 1, label: "Basics", desc: "Category & title" },
              { step: 2, label: "Rooms", desc: "Accommodation setup" },
              { step: 3, label: "Location", desc: "Address & map pin" },
              { step: 4, label: "Photos", desc: "Gallery & amenities" },
              { step: 5, label: "Pricing", desc: "Rates & house rules" },
            ].map((s) => {
              const isDone = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              return (
                <div
                  key={s.step}
                  className={`p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-surface border-primary ring-2 ring-primary/20 shadow-subtle"
                      : isDone
                      ? "bg-surface/80 border-border/80"
                      : "bg-surface-muted/40 border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone
                          ? "bg-primary text-white"
                          : isCurrent
                          ? "bg-[#111716] text-white"
                          : "bg-surface-muted text-muted border border-border"
                      }`}
                    >
                      {isDone ? <CheckIcon className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                    </div>
                    <span className={`text-xs font-bold ${isCurrent ? "text-foreground" : "text-muted"}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted truncate">{s.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Mobile Stepper Bar */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">
                Step {currentStep} of 5:{" "}
                {currentStep === 1
                  ? "Basic Information"
                  : currentStep === 2
                  ? "Accommodation Details"
                  : currentStep === 3
                  ? "Location & Address"
                  : currentStep === 4
                  ? "Photos & Amenities"
                  : "Pricing & Rules"}
              </span>
              <span className="font-extrabold text-primary">{currentStep * 20}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${currentStep * 20}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-9 shadow-subtle">
          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Basic Property Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="mb-4 pb-3.5 border-b border-border/70">
                  <h2 className="text-base font-extrabold text-foreground">
                    Basic Property Information
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Provide a clear title, description, and choose the accommodation category for your listing.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Property Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Furnished 2BHK Apartment in Cyber City, Gurugram"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold bg-background border border-border text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe key features, amenities, food availability, Wi-Fi speed, etc..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl text-xs font-medium bg-background border border-border text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Accommodation Category <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-muted">
                      Select 1 of 5 categories
                    </span>
                  </div>

                  {/* 5 accommodation categories cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mb-3">
                    {ACCOMMODATION_CATEGORIES.map((cat) => {
                      const isSelected = propertyType === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#111716] text-white border-[#111716] shadow-subtle ring-2 ring-primary/30"
                              : "bg-surface-muted/60 hover:bg-surface-muted hover:border-border-hover border-border text-foreground"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-extrabold ${isSelected ? "text-white" : "text-foreground"}`}>
                                {cat.id}
                              </span>
                              {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className={`text-[11px] font-medium block leading-snug ${isSelected ? "text-zinc-300" : "text-muted"}`}>
                              {cat.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <select
                    value={propertyType}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-xs font-bold bg-background border border-border text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {ACCOMMODATION_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.id} ({cat.label}) - {cat.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-4 border-t border-border/70 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-3 rounded-xl border border-border text-xs font-bold text-foreground bg-surface hover:bg-surface-muted cursor-pointer transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToStep2}
                    className="px-6 py-3 rounded-xl bg-[#111716] hover:bg-black text-xs font-bold text-white shadow-subtle hover:shadow-elevated transition-all cursor-pointer inline-flex items-center gap-2 group"
                  >
                    <span>Continue</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Accommodation Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-4 pb-3.5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      Accommodation Details ({propertyType})
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Configure room inventory, bathroom specifications, and category-specific living arrangements for your {propertyType} listing.
                    </p>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 self-start sm:self-auto">
                    Category: {propertyType}
                  </div>
                </div>

                {/* Dynamic Category Specific Form Fields */}
                <CategorySpecificFormFields category={propertyType} stayModel={bookingType} form={formState} />

                {/* Step 2 Actions */}
                <div className="pt-4 border-t border-border/70 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCurrentStep(1);
                    }}
                    className="px-5 py-3 rounded-xl border border-border text-xs font-bold text-foreground bg-surface hover:bg-surface-muted cursor-pointer transition-colors shadow-2xs"
                  >
                    Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToStep3}
                    className="px-6 py-3 rounded-xl bg-[#111716] hover:bg-black text-xs font-bold text-white shadow-subtle hover:shadow-elevated transition-all cursor-pointer inline-flex items-center gap-2 group"
                  >
                    <span>Continue</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Location & Address */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="mb-4 pb-3.5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      Step 3: Location & Address
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Specify the city, neighborhood, and street address for your Delhi NCR property, then set your map location pin.
                    </p>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 self-start sm:self-auto">
                    Region: Delhi NCR
                  </div>
                </div>

                {/* City and Area selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      City (Delhi NCR) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (error) setError("");
                      }}
                      className="w-full px-4 py-3 rounded-xl text-xs font-bold bg-background border border-border text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {SUPPORTED_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name} ({loc.state})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      StayTrack currently serves Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Area / Locality <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cyber City, Sector 62, Indirapuram"
                      value={area}
                      onChange={(e) => {
                        setArea(e.target.value);
                        if (error) setError("");
                      }}
                      className="w-full px-4 py-3 rounded-xl text-xs font-semibold bg-background border border-border text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      The neighborhood or locality displayed prominently on search results.
                    </p>
                  </div>
                </div>

                {/* Street Address input */}
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Street Address (Private to confirmed guests) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tower B, Flat 402, Cyber City Residency, Phase 2"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (error) setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold bg-background border border-border text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    StayTrack privacy protection: Your exact street address is never displayed publicly. It is only shared with guests after you confirm their booking.
                  </p>
                </div>

                {/* Interactive Map Picker */}
                <div className="pt-2">
                  <PropertyLocationPicker
                    city={city}
                    latitude={latitude}
                    longitude={longitude}
                    onChange={({ latitude: newLat, longitude: newLng }) => {
                      setLatitude(newLat);
                      setLongitude(newLng);
                      if (error) setError("");
                    }}
                  />
                </div>

                {/* Step 3 Actions */}
                <div className="pt-4 border-t border-border/70 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCurrentStep(2);
                    }}
                    className="px-5 py-3 rounded-xl border border-border text-xs font-bold text-foreground bg-surface hover:bg-surface-muted cursor-pointer transition-colors shadow-2xs"
                  >
                    Back to Step 2
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToStep4}
                    className="px-6 py-3 rounded-xl bg-[#111716] hover:bg-black text-xs font-bold text-white shadow-subtle hover:shadow-elevated transition-all cursor-pointer inline-flex items-center gap-2 group"
                  >
                    <span>Continue</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Photos & Amenities */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="mb-4 pb-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-foreground tracking-tight">
                      Step 4: Photos & Amenities
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload high-resolution property photos, then review and configure room-level amenities and shared property facilities for your {propertyType} listing.
                    </p>
                  </div>
                  <div className="text-xs font-medium px-3 py-1 bg-surface-muted text-foreground rounded-full border border-border self-start sm:self-auto tracking-wide">
                    Category: {propertyType}
                  </div>
                </div>

                {/* SECTION A: Property Photos */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Property Photos
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add up to 10 photos of your property. The first photo serves as the primary cover photo across search results.
                    </p>
                  </div>

                  <PropertyImageUploader images={images} onChange={setImages} maxImages={10} />
                </div>

                {/* SECTION B: Room-Specific Amenities */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Room Amenities
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(propertyType === "PG" || propertyType === "HOSTEL")
                        ? "Configure independent amenities for each room configuration created in Step 2. Amenities are kept separate per room."
                        : propertyType === "HOTEL"
                        ? "Configure independent amenities for each hotel room type created in Step 2."
                        : "Configure amenities and living features available in your listing."}
                    </p>
                  </div>

                  {/* PG & Hostel: Per-room amenities */}
                  {(propertyType === "PG" || propertyType === "HOSTEL") && (
                    <div className="space-y-4">
                      {occupancyOptions.length === 0 ? (
                        <div className="p-5 rounded-xl border border-dashed border-border bg-surface text-center text-xs text-muted-foreground">
                          No room configurations found from Step 2. Please go back to Step 2 to add room configurations.
                        </div>
                      ) : (
                        occupancyOptions.map((opt, idx) => (
                          <div key={opt.id || idx} className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/60 gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                  {opt.name || `Room Option #${idx + 1}`}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted text-muted-foreground rounded-full border border-border/60 capitalize">
                                  {opt.occupancyType}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-3">
                                <span>Beds: <strong className="text-foreground">{opt.bedsCount ?? 1}</strong></span>
                                <span>Bathroom: <strong className="text-foreground capitalize">{opt.bathroomType || "attached"}</strong></span>
                                {opt.monthlyRentPerBed ? <span className="text-primary font-bold">₹{opt.monthlyRentPerBed.toLocaleString("en-IN")}/mo</span> : null}
                              </div>
                            </div>

                            <div>
                              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Room-Specific Amenities ({opt.amenities?.length || 0})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {PG_HOSTEL_ROOM_AMENITIES.map((amenity) => {
                                  const active = (opt.amenities || []).includes(amenity);
                                  return (
                                    <button
                                      key={amenity}
                                      type="button"
                                      onClick={() => toggleRoomAmenity(opt.id, amenity)}
                                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                        active
                                          ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                          : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                                      }`}
                                    >
                                      {active ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                                      <span>{amenity}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* HOTEL: Per-room-type amenities */}
                  {propertyType === "HOTEL" && (
                    <div className="space-y-4">
                      {occupancyOptions.length === 0 ? (
                        <div className="p-5 rounded-xl border border-dashed border-border bg-surface text-center text-xs text-muted-foreground">
                          No hotel room types found from Step 2. Please go back to Step 2 to add room types.
                        </div>
                      ) : (
                        occupancyOptions.map((opt, idx) => (
                          <div key={opt.id || idx} className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/60 gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                  {opt.name || `Room Type #${idx + 1}`}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 capitalize">
                                  {opt.roomCategory || "standard"}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-3">
                                <span>Bed: <strong className="text-foreground capitalize">{opt.bedType || "queen"}</strong> ({opt.bedsCount ?? 1})</span>
                                <span>Max Guests: <strong className="text-foreground">{opt.maxOccupancy ?? 2}</strong></span>
                                <span>Bathroom: <strong className="text-foreground capitalize">{opt.bathroomType || "attached"}</strong></span>
                              </div>
                            </div>

                            <div>
                              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Room-Type Amenities ({opt.amenities?.length || 0})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {HOTEL_ROOM_AMENITIES.map((amenity) => {
                                  const active = (opt.amenities || []).includes(amenity);
                                  return (
                                    <button
                                      key={amenity}
                                      type="button"
                                      onClick={() => toggleRoomAmenity(opt.id, amenity)}
                                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                        active
                                          ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                          : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                                      }`}
                                    >
                                      {active ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                                      <span>{amenity}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* BNB: Unit-level amenities */}
                  {(propertyType === "BNB" || propertyType === "VACATIONSTAY" || propertyType === "VACATION_STAY") && (
                    <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pb-2.5 border-b border-border/60">
                        <span>Space Type: <strong className="text-foreground">{spaceType}</strong></span>
                        <span>Max Guests: <strong className="text-foreground">{maxGuests}</strong></span>
                        <span>Bedrooms: <strong className="text-foreground">{bedrooms}</strong></span>
                        <span>Bathrooms: <strong className="text-foreground">{bathrooms}</strong></span>
                        <span>Furnishing: <strong className="text-foreground">{furnished ? "Furnished" : "Unfurnished"}</strong></span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          BNB Amenities & Living Features ({amenities.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {BNB_AMENITIES.map((amenity) => {
                            const active = amenities.includes(amenity);
                            return (
                              <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                  active
                                    ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                    : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                                }`}
                              >
                                {active ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                                <span>{amenity}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FLAT: Unit-level amenities */}
                  {(propertyType === "FLAT" || propertyType === "APARTMENT" || propertyType === "HOUSE") && (
                    <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pb-2.5 border-b border-border/60">
                        <span>Config: <strong className="text-foreground">{bhkConfig}</strong></span>
                        <span>Bedrooms: <strong className="text-foreground">{bedrooms}</strong></span>
                        <span>Bathrooms: <strong className="text-foreground">{bathrooms}</strong></span>
                        <span>Furnishing: <strong className="text-foreground">{furnished ? "Furnished" : "Unfurnished"}</strong></span>
                        <span>Parking: <strong className="text-foreground">{parkingType}</strong></span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Flat & Society Amenities ({amenities.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {FLAT_AMENITIES.map((amenity) => {
                            const active = amenities.includes(amenity);
                            return (
                              <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                  active
                                    ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                    : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                                }`}
                              >
                                {active ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                                <span>{amenity}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION C: Shared Property Facilities */}
                {(propertyType === "PG" || propertyType === "HOSTEL" || propertyType === "HOTEL") && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-4">
                    <div className="border-b border-border/60 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {propertyType === "HOTEL" ? "Hotel-Wide Facilities & Services" : "Shared Property Facilities"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {propertyType === "HOTEL"
                          ? "These property-level services and facilities are available to all hotel guests and kept separate from room-type amenities."
                          : "These shared community facilities are available across the property and are kept separate from individual room configurations."}
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Select Available Facilities ({sharedFacilities.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(propertyType === "HOTEL" ? HOTEL_PROPERTY_FACILITIES : SHARED_PROPERTY_FACILITIES).map((fac) => {
                          const active = sharedFacilities.includes(fac);
                          return (
                            <button
                              type="button"
                              key={fac}
                              onClick={() => toggleSharedFacility(fac)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                                active
                                  ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                  : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                              }`}
                            >
                              {active ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span>{fac}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 Actions */}
                <div className="pt-4 border-t border-border flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCurrentStep(3);
                    }}
                    className="px-5 py-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface-muted cursor-pointer transition-colors"
                  >
                    Back to Step 3
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToStep5}
                    className="px-6 py-3 rounded-xl bg-[#111716] hover:bg-black text-xs font-bold text-white shadow-subtle hover:shadow-elevated transition-all cursor-pointer inline-flex items-center gap-2 group"
                  >
                    <span>Continue</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Pricing, Availability & Rules */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-foreground tracking-tight">
                      Step 5: Pricing, Availability & Rules
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Set category-specific pricing, booking terms, house rules, and review your full listing before final submission.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface-muted text-foreground border border-border tracking-wide self-start sm:self-auto">
                    Category: {propertyType}
                  </span>
                </div>

                {/* A. PG & HOSTEL PRICING & TERMS */}
                {(propertyType === "PG" || propertyType === "HOSTEL") && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pricing & Stay Terms: Monthly Rent per Bed
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Each room configuration retains its independent monthly rent per bed. Adjust below if needed.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {occupancyOptions.map((opt) => (
                        <div key={opt.id} className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{opt.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-muted-foreground border border-border/60 capitalize">
                              {opt.occupancyType}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Rooms: <strong className="text-foreground">{opt.roomCount ?? 1}</strong> | Beds/Room: <strong className="text-foreground">{opt.bedsCount ?? 1}</strong></div>
                            <div>Bathroom: <strong className="text-foreground capitalize">{opt.bathroomType || "attached"}</strong></div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Monthly Rent / Bed (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={opt.monthlyRentPerBed || ""}
                              onChange={(e) => updateOccupancyOptionRent(opt.id, Math.max(0, Number(e.target.value)))}
                              placeholder="e.g. 10000"
                              className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Security Deposit & Notice Period */}
                    <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Security Deposit
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={securityDepositEnabled}
                              onChange={(e) => setSecurityDepositEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        {securityDepositEnabled ? (
                          <input
                            type="number"
                            min={1}
                            value={securityDeposit}
                            onChange={(e) => setSecurityDeposit(e.target.value)}
                            placeholder="Deposit amount (e.g. 15000)"
                            className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No security deposit required from residents.</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Notice Period (Days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={noticePeriodDays}
                          onChange={(e) => setNoticePeriodDays(e.target.value)}
                          placeholder="30"
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                        />
                      </div>
                    </div>

                    {/* Contract Duration Review */}
                    <div className="pt-3.5 border-t border-border/60 text-xs text-muted-foreground flex flex-wrap items-center gap-4">
                      <span>
                        <strong className="text-foreground">Minimum Stay / Contract Duration:</strong>{" "}
                        <span className="font-semibold text-foreground">
                          {formatContractDuration(contractDuration, customDurationValue, customDurationUnit)}
                        </span>
                      </span>
                      {propertyType === "PG" && (
                        <span>
                          <strong className="text-foreground">Gate Closing Time:</strong>{" "}
                          <span className="font-semibold text-foreground">{gateClosingTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* B. HOTEL PRICING & POLICIES */}
                {propertyType === "HOTEL" && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pricing & Stay Terms: Hotel Room Types Nightly Pricing
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure independent nightly rates for each hotel room type. The lowest room price will serve as the starting rate in search listings.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {occupancyOptions.map((opt) => (
                        <div key={opt.id} className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{opt.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                              {opt.roomCategory || opt.occupancyType}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Rooms: <strong className="text-foreground">{opt.roomCount ?? 1}</strong> | Bed: <strong className="text-foreground capitalize">{opt.bedType || "queen"}</strong></div>
                            <div>Max Guests: <strong className="text-foreground">{opt.maxOccupancy ?? 2}</strong> | Bathroom: <strong className="text-foreground capitalize">{opt.bathroomType || "attached"}</strong></div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Nightly Price (₹ / night) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={opt.nightlyPrice || opt.price || ""}
                              onChange={(e) => updateHotelRoomPrice(opt.id, Math.max(0, Number(e.target.value)))}
                              placeholder="e.g. 2500"
                              className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hotel Policies: Breakfast, Cancellation, Check-in/out */}
                    <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                          Breakfast Policy
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="hotel_breakfast"
                            checked={breakfastIncluded}
                            onChange={(e) => setBreakfastIncluded(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                          />
                          <label htmlFor="hotel_breakfast" className="text-xs font-semibold text-foreground cursor-pointer">
                            Breakfast Included in Room Rate
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Cancellation Policy
                        </label>
                        <select
                          value={cancellationPolicy}
                          onChange={(e) => setCancellationPolicy(e.target.value)}
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground cursor-pointer"
                        >
                          <option value="flexible">Flexible (Free up to 24h before check-in)</option>
                          <option value="moderate">Moderate (Free up to 5 days before check-in)</option>
                          <option value="strict">Strict (Non-refundable)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-foreground uppercase mb-1">Check-In</label>
                          <input
                            type="text"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                            placeholder="02:00 PM"
                            className="glass-input w-full px-2.5 py-2 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-foreground uppercase mb-1">Check-Out</label>
                          <input
                            type="text"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            placeholder="11:00 AM"
                            className="glass-input w-full px-2.5 py-2 rounded-xl text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* C. BNB PRICING */}
                {(propertyType === "BNB" || propertyType === "VACATIONSTAY") && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pricing & Stay Terms: Base Nightly Price
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Set nightly rate and standard guest check-in/out hours.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Base Nightly Price (₹ / night) <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Nightly rate for booking this entire place or private holiday room.
                        </p>
                        <input
                          type="number"
                          min={1}
                          value={price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          placeholder="e.g. 3500"
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-xs font-bold text-foreground"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                            Check-In Time
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">Standard check-in</p>
                          <input
                            type="text"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                            placeholder="02:00 PM"
                            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                            Check-Out Time
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">Standard check-out</p>
                          <input
                            type="text"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            placeholder="11:00 AM"
                            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* D. FLAT PRICING & RESIDENTIAL TERMS */}
                {(propertyType === "FLAT" || propertyType === "APARTMENT" || propertyType === "HOUSE") && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pricing & Stay Terms: Monthly Lease Rent
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure monthly rental, maintenance charges, and tenant preferences.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Monthly Rent (₹ / month) <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Monthly lease rent for this {bhkConfig} flat.
                        </p>
                        <input
                          type="number"
                          min={1}
                          value={price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          placeholder="e.g. 28000"
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-xs font-bold text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Monthly Maintenance (₹ / month)
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Society or building maintenance charges (or leave empty if included).
                        </p>
                        <input
                          type="number"
                          min={0}
                          value={maintenanceCharges}
                          onChange={(e) => setMaintenanceCharges(e.target.value)}
                          placeholder="0 or included"
                          className="glass-input w-full px-4 py-2.5 rounded-xl text-xs font-bold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Security Deposit
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={securityDepositEnabled}
                              onChange={(e) => setSecurityDepositEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        {securityDepositEnabled ? (
                          <input
                            type="number"
                            min={1}
                            value={securityDeposit}
                            onChange={(e) => setSecurityDeposit(e.target.value)}
                            placeholder="Deposit amount (e.g. 50000)"
                            className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No deposit required.</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Notice Period (Days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={noticePeriodDays}
                          onChange={(e) => setNoticePeriodDays(e.target.value)}
                          placeholder="30"
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Tenant Preference
                        </label>
                        <select
                          value={tenantPreference}
                          onChange={(e) => setTenantPreference(e.target.value)}
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-foreground cursor-pointer"
                        >
                          <option value="any">Any (Families or Bachelors)</option>
                          <option value="family">Families Only</option>
                          <option value="bachelors">Bachelors / Working Professionals</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION B: HOUSE RULES & STAY POLICIES */}
                {propertyType !== "HOTEL" && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/70 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          House Rules & Policies
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Select standard guidelines or add custom rules for residents and guests.
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {houseRules.length} Rules Active
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {((propertyType === "PG" || propertyType === "HOSTEL") ? [
                        "No Smoking inside premises",
                        "Quiet Hours (10 PM - 7 AM)",
                        "No outside visitors after gate time",
                        "Bio-metric / ID entry required",
                        "Alcohol strictly prohibited"
                      ] : (propertyType === "FLAT" || propertyType === "APARTMENT" || propertyType === "HOUSE") ? [
                        "No pets allowed",
                        "Vegetarian tenants preferred",
                        "No loud music after 10 PM",
                        "Society parking rules apply",
                        "Subletting prohibited"
                      ] : [
                        "No smoking inside",
                        "Quiet hours after 10 PM",
                        "No pets allowed",
                        "No parties or events",
                        "Suitable for children"
                      ]).map((rule) => {
                        const active = houseRules.includes(rule);
                        return (
                          <button
                            key={rule}
                            type="button"
                            onClick={() => toggleHouseRule(rule)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              active
                                ? "bg-[#111716] text-white border-[#111716] shadow-xs"
                                : "bg-surface hover:bg-surface-muted text-foreground border-border/80 hover:border-primary/50"
                            }`}
                          >
                            {active && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            <span>{rule}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom rule input */}
                    <div className="flex items-center gap-2 pt-1 max-w-md">
                      <input
                        type="text"
                        value={customRuleInput}
                        onChange={(e) => setCustomRuleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomHouseRule();
                          }
                        }}
                        placeholder="Add custom rule (e.g. Quiet hours strictly after 11 PM)..."
                        className="glass-input flex-1 px-3 py-2 rounded-xl text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={addCustomHouseRule}
                        className="px-3.5 py-2 rounded-xl bg-[#111716] hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        + Add Rule
                      </button>
                    </div>

                    {/* Custom rule tags */}
                    {houseRules.filter(r => ![
                      "No Smoking inside premises", "Quiet Hours (10 PM - 7 AM)", "No outside visitors after gate time", "Bio-metric / ID entry required", "Alcohol strictly prohibited",
                      "No pets allowed", "Vegetarian tenants preferred", "No loud music after 10 PM", "Society parking rules apply", "Subletting prohibited",
                      "No smoking inside", "Quiet hours after 10 PM", "No parties or events", "Suitable for children"
                    ].includes(r)).length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {houseRules.filter(r => ![
                          "No Smoking inside premises", "Quiet Hours (10 PM - 7 AM)", "No outside visitors after gate time", "Bio-metric / ID entry required", "Alcohol strictly prohibited",
                          "No pets allowed", "Vegetarian tenants preferred", "No loud music after 10 PM", "Society parking rules apply", "Subletting prohibited",
                          "No smoking inside", "Quiet hours after 10 PM", "No parties or events", "Suitable for children"
                        ].includes(r)).map((customRule) => (
                          <span key={customRule} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-muted text-foreground border border-border/80">
                            <span>{customRule}</span>
                            <button
                              type="button"
                              onClick={() => toggleHouseRule(customRule)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <CloseIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION C: ROOM-LEVEL BOOKING AVAILABILITY */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Room-Level Booking Availability
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage listing and room configuration availability.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      Active Availability
                    </span>
                  </div>

                  {(propertyType === "PG" || propertyType === "HOSTEL" || propertyType === "HOTEL") ? (
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold text-foreground">
                        Room-Level Availability Toggles:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {occupancyOptions.map((opt) => {
                          const isAvail = opt.isAvailable !== false;
                          return (
                            <div
                              key={opt.id}
                              className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                isAvail ? "bg-surface-muted/30 border-border/80" : "bg-red-50/50 border-red-200/60 opacity-70"
                              }`}
                            >
                              <div>
                                <span className="font-bold text-xs text-foreground block">{opt.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {isAvail ? "Available for reservations" : "Currently marked unavailable"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleOccupancyOptionAvailability(opt.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  isAvail ? "bg-primary text-white hover:bg-[#5E7771]" : "bg-surface-muted text-muted-foreground border border-border hover:bg-surface-muted/80"
                                }`}
                              >
                                {isAvail ? "Available" : "Booked / Unavailable"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-surface-muted/30 border border-border/80 text-xs text-foreground flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground block">Immediate Booking Availability</span>
                        <span className="text-xs text-muted-foreground">
                          Listing will be published for instant reservations once verified by StayTrack administrators.
                        </span>
                      </div>
                      <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                        Ready
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic">
                    Note: Detailed calendar reservations and stay dates are dynamically checked and held by StayTrack upon booking creation.
                  </p>
                </div>

                {/* SECTION D: COMPREHENSIVE LISTING REVIEW SUMMARY */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface-muted/30 border border-border/80 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/70">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Listing Review Summary
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground">
                      Steps 1–5 Configuration
                    </span>
                  </div>

                  {/* Step 1 Summary */}
                  <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Property Title</span>
                      <span className="font-bold text-foreground truncate block mt-0.5">{title}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</span>
                      <span className="font-bold text-foreground block mt-0.5">{propertyType}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                      <span className="font-medium text-muted-foreground line-clamp-2 mt-0.5">{description}</span>
                    </div>
                  </div>

                  {/* Step 2 Summary */}
                  <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs text-xs space-y-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Step 2: Accommodation Details
                    </span>
                    {(propertyType === "PG" || propertyType === "HOSTEL") && (
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-xs">
                          {occupancyOptions.length} room options configured | Gender: <strong className="text-foreground">{genderCategory}</strong> | Food: <strong className="text-foreground">{foodIncluded ? `Included (${foodOptions.join(", ")})` : "Self / Optional"}</strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {occupancyOptions.map((opt) => (
                            <div key={opt.id} className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/70 text-xs">
                              <div className="font-bold text-foreground flex justify-between">
                                <span>{opt.name}</span>
                                <span className="text-primary">₹{opt.monthlyRentPerBed.toLocaleString("en-IN")}/mo</span>
                              </div>
                              <div className="text-muted-foreground text-[11px] mt-0.5">
                                Rooms: {opt.roomCount ?? 1} | Beds: {opt.bedsCount ?? 1} | Bathroom: {opt.bathroomType}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {propertyType === "HOTEL" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {occupancyOptions.map((opt) => (
                          <div key={opt.id} className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/70 text-xs">
                            <div className="font-bold text-foreground flex justify-between">
                              <span>{opt.name}</span>
                              <span className="text-primary">₹{(opt.nightlyPrice || opt.price || 2500).toLocaleString("en-IN")}/night</span>
                            </div>
                            <div className="text-muted-foreground text-[11px] mt-0.5">
                              Rooms: {opt.roomCount ?? 1} | Bed: {opt.bedType} | Guests: {opt.maxOccupancy}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(propertyType === "BNB" || propertyType === "VACATIONSTAY") && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground text-xs">
                        <div>Space: <strong className="text-foreground">{spaceType}</strong></div>
                        <div>Guests: <strong className="text-foreground">{maxGuests}</strong></div>
                        <div>Bedrooms: <strong className="text-foreground">{bedrooms}</strong></div>
                        <div>Beds: <strong className="text-foreground">{bedsCount}</strong></div>
                      </div>
                    )}
                    {(propertyType === "FLAT" || propertyType === "APARTMENT" || propertyType === "HOUSE") && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground text-xs">
                        <div>Config: <strong className="text-foreground">{bhkConfig}</strong></div>
                        <div>Bedrooms: <strong className="text-foreground">{bedrooms}</strong></div>
                        <div>Bathrooms: <strong className="text-foreground">{bathrooms}</strong></div>
                        <div>Area: <strong className="text-foreground">{areaSqFt ? `${areaSqFt} sq ft` : "Not specified"}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* Step 3 Summary */}
                  <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">City</span>
                      <span className="font-bold text-foreground block mt-0.5">{city}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Area / Locality</span>
                      <span className="font-bold text-foreground block mt-0.5">{area}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Street Address</span>
                      <span className="font-medium text-foreground line-clamp-1 block mt-0.5">{address}</span>
                    </div>
                  </div>

                  {/* Step 4 Summary */}
                  <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Photos & Amenities</span>
                      <span className="text-xs font-medium text-foreground">{images.length} Photos Uploaded</span>
                    </div>
                    {images.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {images.map((url, i) => (
                          <div key={i} className="relative w-14 h-10 rounded-lg overflow-hidden border border-border shrink-0 bg-surface-muted">
                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                            {i === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-[7px] text-white font-bold text-center uppercase tracking-wider py-0.5">
                                Cover
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 5 Summary */}
                  <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {propertyType === "HOTEL" || propertyType === "BNB" ? "Baseline Nightly Rate" : "Baseline Monthly Rent"}
                      </span>
                      <span className="font-serif text-lg font-bold text-foreground block mt-0.5">
                        ₹{(() => {
                          if (propertyType === "PG" || propertyType === "HOSTEL") {
                            const minRent = occupancyOptions.length > 0
                              ? Math.min(...occupancyOptions.map((o) => o.monthlyRentPerBed || 999999))
                              : 0;
                            return (minRent !== 999999 ? minRent : 0).toLocaleString("en-IN");
                          } else if (propertyType === "HOTEL") {
                            const minPrice = occupancyOptions.length > 0
                              ? Math.min(...occupancyOptions.map((o) => o.nightlyPrice || o.price || 999999))
                              : 0;
                            return (minPrice !== 999999 ? minPrice : 0).toLocaleString("en-IN");
                          } else {
                            return (price ? Number(price) : 0).toLocaleString("en-IN");
                          }
                        })()}
                        <span className="text-xs text-muted-foreground font-sans font-normal ml-1">
                          {propertyType === "HOTEL" || propertyType === "BNB" ? " / night" : " / month"}
                        </span>
                      </span>
                    </div>
                    {(propertyType === "PG" || propertyType === "HOSTEL" || propertyType === "FLAT") && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Security Deposit</span>
                        <span className="font-bold text-foreground block mt-0.5">
                          {securityDepositEnabled && Number(securityDeposit) > 0 ? `₹${Number(securityDeposit).toLocaleString("en-IN")}` : "None"}
                        </span>
                        {noticePeriodDays && (
                          <span className="text-[11px] text-muted-foreground block">Notice: {noticePeriodDays} days</span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rules & Policies</span>
                      <span className="font-bold text-foreground block mt-0.5">{houseRules.length} rules specified</span>
                    </div>
                  </div>
                </div>

                {/* SECTION D: ACTIONS (Back & Final Submission) */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCurrentStep(4);
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface-muted cursor-pointer transition-colors"
                  >
                    Back to Step 4
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-[#5E7771] text-xs font-bold text-white shadow-elevated transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Submitting Property Listing...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Property Listing</span>
                        <ArrowRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
    </div>
  );
}

