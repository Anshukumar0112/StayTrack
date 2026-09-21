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
