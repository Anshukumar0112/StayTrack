package com.staytrack.backend;

import com.google.cloud.Timestamp;
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
public class BookingRoleAccessWorkflowTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private UserService userService;

    @Test
    void testHostAsGuestAndRoleBasedAccessControl() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        // 1. Setup Admin, Host 1, Host 2, and Unrelated Guest
        String adminUid = "role_test_admin_001";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, "+919000000001", "admin");

        String host1Uid = "role_test_host_001";
        AuthenticatedUser host1User = new AuthenticatedUser(host1Uid, "+919111111111", "host");
        userService.getOrCreateUser(host1User);

        String host2Uid = "role_test_host_002";
        AuthenticatedUser host2User = new AuthenticatedUser(host2Uid, "+919222222222", "host");
        userService.getOrCreateUser(host2User);

        String outsiderUid = "role_test_outsider_001";
        AuthenticatedUser outsiderUser = new AuthenticatedUser(outsiderUid, "+919333333333", "customer");
        userService.getOrCreateUser(outsiderUser);

        // 2. Active subscription for Host 2 so properties can be listed
        String subId = "role_test_sub_002";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", host2Uid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        String property2Id = null;
        String bookingId = null;

        try {
            // 3. Host 2 creates and Admin approves a property
            PropertyRequest pReq = new PropertyRequest();
            pReq.setHostType("pg_owner");
            pReq.setTitle("Cozy Studio in Connaught Place");
            pReq.setPropertyType("hotel");
            pReq.setStayTypes(List.of("daily"));
            pReq.setDailyPrice(2500.0);
            pReq.setAddress("12 Barakhamba Road");
            pReq.setCity("New Delhi");
            pReq.setArea("Connaught Place");
            pReq.setLatitude(28.6304);
            pReq.setLongitude(77.2177);
            pReq.setBedrooms(1);
            pReq.setBathrooms(1);
            pReq.setFurnished(true);
            pReq.setAreaSqFt(650.0);

            Map<String, Object> property2 = propertyService.createProperty(host2User, pReq);
            property2Id = (String) property2.get("propertyId");
            adminService.approveProperty(adminUser, property2Id, "Verified");

            // SCENARIO B: Host 2 cannot book their own property
            BookingRequest selfBookingReq = new BookingRequest();
            selfBookingReq.setPropertyId(property2Id);
            selfBookingReq.setBookingType("daily");
            selfBookingReq.setStartDate("2026-11-01");
            selfBookingReq.setEndDate("2026-11-03");

            assertThrows(SecurityException.class, () -> {
                bookingService.createBooking(host2User, selfBookingReq);
            }, "Host must not be allowed to book their own property");

            // SCENARIO A: Host 1 books Host 2's property as a guest
            BookingRequest hostAsGuestReq = new BookingRequest();
            hostAsGuestReq.setPropertyId(property2Id);
            hostAsGuestReq.setBookingType("daily");
            hostAsGuestReq.setStartDate("2026-11-05");
            hostAsGuestReq.setEndDate("2026-11-08");
            hostAsGuestReq.setGuestName("Host One Traveling");
            hostAsGuestReq.setContactPhone("+919111111111");

            Map<String, Object> booking = bookingService.createBooking(host1User, hostAsGuestReq);
            assertNotNull(booking);
            bookingId = (String) booking.get("bookingId");
            assertNotNull(bookingId);
            assertEquals("accepted", booking.get("bookingStatus"));
            assertEquals(Boolean.TRUE, booking.get("isDirectBooking"));
            assertEquals(host1Uid, booking.get("customerId"), "Host 1 must be saved as customerId");
            assertEquals(host2Uid, booking.get("hostId"), "Host 2 must be saved as hostId");
            assertEquals("Host One Traveling", booking.get("guestName"));
            assertEquals("Cozy Studio in Connaught Place", booking.get("propertyTitle"));
            assertEquals("New Delhi", booking.get("city"));

            // SCENARIO C: Role-based separation in list views
            final String finalBookingId = bookingId;
            // Host 1's guest view ("My Bookings") should contain this booking
            List<Map<String, Object>> host1MyBookings = bookingService.getMyBookings(host1User);
            assertTrue(host1MyBookings.stream().anyMatch(b -> finalBookingId.equals(b.get("bookingId"))),
                    "Host 1's My Bookings must include their stay as a guest");

            // Host 1's host view ("Bookings") must NOT contain this booking
            List<Map<String, Object>> host1HostBookings = bookingService.getHostBookings(host1User);
            assertFalse(host1HostBookings.stream().anyMatch(b -> finalBookingId.equals(b.get("bookingId"))),
                    "Host 1's Host Bookings must NOT include bookings where they are guest");

            // Host 2's host view ("Bookings") must contain this booking
            List<Map<String, Object>> host2HostBookings = bookingService.getHostBookings(host2User);
            assertTrue(host2HostBookings.stream().anyMatch(b -> finalBookingId.equals(b.get("bookingId"))),
                    "Host 2's Host Bookings must include reservations on their property");

            // Host 2's guest view ("My Bookings") must NOT contain this booking
            List<Map<String, Object>> host2MyBookings = bookingService.getMyBookings(host2User);
            assertFalse(host2MyBookings.stream().anyMatch(b -> finalBookingId.equals(b.get("bookingId"))),
                    "Host 2's My Bookings must NOT include reservations on their property");

            // SCENARIO D: Authorization on booking details and actions
            // Outsider cannot view this booking
            assertThrows(SecurityException.class, () -> {
                bookingService.getBooking(outsiderUser, finalBookingId);
            }, "Outsider cannot view booking details");

            // Host 1 (guest) cannot accept the booking
            assertThrows(SecurityException.class, () -> {
                bookingService.acceptBooking(host1User, finalBookingId);
            }, "Guest cannot accept their own booking even if they have role 'host'");

            // Host 2 (host) cannot cancel the booking (must reject instead)
            assertThrows(SecurityException.class, () -> {
                bookingService.cancelBooking(host2User, finalBookingId);
            }, "Host cannot call cancelBooking on their property reservation");

            // Host 2 (host) accepts the booking
            Map<String, Object> acceptedBooking = bookingService.acceptBooking(host2User, finalBookingId);
            assertEquals("accepted", acceptedBooking.get("bookingStatus"));

            // Host 1 (guest) can prepare payment
            Map<String, Object> paymentPendingBooking = bookingService.markPaymentPending(host1User, finalBookingId);
            assertEquals("payment_pending", paymentPendingBooking.get("bookingStatus"));

            // Host 1 (guest) can cancel the booking
            Map<String, Object> cancelledBooking = bookingService.cancelBooking(host1User, finalBookingId);
            assertEquals("cancelled", cancelledBooking.get("bookingStatus"));

        } finally {
            if (bookingId != null) {
                try { db.collection("bookings").document(bookingId).delete().get(); } catch (Exception ignored) {}
            }
            if (property2Id != null) {
                try { db.collection("properties").document(property2Id).delete().get(); } catch (Exception ignored) {}
            }
            try { db.collection("subscriptions").document(subId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(host1Uid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(host2Uid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(outsiderUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
