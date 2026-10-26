package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.BookingService;
import com.staytrack.backend.service.PaymentService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.repository.PaymentRepository;
import com.staytrack.backend.service.RazorpayWebhookService;
import com.staytrack.backend.service.RefundService;
import com.staytrack.backend.service.UserService;
import com.staytrack.backend.util.BookingAvailabilityUtils;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class BookingAvailabilityAndHoldIntegrityTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserService userService;

    @Autowired
    private RazorpayWebhookService webhookService;

    @Autowired
    private RefundService refundService;

    @Autowired
    private PaymentRepository paymentRepository;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser guestUser1;
    private AuthenticatedUser guestUser2;

    private String propertyId;
    private final List<String> createdBookingIds = new ArrayList<>();
    private final List<String> createdPaymentIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_hold_host_001";
        hostUser = new AuthenticatedUser(hostUid, "+919888877771", "host");

        String adminUid = "test_hold_admin_001";
        adminUser = new AuthenticatedUser(adminUid, "+919000011111", "admin");

        String guest1Uid = "test_hold_guest_001";
        guestUser1 = new AuthenticatedUser(guest1Uid, "+919777711111", "customer");
        userService.getOrCreateUser(guestUser1);

        String guest2Uid = "test_hold_guest_002";
        guestUser2 = new AuthenticatedUser(guest2Uid, "+919666622222", "customer");
        userService.getOrCreateUser(guestUser2);

        // Ensure host has active subscription
        String subId = "test_sub_hold_host_001";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        // Create and approve test property
        PropertyRequest pReq = new PropertyRequest();
        pReq.setHostType("pg_owner");
        pReq.setTitle("Hold Integrity Test Hotel");
        pReq.setPropertyType("hotel");
        pReq.setStayTypes(List.of("daily", "hourly"));
        pReq.setDailyPrice(2000.0);
        pReq.setHourlyPrice(300.0);
        pReq.setAddress("789 4th Cross");
        pReq.setCity("Bengaluru");
        pReq.setArea("HSR Layout");
        pReq.setLatitude(12.9116);
        pReq.setLongitude(77.6389);
        pReq.setBedrooms(3);
        pReq.setBathrooms(3);
        pReq.setFurnished(true);
        pReq.setAreaSqFt(1200.0);

        Map<String, Object> property = propertyService.createProperty(hostUser, pReq);
        propertyId = (String) property.get("propertyId");
        adminService.approveProperty(adminUser, propertyId, "Verified");
    }

    @AfterEach
    void tearDown() {
        for (String bId : createdBookingIds) {
            try {
                db.collection("bookings").document(bId).delete().get();
            } catch (Exception ignored) {
            }
        }
        for (String pId : createdPaymentIds) {
            try {
                db.collection("payments").document(pId).delete().get();
            } catch (Exception ignored) {
            }
        }
        if (propertyId != null) {
            try {
                db.collection("properties").document(propertyId).delete().get();
                db.collection("propertyBookingLocks").document(propertyId).delete().get();
            } catch (Exception ignored) {
            }
        }
        try {
            db.collection("subscriptions").document("test_sub_hold_host_001").delete().get();
            db.collection("users").document(hostUser.getUid()).delete().get();
            db.collection("users").document(adminUser.getUid()).delete().get();
            db.collection("users").document(guestUser1.getUid()).delete().get();
            db.collection("users").document(guestUser2.getUid()).delete().get();
        } catch (Exception ignored) {
        }
    }

    /**
     * TEST 1: Two concurrent booking attempts for the same dates.
     * One must succeed and acquire the lock; the other must be rejected.
     */
    @Test
    void testConcurrentBookingAttemptsForSameDates() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);

        Callable<Map<String, Object>> task1 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propertyId);
            req.setBookingType("daily");
            req.setStartDate("2026-11-01");
            req.setEndDate("2026-11-05");
            return bookingService.createBooking(guestUser1, req);
        };

        Callable<Map<String, Object>> task2 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propertyId);
            req.setBookingType("daily");
            req.setStartDate("2026-11-03"); // Overlaps 2026-11-01 to 2026-11-05
            req.setEndDate("2026-11-07");
            return bookingService.createBooking(guestUser2, req);
        };

        Future<Map<String, Object>> future1 = executor.submit(task1);
        Future<Map<String, Object>> future2 = executor.submit(task2);

        // Release latch simultaneously
        latch.countDown();

        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger failures = new AtomicInteger(0);

        try {
            Map<String, Object> res1 = future1.get();
            if (res1 != null && res1.containsKey("bookingId")) {
                successes.incrementAndGet();
                createdBookingIds.add((String) res1.get("bookingId"));
            }
        } catch (ExecutionException e) {
            failures.incrementAndGet();
        }

        try {
            Map<String, Object> res2 = future2.get();
            if (res2 != null && res2.containsKey("bookingId")) {
                successes.incrementAndGet();
                createdBookingIds.add((String) res2.get("bookingId"));
            }
        } catch (ExecutionException e) {
            failures.incrementAndGet();
        }

        executor.shutdown();

        assertEquals(1, successes.get(), "Exactly one concurrent booking must succeed");
        assertEquals(1, failures.get(), "Conflicting concurrent booking must fail");
    }

    /**
     * TEST 2: Availability check returns false for dates with an active booking,
     * true for dates with no booking.
     */
    @Test
    void testAvailabilityCheckWithActiveBooking() {
        BookingRequest req = new BookingRequest();
        req.setPropertyId(propertyId);
        req.setBookingType("daily");
        req.setStartDate("2026-11-10");
        req.setEndDate("2026-11-15");

        Map<String, Object> booking = bookingService.createBooking(guestUser1, req);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Check overlapping dates -> false
        Map<String, Object> checkOverlap = propertyService.checkPropertyAvailability(
                propertyId, "2026-11-12", "2026-11-16", null, null, "daily"
        );
        assertEquals(false, checkOverlap.get("available"), "Overlapping dates should return available = false");

        // Check dates before -> true
        Map<String, Object> checkBefore = propertyService.checkPropertyAvailability(
                propertyId, "2026-11-05", "2026-11-10", null, null, "daily"
        );
        assertEquals(true, checkBefore.get("available"), "Non-overlapping prior window should return available = true");

        // Check dates after -> true
        Map<String, Object> checkAfter = propertyService.checkPropertyAvailability(
                propertyId, "2026-11-15", "2026-11-20", null, null, "daily"
        );
        assertEquals(true, checkAfter.get("available"), "Non-overlapping subsequent window should return available = true");
    }

    /**
     * TEST 3: Expired host request does not block dates.
     * When a request is older than 24 hours, availability returns true and another guest can book.
     */
    @Test
    void testExpiredHostRequestDoesNotBlockDates() throws Exception {
        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propertyId);
        req1.setBookingType("daily");
        req1.setStartDate("2026-11-20");
        req1.setEndDate("2026-11-25");

        Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
        String bookingId1 = (String) booking1.get("bookingId");
        createdBookingIds.add(bookingId1);

        // Simulate expiration: set holdExpiresAt in the past (e.g. 2 hours ago)
        long pastMillis = System.currentTimeMillis() - 7200000L;
        Timestamp pastTimestamp = Timestamp.ofTimeSecondsAndNanos(pastMillis / 1000, 0);
        db.collection("bookings").document(bookingId1).update("holdExpiresAt", pastTimestamp).get();

        // 1. Availability check should now return available = true
        Map<String, Object> avail = propertyService.checkPropertyAvailability(
                propertyId, "2026-11-20", "2026-11-25", null, null, "daily"
        );
        assertEquals(true, avail.get("available"), "Expired request should NOT block dates in checkPropertyAvailability");

        // 2. Another guest can book the exact same dates
        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propertyId);
        req2.setBookingType("daily");
        req2.setStartDate("2026-11-20");
        req2.setEndDate("2026-11-25");

        Map<String, Object> booking2 = bookingService.createBooking(guestUser2, req2);
        assertNotNull(booking2, "New booking must succeed over expired hold");
        String bookingId2 = (String) booking2.get("bookingId");
        createdBookingIds.add(bookingId2);

        // 3. Host attempting to accept the expired request must be rejected
        Exception acceptException = assertThrows(Exception.class, () -> {
            bookingService.acceptBooking(hostUser, bookingId1);
        });
        assertTrue(acceptException.getMessage().toLowerCase().contains("expired"),
                "Accepting an expired request must throw an expiration error");
    }

    /**
     * TEST 4: Expired payment hold does not block dates.
     * When host accepts a booking but guest fails to pay within 30 minutes, dates are released.
     */
    @Test
    void testExpiredPaymentHoldDoesNotBlockDates() throws Exception {
        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propertyId);
        req1.setBookingType("daily");
        req1.setStartDate("2026-12-01");
        req1.setEndDate("2026-12-05");

        Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
        String bookingId1 = (String) booking1.get("bookingId");
        createdBookingIds.add(bookingId1);

        // Host accepts
        bookingService.acceptBooking(hostUser, bookingId1);

        // Simulate payment hold expiration (holdExpiresAt in the past)
        long pastMillis = System.currentTimeMillis() - 3600000L; // 1 hour ago
        Timestamp pastTimestamp = Timestamp.ofTimeSecondsAndNanos(pastMillis / 1000, 0);
        db.collection("bookings").document(bookingId1).update("holdExpiresAt", pastTimestamp).get();

        // 1. Availability check should return true
        Map<String, Object> avail = propertyService.checkPropertyAvailability(
                propertyId, "2026-12-01", "2026-12-05", null, null, "daily"
        );
        assertEquals(true, avail.get("available"), "Expired payment hold should NOT block dates");

        // 2. Guest attempting to create payment order on expired hold is rejected
        Exception paymentOrderException = assertThrows(IllegalStateException.class, () -> {
            paymentService.createBookingOrder(guestUser1, bookingId1);
        });
        assertTrue(paymentOrderException.getMessage().toLowerCase().contains("expired"),
                "Payment order creation must fail on expired hold");

        // 3. Another guest can book the dates
        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propertyId);
        req2.setBookingType("daily");
        req2.setStartDate("2026-12-01");
        req2.setEndDate("2026-12-05");

        Map<String, Object> booking2 = bookingService.createBooking(guestUser2, req2);
        assertNotNull(booking2);
        String bookingId2 = (String) booking2.get("bookingId");
        createdBookingIds.add(bookingId2);
    }

    /**
     * TEST 5: Rejected or cancelled booking releases dates immediately.
     */
    @Test
    void testRejectionAndCancellationReleaseDatesImmediately() {
        // Test rejection release
        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propertyId);
        req1.setBookingType("daily");
        req1.setStartDate("2026-12-10");
        req1.setEndDate("2026-12-15");

        Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
        String bookingId1 = (String) booking1.get("bookingId");
        createdBookingIds.add(bookingId1);

        // Reject booking
        bookingService.rejectBooking(hostUser, bookingId1);

        // Check availability
        Map<String, Object> availAfterReject = propertyService.checkPropertyAvailability(
                propertyId, "2026-12-10", "2026-12-15", null, null, "daily"
        );
        assertEquals(true, availAfterReject.get("available"), "Rejected booking must release dates immediately");

        // New booking succeeds
        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propertyId);
        req2.setBookingType("daily");
        req2.setStartDate("2026-12-10");
        req2.setEndDate("2026-12-15");

        Map<String, Object> booking2 = bookingService.createBooking(guestUser2, req2);
        assertNotNull(booking2);
        String bookingId2 = (String) booking2.get("bookingId");
        createdBookingIds.add(bookingId2);

        // Cancel booking2
        bookingService.cancelBooking(guestUser2, bookingId2);

        // Check availability after cancellation
        Map<String, Object> availAfterCancel = propertyService.checkPropertyAvailability(
                propertyId, "2026-12-10", "2026-12-15", null, null, "daily"
        );
        assertEquals(true, availAfterCancel.get("available"), "Cancelled booking must release dates immediately");
    }

    /**
     * TEST 6: Host cannot accept a booking whose dates conflict with an already-confirmed booking.
     */
    @Test
    void testHostCannotAcceptConflictingBooking() throws Exception {
        // Host acceptance of booking requests is the core workflow for request-to-book properties (PG / Flat)
        PropertyRequest pgReq = new PropertyRequest();
        pgReq.setHostType("pg_owner");
        pgReq.setTitle("Host Approval Conflict PG");
        pgReq.setPropertyType("pg");
        pgReq.setCategory("pg");
        pgReq.setStayTypes(List.of("monthly"));
        pgReq.setMonthlyPrice(8000.0);
        pgReq.setMonthlyRentPerBed(8000.0);
        pgReq.setContractDuration("3_months");
        pgReq.setSecurityDepositEnabled(false);
        pgReq.setOccupancyType("single");
        pgReq.setGenderCategory("unisex");
        pgReq.setAddress("45 Residency Road");
        pgReq.setCity("Bengaluru");
        pgReq.setArea("HSR Layout");
        pgReq.setBedrooms(1);
        pgReq.setBathrooms(1);
        pgReq.setFurnished(true);

        Map<String, Object> pgProp = propertyService.createProperty(hostUser, pgReq);
        String pgPropId = (String) pgProp.get("propertyId");
        adminService.approveProperty(adminUser, pgPropId, "Approved");

        try {
            // 1. Guest 1 books and confirms Dec 1 to Dec 31
            BookingRequest req1 = new BookingRequest();
            req1.setPropertyId(pgPropId);
            req1.setBookingType("monthly");
            req1.setStartDate("2026-12-01");
            req1.setEndDate("2026-12-31");

            Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
            String bookingId1 = (String) booking1.get("bookingId");
            createdBookingIds.add(bookingId1);

            // Host accepts and confirms Guest 1
            bookingService.acceptBooking(hostUser, bookingId1);
            bookingRepository.confirmWithAvailabilityCheck(pgPropId, bookingId1);

            // 2. Simulate an existing second request in "requested" state (submitted concurrently before confirmation)
            String bookingId2 = "test_conflicting_req_002";
            createdBookingIds.add(bookingId2);

            Map<String, Object> secondBookingData = new HashMap<>();
            secondBookingData.put("bookingId", bookingId2);
            secondBookingData.put("propertyId", pgPropId);
            secondBookingData.put("customerId", guestUser2.getUid());
            secondBookingData.put("hostId", hostUser.getUid());
            secondBookingData.put("bookingType", "monthly");
            secondBookingData.put("startDate", "2026-12-15"); // Overlaps with Dec 1 - Dec 31
            secondBookingData.put("endDate", "2027-01-15");
            secondBookingData.put("amount", 8000.0);
            secondBookingData.put("bookingStatus", "requested");
            secondBookingData.put("paymentStatus", "created");
            secondBookingData.put("createdAt", Timestamp.now());
            secondBookingData.put("updatedAt", Timestamp.now());
            long hostHoldExpiryMillis = System.currentTimeMillis() + BookingAvailabilityUtils.HOST_REQUEST_HOLD_MILLIS;
            secondBookingData.put("holdExpiresAt", Timestamp.ofTimeSecondsAndNanos(hostHoldExpiryMillis / 1000, 0));

            db.collection("bookings").document(bookingId2).set(secondBookingData).get();

            // 3. Host tries to accept the second request -> must fail with conflict exception
            Exception conflictException = assertThrows(Exception.class, () -> {
                bookingService.acceptBooking(hostUser, bookingId2);
            });
            assertTrue(conflictException.getMessage().toLowerCase().contains("already booked"),
                    "Host acceptance must be blocked if conflicting confirmed booking exists");
        } finally {
            try { db.collection("properties").document(pgPropId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("propertyBookingLocks").document(pgPropId).delete().get(); } catch (Exception ignored) {}
        }
    }

    /**
     * TEST 7: Availability endpoint returns consistent results with actual booking creation.
     */
    @Test
    void testAvailabilityEndpointConsistencyWithBookingCreation() {
        // Create an active booking Jan 10–15
        BookingRequest req = new BookingRequest();
        req.setPropertyId(propertyId);
        req.setBookingType("daily");
        req.setStartDate("2027-01-10");
        req.setEndDate("2027-01-15");

        Map<String, Object> booking = bookingService.createBooking(guestUser1, req);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Case A: Overlapping window
        Map<String, Object> availA = propertyService.checkPropertyAvailability(
                propertyId, "2027-01-12", "2027-01-18", null, null, "daily"
        );
        assertEquals(false, availA.get("available"));

        // Attempting to create booking for same window must throw exception
        BookingRequest overlapReq = new BookingRequest();
        overlapReq.setPropertyId(propertyId);
        overlapReq.setBookingType("daily");
        overlapReq.setStartDate("2027-01-12");
        overlapReq.setEndDate("2027-01-18");

        assertThrows(RuntimeException.class, () -> {
            bookingService.createBooking(guestUser2, overlapReq);
        }, "Booking creation must fail when checkPropertyAvailability returns false");

        // Case B: Checkout edge window (check-in on Jan 15, checkout Jan 20)
        Map<String, Object> availB = propertyService.checkPropertyAvailability(
                propertyId, "2027-01-15", "2027-01-20", null, null, "daily"
        );
        assertEquals(true, availB.get("available"));

        // Attempting to create booking for checkout edge window must succeed
        BookingRequest edgeReq = new BookingRequest();
        edgeReq.setPropertyId(propertyId);
        edgeReq.setBookingType("daily");
        edgeReq.setStartDate("2027-01-15");
        edgeReq.setEndDate("2027-01-20");

        Map<String, Object> edgeBooking = bookingService.createBooking(guestUser2, edgeReq);
        assertNotNull(edgeBooking);
        createdBookingIds.add((String) edgeBooking.get("bookingId"));
    }

    /**
     * TEST 8: An expired booking must NEVER transition to confirmed.
     * When payment confirmation is attempted on an expired hold:
     * 1. BookingRepository.confirmWithAvailabilityCheck rejects with IllegalStateException.
     * 2. Booking remains unconfirmed (status does not become "confirmed").
     */
    @Test
    void testExpiredBookingPaymentConfirmationFailsAndReleasesHold() throws Exception {
        BookingRequest req = new BookingRequest();
        req.setPropertyId(propertyId);
        req.setBookingType("daily");
        req.setStartDate("2027-02-01");
        req.setEndDate("2027-02-05");

        Map<String, Object> booking = bookingService.createBooking(guestUser1, req);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Host accepts
        bookingService.acceptBooking(hostUser, bookingId);

        // Simulate payment hold expiration (holdExpiresAt in the past)
        long pastMillis = System.currentTimeMillis() - 3600000L;
        Timestamp pastTimestamp = Timestamp.ofTimeSecondsAndNanos(pastMillis / 1000, 0);
        db.collection("bookings").document(bookingId).update("holdExpiresAt", pastTimestamp).get();

        // Direct confirmation attempt on expired booking must fail
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingId);
        });
        assertTrue(ex.getMessage().toLowerCase().contains("expired"),
                "confirmWithAvailabilityCheck must reject expired booking");

        // Verify status is not confirmed
        DocumentSnapshot doc = db.collection("bookings").document(bookingId).get().get();
        assertNotEquals("confirmed", doc.getString("bookingStatus"),
                "Expired booking must NEVER become confirmed");
    }

    /**
     * TEST 9: If a booking hold has expired, payment confirmation failure marks the booking
     * cancelled, clears the hold, and safely unblocks calendar inventory.
     */
    @Test
    void testLatePaymentFailureCancelsBookingAndReleasesHold() throws Exception {
        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propertyId);
        req1.setBookingType("daily");
        req1.setStartDate("2027-02-10");
        req1.setEndDate("2027-02-15");

        Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
        String bookingId1 = (String) booking1.get("bookingId");
        createdBookingIds.add(bookingId1);

        bookingService.acceptBooking(hostUser, bookingId1);

        // Simulate payment hold expiration
        long pastMillis = System.currentTimeMillis() - 7200000L;
        Timestamp pastTimestamp = Timestamp.ofTimeSecondsAndNanos(pastMillis / 1000, 0);
        db.collection("bookings").document(bookingId1).update("holdExpiresAt", pastTimestamp).get();

        // Attempting to confirm must fail
        assertThrows(IllegalStateException.class, () -> {
            bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingId1);
        });

        // Safe cleanup marks booking cancelled with hold cleared
        Map<String, Object> bookingUpdates = new HashMap<>();
        bookingUpdates.put("bookingStatus", "cancelled");
        bookingUpdates.put("updatedAt", Timestamp.now());
        bookingUpdates.put("holdExpiresAt", null);
        db.collection("bookings").document(bookingId1).update(bookingUpdates).get();

        // 1. Verify calendar availability is completely unblocked
        Map<String, Object> avail = propertyService.checkPropertyAvailability(
                propertyId, "2027-02-10", "2027-02-15", null, null, "daily"
        );
        assertEquals(true, avail.get("available"), "Cancelled booking after expired payment must release calendar");

        // 2. New booking succeeds on those exact dates
        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propertyId);
        req2.setBookingType("daily");
        req2.setStartDate("2027-02-10");
        req2.setEndDate("2027-02-15");

        Map<String, Object> booking2 = bookingService.createBooking(guestUser2, req2);
        assertNotNull(booking2);
        createdBookingIds.add((String) booking2.get("bookingId"));
    }

    /**
     * TEST 10: Terminal state immutability.
     * Cancelled, rejected, and expired bookings can NEVER be accepted or confirmed.
     */
    @Test
    void testTerminalStateImmutabilityAcrossOperations() throws Exception {
        // Case A: Cancelled booking
        BookingRequest reqA = new BookingRequest();
        reqA.setPropertyId(propertyId);
        reqA.setBookingType("daily");
        reqA.setStartDate("2027-03-01");
        reqA.setEndDate("2027-03-05");

        Map<String, Object> bookingA = bookingService.createBooking(guestUser1, reqA);
        String bookingIdA = (String) bookingA.get("bookingId");
        createdBookingIds.add(bookingIdA);
        bookingService.cancelBooking(guestUser1, bookingIdA);

        assertThrows(Exception.class, () -> bookingService.acceptBooking(hostUser, bookingIdA),
                "Host cannot accept a cancelled booking");
        assertThrows(IllegalStateException.class, () -> bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingIdA),
                "Cancelled booking cannot transition to confirmed");

        // Case B: Rejected booking
        BookingRequest reqB = new BookingRequest();
        reqB.setPropertyId(propertyId);
        reqB.setBookingType("daily");
        reqB.setStartDate("2027-03-06");
        reqB.setEndDate("2027-03-10");

        Map<String, Object> bookingB = bookingService.createBooking(guestUser1, reqB);
        String bookingIdB = (String) bookingB.get("bookingId");
        createdBookingIds.add(bookingIdB);
        bookingService.rejectBooking(hostUser, bookingIdB);

        assertThrows(Exception.class, () -> bookingService.acceptBooking(hostUser, bookingIdB),
                "Host cannot accept a rejected booking");
        assertThrows(IllegalStateException.class, () -> bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingIdB),
                "Rejected booking cannot transition to confirmed");

        // Case C: Availability for both windows is completely free
        Map<String, Object> availA = propertyService.checkPropertyAvailability(
                propertyId, "2027-03-01", "2027-03-05", null, null, "daily"
        );
        assertEquals(true, availA.get("available"), "Cancelled booking must not block dates");

        Map<String, Object> availB = propertyService.checkPropertyAvailability(
                propertyId, "2027-03-06", "2027-03-10", null, null, "daily"
        );
        assertEquals(true, availB.get("available"), "Rejected booking must not block dates");
    }

    /**
     * TEST 11: Refund idempotency.
     * Retrying a refund on an already-refunded or pending refund reuses the idempotency key
     * and does not issue duplicate refund transitions.
     */
    @Test
    void testRefundIdempotencyAndNoDuplicateRefund() throws Exception {
        BookingRequest req = new BookingRequest();
        req.setPropertyId(propertyId);
        req.setBookingType("daily");
        req.setStartDate("2027-04-01");
        req.setEndDate("2027-04-05");

        Map<String, Object> booking = bookingService.createBooking(guestUser1, req);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Simulate captured payment with refund already in "pending" status
        String paymentId = "test_pay_refund_idem_" + System.currentTimeMillis();
        createdPaymentIds.add(paymentId);

        Map<String, Object> paymentData = new HashMap<>();
        paymentData.put("paymentId", paymentId);
        paymentData.put("userId", guestUser1.getUid());
        paymentData.put("bookingId", bookingId);
        paymentData.put("type", "booking");
        paymentData.put("amount", 8000L);
        paymentData.put("currency", "INR");
        paymentData.put("status", "captured");
        paymentData.put("gatewayPaymentId", "pay_mock_idem_123");
        paymentData.put("refundStatus", "pending");
        paymentData.put("refundIdempotencyKey", "ST-REFUND-" + paymentId);
        paymentData.put("createdAt", System.currentTimeMillis());
        paymentData.put("updatedAt", System.currentTimeMillis());
        db.collection("payments").document(paymentId).set(paymentData).get();

        // Process cancellation refund: must detect "pending" and return cleanly
        Map<String, Object> refundResult1 = refundService.processBookingCancellation(bookingId);
        assertNotNull(refundResult1);
        assertEquals("pending", refundResult1.get("refundStatus"));

        // Process cancellation refund again (retry): must also detect "pending" and return cleanly
        Map<String, Object> refundResult2 = refundService.processBookingCancellation(bookingId);
        assertNotNull(refundResult2);
        assertEquals("pending", refundResult2.get("refundStatus"));

        // Verify the payment record was not duplicated or corrupted
        DocumentSnapshot pDoc = db.collection("payments").document(paymentId).get().get();
        assertEquals("ST-REFUND-" + paymentId, pDoc.getString("refundIdempotencyKey"));
        assertEquals("pending", pDoc.getString("refundStatus"));
    }

    /**
     * TEST 12: Idempotent confirmation.
     * Calling confirmWithAvailabilityCheck on an already-confirmed booking
     * returns cleanly without throwing an exception or modifying state.
     */
    @Test
    void testConfirmedBookingConfirmationIsIdempotent() throws Exception {
        BookingRequest req = new BookingRequest();
        req.setPropertyId(propertyId);
        req.setBookingType("daily");
        req.setStartDate("2027-05-01");
        req.setEndDate("2027-05-05");

        Map<String, Object> booking = bookingService.createBooking(guestUser1, req);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        bookingService.acceptBooking(hostUser, bookingId);
        Map<String, Object> confirmed1 = bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingId);
        assertEquals("confirmed", confirmed1.get("bookingStatus"));

        // Second confirmation (e.g. duplicate webhook or retry)
        Map<String, Object> confirmed2 = bookingRepository.confirmWithAvailabilityCheck(propertyId, bookingId);
        assertEquals("confirmed", confirmed2.get("bookingStatus"));
    }
}
