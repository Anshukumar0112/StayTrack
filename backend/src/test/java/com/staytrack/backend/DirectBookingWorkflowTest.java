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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class DirectBookingWorkflowTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser customerUser;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdBookingIds = new ArrayList<>();
    private final List<String> createdSubIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_host_dir_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811122299", "host");

        String adminUid = "test_admin_dir_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000033399", "admin");

        String customerUid = "test_cust_dir_" + UUID.randomUUID().toString().substring(0, 8);
        customerUser = new AuthenticatedUser(customerUid, "+919711144499", "customer");
        userService.getOrCreateUser(customerUser);

        String subId = "test_sub_" + hostUid;
        createdSubIds.add(subId);
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();
    }

    @AfterEach
    void tearDown() {
        for (String bId : createdBookingIds) {
            try {
                db.collection("bookings").document(bId).delete().get();
            } catch (Exception ignored) {
            }
        }
        for (String propId : createdPropertyIds) {
            try {
                db.collection("properties").document(propId).delete().get();
            } catch (Exception ignored) {
            }
        }
        for (String subId : createdSubIds) {
            try {
                db.collection("subscriptions").document(subId).delete().get();
            } catch (Exception ignored) {
            }
        }
    }

    private String createProperty(String category, String stayType, double price, int units) throws Exception {
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Test " + category + " " + UUID.randomUUID().toString().substring(0, 4));
        req.setPropertyType(category);
        req.setStayTypes(List.of(stayType));
        if ("daily".equalsIgnoreCase(stayType)) {
            req.setDailyPrice(price);
        } else {
            req.setMonthlyPrice(price);
        }
        req.setAddress("MG Road");
        req.setCity("Gurugram");
        req.setArea("DLF Phase 2");
        req.setLatitude(28.4815);
        req.setLongitude(77.0865);
        req.setBedrooms(units);
        req.setBathrooms(units);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved for testing");
        return propId;
    }

    @Test
    void testAvailableBnbProceedsToDirectBookingWithAcceptedStatus() throws Exception {
        // Create an available B&B property
        String bnbId = createProperty("bnb", "daily", 3000.0, 2);

        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(bnbId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-11-01");
        bReq.setEndDate("2026-11-04");

        Map<String, Object> booking = bookingService.createBooking(customerUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        assertNotNull(bookingId);
        createdBookingIds.add(bookingId);

        // B&Bs must directly receive 'accepted' status (never 'requested' / host approval)
        assertEquals("accepted", booking.get("bookingStatus"),
                "Available B&B reservation must be created with accepted status for direct booking");
        assertEquals(Boolean.TRUE, booking.get("isDirectBooking"),
                "B&B booking must be flagged as direct booking");

        // Verify in live Firestore document
        DocumentSnapshot doc = db.collection("bookings").document(bookingId).get().get();
        assertEquals("accepted", doc.getString("bookingStatus"));
        assertEquals(Boolean.TRUE, doc.getBoolean("isDirectBooking"));
        assertNotNull(doc.get("holdExpiresAt"), "Payment hold expiration must be set");

        // Verify 30-minute hold window (approx. now + 30 min, NOT 24 hours)
        Object holdObj = doc.get("holdExpiresAt");
        long holdMillis = 0;
        if (holdObj instanceof Timestamp) {
            holdMillis = ((Timestamp) holdObj).toDate().getTime();
        } else if (holdObj instanceof Number) {
            holdMillis = ((Number) holdObj).longValue();
        }
        long now = System.currentTimeMillis();
        long diffMinutes = (holdMillis - now) / (60 * 1000L);
        assertTrue(diffMinutes >= 28 && diffMinutes <= 32,
                "Direct booking hold window must be approximately 30 minutes, actual: " + diffMinutes + " min");
    }

    @Test
    void testAvailableHotelProceedsToDirectBooking() throws Exception {
        String hotelId = createProperty("hotel", "daily", 4500.0, 5);

        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(hotelId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-11-10");
        bReq.setEndDate("2026-11-12");

        Map<String, Object> booking = bookingService.createBooking(customerUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        assertNotNull(bookingId);
        createdBookingIds.add(bookingId);

        assertEquals("accepted", booking.get("bookingStatus"), "Hotel booking must be accepted directly");
        assertEquals(Boolean.TRUE, booking.get("isDirectBooking"));
    }

    @Test
    void testHostelDailyUsesDirectBookingWhereasMonthlyUsesHostApproval() throws Exception {
        // Daily Hostel -> Direct Booking ('accepted')
        String dailyHostelId = createProperty("hostel", "daily", 800.0, 10);
        BookingRequest dailyReq = new BookingRequest();
        dailyReq.setPropertyId(dailyHostelId);
        dailyReq.setBookingType("daily");
        dailyReq.setStartDate("2026-11-05");
        dailyReq.setEndDate("2026-11-08");

        Map<String, Object> dailyBooking = bookingService.createBooking(customerUser, dailyReq);
        String dailyBookingId = (String) dailyBooking.get("bookingId");
        assertNotNull(dailyBookingId);
        createdBookingIds.add(dailyBookingId);

        assertEquals("accepted", dailyBooking.get("bookingStatus"),
                "Daily hostel stay must use direct booking ('accepted')");
        assertEquals(Boolean.TRUE, dailyBooking.get("isDirectBooking"));

        // Monthly Hostel -> Host Approval ('requested')
        String monthlyHostelId = createProperty("hostel", "monthly", 9000.0, 10);
        BookingRequest monthlyReq = new BookingRequest();
        monthlyReq.setPropertyId(monthlyHostelId);
        monthlyReq.setBookingType("monthly");
        monthlyReq.setStartDate("2026-12-01");
        monthlyReq.setEndDate("2027-01-01");

        Map<String, Object> monthlyBooking = bookingService.createBooking(customerUser, monthlyReq);
        String monthlyBookingId = (String) monthlyBooking.get("bookingId");
        assertNotNull(monthlyBookingId);
        createdBookingIds.add(monthlyBookingId);

        assertEquals("requested", monthlyBooking.get("bookingStatus"),
                "Monthly hostel stay must require host approval ('requested')");
        assertEquals(Boolean.FALSE, monthlyBooking.get("isDirectBooking"));
    }

    @Test
    void testPgAndFlatRequireHostApproval() throws Exception {
        // PG
        String pgId = createProperty("pg", "monthly", 11000.0, 6);
        BookingRequest pgReq = new BookingRequest();
        pgReq.setPropertyId(pgId);
        pgReq.setBookingType("monthly");
        pgReq.setStartDate("2026-11-01");
        pgReq.setEndDate("2026-12-01");

        Map<String, Object> pgBooking = bookingService.createBooking(customerUser, pgReq);
        String pgBookingId = (String) pgBooking.get("bookingId");
        assertNotNull(pgBookingId);
        createdBookingIds.add(pgBookingId);

        assertEquals("requested", pgBooking.get("bookingStatus"),
                "PG reservations must require host approval ('requested')");
        assertEquals(Boolean.FALSE, pgBooking.get("isDirectBooking"));

        // Flat
        String flatId = createProperty("flat", "monthly", 35000.0, 1);
        BookingRequest flatReq = new BookingRequest();
        flatReq.setPropertyId(flatId);
        flatReq.setBookingType("monthly");
        flatReq.setStartDate("2026-11-01");
        flatReq.setEndDate("2026-12-01");

        Map<String, Object> flatBooking = bookingService.createBooking(customerUser, flatReq);
        String flatBookingId = (String) flatBooking.get("bookingId");
        assertNotNull(flatBookingId);
        createdBookingIds.add(flatBookingId);

        assertEquals("requested", flatBooking.get("bookingStatus"),
                "Flat reservations must require host approval ('requested')");
        assertEquals(Boolean.FALSE, flatBooking.get("isDirectBooking"));
    }

    @Test
    void testUnavailableBnbFailsAndNeverFallsBackToHostApproval() throws Exception {
        // 1-unit B&B property
        String bnbId = createProperty("bnb", "daily", 2800.0, 1);

        // First guest books the unit
        BookingRequest bReq1 = new BookingRequest();
        bReq1.setPropertyId(bnbId);
        bReq1.setBookingType("daily");
        bReq1.setStartDate("2026-11-15");
        bReq1.setEndDate("2026-11-18");

        Map<String, Object> booking1 = bookingService.createBooking(customerUser, bReq1);
        String booking1Id = (String) booking1.get("bookingId");
        assertNotNull(booking1Id);
        createdBookingIds.add(booking1Id);
        assertEquals("accepted", booking1.get("bookingStatus"));

        // Second guest tries to book overlapping dates for the only unit
        String otherCustomerUid = "test_cust_overlap_" + UUID.randomUUID().toString().substring(0, 8);
        AuthenticatedUser otherCust = new AuthenticatedUser(otherCustomerUid, "+919711144488", "customer");
        userService.getOrCreateUser(otherCust);

        BookingRequest bReq2 = new BookingRequest();
        bReq2.setPropertyId(bnbId);
        bReq2.setBookingType("daily");
        bReq2.setStartDate("2026-11-16");
        bReq2.setEndDate("2026-11-19");

        // Must fail with unavailability exception and NEVER create a 'requested' booking
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            bookingService.createBooking(otherCust, bReq2);
        });

        assertTrue(ex.getMessage().contains("already booked") || ex.getMessage().contains("No available") || ex.getMessage().contains("available"),
                "Unavailable B&B must throw availability exception instead of falling back to host approval");
    }
}
