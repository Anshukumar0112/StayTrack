package com.staytrack.backend.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.model.Notification;
import com.staytrack.backend.repository.NotificationRepository;

@Service
public class NotificationService {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository) {

        this.notificationRepository = notificationRepository;
    }

    /**
     * Creates a notification for a user.
     *
     * This method is intended for internal backend use.
     */
    public Map<String, Object> createNotification(
            String userId,
            String type,
            String title,
            String message,
            String relatedId,
            String relatedType) {

        validateRequired(userId, "userId");
        validateRequired(type, "type");
        validateRequired(title, "title");
        validateRequired(message, "message");

        if (title.length() > 200) {
            throw new IllegalArgumentException(
                    "Notification title cannot exceed 200 characters"
            );
        }

        if (message.length() > 1000) {
            throw new IllegalArgumentException(
                    "Notification message cannot exceed 1000 characters"
            );
        }

        if (type.length() > 100) {
            throw new IllegalArgumentException(
                    "Notification type cannot exceed 100 characters"
            );
        }

        if (relatedId == null) {
            relatedId = "";
        }

        if (relatedType == null) {
            relatedType = "";
        }

        String notificationId = UUID.randomUUID().toString();

        Notification notification = new Notification(
                notificationId,
                userId,
                type.trim(),
                title.trim(),
                message.trim(),
                relatedId.trim(),
                relatedType.trim(),
                false,
                Instant.now().toString()
        );

        notificationRepository.create(
                notificationId,
                notification
        );

        return notification.toMap();
    }

    /**
     * Returns the authenticated user's notifications.
     */
    public List<Map<String, Object>> getMyNotifications(
            String userId,
            Integer requestedLimit) {

        validateRequired(userId, "userId");

        int limit = normalizeLimit(requestedLimit);

        List<QueryDocumentSnapshot> documents =
                notificationRepository.findByUserId(
                        userId,
                        limit
                );

        return documents.stream()
                .map(Notification::fromDocument)
                .map(Notification::toMap)
                .toList();
    }

    /**
     * Returns unread notifications belonging to the authenticated user.
     */
    public List<Map<String, Object>> getMyUnreadNotifications(
            String userId,
            Integer requestedLimit) {

        validateRequired(userId, "userId");

        int limit = normalizeLimit(requestedLimit);

        List<QueryDocumentSnapshot> documents =
                notificationRepository.findUnreadByUserId(
                        userId,
                        limit
                );

        return documents.stream()
                .map(Notification::fromDocument)
                .map(Notification::toMap)
                .toList();
    }

    /**
     * Returns a single notification after verifying ownership.
     */
    public Map<String, Object> getMyNotification(
            String userId,
            String notificationId) {

        validateRequired(userId, "userId");
        validateRequired(notificationId, "notificationId");

        DocumentSnapshot document =
                notificationRepository.findById(notificationId);

        if (!document.exists()) {
            throw new IllegalArgumentException(
                    "Notification not found"
            );
        }

        Notification notification =
                Notification.fromDocument(document);

        if (!userId.equals(notification.getUserId())) {
            throw new SecurityException(
                    "You are not allowed to access this notification"
            );
        }

        return notification.toMap();
    }

    /**
     * Marks one notification as read after verifying ownership.
     */
    public Map<String, Object> markAsRead(
            String userId,
            String notificationId) {

        validateRequired(userId, "userId");
        validateRequired(notificationId, "notificationId");

        DocumentSnapshot document =
                notificationRepository.findById(notificationId);

        if (!document.exists()) {
            throw new IllegalArgumentException(
                    "Notification not found"
            );
        }

        Notification notification =
                Notification.fromDocument(document);

        if (!userId.equals(notification.getUserId())) {
            throw new SecurityException(
                    "You are not allowed to modify this notification"
            );
        }

        if (!notification.isRead()) {
            notificationRepository.markAsRead(notificationId);
        }

        notification.setRead(true);

        return notification.toMap();
    }

    /**
     * Marks all notifications belonging to the authenticated user as read.
     */
    public Map<String, Object> markAllAsRead(String userId) {

        validateRequired(userId, "userId");

        notificationRepository.markAllAsRead(userId);

        Map<String, Object> response = new HashMap<>();

        response.put("success", true);
        response.put("message", "All notifications marked as read");

        return response;
    }

    /**
     * Counts unread notifications for the authenticated user.
     */
    public long getUnreadCount(String userId) {

        validateRequired(userId, "userId");

        List<QueryDocumentSnapshot> documents =
                notificationRepository.findUnreadByUserId(
                        userId,
                        MAX_LIMIT
                );

        return documents.size();
    }

    private int normalizeLimit(Integer requestedLimit) {

        if (requestedLimit == null) {
            return DEFAULT_LIMIT;
        }

        if (requestedLimit < 1) {
            throw new IllegalArgumentException(
                    "Limit must be at least 1"
            );
        }

        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private void validateRequired(
            String value,
            String fieldName) {

        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    fieldName + " is required"
            );
        }
    }
}