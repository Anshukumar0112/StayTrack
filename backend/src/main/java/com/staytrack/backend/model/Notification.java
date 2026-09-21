package com.staytrack.backend.model;

import java.util.HashMap;
import java.util.Map;

import com.google.cloud.firestore.DocumentSnapshot;

public class Notification {

    private String notificationId;
    private String userId;
    private String type;
    private String title;
    private String message;
    private String relatedId;
    private String relatedType;
    private boolean read;
    private String createdAt;

    public Notification() {
    }

    public Notification(
            String notificationId,
            String userId,
            String type,
            String title,
            String message,
            String relatedId,
            String relatedType,
            boolean read,
            String createdAt) {

        this.notificationId = notificationId;
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.relatedId = relatedId;
        this.relatedType = relatedType;
        this.read = read;
        this.createdAt = createdAt;
    }

    public static Notification fromDocument(DocumentSnapshot document) {

        Notification notification = new Notification();

        notification.notificationId = document.getId();
        notification.userId = stringValue(document.get("userId"));
        notification.type = stringValue(document.get("type"));
        notification.title = stringValue(document.get("title"));
        notification.message = stringValue(document.get("message"));
        notification.relatedId = stringValue(document.get("relatedId"));
        notification.relatedType = stringValue(document.get("relatedType"));

        Boolean readValue = document.getBoolean("read");
        notification.read = readValue != null && readValue;

        notification.createdAt = stringValue(document.get("createdAt"));

        return notification;
    }

    public Map<String, Object> toMap() {

        Map<String, Object> data = new HashMap<>();

        data.put("notificationId", notificationId);
        data.put("userId", userId);
        data.put("type", type);
        data.put("title", title);
        data.put("message", message);
        data.put("relatedId", relatedId);
        data.put("relatedType", relatedType);
        data.put("read", read);
        data.put("createdAt", createdAt);

        return data;
    }

    private static String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getRelatedId() {
        return relatedId;
    }

    public void setRelatedId(String relatedId) {
        this.relatedId = relatedId;
    }

    public String getRelatedType() {
        return relatedType;
    }

    public void setRelatedType(String relatedType) {
        this.relatedType = relatedType;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}