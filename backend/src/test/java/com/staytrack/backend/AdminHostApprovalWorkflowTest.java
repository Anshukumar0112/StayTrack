package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AdminHostApprovalWorkflowTest {

    @Autowired
    private AdminService adminService;

    @Test
    void testAdminHostApprovalWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        // 1. Setup test admin user
        String adminUid = "test_admin_001";
        String adminPhone = "+919000000000";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, adminPhone, "admin");

        Map<String, Object> adminData = new HashMap<>();
        adminData.put("uid", adminUid);
        adminData.put("phone", adminPhone);
        adminData.put("name", "Test Admin");
        adminData.put("role", "admin");
        adminData.put("status", "active");
        db.collection("users").document(adminUid).set(adminData).get();

        // 2. Setup target host applicant for approval test
        String applicantUid = "test_user_host_applicant_001";
        Map<String, Object> userData = new HashMap<>();
        userData.put("uid", applicantUid);
        userData.put("phone", "+919999988888");
        userData.put("name", "Anshu Kumar");
        userData.put("role", "customer"); // Reset role to customer so approval transition works
        userData.put("status", "active");
        db.collection("users").document(applicantUid).set(userData).get();

        Map<String, Object> appData = new HashMap<>();
        appData.put("userId", applicantUid);
        appData.put("hostType", "pg_owner");
        appData.put("applicantName", "Anshu Kumar");
        appData.put("verificationStatus", "pending"); // Reset status to pending
        appData.put("submittedAt", Timestamp.now());
        appData.put("updatedAt", Timestamp.now());
        db.collection("hostApplications").document(applicantUid).set(appData).get();

        try {
            // 3. Approve host application
            Map<String, Object> result = adminService.approveHostApplication(
                    adminUser,
                    applicantUid,
                    "Approved via automated verification test"
            );

            // 4. Assert result payload
            assertNotNull(result, "Result should not be null");
            assertEquals("approved", result.get("verificationStatus"), "Verification status should be approved");

            // 5. Verify applicant user document in Firestore now has role = host
            DocumentSnapshot userDoc = db.collection("users").document(applicantUid).get().get();
            assertTrue(userDoc.exists(), "User document should exist");
            assertEquals("host", userDoc.getString("role"), "User role should be updated to host");

            // 6. Verify hostApplication document in Firestore has verificationStatus = approved
            DocumentSnapshot appDoc = db.collection("hostApplications").document(applicantUid).get().get();
            assertTrue(appDoc.exists(), "Host application document should exist");
            assertEquals("approved", appDoc.getString("verificationStatus"), "Application status should be approved");
        } finally {
            try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(applicantUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("hostApplications").document(applicantUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
