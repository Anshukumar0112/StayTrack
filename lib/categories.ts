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
    icon: '🏡',
  },
  {
    id: 'HOSTEL',
    label: 'Hostels',
    order: 2,
    description: 'Shared & community living spaces for students and travelers',
    icon: '🛏️',
  },
  {
    id: 'PG',
    label: 'PGs',
    order: 3,
    description: 'Paying Guest accommodations with mess facilities & basic amenities',
    icon: '🏢',
  },
  {
    id: 'HOTEL',
    label: 'Hotels',
    order: 4,
    description: 'Comfortable hotel rooms with daily room service & hospitality',
    icon: '🏨',
  },
  {
    id: 'FLAT',
    label: 'Flats',
    order: 5,
    description: '1BHK, 2BHK, 3BHK flats and independent apartments',
    icon: '🔑',
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
