package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.BookingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ActualFailingBookingRegressionTest {

    @Autowired
    private BookingService bookingService;

    @Test
    @DisplayName("Actual failing property 'c2c844c0-67b8-471d-81f2-f9a431289dd9' creates a direct booking in 'accepted' status without host interference")
    public void testActualFailingBnbCreatesDirectBookingAccepted() throws Exception {
        String propertyId = "c2c844c0-67b8-471d-81f2-f9a431289dd9";

        // Pick future test dates so there is no calendar conflict
        String startDate = LocalDate.now().plusMonths(3).toString();
        String endDate = LocalDate.now().plusMonths(3).plusDays(2).toString();

        AuthenticatedUser testGuest = new AuthenticatedUser(
                "test-actual-guest-id",
                "guest@example.com",
                "customer"
        );

        BookingRequest request = new BookingRequest();
        request.setPropertyId(propertyId);
        request.setBookingType("daily");
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setGuestName("Rohit Test");
        request.setContactPhone("9876543210");

        Map<String, Object> created = bookingService.createBooking(testGuest, request);

        assertNotNull(created);
        String createdBookingId = String.valueOf(created.get("bookingId"));
        assertNotNull(createdBookingId);

        // Verification 1: Must be direct booking
        assertEquals(Boolean.TRUE, created.get("isDirectBooking"),
                "B&B booking must have isDirectBooking == true");

        // Verification 2: Must be 'accepted' immediately ready for guest payment (NEVER 'requested')
        assertEquals("accepted", created.get("bookingStatus"),
                "Available B&B must enter 'accepted' status immediately without host interference");

        // Verification 3: Hold expiration must be set for 30 minutes (payment hold)
        assertNotNull(created.get("holdExpiresAt"), "Direct booking must have holdExpiresAt set");

        // Verification 4: Test getBooking retrieval returns isDirectBooking == true and accepted
        Map<String, Object> retrieved = bookingService.getBooking(testGuest, createdBookingId);
        assertNotNull(retrieved);
        assertEquals("accepted", retrieved.get("bookingStatus"), "getBooking must reflect accepted status");
        assertEquals(Boolean.TRUE, retrieved.get("isDirectBooking"), "getBooking must reflect isDirectBooking == true");

        // Clean up: delete test booking from Firestore so calendar remains clean
        Firestore db = FirestoreClient.getFirestore();
        db.collection("bookings").document(createdBookingId).delete().get();
    }

    @Test
    @DisplayName("Verify getBooking heals in-flight legacy booking for B&B to accepted direct booking")
    public void testGetBookingHealsLegacyRequestedBnb() throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        String legacyId = "test-legacy-bnb-booking";

        // Create a simulated legacy booking in Firestore that was saved as 'requested' with null isDirectBooking
        long nowMillis = System.currentTimeMillis();
        long holdMillis = nowMillis + 24 * 60 * 60 * 1000L;

        Map<String, Object> legacyData = new java.util.HashMap<>();
        legacyData.put("bookingId", legacyId);
        legacyData.put("propertyId", "c2c844c0-67b8-471d-81f2-f9a431289dd9");
        legacyData.put("customerId", "test-legacy-cust");
        legacyData.put("hostId", "rd3TX5ucG6Zd3Sq0Y9sSGQcH2cU2");
        legacyData.put("bookingType", "daily");
        legacyData.put("startDate", "2027-01-01");
        legacyData.put("endDate", "2027-01-02");
        legacyData.put("amount", 2000L);
        legacyData.put("bookingStatus", "requested");
        legacyData.put("paymentStatus", "created");
        legacyData.put("holdExpiresAt", Timestamp.ofTimeSecondsAndNanos(holdMillis / 1000, 0));
        legacyData.put("createdAt", Timestamp.now());
        legacyData.put("updatedAt", Timestamp.now());

        db.collection("bookings").document(legacyId).set(legacyData).get();

        try {
            AuthenticatedUser custUser = new AuthenticatedUser("test-legacy-cust", "legacy@test.com", "customer");
            Map<String, Object> healed = bookingService.getBooking(custUser, legacyId);

            assertNotNull(healed);
            assertEquals(Boolean.TRUE, healed.get("isDirectBooking"),
                    "Healed legacy B&B booking must have isDirectBooking == true");
            assertEquals("accepted", healed.get("bookingStatus"),
                    "Healed legacy B&B booking must be promoted from requested to accepted so guest can pay");

        } finally {
            db.collection("bookings").document(legacyId).delete().get();
        }
    }

    @Test
    @DisplayName("Inspect and verify user screenshot booking 15a36e56-f517-4d3e-9364-0805a6ee1bba")
    public void testInspectAndHealUserScreenshotBooking() throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        String userBookingId = "15a36e56-f517-4d3e-9364-0805a6ee1bba";
        DocumentSnapshot doc = db.collection("bookings").document(userBookingId).get().get();
        if (doc.exists()) {
            System.out.println("USER SCREENSHOT BOOKING RAW DATA: " + doc.getData());
            String custId = doc.getString("customerId");
            AuthenticatedUser user = new AuthenticatedUser(custId, "rohit@test.com", "customer");
            Map<String, Object> bookingMap = bookingService.getBooking(user, userBookingId);
            System.out.println("AFTER GETBOOKING ENRICHMENT: isDirectBooking=" + bookingMap.get("isDirectBooking")
                    + ", bookingStatus=" + bookingMap.get("bookingStatus")
                    + ", status=" + bookingMap.get("status"));
            assertEquals(Boolean.TRUE, bookingMap.get("isDirectBooking"),
                    "User booking must be recognized as isDirectBooking == true");
            assertEquals("accepted", bookingMap.get("bookingStatus"),
                    "User booking must be healed to accepted direct reservation");
        }
    }
}
