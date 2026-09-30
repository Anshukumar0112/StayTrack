package com.staytrack.backend;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.host.HostApplicationRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.HostApplicationService;
import com.staytrack.backend.service.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class HostApplicationWorkflowTest {

    @Autowired
    private HostApplicationService hostApplicationService;

    @Autowired
    private UserService userService;

    @Test
    void testHostApplicationSubmissionWorkflow() throws Exception {
        String testUid = "test_user_host_applicant_submission_001";
        String testPhone = "+919999988888";
        AuthenticatedUser user = new AuthenticatedUser(testUid, testPhone, "customer");

        // Cleanup prior test artifacts to make test idempotent
        Firestore db = FirestoreClient.getFirestore();
        db.collection("hostApplications").document(testUid).delete().get();
        db.collection("users").document(testUid).delete().get();

        // Ensure test user profile exists in Firestore
        userService.getOrCreateUser(user);

        // Prepare Host Application Request
        HostApplicationRequest request = new HostApplicationRequest();
        request.setHostType("pg_owner");
        request.setApplicantName("Anshu Kumar");
        request.setEmail("anshu@staytrack.com");

        try {
            // Submit Host Application
            Map<String, Object> result = hostApplicationService.submitApplication(user, request);

            // Assertions
            assertNotNull(result, "Result should not be null");
            assertEquals("pending", result.get("verificationStatus"), "Verification status should be pending");
            assertEquals(testUid, result.get("applicationId"), "Application ID should match user UID");
        } finally {
            try { db.collection("hostApplications").document(testUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(testUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
