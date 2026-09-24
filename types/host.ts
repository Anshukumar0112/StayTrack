export interface HostApplication {
  id?: string;
  applicationId?: string;
  exists?: boolean;
  userId: string;
  applicantName?: string;
  fullName?: string;
  email: string;
  phone: string;
  hostType?: string;
  govIdUrl?: string;
  documents?: Record<string, any>;
  verificationStatus: 'pending' | 'approved' | 'changes_required' | 'rejected' | 'none';
  adminNote?: string;
  rejectionReason?: string;
  submittedAt?: any;
  updatedAt?: any;
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
