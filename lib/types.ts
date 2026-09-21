export interface User {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'customer' | 'host' | 'admin';
  profileCompleted?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationArea {
  id: string;
  cityName: string;
  areaName: string;
  pincode?: string;
  active?: boolean;
  createdAt?: string;
}

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
  adminNote?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  userId: string;
  userName?: string;
  hostId: string;
  hostName?: string;
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
  status: 'REQUESTED' | 'ACCEPTED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
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

export interface Conversation {
  id: string;
  participantIds: string[];
  propertyId?: string;
  propertyTitle?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type?: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export interface HostApplication {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  govIdUrl?: string;
  verificationStatus: 'pending' | 'approved' | 'changes_required' | 'rejected';
  adminNote?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  propertyLimit: number;
  durationDays: number;
}

export interface HostSubscription {
  id: string;
  hostId: string;
  planId: string;
  status: 'active' | 'expired';
  expiresAt: string;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  totalHosts: number;
  totalProperties: number;
  pendingProperties: number;
  pendingHostApplications: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
}

