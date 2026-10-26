import { getIdToken } from "./auth";
import {
  SearchRequest,
  AiSearchRequest,
  Property,
  getPropertyId,
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
import { VisitBooking } from "@/types/visit";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getAdminToken(): string | null {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("staytrack_admin_token");
    if (token) return token;
  }
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )staytrack_admin_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Generic fetch wrapper attaching Firebase Auth Bearer token and Admin Session token if available
 */
async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = await getIdToken();
  const adminSessionToken = getAdminToken();

  const makeRequest = async (authToken: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (adminSessionToken && endpoint.startsWith("/api/admin")) {
      headers["X-Admin-Session"] = adminSessionToken;
    }

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Default 20-second timeout if caller did not provide a signal
    let signal = options.signal;
    let timeoutId: any = null;
    if (!signal) {
      const controller = new AbortController();
      signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), 20000);
    }

    try {
      return await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal,
        credentials: "include",
      });
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        throw new Error("Request timed out. Please check that the server is running and try again.");
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  let response: Response;
  try {
    response = await makeRequest(token);
  } catch (err: any) {
    throw err;
  }

  // Firebase can restore the persisted session asynchronously after the first render.
  // If the first request was sent before token was ready, wait and retry.
  if (response.status === 401 && !token) {
    for (let attempt = 0; attempt < 5 && !token; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      token = await getIdToken();
    }

    if (token) {
      response = await makeRequest(token);
    }
  } else if (response.status === 401 && token) {
    // Token may have expired in the browser session. Attempt one force-refresh.
    const refreshedToken = await getIdToken(true);
    if (refreshedToken && refreshedToken !== token) {
      token = refreshedToken;
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
  // 1. Attempt to fetch from Spring Boot backend API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && (data.uid || data.id)) {
        return {
          ...data,
          uid: data.uid || data.id,
          role: (data.role || "customer").toLowerCase(),
        };
      }
    }
  } catch (error) {
    console.warn("Backend user me offline, falling back to Firestore:", error);
  }

  // 2. Authoritative Firestore fallback for authenticated Firebase user
  if (typeof window !== "undefined") {
    try {
      const { auth, db } = await import("./firebase");
      const currentAuthUser = auth?.currentUser;
      if (currentAuthUser && db) {
        const { doc, getDoc } = await import("firebase/firestore");
        const userDocRef = doc(db, "users", currentAuthUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const docData = userDocSnap.data() as any;
          return {
            uid: currentAuthUser.uid,
            name: docData.name || currentAuthUser.displayName || "",
            email: docData.email || currentAuthUser.email || "",
            phone: docData.phone || currentAuthUser.phoneNumber || "",
            role: (docData.role || "customer").toLowerCase(),
            profileCompleted: docData.profileCompleted ?? false,
            status: docData.status || "active",
            createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
            updatedAt: docData.updatedAt?.toDate ? docData.updatedAt.toDate().toISOString() : docData.updatedAt,
          };
        } else {
          // Document not found in Firestore -> return active customer profile
          return {
            uid: currentAuthUser.uid,
            name: currentAuthUser.displayName || "",
            email: currentAuthUser.email || "",
            phone: currentAuthUser.phoneNumber || "",
            role: "customer",
            profileCompleted: false,
            status: "active",
          };
        }
      }
    } catch (fsError) {
      console.warn("Firestore user fallback failed:", fsError);
    }
  }

  return null;
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
  const list = await apiFetch<Property[]>("/api/properties/top-verified");
  return (list || []).map((p) => ({ ...p, id: getPropertyId(p) }));
}

export async function getStayProperties(): Promise<Property[]> {
  const list = await apiFetch<Property[]>("/api/properties/stay-section");
  return (list || []).map((p) => ({ ...p, id: getPropertyId(p) }));
}

export async function getPropertyDetails(propertyId: string): Promise<Property> {
  try {
    const res = await apiFetch<Property>(`/api/properties/${propertyId}`);
    if (res) {
      res.id = getPropertyId(res);
      return res;
    }
  } catch (err: unknown) {
    try {
      const publicList = await getPublicProperties();
      const match = (publicList || []).find(
        (p) => getPropertyId(p) === propertyId || p.id === propertyId || p.propertyId === propertyId
      );
      if (match) {
        match.id = getPropertyId(match);
        return match;
      }
    } catch {
      // ignore fallback error and throw original error
    }
    throw err;
  }
  throw new Error("Property not found");
}

export async function getMyProperties(): Promise<Property[]> {
  const list = await apiFetch<Property[]>("/api/properties/mine");
  return (list || []).map((p) => ({ ...p, id: getPropertyId(p) }));
}

export async function createProperty(data: Partial<Property>): Promise<any> {
  const res = await apiFetch<any>("/api/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res) {
    res.id = getPropertyId(res);
  }
  return res;
}

export async function updateProperty(propertyId: string, data: Partial<Property>): Promise<any> {
  const res = await apiFetch<any>(`/api/properties/${propertyId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (res) {
    res.id = getPropertyId(res);
  }
  return res;
}

export async function deleteProperty(propertyId: string): Promise<any> {
  return apiFetch<any>(`/api/properties/${propertyId}`, {
    method: "DELETE",
  });
}

// ==========================================
// BOOKINGS
// ==========================================
export async function createBooking(data: {
  propertyId: string;
  bookingType: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  guestName?: string;
  contactPhone?: string;
  inventoryUnitId?: string;
  occupancyType?: string;
  roomTypeId?: string;
  occupancyOptionName?: string;
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
export async function checkPropertyAvailability(
  propertyId: string,
  params: {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    bookingType?: string;
    inventoryUnitId?: string;
    occupancyType?: string;
    roomTypeId?: string;
  }
): Promise<{ available: boolean; reason?: string }> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.startTime) query.set("startTime", params.startTime);
  if (params.endTime) query.set("endTime", params.endTime);
  if (params.bookingType) query.set("bookingType", params.bookingType);
  if (params.inventoryUnitId) query.set("inventoryUnitId", params.inventoryUnitId);
  if (params.occupancyType) query.set("occupancyType", params.occupancyType);
  if (params.roomTypeId) query.set("roomTypeId", params.roomTypeId);

  return apiFetch<{ available: boolean; reason?: string }>(`/api/properties/${propertyId}/availability?${query.toString()}`);
}

export async function getInventoryUnits(propertyId: string): Promise<any[]> {
  return apiFetch<any[]>(`/api/properties/${propertyId}/inventory`);
}

export async function createConversation(data: { propertyId: string; bookingId?: string; participantId?: string }): Promise<Conversation> {
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

export interface SendMessageOptions {
  messageType?: string;
  visitorPhone?: string;
}

export async function sendMessage(
  conversationId: string,
  text: string,
  options?: SendMessageOptions
): Promise<Message> {
  return apiFetch<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: text,
      text,
      messageType: options?.messageType,
      visitorPhone: options?.visitorPhone,
    }),
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
  try {
    return await apiFetch<Review[]>(`/api/reviews/property/${propertyId}`);
  } catch {
    return [];
  }
}

export async function getMyReviews(): Promise<Review[]> {
  return apiFetch<Review[]>("/api/reviews/me");
}

// ==========================================
// ADMIN API
// ==========================================
function buildQueryString(params?: Record<string, any>): string {
  if (!params) return "";
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      clean[k] = String(v);
    }
  });
  const str = new URLSearchParams(clean).toString();
  return str ? `?${str}` : "";
}

export async function getAdminSummary(): Promise<AdminDashboardSummary> {
  return apiFetch<AdminDashboardSummary>("/api/admin/dashboard/summary");
}

export async function getAdminActivities(): Promise<any[]> {
  try {
    return await apiFetch<any[]>("/api/admin/activities");
  } catch {
    return [];
  }
}

export async function listAdminUsers(params?: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = buildQueryString(params);
  return apiFetch(`/api/admin/users${query}`);
}

export async function updateAdminUserStatus(userId: string, status: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/status?status=${encodeURIComponent(status)}`, { method: "PUT" });
}

export async function updateAdminUserRole(userId: string, role: string): Promise<any> {
  return apiFetch(`/api/admin/users/${userId}/role?role=${encodeURIComponent(role)}`, { method: "PUT" });
}

export async function suspendAdminHost(hostId: string, reason?: string): Promise<any> {
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return apiFetch(`/api/admin/hosts/${hostId}/suspend${q}`, { method: "PUT" });
}

export async function banAdminHost(hostId: string, reason?: string): Promise<any> {
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return apiFetch(`/api/admin/hosts/${hostId}/ban${q}`, { method: "PUT" });
}

export async function reactivateAdminHost(hostId: string): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/reactivate`, { method: "PUT" });
}

export async function getHostSubscription(hostId: string): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/subscription`);
}

export async function grantHostSubscription(
  hostId: string,
  data?: { plan?: string; durationDays?: number; reason?: string }
): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/subscription/grant`, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

export async function pauseHostSubscription(hostId: string): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/subscription/pause`, { method: "PUT" });
}

export async function resumeHostSubscription(hostId: string): Promise<any> {
  return apiFetch(`/api/admin/hosts/${hostId}/subscription/resume`, { method: "PUT" });
}

export async function listAdminProperties(params?: {
  verificationStatus?: string;
  listingStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = buildQueryString(params);
  return apiFetch(`/api/admin/properties${query}`);
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

export async function updatePropertyListingStatus(
  propertyId: string,
  listingStatus: string,
  reason?: string
): Promise<any> {
  const query = reason ? `&reason=${encodeURIComponent(reason)}` : "";
  return apiFetch(
    `/api/admin/properties/${propertyId}/listing-status?listingStatus=${encodeURIComponent(listingStatus)}${query}`,
    { method: "PUT" }
  );
}

export async function listAdminHostApplications(params?: {
  verificationStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<any> {
  const query = buildQueryString(params);
  return apiFetch(`/api/admin/host-applications${query}`);
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

export async function deleteAdminUser(userId: string): Promise<any> {
  try {
    return await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
  }
}

export async function deleteAdminHost(hostId: string): Promise<any> {
  try {
    return await apiFetch(`/api/admin/hosts/${hostId}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/api/admin/hosts/${hostId}/delete`, { method: "POST" });
  }
}

export async function unbanAdminHost(hostId: string): Promise<any> {
  try {
    return await apiFetch(`/api/admin/hosts/${hostId}/unban`, { method: "PUT" });
  } catch {
    return await apiFetch(`/api/admin/hosts/${hostId}/unban`, { method: "POST" });
  }
}

export async function deleteAdminProperty(propertyId: string, reason?: string): Promise<any> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  try {
    return await apiFetch(`/api/admin/properties/${propertyId}${query}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/api/admin/properties/${propertyId}/delete${query}`, { method: "POST" });
  }
}

export async function deleteAdminHostApplication(applicationId: string): Promise<any> {
  try {
    return await apiFetch(`/api/admin/host-applications/${applicationId}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/api/admin/host-applications/${applicationId}/delete`, { method: "POST" });
  }
}

export async function deleteAdminReview(reviewId: string): Promise<any> {
  try {
    return await apiFetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/api/admin/reviews/${reviewId}/delete`, { method: "POST" });
  }
}

export async function clearAdminActivities(): Promise<any> {
  try {
    return await apiFetch("/api/admin/activities", { method: "DELETE" });
  } catch {
    try {
      return await apiFetch("/api/admin/activities/clear", { method: "POST" });
    } catch {
      return await apiFetch("/api/admin/activities/delete", { method: "POST" });
    }
  }
}

export async function createVisit(data: {
  propertyId: string;
  visitDate: string;
  timeSlot: string;
  visitorName?: string;
  notes?: string;
}): Promise<VisitBooking> {
  return apiFetch<VisitBooking>("/api/visits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyVisits(): Promise<VisitBooking[]> {
  return apiFetch<VisitBooking[]>("/api/visits/me");
}

export async function getHostVisits(): Promise<VisitBooking[]> {
  return apiFetch<VisitBooking[]>("/api/visits/host");
}

export async function getVisit(visitId: string): Promise<VisitBooking> {
  return apiFetch<VisitBooking>(`/api/visits/${visitId}`);
}

export async function cancelVisit(visitId: string): Promise<VisitBooking> {
  return apiFetch<VisitBooking>(`/api/visits/${visitId}/cancel`, {
    method: "PUT",
  });
}