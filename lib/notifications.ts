import { Notification, getNotificationId, getNotificationBody, getNotificationRelatedId } from "@/types/booking";

export type NotificationCategory = "all" | "booking" | "message" | "payment" | "property" | "system";

/**
 * Formats relative timestamp for notifications (e.g., "Just now", "5m ago", "3h ago", "2d ago", or "Oct 22")
 */
export function formatNotificationTime(dateStr?: string): string {
  if (!dateStr) return "Recent";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

/**
 * Resolves destination URL based on notification type and related entities.
 */
export function getNotificationDestination(
  notification: Partial<Notification> & Record<string, any>,
  isHost: boolean = false
): string | null {
  const relatedId = getNotificationRelatedId(notification);
  const relatedType = (notification.relatedType || "").toLowerCase();
  const rawType = (notification.type || "").toLowerCase();
  const title = (notification.title || "").toLowerCase();

  // 1. BOOKINGS & STAYS
  if (
    relatedType === "booking" ||
    rawType.includes("booking") ||
    title.includes("booking") ||
    title.includes("reservation")
  ) {
    if (isHost) {
      return relatedId ? `/host/bookings/${relatedId}` : "/host/bookings";
    }
    return relatedId ? `/trips/${relatedId}` : "/trips";
  }

  // 2. MESSAGES & CHAT
  if (
    relatedType === "message" ||
    relatedType === "conversation" ||
    rawType.includes("message") ||
    rawType.includes("chat") ||
    title.includes("message")
  ) {
    if (isHost) {
      return "/host/messages";
    }
    return relatedId ? `/chat/${relatedId}` : "/chat";
  }

  // 3. PROPERTIES & LISTINGS
  if (
    relatedType === "property" ||
    rawType.includes("property") ||
    title.includes("property") ||
    title.includes("listing")
  ) {
    if (isHost) {
      return relatedId ? `/host/properties/${relatedId}` : "/host/properties";
    }
    return relatedId ? `/properties/${relatedId}` : "/search";
  }

  // 4. VISITS / TOURS
  if (relatedType === "visit" || rawType.includes("visit") || title.includes("visit")) {
    return isHost ? "/host/bookings" : "/trips";
  }

  // 5. PAYMENTS & EARNINGS
  if (
    rawType.includes("payment") ||
    rawType.includes("payout") ||
    rawType.includes("wallet") ||
    title.includes("payout") ||
    title.includes("payment")
  ) {
    return isHost ? "/host/earnings" : "/trips";
  }

  // 6. SUBSCRIPTION
  if (rawType.includes("subscription") || title.includes("subscription")) {
    return "/host/subscription";
  }

  // 7. REVIEWS
  if (rawType.includes("review") || title.includes("review")) {
    return isHost ? "/host/reviews" : "/trips";
  }

  return null;
}

/**
 * Categorizes a notification into a high-level bucket for filtering.
 */
export function getNotificationCategory(
  notification: Partial<Notification> & Record<string, any>
): NotificationCategory {
  const relatedType = (notification.relatedType || "").toLowerCase();
  const rawType = (notification.type || "").toLowerCase();
  const title = (notification.title || "").toLowerCase();

  if (
    relatedType === "booking" ||
    rawType.includes("booking") ||
    title.includes("booking") ||
    title.includes("reservation") ||
    relatedType === "visit" ||
    rawType.includes("visit")
  ) {
    return "booking";
  }

  if (
    relatedType === "message" ||
    relatedType === "conversation" ||
    rawType.includes("message") ||
    rawType.includes("chat") ||
    title.includes("message")
  ) {
    return "message";
  }

  if (
    rawType.includes("payment") ||
    rawType.includes("payout") ||
    rawType.includes("wallet") ||
    rawType.includes("subscription") ||
    title.includes("payout") ||
    title.includes("payment") ||
    title.includes("subscription")
  ) {
    return "payment";
  }

  if (
    relatedType === "property" ||
    rawType.includes("property") ||
    title.includes("property") ||
    title.includes("listing")
  ) {
    return "property";
  }

  return "system";
}
