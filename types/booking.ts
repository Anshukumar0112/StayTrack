export interface Booking {
  id?: string;
  bookingId?: string;
  propertyId: string;
  propertyTitle?: string;
  userId?: string;
  customerId?: string;
  userName?: string;
  hostId: string;
  hostName?: string;
  startDate?: string;
  endDate?: string;
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
        return "Rejected by host";
      case "cancelled":
        return "Cancelled";
      case "completed":
        return "Completed";
      default:
        return status || "Unknown";
    }
  }
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
