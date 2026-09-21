package com.staytrack.backend.model;

import com.google.cloud.Timestamp;

import java.util.HashMap;
import java.util.Map;

public class Conversation {

    private String conversationId;
    private String customerId;
    private String hostId;
    private String propertyId;
    private String bookingId;
    private String lastMessage;
    private Timestamp lastMessageAt;
    private String lastMessageSenderId;
    private long customerUnreadCount;
    private long hostUnreadCount;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public Conversation() {
    }

    public Map<String, Object> toMap() {
        Map<String, Object> data = new HashMap<>();
        data.put("conversationId", conversationId);
        data.put("customerId", customerId);
        data.put("hostId", hostId);
        data.put("propertyId", propertyId);
        data.put("bookingId", bookingId);
        data.put("lastMessage", lastMessage);
        data.put("lastMessageAt", lastMessageAt);
        data.put("lastMessageSenderId", lastMessageSenderId);
        data.put("customerUnreadCount", customerUnreadCount);
        data.put("hostUnreadCount", hostUnreadCount);
        data.put("createdAt", createdAt);
        data.put("updatedAt", updatedAt);
        return data;
    }
}
