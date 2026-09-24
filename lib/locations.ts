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
    image: "🏛️",
    description: "Capital region stays & central hubs",
  },
  {
    id: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    image: "🏙️",
    description: "Cyber City, Golf Course & tech corridors",
  },
  {
    id: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "🏢",
    description: "Sector hubs, IT parks & expressways",
  },
  {
    id: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "🏬",
    description: "Knowledge parks & educational hubs",
  },
  {
    id: "ghaziabad",
    name: "Ghaziabad",
    state: "Uttar Pradesh",
    region: NCR_SERVICE_REGION,
    image: "🏘️",
    description: "Indirapuram, Vaishali & residential zones",
  },
  {
    id: "faridabad",
    name: "Faridabad",
    state: "Haryana",
    region: NCR_SERVICE_REGION,
    image: "🏙️",
    description: "Industrial hubs & connectivity corridors",
  },
];

export const SUPPORTED_CITY_NAMES = SUPPORTED_LOCATIONS.map((loc) => loc.name);

/**
 * Checks if a given query or location string falls within the supported Delhi NCR service area.
 * Returns true if empty/blank (defaults to searching within supported scope).
 */
export function isSupportedLocation(cityName?: string | null): boolean {
  if (!cityName || !cityName.trim()) return true;
  const normalized = cityName.trim().toLowerCase();

  if (
    normalized.includes("ncr") ||
    normalized.includes("delhi") ||
    normalized.includes("national capital")
  ) {
    return true;
  }

  return SUPPORTED_LOCATIONS.some(
    (loc) =>
      loc.name.toLowerCase() === normalized ||
      normalized.includes(loc.name.toLowerCase()) ||
      loc.name.toLowerCase().includes(normalized)
  );
}
