export interface Property {
  id: string;
  title: string;
  description: string;
  hostId: string;
  propertyType: 'Flat' | 'PG' | 'Room' | 'Hotel' | string;
  bookingType: 'daily' | 'monthly' | 'hourly' | string;
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
  rating?: number;
  images?: string[];
  verificationStatus?: 'pending' | 'approved' | 'changes_required' | 'rejected';
  listingStatus?: 'active' | 'hidden' | 'inactive';
  topVerified?: boolean;
  showInStay?: boolean;
  adminNote?: string;
  rejectionReason?: string;
  createdAt?: string;
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

