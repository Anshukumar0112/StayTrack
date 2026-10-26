package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.dto.visit.VisitRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class CompleteEndToEndBookingJourneyVerificationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    @Autowired
    private VisitService visitService;

    @Autowired
    private BookingRepository bookingRepository;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser guestUser;
    private AuthenticatedUser secondGuestUser;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdBookingIds = new ArrayList<>();
    private final List<String> createdVisitIds = new ArrayList<>();
    private final List<String> createdSubIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_host_e2e_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811122111", "host");

        String adminUid = "test_admin_e2e_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000033111", "admin");

        String guestUid = "test_guest_e2e_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser = new AuthenticatedUser(guestUid, "+919711144111", "customer");
        userService.getOrCreateUser(guestUser);

        String secondGuestUid = "test_guest2_e2e_" + UUID.randomUUID().toString().substring(0, 8);
        secondGuestUser = new AuthenticatedUser(secondGuestUid, "+919711144222", "customer");
        userService.getOrCreateUser(secondGuestUser);

        // Active host subscription
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
        for (String vId : createdVisitIds) {
            try {
                db.collection("visits").document(vId).delete().get();
            } catch (Exception ignored) {}
        }
        for (String bId : createdBookingIds) {
            try {
                db.collection("bookings").document(bId).delete().get();
            } catch (Exception ignored) {}
        }
        for (String propId : createdPropertyIds) {
            try {
                db.collection("properties").document(propId).delete().get();
            } catch (Exception ignored) {}
        }
        for (String subId : createdSubIds) {
            try {
                db.collection("subscriptions").document(subId).delete().get();
            } catch (Exception ignored) {}
        }
    }

    private String createAndApproveProperty(String category, String stayType, double dailyPrice, double monthlyPrice) throws Exception {
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Verified " + category.toUpperCase() + " " + UUID.randomUUID().toString().substring(0, 4));
        req.setPropertyType(category);
        req.setStayTypes("daily_and_monthly".equalsIgnoreCase(stayType) ? List.of("daily", "monthly") : List.of(stayType));
        if (dailyPrice > 0) req.setDailyPrice(dailyPrice);
        if (monthlyPrice > 0) req.setMonthlyPrice(monthlyPrice);
        req.setAddress("Golf Course Road");
        req.setCity("Gurugram");
        req.setArea("Sector 42");
        req.setLatitude(28.4595);
        req.setLongitude(77.0266);
        req.setBedrooms(1);
        req.setBathrooms(1);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved for testing");
        return propId;
    }

    @Test
    @Order(1)
    @DisplayName("Flow 1: B&B / Hotel -> Available inventory -> Direct booking enters 'accepted' -> Payment required -> Booking confirms after payment")
    void testFlow1_BnbHotel_AvailableInventory_PaymentRequired_ConfirmsAfterPayment() throws Exception {
        System.out.println("=== Starting Flow 1: B&B / Hotel Direct Booking & Payment Journey ===");

        // Step 1: Create active B&B property
        String bnbId = createAndApproveProperty("bnb", "daily", 3500.0, 0);
        String start = LocalDate.now().plusMonths(2).toString();
        String end = LocalDate.now().plusMonths(2).plusDays(3).toString();

        // Step 2: Guest books available inventory
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(bnbId);
        bReq.setBookingType("daily");
        bReq.setStartDate(start);
        bReq.setEndDate(end);
        bReq.setGuestName("Alice Traveler");
        bReq.setContactPhone("9811122233");

        Map<String, Object> created = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) created.get("bookingId");
        assertNotNull(bookingId, "Booking ID must be generated");
        createdBookingIds.add(bookingId);

        // Assert 1: Must be direct booking
        assertEquals(Boolean.TRUE, created.get("isDirectBooking"), "B&B must have isDirectBooking == true");

        // Assert 2: Status is 'accepted' immediately ready for guest payment (NEVER 'requested')
        assertEquals("accepted", created.get("bookingStatus"),
                "Available B&B must enter 'accepted' status immediately without host interference");

        // Assert 3: Payment status is 'created' and 30-min hold timer is active
        assertEquals("created", created.get("paymentStatus"), "Payment status must initially be 'created'");
        assertNotNull(created.get("holdExpiresAt"), "Payment hold expiration must be set");

        // Step 3: Simulate successful payment capture
        Map<String, Object> confirmed = bookingRepository.confirmWithAvailabilityCheck(bnbId, bookingId);
        assertNotNull(confirmed, "Booking confirmation must succeed");

        // Assert 4: Status transitions to 'confirmed' and paymentStatus to 'captured'
        assertEquals("confirmed", confirmed.get("bookingStatus"), "Booking status must transition to 'confirmed'");
        assertEquals("captured", confirmed.get("paymentStatus"), "Payment status must transition to 'captured'");

        // Verify in live Firestore document
        DocumentSnapshot doc = db.collection("bookings").document(bookingId).get().get();
        assertEquals("confirmed", doc.getString("bookingStatus"));
        assertEquals("captured", doc.getString("paymentStatus"));
        assertNull(doc.get("holdExpiresAt"), "Hold timer must be cleared after confirmation");

        System.out.println("=== Flow 1 PASSED: B&B direct reservation created (accepted), payment captured, booking confirmed! ===");
    }

    @Test
    @Order(2)
    @DisplayName("Flow 2: B&B / Hotel unavailable -> Guest cannot book and is NEVER routed to host approval")
    void testFlow2_BnbHotel_Unavailable_CannotBook_NeverRoutedToHostApproval() throws Exception {
        System.out.println("=== Starting Flow 2: Unavailable B&B Rejection & No Host Routing ===");

        // Step 1: Create 1-unit B&B and book it for specific dates
        String bnbId = createAndApproveProperty("bnb", "daily", 4000.0, 0);
        String start = LocalDate.now().plusMonths(3).toString();
        String end = LocalDate.now().plusMonths(3).plusDays(2).toString();

        BookingRequest firstReq = new BookingRequest();
        firstReq.setPropertyId(bnbId);
        firstReq.setBookingType("daily");
        firstReq.setStartDate(start);
        firstReq.setEndDate(end);

        Map<String, Object> booking1 = bookingService.createBooking(guestUser, firstReq);
        String booking1Id = (String) booking1.get("bookingId");
        assertNotNull(booking1Id);
        createdBookingIds.add(booking1Id);
        assertEquals("accepted", booking1.get("bookingStatus"));

        // Step 2: Second guest attempts to book overlapping dates
        BookingRequest overlapReq = new BookingRequest();
        overlapReq.setPropertyId(bnbId);
        overlapReq.setBookingType("daily");
        overlapReq.setStartDate(start);
        overlapReq.setEndDate(end);

        // Assert: Second booking attempt throws IllegalStateException
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            bookingService.createBooking(secondGuestUser, overlapReq);
        });

        assertTrue(ex.getMessage().toLowerCase().contains("already booked"),
                "Exception message must specify property is already booked, actual: " + ex.getMessage());

        // Assert: No second booking document was created in Firestore under requested or any status
        List<Map<String, Object>> secondGuestBookings = bookingService.getMyBookings(secondGuestUser);
        boolean overlapFound = secondGuestBookings.stream()
                .anyMatch(b -> bnbId.equals(b.get("propertyId")));
        assertFalse(overlapFound, "Second guest must NOT have any booking created (neither requested nor accepted)");

        System.out.println("=== Flow 2 PASSED: Unavailable B&B throws exception and is NEVER routed to host approval ===");
    }

    @Test
    @Order(3)
    @DisplayName("Flow 3: PG / Flat -> Guest requests booking -> Host receives request -> Host approves and rejects")
    void testFlow3_PgFlat_GuestRequests_HostReceives_HostApprovesAndRejects() throws Exception {
        System.out.println("=== Starting Flow 3: PG / Flat Request-to-Book Journey ===");

        // Step 1: Create active PG property
        String pgId = createAndApproveProperty("pg", "monthly", 0, 12000.0);
        String start = LocalDate.now().plusMonths(1).toString();
        String end = LocalDate.now().plusMonths(2).toString();

        // Step 2: Guest submits booking request
        BookingRequest pgReq = new BookingRequest();
        pgReq.setPropertyId(pgId);
        pgReq.setBookingType("monthly");
        pgReq.setStartDate(start);
        pgReq.setEndDate(end);
        pgReq.setGuestName("Vikram Student");
        pgReq.setContactPhone("9822233344");

        Map<String, Object> created = bookingService.createBooking(guestUser, pgReq);
        String bookingId = (String) created.get("bookingId");
        assertNotNull(bookingId);
        createdBookingIds.add(bookingId);

        // Assert 1: PG is Request-to-book (NOT direct booking)
        assertEquals(Boolean.FALSE, created.get("isDirectBooking"), "PG booking must have isDirectBooking == false");
        assertEquals("requested", created.get("bookingStatus"), "PG booking must enter 'requested' status");

        // Step 3: Host receives the request in getHostBookings()
        List<Map<String, Object>> hostBookings = bookingService.getHostBookings(hostUser);
        Optional<Map<String, Object>> foundBooking = hostBookings.stream()
                .filter(b -> bookingId.equals(b.get("bookingId")))
                .findFirst();
        assertTrue(foundBooking.isPresent(), "Host must receive the booking request in their dashboard");
        assertEquals("requested", foundBooking.get().get("bookingStatus"));

        // Step 4a: Host approves request
        Map<String, Object> acceptedBooking = bookingService.acceptBooking(hostUser, bookingId);
        assertEquals("accepted", acceptedBooking.get("bookingStatus"),
                "Booking status must transition to 'accepted' upon host approval");
        assertNotNull(acceptedBooking.get("holdExpiresAt"), "Guest payment hold timer must be set upon acceptance");

        // Step 4b: Test rejection flow with a second PG request
        String start2 = LocalDate.now().plusMonths(3).toString();
        String end2 = LocalDate.now().plusMonths(4).toString();

        BookingRequest pgReq2 = new BookingRequest();
        pgReq2.setPropertyId(pgId);
        pgReq2.setBookingType("monthly");
        pgReq2.setStartDate(start2);
        pgReq2.setEndDate(end2);

        Map<String, Object> created2 = bookingService.createBooking(secondGuestUser, pgReq2);
        String bookingId2 = (String) created2.get("bookingId");
        assertNotNull(bookingId2);
        createdBookingIds.add(bookingId2);
        assertEquals("requested", created2.get("bookingStatus"));

        // Host rejects request
        Map<String, Object> rejectedBooking = bookingService.rejectBooking(hostUser, bookingId2);
        assertEquals("rejected", rejectedBooking.get("bookingStatus"),
                "Booking status must transition to 'rejected' upon host decline");

        System.out.println("=== Flow 3 PASSED: PG request-to-book verified (requested -> host receives -> host approves/rejects) ===");
    }

    @Test
    @Order(4)
    @DisplayName("Flow 4: Hostel -> Daily stay follows direct booking; Monthly stay follows host approval")
    void testFlow4_Hostel_DailyDirectBooking_MonthlyHostApproval() throws Exception {
        System.out.println("=== Starting Flow 4: Hostel Dual-Model Routing Journey ===");

        // Step 1: Create active Hostel property supporting both daily and monthly stays
        String hostelId = createAndApproveProperty("hostel", "daily_and_monthly", 900.0, 9500.0);

        // Step 2: Guest books a Daily stay
        BookingRequest dailyReq = new BookingRequest();
        dailyReq.setPropertyId(hostelId);
        dailyReq.setBookingType("daily");
        dailyReq.setStartDate(LocalDate.now().plusMonths(1).toString());
        dailyReq.setEndDate(LocalDate.now().plusMonths(1).plusDays(4).toString());

        Map<String, Object> dailyBooking = bookingService.createBooking(guestUser, dailyReq);
        String dailyBookingId = (String) dailyBooking.get("bookingId");
        assertNotNull(dailyBookingId);
        createdBookingIds.add(dailyBookingId);

        // Assert 4a: Daily stay -> Direct Booking ('accepted')
        assertEquals("accepted", dailyBooking.get("bookingStatus"),
                "Daily hostel stay MUST follow direct booking ('accepted')");
        assertEquals(Boolean.TRUE, dailyBooking.get("isDirectBooking"),
                "Daily hostel stay must have isDirectBooking == true");

        // Step 3: Guest books a Monthly stay
        BookingRequest monthlyReq = new BookingRequest();
        monthlyReq.setPropertyId(hostelId);
        monthlyReq.setBookingType("monthly");
        monthlyReq.setStartDate(LocalDate.now().plusMonths(2).toString());
        monthlyReq.setEndDate(LocalDate.now().plusMonths(3).toString());

        Map<String, Object> monthlyBooking = bookingService.createBooking(secondGuestUser, monthlyReq);
        String monthlyBookingId = (String) monthlyBooking.get("bookingId");
        assertNotNull(monthlyBookingId);
        createdBookingIds.add(monthlyBookingId);

        // Assert 4b: Monthly stay -> Host Approval ('requested')
        assertEquals("requested", monthlyBooking.get("bookingStatus"),
                "Monthly hostel stay MUST follow host approval ('requested')");
        assertEquals(Boolean.FALSE, monthlyBooking.get("isDirectBooking"),
                "Monthly hostel stay must have isDirectBooking == false");

        System.out.println("=== Flow 4 PASSED: Hostel daily follows direct booking (accepted), monthly follows host approval (requested) ===");
    }

    @Test
    @Order(5)
    @DisplayName("Flow 5: Property Visits -> Guest schedules visit -> Appears in My Bookings & Host Dashboard -> Zero accommodation inventory locked")
    void testFlow5_Visits_GuestSchedules_AppearsInGuestAndHost_ZeroInventoryLocked() throws Exception {
        System.out.println("=== Starting Flow 5: Property Visit Journey & Zero Inventory Locking ===");

        // Step 1: Create active PG property
        String pgId = createAndApproveProperty("pg", "monthly", 0, 14000.0);
        String visitDate = LocalDate.now().plusDays(5).toString();
        String timeSlot = "11:00 AM - 12:00 PM";

        // Step 2: Guest schedules a property visit without requiring a phone number
        VisitRequest vReq = new VisitRequest();
        vReq.setPropertyId(pgId);
        vReq.setVisitDate(visitDate);
        vReq.setTimeSlot(timeSlot);
        vReq.setVisitorName("Neha Visitor");
        vReq.setNotes("Looking for single occupancy room");

        Map<String, Object> visit = visitService.createVisit(guestUser, vReq);
        String visitId = (String) visit.get("visitId");
        assertNotNull(visitId, "Visit ID must be generated");
        createdVisitIds.add(visitId);

        // Assert 1: Visit status is 'scheduled'
        assertEquals("scheduled", visit.get("status"), "Visit status must be 'scheduled'");
        assertNotNull(visit.get("referenceId"), "Human-readable reference ID must be generated");

        // Step 3: Visit appears in Guest's My Bookings ('getMyVisits')
        List<Map<String, Object>> guestVisits = visitService.getMyVisits(guestUser);
        Optional<Map<String, Object>> foundGuestVisit = guestVisits.stream()
                .filter(v -> visitId.equals(v.get("visitId")))
                .findFirst();
        assertTrue(foundGuestVisit.isPresent(), "Visit must appear in Guest's My Bookings");
        assertEquals("scheduled", foundGuestVisit.get().get("status"));

        // Step 4: Visit appears in Host's Dashboard ('getHostVisits')
        List<Map<String, Object>> hostVisits = visitService.getHostVisits(hostUser);
        Optional<Map<String, Object>> foundHostVisit = hostVisits.stream()
                .filter(v -> visitId.equals(v.get("visitId")))
                .findFirst();
        assertTrue(foundHostVisit.isPresent(), "Visit must appear in Host's Dashboard");
        assertEquals("scheduled", foundHostVisit.get().get("status"));
        assertEquals("Neha Visitor", foundHostVisit.get().get("visitorName"));

        // Step 5: Critical Assertion — Zero Inventory Lock!
        // The property must remain 100% available for booking on the visit date!
        Map<String, Object> availCheck = propertyService.checkPropertyAvailability(
                pgId,
                visitDate,
                LocalDate.now().plusDays(35).toString(),
                null,
                null,
                "monthly",
                null,
                null,
                null
        );
        assertEquals(Boolean.TRUE, availCheck.get("available"),
                "Scheduled visit MUST NOT lock property inventory; checkPropertyAvailability must return available=true");

        // Another guest can successfully book the property during the visit date
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(pgId);
        bReq.setBookingType("monthly");
        bReq.setStartDate(visitDate);
        bReq.setEndDate(LocalDate.now().plusDays(35).toString());

        Map<String, Object> booking = bookingService.createBooking(secondGuestUser, bReq);
        assertNotNull(booking.get("bookingId"), "Booking during visit date must succeed without collision");
        createdBookingIds.add((String) booking.get("bookingId"));

        System.out.println("=== Flow 5 PASSED: Visit appears in guest & host views and NO inventory is locked ===");
    }
}
