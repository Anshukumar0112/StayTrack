export interface VisitBooking {
  visitId: string;
  id?: string;
  referenceId: string;
  propertyId: string;
  propertyTitle: string;
  city?: string;
  area?: string;
  propertyImage?: string;
  category?: string;
  customerId: string;
  visitorName: string;
  hostId: string;
  visitDate: string;
  timeSlot: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  conversationId?: string;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
  updatedAt?: string | { _seconds: number; _nanoseconds: number };
}
