package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.visit.VisitRequest;
import com.staytrack.backend.repository.ConversationRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.repository.VisitRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VisitService {

    private final VisitRepository visitRepository;
    private final PropertyRepository propertyRepository;
    private final ConversationRepository conversationRepository;
    private final NotificationService notificationService;

    public VisitService(
            VisitRepository visitRepository,
            PropertyRepository propertyRepository,
            ConversationRepository conversationRepository,
            NotificationService notificationService
    ) {
        this.visitRepository = visitRepository;
        this.propertyRepository = propertyRepository;
        this.conversationRepository = conversationRepository;
        this.notificationService = notificationService;
    }

    public Map<String, Object> createVisit(
            AuthenticatedUser user,
            VisitRequest request
    ) {
        if (user == null || user.getUid() == null || user.getUid().isBlank()) {
            throw new SecurityException("Authentication is required to schedule a visit");
        }

        if (request == null) {
            throw new IllegalArgumentException("Visit request payload is required");
        }

        if (request.getPropertyId() == null || request.getPropertyId().isBlank()) {
            throw new IllegalArgumentException("Property ID is required");
        }

        if (request.getVisitDate() == null || request.getVisitDate().isBlank()) {
            throw new IllegalArgumentException("Visit date is required");
        }

        if (request.getTimeSlot() == null || request.getTimeSlot().isBlank()) {
            throw new IllegalArgumentException("Visit time slot is required");
        }

        String propertyId = request.getPropertyId().trim();
        try {
            DocumentSnapshot propDoc = propertyRepository.findById(propertyId);
            if (!propDoc.exists()) {
                throw new RuntimeException("Property not found");
            }

            Map<String, Object> propData = propDoc.getData();
            if (propData == null) {
                throw new RuntimeException("Property data is empty");
            }

            String verificationStatus = String.valueOf(propData.getOrDefault("verificationStatus", ""));
            String listingStatus = String.valueOf(propData.getOrDefault("listingStatus", ""));
            if (!"approved".equalsIgnoreCase(verificationStatus) || !"active".equalsIgnoreCase(listingStatus)) {
                throw new RuntimeException("Property is not available for visit scheduling");
            }

            String cat = String.valueOf(propData.getOrDefault("category", ""));
            if (cat.isBlank()) {
                cat = String.valueOf(propData.getOrDefault("propertyType", ""));
            }
            String catUpper = cat.trim().toUpperCase();
            if ("HOTEL".equals(catUpper) || "BNB".equals(catUpper) || "B&B".equals(catUpper)
                    || "BED_AND_BREAKFAST".equals(catUpper) || "VACATIONSTAY".equals(catUpper)
                    || "VACATION_STAY".equals(catUpper)) {
                throw new IllegalArgumentException("In-person visits are not available for Hotel and B&B accommodations");
            }

            String hostId = String.valueOf(propData.getOrDefault("hostId", ""));
            if (hostId.isBlank()) {
                throw new RuntimeException("Property host is missing");
            }

            if (hostId.equals(user.getUid())) {
                throw new SecurityException("You cannot schedule a visit for your own property");
            }

            String visitId = UUID.randomUUID().toString();
            String referenceId = "VIS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Timestamp now = Timestamp.now();

            String visitorName = request.getVisitorName() != null && !request.getVisitorName().isBlank()
                    ? request.getVisitorName().trim()
                    : "Guest";

            String propertyTitle = String.valueOf(propData.getOrDefault("title", ""));
            if (propertyTitle.isBlank()) {
                propertyTitle = String.valueOf(propData.getOrDefault("name", "Accommodation"));
            }

            String propertyImage = "";
            Object imagesObj = propData.get("images");
            if (imagesObj instanceof List && !((List<?>) imagesObj).isEmpty()) {
                propertyImage = String.valueOf(((List<?>) imagesObj).get(0));
            } else if (propData.get("imageUrl") != null) {
                propertyImage = String.valueOf(propData.get("imageUrl"));
            }

            // Establish conversation if not already created
            String conversationId = ConversationRepository.buildConversationId(
                    user.getUid(),
                    hostId,
                    propertyId
            );

            try {
                DocumentSnapshot existingConv = conversationRepository.findById(conversationId);
                if (!existingConv.exists()) {
                    Map<String, Object> convData = new HashMap<>();
                    convData.put("conversationId", conversationId);
                    convData.put("customerId", user.getUid());
                    convData.put("hostId", hostId);
                    convData.put("propertyId", propertyId);
                    convData.put("lastMessage", "[SCHEDULED VISIT REQUEST]");
                    convData.put("lastMessageAt", now);
                    convData.put("lastMessageSenderId", user.getUid());
                    convData.put("customerUnreadCount", 0L);
                    convData.put("hostUnreadCount", 1L);
                    convData.put("createdAt", now);
                    convData.put("updatedAt", now);
                    conversationRepository.create(conversationId, convData);
                }

                // Post visit inquiry into chat (no personal phone number)
                String messageId = UUID.randomUUID().toString();
                String visitNotes = request.getNotes() != null && !request.getNotes().isBlank()
                        ? request.getNotes().trim()
                        : "No additional notes";

                String messageContent = "[SCHEDULED VISIT REQUEST]\n" +
                        "Date: " + request.getVisitDate().trim() + "\n" +
                        "Time: " + request.getTimeSlot().trim() + "\n" +
                        "Visitor Name: " + visitorName + "\n" +
                        "Visit Reference: " + referenceId + "\n" +
                        "Notes: " + visitNotes;

                Map<String, Object> message = new HashMap<>();
                message.put("messageId", messageId);
                message.put("conversationId", conversationId);
                message.put("senderId", user.getUid());
                message.put("senderRole", user.getRole() != null ? user.getRole().toLowerCase() : "customer");
                message.put("content", messageContent);
                message.put("messageType", "visit_request");
                message.put("createdAt", now);

                conversationRepository.addMessage(conversationId, messageId, message);

                Map<String, Object> convUpdates = new HashMap<>();
                convUpdates.put("lastMessage", "[SCHEDULED VISIT REQUEST] " + request.getVisitDate().trim() + " " + request.getTimeSlot().trim());
                convUpdates.put("lastMessageAt", now);
                convUpdates.put("lastMessageSenderId", user.getUid());
                conversationRepository.update(conversationId, convUpdates);
            } catch (Exception ignored) {
                // Keep visit booking valid even if optional chat thread logging encounters an error
            }

            // Notify host
            try {
                notificationService.createNotification(
                        hostId,
                        "VISIT_SCHEDULED",
                        "New In-Person Visit Scheduled",
                        visitorName + " scheduled a visit for " + propertyTitle + " on " + request.getVisitDate().trim() + " (" + request.getTimeSlot().trim() + ").",
                        visitId,
                        "visit"
                );
            } catch (Exception ignored) {
            }

            // Create visit booking document
            Map<String, Object> visit = new HashMap<>();
            visit.put("visitId", visitId);
            visit.put("id", visitId);
            visit.put("referenceId", referenceId);
            visit.put("propertyId", propertyId);
            visit.put("propertyTitle", propertyTitle);
            visit.put("city", String.valueOf(propData.getOrDefault("city", "")));
            visit.put("area", String.valueOf(propData.getOrDefault("area", "")));
            visit.put("propertyImage", propertyImage);
            visit.put("category", catUpper);
            visit.put("customerId", user.getUid());
            visit.put("visitorName", visitorName);
            visit.put("hostId", hostId);
            visit.put("visitDate", request.getVisitDate().trim());
            visit.put("timeSlot", request.getTimeSlot().trim());
            visit.put("notes", request.getNotes() != null ? request.getNotes().trim() : "");
            visit.put("status", "scheduled");
            visit.put("conversationId", conversationId);
            visit.put("createdAt", now);
            visit.put("updatedAt", now);

            visitRepository.save(visitId, visit);
            return visit;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Unable to schedule visit: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getMyVisits(AuthenticatedUser user) {
        if (user == null || user.getUid() == null || user.getUid().isBlank()) {
            throw new SecurityException("Authentication required");
        }

        List<QueryDocumentSnapshot> docs = visitRepository.findByCustomerId(user.getUid());
        List<Map<String, Object>> visits = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Map<String, Object> data = doc.getData();
            data.put("visitId", doc.getId());
            data.put("id", doc.getId());
            visits.add(data);
        }
        return visits;
    }

    public List<Map<String, Object>> getHostVisits(AuthenticatedUser user) {
        if (user == null || user.getUid() == null || user.getUid().isBlank()) {
            throw new SecurityException("Authentication required");
        }

        List<QueryDocumentSnapshot> docs = visitRepository.findByHostId(user.getUid());
        List<Map<String, Object>> visits = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Map<String, Object> data = doc.getData();
            data.put("visitId", doc.getId());
            data.put("id", doc.getId());
            visits.add(data);
        }
        return visits;
    }

    public Map<String, Object> getVisit(AuthenticatedUser user, String visitId) {
        if (user == null || user.getUid() == null || user.getUid().isBlank()) {
            throw new SecurityException("Authentication required");
        }

        if (visitId == null || visitId.isBlank()) {
            throw new IllegalArgumentException("Visit ID is required");
        }

        DocumentSnapshot doc = visitRepository.findById(visitId);
        if (!doc.exists()) {
            throw new RuntimeException("Visit booking not found");
        }

        Map<String, Object> visit = doc.getData();
        if (visit == null) {
            throw new RuntimeException("Visit booking data is empty");
        }

        String customerId = String.valueOf(visit.getOrDefault("customerId", ""));
        String hostId = String.valueOf(visit.getOrDefault("hostId", ""));
        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());
        boolean isOwner = user.getUid().equals(customerId);
        boolean isHost = user.getUid().equals(hostId);

        if (!isAdmin && !isOwner && !isHost) {
            throw new SecurityException("You do not have access to this visit booking");
        }

        visit.put("visitId", doc.getId());
        visit.put("id", doc.getId());
        return visit;
    }

    public Map<String, Object> cancelVisit(AuthenticatedUser user, String visitId) {
        if (user == null || user.getUid() == null || user.getUid().isBlank()) {
            throw new SecurityException("Authentication required");
        }

        Map<String, Object> visit = getVisit(user, visitId);
        Timestamp now = Timestamp.now();

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", "cancelled");
        updates.put("updatedAt", now);

        visitRepository.update(visitId, updates);
        visit.put("status", "cancelled");
        visit.put("updatedAt", now);
        return visit;
    }
}
