package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.PropertyService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PropertyWorkflowTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Test
    void testPropertyCreationAndAdminApprovalWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        // 1. Setup host user (approved from Task B)
        String hostUid = "test_user_host_applicant_001";
        AuthenticatedUser hostUser = new AuthenticatedUser(hostUid, "+919999988888", "host");

        // 2. Setup admin user
        String adminUid = "test_admin_001";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, "+919000000000", "admin");

        // 3. Seed active subscription document in Firestore for host
        String subId = "test_sub_host_001";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        // 4. Create Property Request
        PropertyRequest request = new PropertyRequest();
        request.setHostType("pg_owner");
        request.setTitle("Sunshine Luxury PG");
        request.setDescription("Comfortable and affordable PG for working professionals.");
        request.setPropertyType("pg");
        request.setStayTypes(List.of("daily", "monthly"));
        request.setDailyPrice(1200.0);
        request.setMonthlyPrice(15000.0);
        request.setAddress("123 MG Road");
        request.setCity("Bengaluru");
        request.setArea("Koramangala");
        request.setLatitude(12.9352);
        request.setLongitude(77.6245);
        request.setBedrooms(10);
        request.setBathrooms(10);
        request.setFurnished(true);
        request.setAreaSqFt(2500.0);
        request.setAmenities(List.of("WiFi", "AC", "Laundry"));
        request.setImages(List.of("https://example.com/pg1.jpg"));

        String propertyId = null;
        try {
            // 5. Host creates property (Task C)
            Map<String, Object> createdProperty = propertyService.createProperty(hostUser, request);
            assertNotNull(createdProperty, "Created property should not be null");

            propertyId = (String) createdProperty.get("propertyId");
            assertNotNull(propertyId, "Property ID should be generated");
            assertEquals("pending", createdProperty.get("verificationStatus"), "Verification status should be pending");
            assertEquals("hidden", createdProperty.get("listingStatus"), "Listing status should be hidden initially");

            // Verify property document in live Firestore
            DocumentSnapshot pendingDoc = db.collection("properties").document(propertyId).get().get();
            assertTrue(pendingDoc.exists(), "Property document must exist in Firestore");
            assertEquals("pending", pendingDoc.getString("verificationStatus"));

            // 6. Admin approves property (Task D)
            Map<String, Object> approvedProperty = adminService.approveProperty(
                    adminUser,
                    propertyId,
                    "Verified property documents and photos"
            );
            assertNotNull(approvedProperty, "Approved property payload should not be null");
            assertEquals("approved", approvedProperty.get("verificationStatus"), "Verification status should update to approved");
            assertEquals("active", approvedProperty.get("listingStatus"), "Listing status should update to active");

            // Verify property document status in live Firestore
            DocumentSnapshot approvedDoc = db.collection("properties").document(propertyId).get().get();
            assertTrue(approvedDoc.exists(), "Approved property document must exist");
            assertEquals("approved", approvedDoc.getString("verificationStatus"));
            assertEquals("active", approvedDoc.getString("listingStatus"));

            // 7. Verify Public Marketplace Listing (Task D verification)
            List<Map<String, Object>> publicProperties = propertyService.getPublicProperties();
            assertNotNull(publicProperties, "Public properties list should not be null");
            final String targetId = propertyId;
            boolean foundInPublic = publicProperties.stream()
                    .anyMatch(p -> targetId.equals(p.get("propertyId")));
            assertTrue(foundInPublic, "Newly approved property must appear in public marketplace listing");
        } finally {
            if (propertyId != null) {
                try {
                    db.collection("properties").document(propertyId).delete().get();
                } catch (Exception ignored) {}
            }
            try { db.collection("subscriptions").document(subId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(hostUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
