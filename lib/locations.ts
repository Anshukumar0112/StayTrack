export interface SupportedLocation {
  id: string;
  name: string;
  state: string;
  region: string;
  landmark: string;
  image: string;
  description?: string;
}

export const NCR_SERVICE_REGION = "Delhi NCR";

export const SUPPORTED_LOCATIONS: SupportedLocation[] = [
  {
    id: "delhi",
    name: "Delhi",
    state: "Delhi",
    region: NCR_SERVICE_REGION,
    landmark: "India Gate",
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=800&auto=format&fit=crop",
    description: "Capital region stays & central hubs",
  },
  {
    id: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    landmark: "Cyber City",
    image: "https://images.unsplash.com/photo-1595658658421-a9ac457190ae?q=80&w=800&auto=format&fit=crop",
    description: "Cyber City, Golf Course & tech corridors",
  },
  {
    id: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    landmark: "Noida Skyline",
    image: "https://images.unsplash.com/photo-1546412414-8035e1786b9b?q=80&w=800&auto=format&fit=crop",
    description: "Sector hubs, IT parks & expressways",
  },
  {
    id: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    landmark: "Buddh Circuit",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop",
    description: "Knowledge parks & educational hubs",
  },
  {
    id: "ghaziabad",
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    landmark: "Swarna Jayanti Park",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
    description: "Indirapuram, Vaishali & residential zones",
  },
  {
    id: "faridabad",
    name: "Faridabad",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    landmark: "Surajkund Lake",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop",
    description: "Industrial hubs & connectivity corridors",
  },
];

export const SUPPORTED_CITY_NAMES = SUPPORTED_LOCATIONS.map((loc) => loc.name);

/**
 * Canonical location normalization:
 * - null/undefined -> ""
 * - Unicode NFKC normalization
 * - trim leading/trailing whitespace
 * - collapse multiple internal spaces into single space
 * - lowercase
 */
export function normalizeLocation(value?: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Checks if a given query or location string falls within the supported Delhi NCR service area.
 * Returns true if empty/blank (defaults to searching within supported scope).
 */
export function isSupportedLocation(cityName?: string | null): boolean {
  const normalized = normalizeLocation(cityName);
  if (!normalized) return true;

  if (
    normalized.includes("ncr") ||
    normalized.includes("delhi") ||
    normalized.includes("national capital")
  ) {
    return true;
  }

  return SUPPORTED_LOCATIONS.some(
    (loc) =>
      normalizeLocation(loc.name) === normalized ||
      normalized.includes(normalizeLocation(loc.name)) ||
      normalizeLocation(loc.name).includes(normalized)
  );
}
