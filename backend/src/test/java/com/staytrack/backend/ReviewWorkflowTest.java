package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.dto.review.ReviewRequest;
import com.staytrack.backend.repository.ReviewRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.service.ReviewService;
import com.staytrack.backend.service.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ReviewWorkflowTest {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    @Test
    void testReviewSubmissionAndRatingWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        String hostUid = "test_user_host_applicant_001";
        AuthenticatedUser hostUser = new AuthenticatedUser(hostUid, "+919999988888", "host");

        String adminUid = "test_admin_001";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, "+919000000000", "admin");

        String customerUid = "test_user_customer_001";
        AuthenticatedUser customerUser = new AuthenticatedUser(customerUid, "+919777766666", "customer");
        userService.getOrCreateUser(customerUser);

        // 1. Ensure host subscription exists
        String subId = "test_sub_host_001";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        // 2. Create property & approve
        PropertyRequest pReq = new PropertyRequest();
        pReq.setHostType("pg_owner");
        pReq.setTitle("Review Test Hotel");
        pReq.setPropertyType("hotel");
        pReq.setStayTypes(List.of("daily"));
        pReq.setDailyPrice(1000.0);
        pReq.setAddress("789 Indiranagar");
        pReq.setCity("Bengaluru");
        pReq.setArea("Indiranagar");
        pReq.setLatitude(12.9716);
        pReq.setLongitude(77.6412);
        pReq.setBedrooms(4);
        pReq.setBathrooms(4);

        Map<String, Object> property = propertyService.createProperty(hostUser, pReq);
        String propertyId = (String) property.get("propertyId");
        adminService.approveProperty(adminUser, propertyId, "Approved");

        // 3. Seed a dedicated completed booking for review
        String bookingId = "test_booking_review_001";
        Map<String, Object> bookingData = new HashMap<>();
        bookingData.put("bookingId", bookingId);
        bookingData.put("propertyId", propertyId);
        bookingData.put("customerId", customerUid);
        bookingData.put("hostId", hostUid);
        bookingData.put("bookingStatus", "completed");
        bookingData.put("paymentStatus", "paid");
        bookingData.put("amount", 4000L);
        bookingData.put("createdAt", Timestamp.now());
        bookingData.put("updatedAt", Timestamp.now());
        db.collection("bookings").document(bookingId).set(bookingData).get();

        // Cleanup prior test review if exists using correct buildReviewId format (bookingId_reviewerId)
        String reviewId = ReviewRepository.buildReviewId(customerUid, bookingId);
        db.collection("reviews").document(reviewId).delete().get();

        String returnedReviewId = null;
        try {
            // 4. Submit review as customer
            ReviewRequest reviewRequest = new ReviewRequest();
            reviewRequest.setBookingId(bookingId);
            reviewRequest.setRating(5);
            reviewRequest.setComment("Exceptional stay and wonderful host!");

            Map<String, Object> result = reviewService.createReview(customerUser, reviewRequest);
            assertNotNull(result, "Review result should not be null");

            returnedReviewId = (String) result.get("reviewId");
            assertNotNull(returnedReviewId, "Review ID should be returned");
            assertEquals(5, ((Number) result.get("rating")).intValue());

            // 5. Verify live Firestore review document
            DocumentSnapshot reviewDoc = db.collection("reviews").document(returnedReviewId).get().get();
            assertTrue(reviewDoc.exists(), "Review document must exist in Firestore");
            assertEquals("Exceptional stay and wonderful host!", reviewDoc.getString("comment"));

            // 6. Verify property average rating and review count updated in Firestore
            DocumentSnapshot propDoc = db.collection("properties").document(propertyId).get().get();
            assertTrue(propDoc.exists(), "Property document must exist");
            assertEquals(5.0, ((Number) propDoc.get("averageRating")).doubleValue(), 0.01);
            assertEquals(1L, ((Number) propDoc.get("reviewCount")).longValue());
        } finally {
            if (returnedReviewId != null) {
                try { db.collection("reviews").document(returnedReviewId).delete().get(); } catch (Exception ignored) {}
            }
            try { db.collection("reviews").document(reviewId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("bookings").document(bookingId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("properties").document(propertyId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("subscriptions").document(subId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(hostUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(customerUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
