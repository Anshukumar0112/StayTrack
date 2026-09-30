export interface SupportedLocation {
  id: string;
  name: string;
  state: string;
  region: string;
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
    image: "/icons/location-pin.png",
    description: "Capital region stays & central hubs",
  },
  {
    id: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    image: "/icons/location-pin.png",
    description: "Cyber City, Golf Course & tech corridors",
  },
  {
    id: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "/icons/location-pin.png",
    description: "Sector hubs, IT parks & expressways",
  },
  {
    id: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "/icons/location-pin.png",
    description: "Knowledge parks & educational hubs",
  },
  {
    id: "ghaziabad",
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "/icons/location-pin.png",
    description: "Indirapuram, Vaishali & residential zones",
  },
  {
    id: "faridabad",
    name: "Faridabad",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    image: "/icons/location-pin.png",
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
