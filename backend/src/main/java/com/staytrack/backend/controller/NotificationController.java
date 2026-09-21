package com.staytrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:3000")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(
            NotificationService notificationService) {

        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyNotifications(
            @RequestParam(required = false) Integer limit) {

        String userId = SecurityUtils.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getMyNotifications(
                        userId,
                        limit
                )
        );
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Map<String, Object>>> getUnreadNotifications(
            @RequestParam(required = false) Integer limit) {

        String userId = SecurityUtils.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getMyUnreadNotifications(
                        userId,
                        limit
                )
        );
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {

        String userId = SecurityUtils.getCurrentUserId();

        long count =
                notificationService.getUnreadCount(userId);

        return ResponseEntity.ok(
                Map.of(
                        "count",
                        count
                )
        );
    }

    @GetMapping("/{notificationId}")
    public ResponseEntity<Map<String, Object>> getNotification(
            @PathVariable String notificationId) {

        String userId = SecurityUtils.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getMyNotification(
                        userId,
                        notificationId
                )
        );
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable String notificationId) {

        String userId = SecurityUtils.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAsRead(
                        userId,
                        notificationId
                )
        );
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {

        String userId = SecurityUtils.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAllAsRead(userId)
        );
    }
}