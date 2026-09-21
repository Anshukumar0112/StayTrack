package com.staytrack.backend.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.repository.HostApplicationRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.repository.UserRepository;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class AdminService {

    private final PropertyRepository propertyRepository;
    private final HostApplicationRepository hostApplicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public AdminService(
            PropertyRepository propertyRepository,
            HostApplicationRepository hostApplicationRepository,
            UserRepository userRepository,
            NotificationService notificationService) {

        this.propertyRepository = propertyRepository;
        this.hostApplicationRepository = hostApplicationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    // =========================================================
    // ADMIN DASHBOARD
    // =========================================================

    /**
     * Returns read-only summary information for the admin dashboard.
     *
     * Counts are calculated from the current Firestore data.
     * This endpoint does not expose individual user/payment data
     * and does not modify any documents.
     */
    public Map<String, Object> getDashboardSummary(
            AuthenticatedUser admin) {

        requireAdmin(admin);

        try {
            Firestore db =
                    FirestoreClient.getFirestore();

            Map<String, Object> result =
                    new HashMap<>();

            int totalUsers = 0;
            int customers = 0;
            int hosts = 0;
            int activeUsers = 0;
            int inactiveUsers = 0;

            for (DocumentSnapshot document :
                    db.collection("users").get().get().getDocuments()) {

                if (!document.exists()) {
                    continue;
                }

                totalUsers++;

                String role =
                        getStringField(document, "role");

                String status =
                        getStringField(document, "status");

                if ("customer".equalsIgnoreCase(role)) {
                    customers++;
                } else if ("host".equalsIgnoreCase(role)) {
                    hosts++;
                }

                if ("active".equalsIgnoreCase(status)) {
                    activeUsers++;
                } else if ("inactive".equalsIgnoreCase(status)) {
                    inactiveUsers++;
                }
            }

            int pendingHostApplications = 0;

            for (DocumentSnapshot document :
                    db.collection("hostApplications")
                            .whereEqualTo(
                                    "verificationStatus",
                                    "pending"
                            )
                            .get()
                            .get()
                            .getDocuments()) {

                if (document.exists()) {
                    pendingHostApplications++;
                }
            }

            int pendingProperties = 0;

            for (DocumentSnapshot document :
                    db.collection("properties")
                            .whereEqualTo(
                                    "verificationStatus",
                                    "pending"
                            )
                            .get()
                            .get()
                            .getDocuments()) {

                if (document.exists()) {
                    pendingProperties++;
                }
            }

            int activeProperties = 0;

            for (DocumentSnapshot document :
                    db.collection("properties")
                            .whereEqualTo(
                                    "verificationStatus",
                                    "approved"
                            )
                            .whereEqualTo(
                                    "listingStatus",
                                    "active"
                            )
                            .get()
                            .get()
                            .getDocuments()) {

                if (document.exists()) {
                    activeProperties++;
                }
            }

            result.put(
                    "totalUsers",
                    totalUsers
            );

            result.put(
                    "customers",
                    customers
            );

            result.put(
                    "hosts",
                    hosts
            );

            result.put(
                    "activeUsers",
                    activeUsers
            );

            result.put(
                    "inactiveUsers",
                    inactiveUsers
            );

            result.put(
                    "pendingHostApplications",
                    pendingHostApplications
            );

            result.put(
                    "pendingProperties",
                    pendingProperties
            );

            result.put(
                    "activeProperties",
                    activeProperties
            );

            result.put(
                    "generatedAt",
                    Timestamp.now()
            );

            return result;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get admin dashboard summary",
                    e
            );
        }
    }

    // =========================================================
    // USER MANAGEMENT
    // =========================================================

    /**
     * List users for the admin panel with optional role/status/search
     * filters and server-side pagination.
     *
     * Search checks UID, phone, name and email. Payment-account
     * metadata is never included in this generic user list.
     */
    public Map<String, Object> listUsersForAdmin(
            AuthenticatedUser admin,
            String role,
            String status,
            String search,
            int page,
            int pageSize) {

        requireAdmin(admin);

        if (page < 1) {
            throw new RuntimeException(
                    "Page must be greater than or equal to 1"
            );
        }

        if (pageSize < 1 || pageSize > 100) {
            throw new RuntimeException(
                    "Page size must be between 1 and 100"
            );
        }

        String cleanRole =
                normalizeStatus(role);

        if (!cleanRole.isBlank()
                && !"customer".equals(cleanRole)
                && !"host".equals(cleanRole)
                && !"admin".equals(cleanRole)) {

            throw new RuntimeException(
                    "User role must be customer, host, or admin"
            );
        }

        String cleanStatus =
                normalizeStatus(status);

        if (!cleanStatus.isBlank()
                && !"active".equals(cleanStatus)
                && !"inactive".equals(cleanStatus)) {

            throw new RuntimeException(
                    "User status must be active or inactive"
            );
        }

        String cleanSearch =
                search == null
                        ? ""
                        : search.trim().toLowerCase();

        try {
            Firestore db =
                    FirestoreClient.getFirestore();

            List<DocumentSnapshot> matchedUsers =
                    new ArrayList<>();

            for (DocumentSnapshot user :
                    db.collection("users")
                            .get()
                            .get()
                            .getDocuments()) {

                if (!user.exists()) {
                    continue;
                }

                String userRole =
                        getStringField(user, "role")
                                .toLowerCase();

                String userStatus =
                        getStringField(user, "status")
                                .toLowerCase();

                if (!cleanRole.isBlank()
                        && !cleanRole.equals(userRole)) {
                    continue;
                }

                if (!cleanStatus.isBlank()
                        && !cleanStatus.equals(userStatus)) {
                    continue;
                }

                if (!cleanSearch.isBlank()) {

                    String uid =
                            user.getId().toLowerCase();

                    String phone =
                            getStringField(user, "phone")
                                    .toLowerCase();

                    String name =
                            getStringField(user, "name")
                                    .toLowerCase();

                    String email =
                            getStringField(user, "email")
                                    .toLowerCase();

                    if (!uid.contains(cleanSearch)
                            && !phone.contains(cleanSearch)
                            && !name.contains(cleanSearch)
                            && !email.contains(cleanSearch)) {

                        continue;
                    }
                }

                matchedUsers.add(user);
            }

            matchedUsers.sort(
                    Comparator.comparing(
                            (DocumentSnapshot user) ->
                                    user.getTimestamp("createdAt"),
                            Comparator.nullsLast(
                                    Comparator.reverseOrder()
                            )
                    )
            );

            int total =
                    matchedUsers.size();

            int totalPages =
                    total == 0
                            ? 0
                            : (int) Math.ceil(
                                    (double) total / pageSize
                            );

            int start =
                    (page - 1) * pageSize;

            List<Map<String, Object>> users =
                    new ArrayList<>();

            if (start < total) {

                int end =
                        Math.min(
                                start + pageSize,
                                total
                        );

                for (int i = start; i < end; i++) {

                    users.add(
                            sanitizeAdminUser(
                                    matchedUsers.get(i)
                            )
                    );
                }
            }

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "users",
                    users
            );

            result.put(
                    "total",
                    total
            );

            result.put(
                    "page",
                    page
            );

            result.put(
                    "pageSize",
                    pageSize
            );

            result.put(
                    "totalPages",
                    totalPages
            );

            result.put(
                    "hasNext",
                    page < totalPages
            );

            result.put(
                    "hasPrevious",
                    page > 1 && total > 0
            );

            return result;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to list users",
                    e
            );
        }
    }

    /**
     * Get a user profile for admin operations.
     *
     * Sensitive authentication/payment secrets are not stored in
     * this service. Payment-account metadata is only returned
     * through the dedicated host payment-account endpoint.
     */
    public Map<String, Object> getUserForAdmin(
            AuthenticatedUser admin,
            String userId) {

        requireAdmin(admin);

        DocumentSnapshot user =
                getExistingUser(userId);

        return sanitizeAdminUser(user);
    }

    /**
     * Activate or deactivate a user.
     *
     * Admins cannot deactivate themselves.
     * Only the supported account statuses are accepted.
     */
    public Map<String, Object> updateUserStatus(
            AuthenticatedUser admin,
            String userId,
            String status) {

        requireAdmin(admin);

        String cleanUserId =
                requireUserId(userId);

        String cleanStatus =
                normalizeStatus(status);

        if (!"active".equals(cleanStatus)
                && !"inactive".equals(cleanStatus)) {

            throw new RuntimeException(
                    "User status must be active or inactive"
            );
        }

        if (admin.getUid().equals(cleanUserId)) {
            throw new RuntimeException(
                    "An admin cannot change their own account status"
            );
        }

        DocumentSnapshot user =
                getExistingUser(cleanUserId);

        Timestamp now = Timestamp.now();

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "status",
                cleanStatus
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            userRepository.update(
                    cleanUserId,
                    updates
            );

            return sanitizeAdminUser(
                    getExistingUser(cleanUserId)
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update user status",
                    e
            );
        }
    }

    /**
     * Change a user's application role.
     *
     * Supported transitions:
     * - customer -> host
     * - host -> customer
     *
     * Admin role is intentionally not assignable through this
     * endpoint. Root/admin provisioning must remain a controlled
     * server-side operation.
     *
     * An admin cannot change their own role.
     */
    public Map<String, Object> updateUserRole(
            AuthenticatedUser admin,
            String userId,
            String role) {

        requireAdmin(admin);

        String cleanUserId =
                requireUserId(userId);

        String cleanRole =
                normalizeStatus(role);

        if (!"customer".equals(cleanRole)
                && !"host".equals(cleanRole)) {

            throw new RuntimeException(
                    "User role must be customer or host"
            );
        }

        if (admin.getUid().equals(cleanUserId)) {
            throw new RuntimeException(
                    "An admin cannot change their own role"
            );
        }

        DocumentSnapshot user =
                getExistingUser(cleanUserId);

        String currentRole =
                getStringField(user, "role");

        if ("admin".equalsIgnoreCase(currentRole)) {
            throw new RuntimeException(
                    "Admin role cannot be changed through this endpoint"
            );
        }

        if (cleanRole.equalsIgnoreCase(currentRole)) {
            return sanitizeAdminUser(user);
        }

        /*
         * A host role should represent an approved host.
         * Do not allow an admin to bypass the host-application
         * verification flow by manually promoting a customer.
         */
        if ("host".equals(cleanRole)) {
            throw new RuntimeException(
                    "A customer must be approved through the host application process"
            );
        }

        /*
         * Demoting a host to customer is allowed for admin
         * account-management purposes. Existing host properties
         * and payment-account records are not deleted here.
         */
        Timestamp now = Timestamp.now();

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "role",
                cleanRole
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            userRepository.update(
                    cleanUserId,
                    updates
            );

            return sanitizeAdminUser(
                    getExistingUser(cleanUserId)
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update user role",
                    e
            );
        }
    }

    // =========================================================
    // PROPERTY VERIFICATION
    // =========================================================

    /**
     * List properties for the admin panel with optional verification/listing
     * filters, text search and pagination.
     *
     * Search checks property ID, host ID, title, city and area.
     */
    public Map<String, Object> listPropertiesForAdmin(
            AuthenticatedUser admin,
            String verificationStatus,
            String listingStatus,
            String search,
            int page,
            int pageSize) {

        requireAdmin(admin);

        if (page < 1) {
            throw new RuntimeException(
                    "Page must be greater than or equal to 1"
            );
        }

        if (pageSize < 1 || pageSize > 100) {
            throw new RuntimeException(
                    "Page size must be between 1 and 100"
            );
        }

        String cleanVerification =
                normalizeStatus(verificationStatus);

        if (!cleanVerification.isBlank()
                && !"pending".equals(cleanVerification)
                && !"approved".equals(cleanVerification)
                && !"changes_required".equals(cleanVerification)
                && !"rejected".equals(cleanVerification)) {

            throw new RuntimeException(
                    "Invalid property verification status"
            );
        }

        String cleanListing =
                normalizeStatus(listingStatus);

        if (!cleanListing.isBlank()
                && !"active".equals(cleanListing)
                && !"hidden".equals(cleanListing)
                && !"inactive".equals(cleanListing)) {

            throw new RuntimeException(
                    "Invalid property listing status"
            );
        }

        String cleanSearch =
                search == null
                        ? ""
                        : search.trim().toLowerCase();

        try {
            List<QueryDocumentSnapshot> documents =
                    FirestoreClient.getFirestore()
                            .collection("properties")
                            .get()
                            .get()
                            .getDocuments();

            List<QueryDocumentSnapshot> matched =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {

                if (!document.exists()) {
                    continue;
                }

                String verification =
                        getStringField(
                                document,
                                "verificationStatus"
                        ).toLowerCase();

                String listing =
                        getStringField(
                                document,
                                "listingStatus"
                        ).toLowerCase();

                if (!cleanVerification.isBlank()
                        && !cleanVerification.equals(verification)) {
                    continue;
                }

                if (!cleanListing.isBlank()
                        && !cleanListing.equals(listing)) {
                    continue;
                }

                if (!cleanSearch.isBlank()) {

                    String propertyId =
                            document.getId().toLowerCase();

                    String hostId =
                            getStringField(
                                    document,
                                    "hostId"
                            ).toLowerCase();

                    String title =
                            getStringField(
                                    document,
                                    "title"
                            ).toLowerCase();

                    String city =
                            getStringField(
                                    document,
                                    "city"
                            ).toLowerCase();

                    String area =
                            getStringField(
                                    document,
                                    "area"
                            ).toLowerCase();

                    if (!propertyId.contains(cleanSearch)
                            && !hostId.contains(cleanSearch)
                            && !title.contains(cleanSearch)
                            && !city.contains(cleanSearch)
                            && !area.contains(cleanSearch)) {

                        continue;
                    }
                }

                matched.add(document);
            }

            matched.sort(
                    Comparator.comparing(
                            (DocumentSnapshot property) ->
                                    property.getTimestamp("updatedAt"),
                            Comparator.nullsLast(
                                    Comparator.reverseOrder()
                            )
                    )
            );

            int total =
                    matched.size();

            int totalPages =
                    total == 0
                            ? 0
                            : (int) Math.ceil(
                                    (double) total / pageSize
                            );

            int start =
                    (page - 1) * pageSize;

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            if (start < total) {

                int end =
                        Math.min(
                                start + pageSize,
                                total
                        );

                for (int i = start; i < end; i++) {

                    DocumentSnapshot property =
                            matched.get(i);

                    Map<String, Object> data =
                            property.getData();

                    if (data == null) {
                        continue;
                    }

                    Map<String, Object> item =
                            new HashMap<>(data);

                    item.put(
                            "propertyId",
                            property.getId()
                    );

                    properties.add(item);
                }
            }

            Map<String, Object> result =
                    new HashMap<>();

            result.put("properties", properties);
            result.put("total", total);
            result.put("page", page);
            result.put("pageSize", pageSize);
            result.put("totalPages", totalPages);
            result.put("hasNext", page < totalPages);
            result.put(
                    "hasPrevious",
                    page > 1 && total > 0
            );

            return result;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to list properties",
                    e
            );
        }
    }

    /**
     * Change the public listing state of an approved property.
     * Verification state is never changed by this operation.
     */
    public Map<String, Object> updatePropertyListingStatus(
            AuthenticatedUser admin,
            String propertyId,
            String listingStatus) {

        requireAdmin(admin);

        String cleanStatus =
                normalizeStatus(listingStatus);

        if (!"active".equals(cleanStatus)
                && !"hidden".equals(cleanStatus)
                && !"inactive".equals(cleanStatus)) {

            throw new RuntimeException(
                    "Listing status must be active, hidden, or inactive"
            );
        }

        DocumentSnapshot property =
                getExistingProperty(propertyId);

        String hostId =
                getStringField(property, "hostId");

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot change their own property's listing status"
            );
        }

        String verificationStatus =
                getStringField(
                        property,
                        "verificationStatus"
                );

        if (!"approved".equalsIgnoreCase(verificationStatus)) {
            throw new RuntimeException(
                    "Only approved properties can have their listing status changed"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "listingStatus",
                cleanStatus
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            propertyRepository.update(
                    propertyId,
                    updates
            );

            return getPropertyWithId(propertyId);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update property listing status",
                    e
            );
        }
    }

    public List<Map<String, Object>> getPendingProperties(
            AuthenticatedUser admin) {

        requireAdmin(admin);

        try {
            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findByVerificationStatus("pending");

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {

                Map<String, Object> property =
                        document.getData();

                if (property != null) {
                    property.put(
                            "propertyId",
                            document.getId()
                    );

                    properties.add(property);
                }
            }

            return properties;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get pending properties",
                    e
            );
        }
    }

    public Map<String, Object> approveProperty(
            AuthenticatedUser admin,
            String propertyId,
            String note) {

        requireAdmin(admin);

        DocumentSnapshot property =
                getExistingProperty(propertyId);

        String hostId =
                property.getString("hostId");

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot approve their own property"
            );
        }

        String currentStatus =
                getStringField(
                        property,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending properties can be approved"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "verificationStatus",
                "approved"
        );

        updates.put(
                "listingStatus",
                "active"
        );

        updates.put(
                "verificationNote",
                note != null ? note.trim() : ""
        );

        updates.put(
                "verifiedAt",
                Timestamp.now()
        );

        updates.put(
                "verifiedBy",
                admin.getUid()
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            propertyRepository.update(
                    propertyId,
                    updates
            );

            notifyHostApplicant(
                    hostId,
                    "PROPERTY_APPROVED",
                    "Property approved",
                    "Your property has been approved and is now live on StayTrack.",
                    propertyId,
                    "property"
            );

            return getPropertyWithId(propertyId);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to approve property",
                    e
            );
        }
    }

    public Map<String, Object> requestPropertyChanges(
            AuthenticatedUser admin,
            String propertyId,
            String note) {

        requireAdmin(admin);

        if (note == null || note.isBlank()) {
            throw new RuntimeException(
                    "A note is required when requesting changes"
            );
        }

        DocumentSnapshot property =
                getExistingProperty(propertyId);

        String hostId =
                property.getString("hostId");

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot review their own property"
            );
        }

        String currentStatus =
                getStringField(
                        property,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending properties can have changes requested"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "verificationStatus",
                "changes_required"
        );

        updates.put(
                "listingStatus",
                "hidden"
        );

        updates.put(
                "verificationNote",
                note.trim()
        );

        updates.put(
                "verifiedAt",
                Timestamp.now()
        );

        updates.put(
                "verifiedBy",
                admin.getUid()
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            propertyRepository.update(
                    propertyId,
                    updates
            );

            notifyHostApplicant(
                    hostId,
                    "PROPERTY_CHANGES_REQUIRED",
                    "Changes required for property",
                    "Your property needs changes before it can be approved. Admin note: "
                            + note.trim(),
                    propertyId,
                    "property"
            );

            return getPropertyWithId(propertyId);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to request property changes",
                    e
            );
        }
    }

    public Map<String, Object> rejectProperty(
            AuthenticatedUser admin,
            String propertyId,
            String reason) {

        requireAdmin(admin);

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException(
                    "A rejection reason is required"
            );
        }

        DocumentSnapshot property =
                getExistingProperty(propertyId);

        String hostId =
                property.getString("hostId");

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot reject their own property"
            );
        }

        String currentStatus =
                getStringField(
                        property,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending properties can be rejected"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "verificationStatus",
                "rejected"
        );

        updates.put(
                "listingStatus",
                "hidden"
        );

        updates.put(
                "verificationNote",
                reason.trim()
        );

        updates.put(
                "verifiedAt",
                Timestamp.now()
        );

        updates.put(
                "verifiedBy",
                admin.getUid()
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            propertyRepository.update(
                    propertyId,
                    updates
            );

            notifyHostApplicant(
                    hostId,
                    "PROPERTY_REJECTED",
                    "Property rejected",
                    "Your property has been rejected. Reason: "
                            + reason.trim(),
                    propertyId,
                    "property"
            );

            return getPropertyWithId(propertyId);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to reject property",
                    e
            );
        }
    }

    public Map<String, Object> getPropertyForAdmin(
            AuthenticatedUser admin,
            String propertyId) {

        requireAdmin(admin);

        return getPropertyWithId(propertyId);
    }

    // =========================================================
    // HOST APPLICATION MANAGEMENT
    // =========================================================

    /**
     * List host applications for the admin panel with optional status/search
     * filters and pagination.
     */
    public Map<String, Object> listHostApplicationsForAdmin(
            AuthenticatedUser admin,
            String verificationStatus,
            String search,
            int page,
            int pageSize) {

        requireAdmin(admin);

        if (page < 1) {
            throw new RuntimeException(
                    "Page must be greater than or equal to 1"
            );
        }

        if (pageSize < 1 || pageSize > 100) {
            throw new RuntimeException(
                    "Page size must be between 1 and 100"
            );
        }

        String cleanStatus =
                normalizeStatus(verificationStatus);

        if (!cleanStatus.isBlank()
                && !"pending".equals(cleanStatus)
                && !"approved".equals(cleanStatus)
                && !"changes_required".equals(cleanStatus)
                && !"rejected".equals(cleanStatus)) {

            throw new RuntimeException(
                    "Invalid host application verification status"
            );
        }

        String cleanSearch =
                search == null
                        ? ""
                        : search.trim().toLowerCase();

        try {
            List<QueryDocumentSnapshot> documents =
                    FirestoreClient.getFirestore()
                            .collection("hostApplications")
                            .get()
                            .get()
                            .getDocuments();

            List<QueryDocumentSnapshot> matched =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {

                if (!document.exists()) {
                    continue;
                }

                String status =
                        getStringField(
                                document,
                                "verificationStatus"
                        ).toLowerCase();

                if (!cleanStatus.isBlank()
                        && !cleanStatus.equals(status)) {
                    continue;
                }

                if (!cleanSearch.isBlank()) {

                    String applicationId =
                            document.getId().toLowerCase();

                    String userId =
                            getStringField(
                                    document,
                                    "userId"
                            ).toLowerCase();

                    String name =
                            getStringField(
                                    document,
                                    "applicantName"
                            ).toLowerCase();

                    String email =
                            getStringField(
                                    document,
                                    "email"
                            ).toLowerCase();

                    String phone =
                            getStringField(
                                    document,
                                    "phone"
                            ).toLowerCase();

                    String hostType =
                            getStringField(
                                    document,
                                    "hostType"
                            ).toLowerCase();

                    if (!applicationId.contains(cleanSearch)
                            && !userId.contains(cleanSearch)
                            && !name.contains(cleanSearch)
                            && !email.contains(cleanSearch)
                            && !phone.contains(cleanSearch)
                            && !hostType.contains(cleanSearch)) {

                        continue;
                    }
                }

                matched.add(document);
            }

            matched.sort(
                    Comparator.comparing(
                            (DocumentSnapshot application) ->
                                    application.getTimestamp("updatedAt"),
                            Comparator.nullsLast(
                                    Comparator.reverseOrder()
                            )
                    )
            );

            int total =
                    matched.size();

            int totalPages =
                    total == 0
                            ? 0
                            : (int) Math.ceil(
                                    (double) total / pageSize
                            );

            int start =
                    (page - 1) * pageSize;

            List<Map<String, Object>> applications =
                    new ArrayList<>();

            if (start < total) {

                int end =
                        Math.min(
                                start + pageSize,
                                total
                        );

                for (int i = start; i < end; i++) {

                    DocumentSnapshot document =
                            matched.get(i);

                    Map<String, Object> data =
                            document.getData();

                    if (data == null) {
                        continue;
                    }

                    Map<String, Object> item =
                            new HashMap<>(data);

                    item.put(
                            "applicationId",
                            document.getId()
                    );

                    applications.add(item);
                }
            }

            Map<String, Object> result =
                    new HashMap<>();

            result.put("applications", applications);
            result.put("total", total);
            result.put("page", page);
            result.put("pageSize", pageSize);
            result.put("totalPages", totalPages);
            result.put("hasNext", page < totalPages);
            result.put(
                    "hasPrevious",
                    page > 1 && total > 0
            );

            return result;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to list host applications",
                    e
            );
        }
    }

    // =========================================================
    // ADMIN SETTINGS
    // =========================================================

    /**
     * Read the current subscription pricing configuration.
     */
    public Map<String, Object> getSubscriptionSettings(
            AuthenticatedUser admin) {

        requireAdmin(admin);

        try {
            DocumentSnapshot document =
                    FirestoreClient.getFirestore()
                            .collection("settings")
                            .document("subscription")
                            .get()
                            .get();

            if (!document.exists()) {
                throw new RuntimeException(
                        "Subscription settings were not found"
                );
            }

            Map<String, Object> data =
                    document.getData();

            return data == null
                    ? new HashMap<>()
                    : new HashMap<>(data);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get subscription settings",
                    e
            );
        }
    }

    /**
     * Update subscription pricing. Prices are stored in INR as rupee
     * amounts and are read dynamically by SubscriptionService.
     */
    public Map<String, Object> updateSubscriptionSettings(
            AuthenticatedUser admin,
            Map<String, Object> request) {

        requireAdmin(admin);

        if (request == null) {
            throw new RuntimeException(
                    "Settings request is required"
            );
        }

        long introductoryPrice =
                readNonNegativeLong(
                        request,
                        "introductoryPrice"
                );

        long standardPrice =
                readNonNegativeLong(
                        request,
                        "standardPrice"
                );

        Object introductoryEnabledValue =
                request.get("introductoryEnabled");

        if (!(introductoryEnabledValue instanceof Boolean)) {
            throw new RuntimeException(
                    "introductoryEnabled must be boolean"
            );
        }

        boolean introductoryEnabled =
                (Boolean) introductoryEnabledValue;

        String currency =
                request.get("currency") == null
                        ? "INR"
                        : request.get("currency")
                                .toString()
                                .trim()
                                .toUpperCase();

        if (!"INR".equals(currency)) {
            throw new RuntimeException(
                    "Only INR is supported"
            );
        }

        if (standardPrice == 0) {
            throw new RuntimeException(
                    "standardPrice must be greater than 0"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "introductoryPrice",
                introductoryPrice
        );

        updates.put(
                "standardPrice",
                standardPrice
        );

        updates.put(
                "introductoryEnabled",
                introductoryEnabled
        );

        updates.put(
                "currency",
                currency
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            FirestoreClient.getFirestore()
                    .collection("settings")
                    .document("subscription")
                    .set(updates)
                    .get();

            return getSubscriptionSettings(admin);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update subscription settings",
                    e
            );
        }
    }

    /**
     * Read the current AI search configuration.
     */
    public Map<String, Object> getAiSettings(
            AuthenticatedUser admin) {

        requireAdmin(admin);

        try {
            DocumentSnapshot document =
                    FirestoreClient.getFirestore()
                            .collection("settings")
                            .document("ai")
                            .get()
                            .get();

            if (!document.exists()) {
                throw new RuntimeException(
                        "AI settings were not found"
                );
            }

            Map<String, Object> data =
                    document.getData();

            return data == null
                    ? new HashMap<>()
                    : new HashMap<>(data);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get AI settings",
                    e
            );
        }
    }

    /**
     * Update AI provider/model configuration without exposing API keys.
     * API secrets must remain in server-side environment/secret storage.
     */
    public Map<String, Object> updateAiSettings(
            AuthenticatedUser admin,
            Map<String, Object> request) {

        requireAdmin(admin);

        if (request == null) {
            throw new RuntimeException(
                    "Settings request is required"
            );
        }

        Object enabledValue =
                request.get("enabled");

        if (!(enabledValue instanceof Boolean)) {
            throw new RuntimeException(
                    "enabled must be boolean"
            );
        }

        String provider =
                request.get("provider") == null
                        ? ""
                        : request.get("provider")
                                .toString()
                                .trim()
                                .toLowerCase();

        String model =
                request.get("model") == null
                        ? ""
                        : request.get("model")
                                .toString()
                                .trim();

        if (provider.length() > 50) {
            throw new RuntimeException(
                    "AI provider is too long"
            );
        }

        if (model.length() > 150) {
            throw new RuntimeException(
                    "AI model is too long"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "enabled",
                enabledValue
        );

        updates.put(
                "provider",
                provider
        );

        updates.put(
                "model",
                model
        );

        updates.put(
                "updatedAt",
                Timestamp.now()
        );

        try {

            FirestoreClient.getFirestore()
                    .collection("settings")
                    .document("ai")
                    .set(updates)
                    .get();

            return getAiSettings(admin);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update AI settings",
                    e
            );
        }
    }

    // =========================================================
    // HOST APPLICATION VERIFICATION
    // =========================================================

    public List<Map<String, Object>> getPendingHostApplications(
            AuthenticatedUser admin) {

        requireAdmin(admin);

        try {
            List<QueryDocumentSnapshot> documents =
                    hostApplicationRepository
                            .findByVerificationStatus("pending");

            List<Map<String, Object>> applications =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {

                Map<String, Object> application =
                        document.getData();

                if (application != null) {
                    application.put(
                            "applicationId",
                            document.getId()
                    );

                    applications.add(application);
                }
            }

            return applications;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get pending host applications",
                    e
            );
        }
    }

    public Map<String, Object> getHostApplication(
            AuthenticatedUser admin,
            String applicationId) {

        requireAdmin(admin);

        DocumentSnapshot application =
                getExistingHostApplication(applicationId);

        return getHostApplicationWithId(application);
    }

    public Map<String, Object> approveHostApplication(
            AuthenticatedUser admin,
            String applicationId,
            String adminNote) {

        requireAdmin(admin);

        DocumentSnapshot application =
                getExistingHostApplication(applicationId);

        String currentStatus =
                getStringField(
                        application,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending host applications can be approved"
            );
        }

        String userId =
                application.getString("userId");

        if (userId == null || userId.isBlank()) {
            throw new RuntimeException(
                    "Host application has no user ID"
            );
        }

        if (admin.getUid().equals(userId)) {
            throw new RuntimeException(
                    "An admin cannot approve their own host application"
            );
        }

        DocumentSnapshot user =
                getExistingUser(userId);

        String currentRole =
                getStringField(user, "role");

        if ("admin".equalsIgnoreCase(currentRole)) {
            throw new RuntimeException(
                    "An admin cannot be converted into a host"
            );
        }

        if ("host".equalsIgnoreCase(currentRole)) {
            throw new RuntimeException(
                    "User is already a host"
            );
        }

        Timestamp now = Timestamp.now();

        try {

            Firestore db =
                    FirestoreClient.getFirestore();

            db.runTransaction(transaction -> {

                transaction.update(
                        db.collection("users")
                                .document(userId),
                        "role",
                        "host",
                        "updatedAt",
                        now
                );

                transaction.update(
                        db.collection("hostApplications")
                                .document(applicationId),
                        "verificationStatus",
                        "approved",
                        "adminNote",
                        adminNote != null
                                ? adminNote.trim()
                                : "",
                        "reviewedAt",
                        now,
                        "reviewedBy",
                        admin.getUid(),
                        "updatedAt",
                        now
                );

                return null;

            }).get();

            notifyHostApplicant(
                    userId,
                    "HOST_APPLICATION_APPROVED",
                    "Host application approved",
                    "Your host application has been approved. You can now use StayTrack as a host.",
                    applicationId,
                    "hostApplication"
            );

            return getHostApplicationWithId(
                    hostApplicationRepository.findById(
                            applicationId
                    )
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to approve host application",
                    e
            );
        }
    }

    public Map<String, Object> requestHostApplicationChanges(
            AuthenticatedUser admin,
            String applicationId,
            String adminNote) {

        requireAdmin(admin);

        if (adminNote == null || adminNote.isBlank()) {
            throw new RuntimeException(
                    "A note is required when requesting changes"
            );
        }

        DocumentSnapshot application =
                getExistingHostApplication(applicationId);

        String currentStatus =
                getStringField(
                        application,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending host applications can have changes requested"
            );
        }

        String userId =
                application.getString("userId");

        if (admin.getUid().equals(userId)) {
            throw new RuntimeException(
                    "An admin cannot review their own host application"
            );
        }

        Timestamp now = Timestamp.now();

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "verificationStatus",
                "changes_required"
        );

        updates.put(
                "adminNote",
                adminNote.trim()
        );

        updates.put(
                "reviewedAt",
                now
        );

        updates.put(
                "reviewedBy",
                admin.getUid()
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            hostApplicationRepository.update(
                    applicationId,
                    updates
            );

            notifyHostApplicant(
                    userId,
                    "HOST_APPLICATION_CHANGES_REQUIRED",
                    "Changes required for host application",
                    "Your host application needs changes. Admin note: "
                            + adminNote.trim(),
                    applicationId,
                    "hostApplication"
            );

            return getHostApplicationWithId(
                    hostApplicationRepository.findById(
                            applicationId
                    )
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to request host application changes",
                    e
            );
        }
    }

    public Map<String, Object> rejectHostApplication(
            AuthenticatedUser admin,
            String applicationId,
            String rejectionReason) {

        requireAdmin(admin);

        if (rejectionReason == null ||
                rejectionReason.isBlank()) {

            throw new RuntimeException(
                    "A rejection reason is required"
            );
        }

        DocumentSnapshot application =
                getExistingHostApplication(applicationId);

        String currentStatus =
                getStringField(
                        application,
                        "verificationStatus"
                );

        if (!"pending".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException(
                    "Only pending host applications can be rejected"
            );
        }

        String userId =
                application.getString("userId");

        if (admin.getUid().equals(userId)) {
            throw new RuntimeException(
                    "An admin cannot reject their own host application"
            );
        }

        Timestamp now = Timestamp.now();

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "verificationStatus",
                "rejected"
        );

        updates.put(
                "rejectionReason",
                rejectionReason.trim()
        );

        updates.put(
                "reviewedAt",
                now
        );

        updates.put(
                "reviewedBy",
                admin.getUid()
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            hostApplicationRepository.update(
                    applicationId,
                    updates
            );

            notifyHostApplicant(
                    userId,
                    "HOST_APPLICATION_REJECTED",
                    "Host application rejected",
                    "Your host application has been rejected. Reason: "
                            + rejectionReason.trim(),
                    applicationId,
                    "hostApplication"
            );

            return getHostApplicationWithId(
                    hostApplicationRepository.findById(
                            applicationId
                    )
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to reject host application",
                    e
            );
        }
    }

    // =========================================================
    // HOST PAYMENT ACCOUNT MANAGEMENT
    // =========================================================

    /**
     * Get payment account configuration for an approved host.
     */
    public Map<String, Object> getHostPaymentAccount(
            AuthenticatedUser admin,
            String hostId) {

        requireAdmin(admin);

        DocumentSnapshot host =
                getExistingUser(hostId);

        requireApprovedHost(host);

        Map<String, Object> paymentAccount =
                getPaymentAccount(host);

        Map<String, Object> result =
                new HashMap<>();

        result.put(
                "userId",
                host.getId()
        );

        result.put(
                "role",
                getStringField(host, "role")
        );

        result.put(
                "paymentAccount",
                paymentAccount
        );

        return result;
    }

    /**
     * Add or replace a Razorpay Route linked account.
     *
     * A new or changed account is ALWAYS pending.
     *
     * The admin cannot manually activate an account.
     */
    public Map<String, Object> setHostPaymentAccount(
            AuthenticatedUser admin,
            String hostId,
            String linkedAccountId,
            String productId) {

        requireAdmin(admin);

        if (hostId == null || hostId.isBlank()) {
            throw new RuntimeException(
                    "Host ID is required"
            );
        }

        if (linkedAccountId == null ||
                linkedAccountId.isBlank()) {

            throw new RuntimeException(
                    "Razorpay linked account ID is required"
            );
        }

        if (productId == null ||
                productId.isBlank()) {

            throw new RuntimeException(
                    "Razorpay Route product ID is required"
            );
        }

        String cleanLinkedAccountId =
                linkedAccountId.trim();

        String cleanProductId =
                productId.trim();

        if (cleanLinkedAccountId.length() > 200) {
            throw new RuntimeException(
                    "Linked account ID is too long"
            );
        }

        if (cleanProductId.length() > 200) {
            throw new RuntimeException(
                    "Product ID is too long"
            );
        }

        DocumentSnapshot host =
                getExistingUser(hostId);

        requireApprovedHost(host);

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot manage their own host payment account"
            );
        }

        Timestamp now =
                Timestamp.now();

        Map<String, Object> paymentAccount =
                new HashMap<>();

        paymentAccount.put(
                "provider",
                "razorpay"
        );

        paymentAccount.put(
                "linkedAccountId",
                cleanLinkedAccountId
        );

        paymentAccount.put(
                "productId",
                cleanProductId
        );

        /*
         * Never manually activate an account.
         *
         * The verification service will change this to active
         * only after Razorpay confirms the Route product.
         */
        paymentAccount.put(
                "status",
                "pending"
        );

        paymentAccount.put(
                "updatedAt",
                now
        );

        paymentAccount.put(
                "updatedBy",
                admin.getUid()
        );

        paymentAccount.put(
                "verificationError",
                ""
        );

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "paymentAccount",
                paymentAccount
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            userRepository.update(
                    hostId,
                    updates
            );

            return getHostPaymentAccount(
                    admin,
                    hostId
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to update host payment account",
                    e
            );
        }
    }

    /**
     * Suspend a host payment account.
     */
    public Map<String, Object> suspendHostPaymentAccount(
            AuthenticatedUser admin,
            String hostId,
            String reason) {

        requireAdmin(admin);

        if (hostId == null || hostId.isBlank()) {
            throw new RuntimeException(
                    "Host ID is required"
            );
        }

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException(
                    "A suspension reason is required"
            );
        }

        DocumentSnapshot host =
                getExistingUser(hostId);

        requireApprovedHost(host);

        if (admin.getUid().equals(hostId)) {
            throw new RuntimeException(
                    "An admin cannot suspend their own host payment account"
            );
        }

        Map<String, Object> currentAccount =
                getPaymentAccount(host);

        String linkedAccountId =
                getMapString(
                        currentAccount,
                        "linkedAccountId"
                );

        String productId =
                getMapString(
                        currentAccount,
                        "productId"
                );

        if (linkedAccountId.isBlank()) {
            throw new RuntimeException(
                    "Host does not have a Razorpay linked account"
            );
        }

        Timestamp now =
                Timestamp.now();

        Map<String, Object> paymentAccount =
                new HashMap<>();

        paymentAccount.put(
                "provider",
                "razorpay"
        );

        paymentAccount.put(
                "linkedAccountId",
                linkedAccountId
        );

        paymentAccount.put(
                "productId",
                productId
        );

        paymentAccount.put(
                "status",
                "suspended"
        );

        paymentAccount.put(
                "suspensionReason",
                reason.trim()
        );

        paymentAccount.put(
                "updatedAt",
                now
        );

        paymentAccount.put(
                "updatedBy",
                admin.getUid()
        );

        paymentAccount.put(
                "verificationError",
                ""
        );

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "paymentAccount",
                paymentAccount
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            userRepository.update(
                    hostId,
                    updates
            );

            return getHostPaymentAccount(
                    admin,
                    hostId
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to suspend host payment account",
                    e
            );
        }
    }

    /**
     * Update only the verification result.
     *
     * This method is intentionally package/service controlled.
     * It is NOT exposed directly as an admin endpoint.
     */
    public Map<String, Object> updatePaymentAccountVerification(
            String hostId,
            String status,
            String verificationError) {

        if (hostId == null || hostId.isBlank()) {
            throw new RuntimeException(
                    "Host ID is required"
            );
        }

        if (!isValidPaymentAccountStatus(status)) {
            throw new RuntimeException(
                    "Invalid payment account status"
            );
        }

        DocumentSnapshot host =
                getExistingUser(hostId);

        requireApprovedHost(host);

        Map<String, Object> currentAccount =
                getPaymentAccount(host);

        String linkedAccountId =
                getMapString(
                        currentAccount,
                        "linkedAccountId"
                );

        String productId =
                getMapString(
                        currentAccount,
                        "productId"
                );

        if (linkedAccountId.isBlank()) {
            throw new RuntimeException(
                    "Host does not have a linked account"
            );
        }

        if (productId.isBlank()) {
            throw new RuntimeException(
                    "Host does not have a Route product ID"
            );
        }

        Timestamp now =
                Timestamp.now();

        Map<String, Object> paymentAccount =
                new HashMap<>();

        paymentAccount.put(
                "provider",
                "razorpay"
        );

        paymentAccount.put(
                "linkedAccountId",
                linkedAccountId
        );

        paymentAccount.put(
                "productId",
                productId
        );

        paymentAccount.put(
                "status",
                status
        );

        paymentAccount.put(
                "updatedAt",
                now
        );

        /*
         * Verification is performed by the backend,
         * not by an admin.
         */
        paymentAccount.put(
                "updatedBy",
                "system"
        );

        paymentAccount.put(
                "verificationError",
                verificationError != null
                        ? verificationError.trim()
                        : ""
        );

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "paymentAccount",
                paymentAccount
        );

        updates.put(
                "updatedAt",
                now
        );

        try {

            userRepository.update(
                    hostId,
                    updates
            );

            return paymentAccount;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to update payment account verification",
                    e
            );
        }
    }

    /**
     * Sends a host-application decision notification.
     *
     * Notification failure must not undo a successful
     * admin decision that has already been saved.
     */
    private void notifyHostApplicant(
            String userId,
            String type,
            String title,
            String message,
            String relatedId,
            String relatedType) {

        if (userId == null || userId.isBlank()) {
            return;
        }

        try {
            notificationService.createNotification(
                    userId,
                    type,
                    title,
                    message,
                    relatedId,
                    relatedType
            );
        } catch (Exception ignored) {
            /*
             * The application status has already been updated.
             * A notification failure should not make that operation fail.
             */
        }
    }

    // =========================================================
    // PROPERTY HELPERS
    // =========================================================

    private DocumentSnapshot getExistingProperty(
            String propertyId) {

        if (propertyId == null ||
                propertyId.isBlank()) {

            throw new RuntimeException(
                    "Property ID is required"
            );
        }

        try {

            DocumentSnapshot property =
                    propertyRepository.findById(
                            propertyId
                    );

            if (!property.exists()) {
                throw new RuntimeException(
                        "Property not found"
                );
            }

            return property;

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find property",
                    e
            );
        }
    }

    private Map<String, Object> getPropertyWithId(
            String propertyId) {

        DocumentSnapshot document =
                getExistingProperty(propertyId);

        Map<String, Object> property =
                document.getData();

        if (property == null) {
            throw new RuntimeException(
                    "Property data is empty"
            );
        }

        property.put(
                "propertyId",
                document.getId()
        );

        return property;
    }

    // =========================================================
    // HOST APPLICATION HELPERS
    // =========================================================

    private DocumentSnapshot getExistingHostApplication(
            String applicationId) {

        if (applicationId == null ||
                applicationId.isBlank()) {

            throw new RuntimeException(
                    "Application ID is required"
            );
        }

        try {

            DocumentSnapshot application =
                    hostApplicationRepository.findById(
                            applicationId
                    );

            if (!application.exists()) {
                throw new RuntimeException(
                        "Host application not found"
                );
            }

            return application;

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find host application",
                    e
            );
        }
    }

    private Map<String, Object> getHostApplicationWithId(
            DocumentSnapshot document) {

        if (document == null || !document.exists()) {
            throw new RuntimeException(
                    "Host application not found"
            );
        }

        Map<String, Object> application =
                document.getData();

        if (application == null) {
            throw new RuntimeException(
                    "Host application data is empty"
            );
        }

        application.put(
                "applicationId",
                document.getId()
        );

        return application;
    }

    // =========================================================
    // USER HELPERS
    // =========================================================

    private DocumentSnapshot getExistingUser(
            String userId) {

        if (userId == null || userId.isBlank()) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        try {

            DocumentSnapshot user =
                    userRepository.findById(userId);

            if (!user.exists()) {
                throw new RuntimeException(
                        "User profile not found"
                );
            }

            return user;

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find user",
                    e
            );
        }
    }

    private void requireApprovedHost(
            DocumentSnapshot user) {

        String role =
                getStringField(
                        user,
                        "role"
                );

        if (!"host".equalsIgnoreCase(role)) {
            throw new RuntimeException(
                    "Payment account can only be assigned to a host"
            );
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getPaymentAccount(
            DocumentSnapshot user) {

        Object value =
                user.get("paymentAccount");

        if (!(value instanceof Map)) {

            Map<String, Object> empty =
                    new HashMap<>();

            empty.put(
                    "provider",
                    "razorpay"
            );

            empty.put(
                    "linkedAccountId",
                    ""
            );

            empty.put(
                    "productId",
                    ""
            );

            empty.put(
                    "status",
                    "pending"
            );

            empty.put(
                    "verificationError",
                    ""
            );

            return empty;
        }

        return new HashMap<>(
                (Map<String, Object>) value
        );
    }

    private String getMapString(
            Map<String, Object> map,
            String field) {

        if (map == null) {
            return "";
        }

        Object value =
                map.get(field);

        return value != null
                ? String.valueOf(value)
                : "";
    }

    private boolean isValidPaymentAccountStatus(
            String status) {

        if (status == null) {
            return false;
        }

        return "pending".equalsIgnoreCase(status)
                || "active".equalsIgnoreCase(status)
                || "suspended".equalsIgnoreCase(status);
    }

    private String requireUserId(String userId) {

        if (userId == null || userId.isBlank()) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return userId.trim();
    }

    private String normalizeStatus(String value) {

        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase();
    }

    /**
     * Returns the user fields appropriate for the general
     * admin user-management API.
     *
     * Payment-account metadata is intentionally excluded from
     * this generic user endpoint and must be accessed through
     * the dedicated payment-account endpoint.
     */
    private Map<String, Object> sanitizeAdminUser(
            DocumentSnapshot user) {

        if (user == null || !user.exists()) {
            throw new RuntimeException(
                    "User not found"
            );
        }

        Map<String, Object> data =
                user.getData();

        if (data == null) {
            throw new RuntimeException(
                    "User profile is empty"
            );
        }

        Map<String, Object> result =
                new HashMap<>();

        result.put(
                "uid",
                user.getId()
        );

        result.put(
                "phone",
                getStringField(user, "phone")
        );

        result.put(
                "name",
                getStringField(user, "name")
        );

        result.put(
                "email",
                getStringField(user, "email")
        );

        result.put(
                "role",
                getStringField(user, "role")
        );

        result.put(
                "status",
                getStringField(user, "status")
        );

        Object profileCompleted =
                data.get("profileCompleted");

        result.put(
                "profileCompleted",
                profileCompleted instanceof Boolean
                        ? profileCompleted
                        : false
        );

        Object createdAt =
                data.get("createdAt");

        if (createdAt != null) {
            result.put(
                    "createdAt",
                    createdAt
            );
        }

        Object updatedAt =
                data.get("updatedAt");

        if (updatedAt != null) {
            result.put(
                    "updatedAt",
                    updatedAt
            );
        }

        return result;
    }

    // =========================================================
    // COMMON HELPERS
    // =========================================================
    private long readNonNegativeLong(
        Map<String, Object> data,
        String field) {

    Object value = data.get(field);

    if (value instanceof Number number) {
        long result = number.longValue();

        if (result < 0) {
            throw new RuntimeException(
                    field + " cannot be negative"
            );
        }

        return result;
    }

    if (value instanceof String string) {
        try {
            long result = Long.parseLong(string.trim());

            if (result < 0) {
                throw new RuntimeException(
                        field + " cannot be negative"
                );
            }

            return result;

        } catch (NumberFormatException e) {
            throw new RuntimeException(
                    field + " must be a valid non-negative integer"
            );
        }
    }

    throw new RuntimeException(
            field + " is required and must be a number"
    );
}
    private String getStringField(
            DocumentSnapshot document,
            String field) {

        String value =
                document.getString(field);

        return value != null ? value : "";
    }

    private void requireAdmin(
            AuthenticatedUser user) {

        if (user == null ||
                !"admin".equalsIgnoreCase(
                        user.getRole()
                )) {

            throw new RuntimeException(
                    "Admin access required"
            );
        }
    }
}