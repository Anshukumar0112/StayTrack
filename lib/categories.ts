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
  if (clean === 'BNB' || clean === 'BNBS') return 'BNB';
  if (clean === 'HOSTEL' || clean === 'HOSTELS') return 'HOSTEL';
  if (clean === 'PG' || clean === 'PGS') return 'PG';
  if (clean === 'HOTEL' || clean === 'HOTELS') return 'HOTEL';
  if (clean === 'FLAT' || clean === 'FLATS') return 'FLAT';
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
  const found = GENDER_OPTIONS.find((g) => g.id === val.toLowerCase());
  return found ? found.label : val;
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
