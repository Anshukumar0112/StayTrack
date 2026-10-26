export interface CategoryConfig {
  id: 'BNB' | 'HOSTEL' | 'PG' | 'HOTEL' | 'FLAT';
  label: string;
  order: number;
  description: string;
  badgeBg?: string;
  icon?: string;
}

export const ACCOMMODATION_CATEGORIES: CategoryConfig[] = [
  {
    id: 'BNB',
    label: 'BNBs',
    order: 1,
    description: 'Bed & Breakfasts and private holiday stays across Delhi NCR',
    icon: '/icons/bnb.png',
  },
  {
    id: 'HOSTEL',
    label: 'Hostels',
    order: 2,
    description: 'Shared & community living spaces for students and travelers',
    icon: '/icons/hostel.png',
  },
  {
    id: 'PG',
    label: 'PGs',
    order: 3,
    description: 'Paying Guest accommodations with mess facilities & basic amenities',
    icon: '/icons/pg.png',
  },
  {
    id: 'HOTEL',
    label: 'Hotels',
    order: 4,
    description: 'Comfortable hotel rooms with daily room service & hospitality',
    icon: '/icons/hotel.png',
  },
  {
    id: 'FLAT',
    label: 'Flats',
    order: 5,
    description: '1BHK, 2BHK, 3BHK flats and independent apartments',
    icon: '/icons/flat.png',
  },
];

/**
 * Normalizes any category string (e.g., 'bnb', 'BNB', 'hostel', 'Hostels', 'flat')
 * to canonical ID ('BNB' | 'HOSTEL' | 'PG' | 'HOTEL' | 'FLAT') or empty string if invalid.
 */
export function normalizeCategoryKey(input?: string): string {
  if (!input) return '';
  const clean = input.trim().toUpperCase();
  if (
    clean === 'BNB' ||
    clean === 'BNBS' ||
    clean === 'B&B' ||
    clean === 'BED & BREAKFAST' ||
    clean === 'BED AND BREAKFAST' ||
    clean === 'BED_AND_BREAKFAST' ||
    clean === 'VACATIONSTAY' ||
    clean === 'VACATION_STAY' ||
    clean === 'ROOM'
  ) return 'BNB';
  if (clean === 'HOSTEL' || clean === 'HOSTELS') return 'HOSTEL';
  if (clean === 'PG' || clean === 'PGS' || clean === 'PAYING GUEST') return 'PG';
  if (clean === 'HOTEL' || clean === 'HOTELS') return 'HOTEL';
  if (
    clean === 'FLAT' ||
    clean === 'FLATS' ||
    clean === 'APARTMENT' ||
    clean === 'APARTMENTS' ||
    clean === 'HOUSE'
  ) return 'FLAT';
  return clean;
}

/**
 * Gets user-facing label for a given category key (e.g. 'BNB' -> 'BNBs')
 */
export function getCategoryLabel(type?: string): string {
  const normalized = normalizeCategoryKey(type);
  const found = ACCOMMODATION_CATEGORIES.find((c) => c.id === normalized);
  if (found) return found.label;
  if (!type) return 'Stay';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Gets category config by canonical ID
 */
export function getCategoryConfig(type?: string): CategoryConfig | undefined {
  const normalized = normalizeCategoryKey(type);
  return ACCOMMODATION_CATEGORIES.find((c) => c.id === normalized);
}

export const PG_OCCUPANCY_OPTIONS = [
  { id: "single", label: "Single Room" },
  { id: "double", label: "Double Sharing" },
  { id: "triple", label: "Triple Sharing" },
  { id: "four_plus", label: "4+ Sharing" },
] as const;

export const GENDER_OPTIONS = [
  { id: "boys", label: "Boys Only" },
  { id: "girls", label: "Girls Only" },
  { id: "unisex", label: "Unisex / Co-living" },
] as const;

export const HOSTEL_ROOM_OPTIONS = [
  { id: "dormitory", label: "Dormitory" },
  { id: "private", label: "Private Room" },
] as const;

export const HOTEL_ROOM_OPTIONS = [
  { id: "standard", label: "Standard Room" },
  { id: "deluxe", label: "Deluxe Room" },
  { id: "executive", label: "Executive Room" },
  { id: "suite", label: "Suite" },
] as const;

export const BNB_SPACE_OPTIONS = [
  { id: "entire_place", label: "Entire Place" },
  { id: "private_room", label: "Private Room" },
] as const;

export function formatOccupancyLabel(val?: string): string {
  if (!val) return "";
  const found = PG_OCCUPANCY_OPTIONS.find((o) => o.id === val.toLowerCase());
  return found ? found.label : val;
}

export function formatGenderLabel(val?: string): string {
  if (!val) return "";
  const clean = val.toLowerCase().trim();
  const found = GENDER_OPTIONS.find((g) => g.id === clean);
  if (found) return found.label;
  if (clean.includes("boy") || clean.includes("male") || clean.includes("men")) return "Boys Only";
  if (clean.includes("girl") || clean.includes("female") || clean.includes("women")) return "Girls Only";
  if (clean.includes("unisex") || clean.includes("co-living") || clean.includes("coliving")) return "Unisex / Co-living";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export const CONTRACT_DURATION_OPTIONS = [
  { id: "3_months", label: "3 Months Minimum" },
  { id: "4_months", label: "4 Months Minimum" },
  { id: "6_months", label: "6 Months Minimum" },
  { id: "10_months", label: "10 Months Academic Term" },
  { id: "12_months", label: "12 Months (1 Year Lease)" },
] as const;

export function formatContractDuration(
  val?: string,
  customVal?: number | string,
  customUnit?: string
): string {
  if (!val) return "";
  if (val === "custom" && customVal) {
    const unit = customUnit || "months";
    return `${customVal} ${unit.charAt(0).toUpperCase() + unit.slice(1)} Minimum`;
  }
  const found = CONTRACT_DURATION_OPTIONS.find((c) => c.id === val.toLowerCase());
  if (found) return found.label;
  const cleaned = val.replace(/_/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatRoomTypeLabel(val?: string): string {
  if (!val) return "";
  const clean = val.toLowerCase();
  const hotelFound = HOTEL_ROOM_OPTIONS.find((h) => h.id === clean);
  if (hotelFound) return hotelFound.label;
  const hostelFound = HOSTEL_ROOM_OPTIONS.find((h) => h.id === clean);
  if (hostelFound) return hostelFound.label;
  const bnbFound = BNB_SPACE_OPTIONS.find((b) => b.id === clean);
  if (bnbFound) return bnbFound.label;
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export type StayModelId = "daily" | "monthly" | "hourly";

export interface StayModelOption {
  id: StayModelId;
  label: string;
}

export const STAY_MODELS: Record<StayModelId, StayModelOption> = {
  daily: { id: "daily", label: "Nightly / Daily" },
  monthly: { id: "monthly", label: "Monthly Stay" },
  hourly: { id: "hourly", label: "Hourly Stay" },
};

export const CATEGORY_STAY_MODELS: Record<string, StayModelId[]> = {
  PG: ["monthly"],
  FLAT: ["monthly"],
  APARTMENT: ["monthly"],
  HOUSE: ["monthly"],
  HOSTEL: ["monthly", "daily"],
  HOTEL: ["daily", "hourly"],
  BNB: ["daily", "hourly"],
  VACATIONSTAY: ["daily", "hourly"],
  VACATION_STAY: ["daily", "hourly"],
};

export function getAllowedStayModels(category?: string): StayModelOption[] {
  const norm = normalizeCategoryKey(category);
  const allowed = CATEGORY_STAY_MODELS[norm] || ["daily", "monthly", "hourly"];
  return allowed.map((id) => STAY_MODELS[id]);
}

export function getDefaultStayModel(category?: string): StayModelId {
  const norm = normalizeCategoryKey(category);
  if (norm === "PG" || norm === "FLAT" || norm === "APARTMENT" || norm === "HOUSE") return "monthly";
  if (norm === "HOSTEL") return "monthly";
  return "daily";
}

export function isStayModelAllowedForCategory(category?: string, stayModel?: string): boolean {
  if (!stayModel) return false;
  const cleanModel = stayModel.trim().toLowerCase() as StayModelId;
  const norm = normalizeCategoryKey(category);
  const allowed = CATEGORY_STAY_MODELS[norm] || ["daily", "monthly", "hourly"];
  return allowed.includes(cleanModel);
}
