import { getIdToken } from "./auth";
import {
  SearchRequest,
  AiSearchRequest,
  Property,
  Booking,
  Review,
  Conversation,
  Message,
  Notification,
  HostApplication,
  AdminDashboardSummary,
  User,
  LocationArea,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Generic fetch wrapper attaching Firebase Auth Bearer token if available
 */
async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = await getIdToken();

  const makeRequest = async (authToken: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(token);

  // Firebase can restore the persisted session asynchronously after the
  // first render. If the first protected request was sent before the
  // Firebase user/token was ready, wait briefly and retry once the token
  // becomes available. Do not retry a 401 when we already had a token,
  // because that indicates a genuinely rejected credential.
  if (response.status === 401 && !token) {
    for (let attempt = 0; attempt < 5 && !token; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      token = await getIdToken();
    }

    if (token) {
      response = await makeRequest(token);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error (${response.status}): ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }
  return (await response.text()) as unknown as T;
}

// ==========================================
// HEALTH & AUTH
// ==========================================
export async function checkBackendHealth(): Promise<string> {
  try {
    return await apiFetch<string>("/api/health");
  } catch (error) {
    console.warn("Backend server offline:", error);
    return "Backend Offline";
  }
}

export async function verifyFirebaseToken(idToken: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("Auth verification failed");
    return await response.text();
  } catch (error) {
    console.warn("Backend verify offline:", error);
    return "Backend Offline";
  }
}

export async function getCurrentUser(idToken: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("Failed to get profile");
    return await response.json();
  } catch (error) {
    console.warn("Backend user me offline:", error);
    return null;
  }
}

export async function updateCurrentUser(data: {
  name: string;
  email: string;
}): Promise<User> {
  return apiFetch<User>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==========================================
// SEARCH & AI
// ==========================================
export async function searchProperties(request: SearchRequest): Promise<any> {
  return apiFetch("/api/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function searchWithAi(request: AiSearchRequest): Promise<any> {
  return apiFetch("/api/ai/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ==========================================
// LOCATIONS
// ==========================================
export async function getCities(): Promise<LocationArea[]> {
  return apiFetch<LocationArea[]>("/api/locations/cities");
}

export async function getAreas(city?: string): Promise<LocationArea[]> {
  const query = city ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch<LocationArea[]>(`/api/locations/areas${query}`);
}

export async function searchLocations(q: string): Promise<LocationArea[]> {
  return apiFetch<LocationArea[]>(`/api/locations/search?q=${encodeURIComponent(q)}`);
}

// ==========================================
// PROPERTIES
// ==========================================
export async function getPublicProperties(): Promise<Property[]> {
  return apiFetch<Property[]>("/api/properties/stay-section");
}

export async function getTopVerifiedProperties(): Promise<Property[]> {
  return apiFetch<Property[]>("/api/properties/top-verified");
}

export async function getStayProperties(): Promise<Property[]> {
  return apiFetch<Property[]>("/api/properties/stay-section");
}

export async function getPropertyDetails(propertyId: string): Promise<Property> {
  return apiFetch<Property>(`/api/properties/${propertyId}`);
}

export async function getMyProperties(): Promise<Property[]> {
  return apiFetch<Property[]>("/api/properties/mine");
}

export async function createProperty(data: Partial<Property>): Promise<any> {
  return apiFetch("/api/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// BOOKINGS
// ==========================================
export async function createBooking(data: {
  propertyId: string;
  startDate: string;
  endDate: string;
}): Promise<any> {
  return apiFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>("/api/bookings/me");
}

export async function getHostBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>("/api/bookings/host");
}

export async function getBooking(bookingId: string): Promise<Booking> {
  return apiFetch<Booking>(`/api/bookings/${bookingId}`);
}

export async function acceptBooking(bookingId: string): Promise<any> {
  return apiFetch(`/api/bookings/${bookingId}/accept`, { method: "PUT" });
}

export async function rejectBooking(bookingId: string): Promise<any> {
  return apiFetch(`/api/bookings/${bookingId}/reject`, { method: "PUT" });
}

export async function cancelBooking(bookingId: string): Promise<any> {
  return apiFetch(`/api/bookings/${bookingId}/cancel`, { method: "PUT" });
}

export async function markPaymentPending(bookingId: string): Promise<any> {
  return apiFetch(`/api/bookings/${bookingId}/payment`, { method: "PUT" });
}

// ==========================================
// PAYMENTS & RAZORPAY
// ==========================================
export async function getMyPayments(): Promise<any[]> {
  return apiFetch<any[]>("/api/payments/me");
}

export async function createBookingOrder(bookingId: string): Promise<any> {
  return apiFetch(`/api/payments/booking/${bookingId}/order`, { method: "POST" });
}

export async function verifyBookingPayment(verificationData: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<any> {
  return apiFetch("/api/payments/booking/verify", {
    method: "POST",
    body: JSON.stringify(verificationData),
  });
}

export async function createSubscriptionOrder(): Promise<any> {
  return apiFetch("/api/payments/subscription/order", { method: "POST" });
}

export async function verifySubscriptionPayment(verificationData: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<any> {
  return apiFetch("/api/payments/subscription/verify", {
    method: "POST",
    body: JSON.stringify(verificationData),
  });
}

// ==========================================
// SUBSCRIPTIONS & HOST APPS
// ==========================================
export async function getSubscriptionPlans(): Promise<any> {
  return apiFetch("/api/subscriptions/plans");
}

export async function getMySubscription(): Promise<any> {
  return apiFetch("/api/subscriptions/me");
}

export async function getEligibility(): Promise<{ eligible: boolean; reason?: string }> {
  return apiFetch("/api/subscriptions/eligibility");
}

export async function submitHostApplication(data: {
  hostType: string;
  applicantName: string;
  email?: string;
  documentType?: string;
  storagePath?: string;
  fileName?: string;
}): Promise<any> {
  return apiFetch("/api/host-applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyHostApplication(): Promise<HostApplication | null> {
  try {
    return await apiFetch<HostApplication>("/api/host-applications/me");
  } catch (err: any) {
    if (err.message && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("500"))) {
      return null;
    }
    throw err;
  }
}

// ==========================================
// CONVERSATIONS & CHAT
// ==========================================
export async function createConversation(data: { participantId: string; propertyId?: string }): Promise<Conversation> {
  return apiFetch<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/api/conversations");
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${conversationId}`);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/api/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  return apiFetch<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function markConversationAsRead(conversationId: string): Promise<any> {
  return apiFetch(`/api/conversations/${conversationId}/read`, { method: "PUT" });
}

// ==========================================
// NOTIFICATIONS
// ==========================================
export async function getNotifications(limit?: number): Promise<Notification[]> {
  const query = limit ? `?limit=${limit}` : "";
  return apiFetch<Notification[]>(`/api/notifications${query}`);
}

export async function getUnreadNotifications(limit?: number): Promise<Notification[]> {
  const query = limit ? `?limit=${limit}` : "";
  return apiFetch<Notification[]>(`/api/notifications/unread${query}`);
}

export async function getUnreadNotificationsCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/api/notifications/unread/count");
}

export async function markNotificationAsRead(id: string): Promise<any> {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsAsRead(): Promise<any> {
  return apiFetch("/api/notifications/read-all", { method: "PUT" });
}

// ==========================================
// REVIEWS
// ==========================================
export async function createReview(data: { propertyId: string; rating: number; comment: string }): Promise<Review> {
  return apiFetch<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPropertyReviews(propertyId: string): Promise<Review[]> {
  return apiFetch<Review[]>(`/api/reviews/property/${propertyId}`);
}

export async function getMyReviews(): Promise<Review[]> {
  return apiFetch<Review[]>("/api/reviews/me");
}

// ==========================================
// ADMIN API
// ==========================================
export async function getAdminSummary(): Promise<AdminDashboardSummary> {
  return apiFetch<AdminDashboardSummary>("/api/admin/dashboard/summary");
}

export async function listAdminUsers(params?: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/admin/users?${query}`);
}

export async function updateAdminUserStatus(userId: string, status: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/status?status=${encodeURIComponent(status)}`, { method: "PUT" });
}

export async function updateAdminUserRole(userId: string, role: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/role?role=${encodeURIComponent(role)}`, { method: "PUT" });
}

export async function listAdminProperties(params?: {
  verificationStatus?: string;
  listingStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/admin/properties?${query}`);
}

export async function approveProperty(propertyId: string, note?: string): Promise<any> {
  const query = note ? `?note=${encodeURIComponent(note)}` : "";
  return apiFetch(`/api/admin/properties/${propertyId}/approve${query}`, { method: "PUT" });
}

export async function requestPropertyChanges(propertyId: string, note: string): Promise<any> {
  return apiFetch(`/api/admin/properties/${propertyId}/request-changes?note=${encodeURIComponent(note)}`, {
    method: "PUT",
  });
}

export async function rejectProperty(propertyId: string, reason: string): Promise<any> {
  return apiFetch(`/api/admin/properties/${propertyId}/reject?reason=${encodeURIComponent(reason)}`, {
    method: "PUT",
  });
}

export async function updatePropertyAssignment(
  propertyId: string,
  assignment: { topVerified?: boolean; showInStay?: boolean }
): Promise<any> {
  const params = new URLSearchParams();
  if (assignment.topVerified !== undefined) params.set("topVerified", String(assignment.topVerified));
  if (assignment.showInStay !== undefined) params.set("showInStay", String(assignment.showInStay));
  return apiFetch(`/api/admin/properties/${propertyId}/assignment?${params.toString()}`, {
    method: "PUT",
  });
}

export async function listAdminHostApplications(params?: {
  verificationStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch(`/api/admin/host-applications?${query}`);
}

export async function approveHostApplication(applicationId: string, adminNote?: string): Promise<any> {
  const query = adminNote ? `?adminNote=${encodeURIComponent(adminNote)}` : "";
  return apiFetch(`/api/admin/host-applications/${applicationId}/approve${query}`, { method: "PUT" });
}

export async function rejectHostApplication(applicationId: string, rejectionReason: string): Promise<any> {
  return apiFetch(`/api/admin/host-applications/${applicationId}/reject?rejectionReason=${encodeURIComponent(rejectionReason)}`, {
    method: "PUT",
  });
}

export async function verifyHostPaymentAccount(hostId: string): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/payment-account/verify`, { method: "POST" });
}

export async function getSubscriptionSettings(): Promise<any> {
  return apiFetch("/api/admin/settings/subscription");
}

export async function updateSubscriptionSettings(data: any): Promise<any> {
  return apiFetch("/api/admin/settings/subscription", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getAiSettings(): Promise<any> {
  return apiFetch("/api/admin/settings/ai");
}

export async function updateAiSettings(data: any): Promise<any> {
  return apiFetch("/api/admin/settings/ai", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}