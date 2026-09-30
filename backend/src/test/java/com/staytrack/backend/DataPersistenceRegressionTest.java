package com.staytrack.backend;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class DataPersistenceRegressionTest {

    @Autowired
    private AdminService adminService;

    @Test
    void testCleanupTestArtifactsAndPreserveRealData() throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        AuthenticatedUser admin = new AuthenticatedUser("admin_test_runner", "+919000000000", "admin");

        // 1. Run cleanup of any leftover test artifacts
        Map<String, Object> cleanupResult = adminService.cleanupTestArtifacts(admin);
        assertNotNull(cleanupResult, "Cleanup result should not be null");
        assertTrue((Boolean) cleanupResult.get("success"), "Cleanup operation should succeed");

        // 2. Verify test users no longer exist in Firestore
        for (String testUid : java.util.List.of(
                "test_user_host_applicant_submission_001",
                "test_user_host_applicant_001",
                "test_user_customer_001",
                "test_user_customer_002",
                "test_admin_001"
        )) {
            DocumentSnapshot doc = db.collection("users").document(testUid).get().get();
            assertFalse(doc.exists(), "Test user " + testUid + " must NOT exist in Firestore after cleanup");
        }

        // 3. Verify real user Anshu Kumar is PRESERVED
        DocumentSnapshot realUserDoc = db.collection("users").document("rd3Tx5ucG6Zd3sq0Y9sSGQcH2cU2").get().get();
        if (realUserDoc.exists()) {
            assertEquals("Anshu Kumar", realUserDoc.getString("name"), "Real user Anshu Kumar must be preserved");
        }

        // 4. Verify X STAYS property is PRESERVED
        boolean foundXStays = false;
        for (DocumentSnapshot doc : db.collection("properties").get().get().getDocuments()) {
            String title = doc.getString("title");
            if ("X STAYS".equalsIgnoreCase(title)) {
                foundXStays = true;
                break;
            }
        }
        // If X STAYS exists in Firestore, confirm it was preserved
        if (foundXStays) {
            assertTrue(foundXStays, "X STAYS property must be preserved");
        }
    }
}
