package com.staytrack.backend.model;

import com.google.cloud.Timestamp;

import java.util.HashMap;
import java.util.Map;

public class Message {

    private String messageId;
    private String conversationId;
    private String senderId;
    private String senderRole;
    private String content;
    private Timestamp createdAt;

    public Message() {
    }

    public Map<String, Object> toMap() {
        Map<String, Object> data = new HashMap<>();
        data.put("messageId", messageId);
        data.put("conversationId", conversationId);
        data.put("senderId", senderId);
        data.put("senderRole", senderRole);
        data.put("content", content);
        data.put("createdAt", createdAt);
        return data;
    }
}
