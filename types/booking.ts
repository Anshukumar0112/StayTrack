/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Booking {
  id?: string;
  bookingId?: string;
  propertyId: string;
  propertyTitle?: string;
  propertyImage?: string;
  city?: string;
  area?: string;
  propertyType?: string;
  userId?: string;
  customerId?: string;
  userName?: string;
  guestName?: string;
  contactPhone?: string;
  hostId: string;
  hostName?: string;
  bookingType?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  amount?: number;
  totalAmount?: number;
  totalPrice?: number;
  bookingStatus?: string;
  paymentStatus?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getBookingId(b: Partial<Booking> & Record<string, any>): string {
  return b.bookingId || b.id || "";
}

export function getBookingStatus(b: Partial<Booking> & Record<string, any>): string {
  const raw = (b.bookingStatus || b.status || "").toString().toLowerCase();
  return raw;
}

export function getBookingAmount(b: Partial<Booking> & Record<string, any>): number {
  if (typeof b.amount === "number" && b.amount > 0) return b.amount;
  if (typeof b.totalAmount === "number" && b.totalAmount > 0) return b.totalAmount;
  if (typeof b.totalPrice === "number" && b.totalPrice > 0) return b.totalPrice;
  const raw = b.amount || b.totalAmount || b.totalPrice;
  if (raw) {
    const parsed = parseFloat(String(raw));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

export function getBookingStatusLabel(status: string, role?: "customer" | "host"): string {
  const s = (status || "").toLowerCase();
  if (role === "host") {
    switch (s) {
      case "requested":
        return "Pending Approval";
      case "accepted":
      case "payment_pending":
        return "Awaiting customer payment";
      case "confirmed":
        return "Confirmed booking";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled by guest";
      case "completed":
        return "Completed";
      default:
        return status || "Unknown";
    }
  } else {
    switch (s) {
      case "requested":
        return "Request sent — waiting for host";
      case "accepted":
      case "payment_pending":
        return "Accepted — payment required";
      case "confirmed":
        return "Confirmed";
      case "rejected":
        return "Declined by host";
      case "cancelled":
        return "Cancelled";
      case "completed":
        return "Completed";
      default:
        return status || "Unknown";
    }
  }
}

export function getBookingStatusBadge(status: string): { bg: string; text: string; border: string; dot: string } {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "confirmed":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "requested":
      return {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "accepted":
    case "payment_pending":
      return {
        bg: "bg-blue-50",
        text: "text-blue-800",
        border: "border-blue-200",
        dot: "bg-blue-500",
      };
    case "completed":
      return {
        bg: "bg-neutral-100",
        text: "text-neutral-700",
        border: "border-neutral-200",
        dot: "bg-neutral-400",
      };
    case "rejected":
    case "cancelled":
      return {
        bg: "bg-rose-50",
        text: "text-rose-800",
        border: "border-rose-200",
        dot: "bg-rose-500",
      };
    default:
      return {
        bg: "bg-neutral-100",
        text: "text-neutral-700",
        border: "border-neutral-200",
        dot: "bg-neutral-400",
      };
  }
}

export function getBookingStatusBadgeVariant(status: string): "verified" | "success" | "warning" | "error" | "info" | "sage" | "neutral" | "dark" {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "confirmed":
      return "success";
    case "requested":
      return "warning";
    case "accepted":
    case "payment_pending":
      return "info";
    case "completed":
      return "neutral";
    case "rejected":
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
}

export function getBookingStatusDescription(status: string, role?: "customer" | "host"): string {
  const s = (status || "").toLowerCase();
  if (role === "host") {
    switch (s) {
      case "requested":
        return "Guest has requested dates for your property. Review and approve or decline the reservation.";
      case "accepted":
      case "payment_pending":
        return "You accepted this reservation. Waiting for the guest to finalize their payment.";
      case "confirmed":
        return "Booking is locked and confirmed. Prepare accommodation for guest arrival.";
      case "rejected":
        return "You declined this booking request.";
      case "cancelled":
        return "This booking was cancelled by the guest.";
      case "completed":
        return "Stay term has finished.";
      default:
        return "Booking status update.";
    }
  } else {
    switch (s) {
      case "requested":
        return "Your reservation request has been sent to the host. No payment has been deducted.";
      case "accepted":
      case "payment_pending":
        return "The host accepted your request! Complete payment to lock in your stay.";
      case "confirmed":
        return "Your stay is confirmed! The accommodation dates are reserved.";
      case "rejected":
        return "The host was unable to accept this booking request. No payment was charged.";
      case "cancelled":
        return "This booking was cancelled. Accommodation dates have been released.";
      case "completed":
        return "Your stay is complete. Thank you for traveling with StayTrack!";
      default:
        return "Reservation details.";
    }
  }
}

export function isBookingCancellable(b: Partial<Booking> & Record<string, any>): boolean {
  const st = getBookingStatus(b);
  if (st === "completed" || st === "cancelled" || st === "rejected") {
    return false;
  }
  if (b.startDate) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(b.startDate);
      if (start < today) {
        return false;
      }
      if (start.getTime() === today.getTime() && b.bookingType !== "hourly") {
        return false;
      }
      if (start.getTime() === today.getTime() && b.bookingType === "hourly" && b.startTime) {
        const [hours, minutes] = b.startTime.split(":").map(Number);
        const now = new Date();
        const startTimeDate = new Date();
        startTimeDate.setHours(hours, minutes, 0, 0);
        if (now >= startTimeDate) {
          return false;
        }
      }
    } catch {
      return true;
    }
  }
  return true;
}

export function calculateStayDuration(b: Partial<Booking> & Record<string, any>): string {
  const type = (b.bookingType || "daily").toLowerCase();
  if (type === "hourly") {
    if (b.startTime && b.endTime) {
      try {
        const [sh, sm] = b.startTime.split(":").map(Number);
        const [eh, em] = b.endTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const diffHours = Math.max(1, Math.round((endMin - startMin) / 60));
        return `${diffHours} ${diffHours === 1 ? "Hour" : "Hours"}`;
      } catch {
        return "Hourly Transit";
      }
    }
    return "Hourly Transit";
  }

  if (b.startDate && b.endDate) {
    try {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      if (type === "monthly") {
        const months = Math.max(1, Math.ceil(diffDays / 30));
        return `${months} ${months === 1 ? "Month" : "Months"}`;
      }
      return `${diffDays} ${diffDays === 1 ? "Night" : "Nights"}`;
    } catch {
      return type === "monthly" ? "1 Month" : "1 Night";
    }
  }

  return type === "monthly" ? "Monthly Stay" : "Daily Stay";
}

export interface Conversation {
  id?: string;
  conversationId?: string;
  customerId?: string;
  hostId?: string;
  participantIds?: string[];
  propertyId?: string;
  propertyTitle?: string;
  bookingId?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export function getConversationId(c: Partial<Conversation> & Record<string, any>): string {
  return c.conversationId || c.id || "";
}

export interface Message {
  id?: string;
  messageId?: string;
  conversationId?: string;
  senderId?: string;
  senderRole?: string;
  text?: string;
  content?: string;
  timestamp?: any;
  createdAt?: any;
  read?: boolean;
}

export function formatTimestamp(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    return new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (typeof val === "object") {
    if (typeof val.seconds === "number") {
      return new Date(val.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (typeof val._seconds === "number") {
      return new Date(val._seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  return "";
}

export function getMessageText(m: Partial<Message> & Record<string, any>): string {
  return m.content || m.text || "";
}

export function getMessageId(m: Partial<Message> & Record<string, any>): string {
  return m.messageId || m.id || "";
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
