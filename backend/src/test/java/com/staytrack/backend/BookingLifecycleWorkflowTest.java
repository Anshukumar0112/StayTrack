package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.BookingService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.service.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class BookingLifecycleWorkflowTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private UserService userService;

    @Test
    void testBookingCreationAndLockWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        // 1. Setup host, admin, and customer users
        String hostUid = "test_user_host_applicant_001";
        AuthenticatedUser hostUser = new AuthenticatedUser(hostUid, "+919999988888", "host");

        String adminUid = "test_admin_001";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, "+919000000000", "admin");

        String customerUid = "test_user_customer_001";
        AuthenticatedUser customerUser = new AuthenticatedUser(customerUid, "+919777766666", "customer");
        userService.getOrCreateUser(customerUser);

        // 2. Ensure host has active subscription
        String subId = "test_sub_host_001";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        // 3. Create & approve a property for booking
        PropertyRequest pReq = new PropertyRequest();
        pReq.setHostType("pg_owner");
        pReq.setTitle("Royal PG Koramangala");
        pReq.setPropertyType("pg");
        pReq.setStayTypes(List.of("daily"));
        pReq.setDailyPrice(1500.0);
        pReq.setAddress("456 8th Main");
        pReq.setCity("Bengaluru");
        pReq.setArea("Koramangala");
        pReq.setLatitude(12.9352);
        pReq.setLongitude(77.6245);
        pReq.setBedrooms(5);
        pReq.setBathrooms(5);
        pReq.setFurnished(true);
        pReq.setAreaSqFt(1800.0);

        Map<String, Object> property = propertyService.createProperty(hostUser, pReq);
        String propertyId = (String) property.get("propertyId");

        adminService.approveProperty(adminUser, propertyId, "Verified");

        // 4. Customer submits booking request
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propertyId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-10-01");
        bReq.setEndDate("2026-10-05");

        Map<String, Object> booking = bookingService.createBooking(customerUser, bReq);
        assertNotNull(booking, "Booking payload should not be null");

        String bookingId = (String) booking.get("bookingId");
        assertNotNull(bookingId, "Booking ID should be set");
        assertEquals("requested", booking.get("bookingStatus"), "Booking status should be requested");
        assertEquals("created", booking.get("paymentStatus"), "Payment status should be created");
        assertEquals(6000L, ((Number) booking.get("amount")).longValue(), "Daily rate 1500 * 4 nights should be 6000");

        // 5. Verify live Firestore document in bookings collection
        DocumentSnapshot bookingDoc = db.collection("bookings").document(bookingId).get().get();
        assertTrue(bookingDoc.exists(), "Booking document must exist in Firestore");
        assertEquals("requested", bookingDoc.getString("bookingStatus"));
        assertEquals(customerUid, bookingDoc.getString("customerId"));

        // 6. Verify transactional lock / double booking prevention
        String customer2Uid = "test_user_customer_002";
        AuthenticatedUser customer2User = new AuthenticatedUser(customer2Uid, "+919666655555", "customer");
        userService.getOrCreateUser(customer2User);

        BookingRequest bReqOverlap = new BookingRequest();
        bReqOverlap.setPropertyId(propertyId);
        bReqOverlap.setBookingType("daily");
        bReqOverlap.setStartDate("2026-10-03"); // Overlaps with 2026-10-01 to 2026-10-05
        bReqOverlap.setEndDate("2026-10-07");

        Exception exception = assertThrows(RuntimeException.class, () -> {
            bookingService.createBooking(customer2User, bReqOverlap);
        }, "Overlapping booking request must throw an exception due to date locks");

        assertNotNull(exception.getMessage(), "Exception message should explain double-booking conflict");
    }
}
