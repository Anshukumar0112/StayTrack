package com.staytrack.backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.host.HostApplicationRequest;
import com.staytrack.backend.repository.HostApplicationRepository;
import com.staytrack.backend.repository.UserRepository;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class HostApplicationService {

    private final HostApplicationRepository hostApplicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public HostApplicationService(
            HostApplicationRepository hostApplicationRepository,
            UserRepository userRepository,
            NotificationService notificationService) {

        this.hostApplicationRepository =
                hostApplicationRepository;

        this.userRepository =
                userRepository;

        this.notificationService =
                notificationService;
    }

    public Map<String, Object> submitApplication(
            AuthenticatedUser user,
            HostApplicationRequest request) {

        if (user == null ||
                user.getUid() == null ||
                user.getUid().isBlank()) {

            throw new SecurityException(
                    "Authentication required"
            );
        }

        validateApplication(request);

        try {

            String userId =
                    user.getUid();

            DocumentSnapshot existing =
                    hostApplicationRepository.findById(
                            userId
                    );

            if (existing.exists()) {

                String status =
                        existing.getString(
                                "verificationStatus"
                        );

                if ("pending".equalsIgnoreCase(status) ||
                        "approved".equalsIgnoreCase(status)) {

                    throw new RuntimeException(
                            "You already have an active host application"
                    );
                }
            }

            DocumentSnapshot userDocument =
                    userRepository.findById(userId);

            if (!userDocument.exists()) {
                throw new RuntimeException(
                        "User profile not found"
                );
            }

            String currentRole =
                    userDocument.getString("role");

            if ("host".equalsIgnoreCase(currentRole)) {
                throw new RuntimeException(
                        "User is already a host"
                );
            }

            if ("admin".equalsIgnoreCase(currentRole)) {
                throw new RuntimeException(
                        "Admin users cannot submit host applications"
                );
            }

            Map<String, Object> application =
                    new HashMap<>();

            Timestamp now =
                    Timestamp.now();

            application.put(
                    "userId",
                    userId
            );

            application.put(
                    "hostType",
                    request.getHostType().trim().toLowerCase()
            );

            application.put(
                    "applicantName",
                    request.getApplicantName().trim()
            );

            application.put(
                    "email",
                    request.getEmail() != null
                            ? request.getEmail().trim()
                            : ""
            );

            application.put(
                    "phone",
                    user.getPhone()
            );

            application.put(
                    "verificationStatus",
                    "pending"
            );

            Map<String, Object> docsMap = new HashMap<>();
            if (request.getDocumentType() != null && !request.getDocumentType().isBlank()) {
                Map<String, Object> docDetail = new HashMap<>();
                docDetail.put("documentType", request.getDocumentType().trim());
                docDetail.put("storagePath", request.getStoragePath() != null ? request.getStoragePath().trim() : "");
                docDetail.put("fileName", request.getFileName() != null ? request.getFileName().trim() : "");
                docDetail.put("uploadedAt", now);
                docsMap.put(request.getDocumentType().trim().toLowerCase(), docDetail);
            }

            application.put(
                    "documents",
                    docsMap
            );

            application.put(
                    "rejectionReason",
                    ""
            );

            application.put(
                    "adminNote",
                    ""
            );

            application.put(
                    "submittedAt",
                    now
            );

            application.put(
                    "updatedAt",
                    now
            );

            hostApplicationRepository.create(
                    userId,
                    application
            );

            notifyAdminsOfNewApplication(
                    userId,
                    request.getApplicantName().trim()
            );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "message",
                    "Host application submitted successfully"
            );

            response.put(
                    "applicationId",
                    userId
            );

            response.put(
                    "verificationStatus",
                    "pending"
            );

            return response;

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to submit host application",
                    e
            );
        }
    }

    public Map<String, Object> getMyApplication(
            AuthenticatedUser user) {

        if (user == null ||
                user.getUid() == null ||
                user.getUid().isBlank()) {

            throw new com.staytrack.backend.exception.UnauthorizedException(
                    "Authentication required"
            );
        }

        try {

            DocumentSnapshot document =
                    hostApplicationRepository.findById(
                            user.getUid()
                    );

            if (document == null || !document.exists()) {
                Map<String, Object> notFoundResponse = new HashMap<>();
                notFoundResponse.put("exists", false);
                notFoundResponse.put("verificationStatus", "none");
                return notFoundResponse;
            }

            return documentToMap(document);

        } catch (Exception e) {
            Map<String, Object> fallbackResponse = new HashMap<>();
            fallbackResponse.put("exists", false);
            fallbackResponse.put("verificationStatus", "none");
            return fallbackResponse;
        }
    }

    private void notifyAdminsOfNewApplication(
            String applicantUserId,
            String applicantName) {

        try {

            Firestore db =
                    FirestoreClient.getFirestore();

            List<QueryDocumentSnapshot> admins =
                    db.collection("users")
                            .whereEqualTo("role", "admin")
                            .get()
                            .get()
                            .getDocuments();

            for (QueryDocumentSnapshot admin :
                    admins) {

                String adminId =
                        admin.getId();

                if (adminId.equals(applicantUserId)) {
                    continue;
                }

                notificationService.createNotification(
                        adminId,
                        "HOST_APPLICATION_SUBMITTED",
                        "New host application",
                        applicantName
                                + " has submitted a host application for verification.",
                        applicantUserId,
                        "hostApplication"
                );
            }

        } catch (Exception e) {

            /*
             * The application has already been saved.
             * Notification delivery must not make the
             * host application submission fail.
             */
        }
    }

    private Map<String, Object> documentToMap(
            DocumentSnapshot document) {

        Map<String, Object> applicationData = document.getData();

        if (applicationData == null) {
            throw new RuntimeException(
                    "Host application is empty"
            );
        }

        Map<String, Object> application = new HashMap<>(applicationData);

        application.put(
                "applicationId",
                document.getId()
        );

        application.put(
                "id",
                document.getId()
        );

        application.put(
                "exists",
                true
        );

        for (Map.Entry<String, Object> entry : application.entrySet()) {
            if (entry.getValue() instanceof Timestamp timestamp) {
                entry.setValue(timestamp.toDate().toInstant().toString());
            }
        }

        return application;
    }

    private void validateApplication(
            HostApplicationRequest request) {

        if (request == null) {
            throw new RuntimeException(
                    "Application data is required"
            );
        }

        if (request.getHostType() == null ||
                request.getHostType().isBlank()) {

            throw new RuntimeException(
                    "Host type is required"
            );
        }

        if (request.getApplicantName() == null ||
                request.getApplicantName().isBlank()) {

            throw new RuntimeException(
                    "Applicant name is required"
            );
        }

        if (!isValidHostType(
                request.getHostType())) {

            throw new RuntimeException(
                    "Invalid host type"
            );
        }
    }

    private boolean isValidHostType(
            String hostType) {

        return switch (
                hostType.toLowerCase()
        ) {
            case "property_owner",
                 "dealer_broker",
                 "hotel_owner",
                 "pg_owner",
                 "property_manager",
                 "other" -> true;

            default -> false;
        };
    }
}
