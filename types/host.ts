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
