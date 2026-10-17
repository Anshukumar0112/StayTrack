export type PropertyCategory = 'BNB' | 'PG' | 'HOSTEL' | 'FLAT' | 'HOTEL' | string;

export type BnbSpaceType = 'entire_place' | 'private_room' | 'shared_room' | string;

export type PgOccupancyType = 'single' | 'double' | 'triple' | 'four_plus' | string;
export type GenderCategory = 'boys' | 'girls' | 'unisex' | 'coliving' | string;

export type HostelRoomType = 'dormitory' | 'private' | string;
export type HostelPriceModel = 'per_bed' | 'per_room' | string;
export type HostelAudience = 'students' | 'working_professionals' | 'open_to_all' | string;

export type FlatBhkConfig = '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4+ BHK' | string;
export type TenantPreference = 'family' | 'bachelors' | 'any' | string;
export type ParkingType = 'covered' | 'open' | 'two_wheeler' | 'none' | string;

export type HotelRoomType = 'standard' | 'deluxe' | 'suite' | 'executive' | string;
export type BedType = 'king' | 'queen' | 'twin' | 'single' | string;

export interface Property {
  id: string;
  propertyId?: string;
  title: string;
  description: string;
  hostId: string;
  propertyType: 'BNB' | 'HOSTEL' | 'PG' | 'HOTEL' | 'FLAT' | 'Hostel' | 'Hotel' | 'Flat' | string;
  category?: PropertyCategory;
  bookingType: 'daily' | 'monthly' | 'hourly' | string;
  stayTypes?: string[];
  pricePerNight?: number;
  pricePerMonth?: number;
  pricePerHour?: number;
  dailyPrice?: number;
  monthlyPrice?: number;
  hourlyPrice?: number;
  price?: number;
  city: string;
  area: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  areaSqFt?: number;
  amenities?: string[];
  rating?: number;
  images?: string[];
  latitude?: number;
  longitude?: number;
  verificationStatus?: 'pending' | 'approved' | 'changes_required' | 'rejected';
  listingStatus?: 'active' | 'hidden' | 'inactive';
  topVerified?: boolean;
  showInStay?: boolean;
  adminNote?: string;
  rejectionReason?: string;
  createdAt?: string;

  // BNB attributes
  spaceType?: BnbSpaceType;
  maxGuests?: number;
  bedsCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  houseRules?: string[];

  // PG attributes
  occupancyType?: PgOccupancyType;
  genderCategory?: GenderCategory;
  foodIncluded?: boolean;
  foodOptions?: string[];
  securityDeposit?: number;
  noticePeriodDays?: number;
  gateClosingTime?: string;

  // Hostel attributes
  roomType?: HostelRoomType | HotelRoomType;
  totalBeds?: number;
  availableBeds?: number;
  priceModel?: HostelPriceModel;
  studentOrWorking?: HostelAudience;
  sharedFacilities?: string[];

  // Flat attributes
  bhkConfig?: FlatBhkConfig;
  maintenanceCharges?: number;
  tenantPreference?: TenantPreference;
  floorNumber?: number;
  totalFloors?: number;
  parkingType?: ParkingType;

  // Hotel attributes
  bedType?: BedType;
  breakfastIncluded?: boolean;
  cancellationPolicy?: string;
}

export function getPropertyId(p?: { id?: string; propertyId?: string } | null): string {
  if (!p) return "";
  return p.id || p.propertyId || "";
}

export interface SearchRequest {
  query?: string;
  city?: string;
  area?: string;
  propertyType?: string;
  bookingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  furnished?: boolean;
  bhkConfig?: string;
  occupancyType?: string;
  genderCategory?: string;
  roomType?: string;
  maxGuests?: number;
  minRating?: number;
  availableFrom?: string;
  availableTo?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface AiSearchRequest {
  prompt: string;
  limit?: number;
}

export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

export type { Booking } from "./booking";

