package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.inventory.InventoryUnitRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.InventoryUnitRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.BookingService;
import com.staytrack.backend.service.InventoryService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class InventoryBookingIntegrityTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private InventoryUnitRepository inventoryUnitRepository;

    @Autowired
    private UserService userService;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser guestUser1;
    private AuthenticatedUser guestUser2;
    private AuthenticatedUser guestUser3;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdUnitIds = new ArrayList<>();
    private final List<String> createdBookingIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_inv_host_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919888877771", "host");

        String adminUid = "test_inv_admin_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000011111", "admin");

        String guest1Uid = "test_inv_guest1_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser1 = new AuthenticatedUser(guest1Uid, "+919777711111", "customer");
        userService.getOrCreateUser(guestUser1);

        String guest2Uid = "test_inv_guest2_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser2 = new AuthenticatedUser(guest2Uid, "+919666622222", "customer");
        userService.getOrCreateUser(guestUser2);

        String guest3Uid = "test_inv_guest3_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser3 = new AuthenticatedUser(guest3Uid, "+919555533333", "customer");
        userService.getOrCreateUser(guestUser3);

        // Ensure host has subscription
        String subId = "test_sub_" + hostUid;
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
        for (String bookingId : createdBookingIds) {
            try {
                db.collection("bookings").document(bookingId).delete().get();
            } catch (Exception ignored) {}
        }
        for (String unitId : createdUnitIds) {
            try {
                db.collection("inventoryUnits").document(unitId).delete().get();
            } catch (Exception ignored) {}
        }
        for (String propId : createdPropertyIds) {
            try {
                db.collection("properties").document(propId).delete().get();
                db.collection("propertyBookingLocks").document(propId).delete().get();
            } catch (Exception ignored) {}
        }
    }

    private String createAndApproveProperty(String propertyType, String bookingType, Double price) {
        PropertyRequest req = new PropertyRequest();
        req.setTitle("Test " + propertyType + " " + UUID.randomUUID().toString().substring(0, 6));
        req.setDescription("Property for inventory testing");
        req.setPropertyType(propertyType);
        req.setCategory(propertyType);
        req.setBookingType(bookingType);
        req.setPrice(price);
        if ("monthly".equalsIgnoreCase(bookingType)) {
            req.setMonthlyPrice(price);
            req.setStayTypes(List.of("monthly"));
            if ("pg".equalsIgnoreCase(propertyType) || "hostel".equalsIgnoreCase(propertyType)) {
                req.setContractDuration("3_months");
                req.setMonthlyRentPerBed(price);
            }
        } else {
            req.setDailyPrice(price);
            req.setPricePerNight(price);
            req.setStayTypes(List.of("daily"));
        }
        req.setCity("Bengaluru");
        req.setArea("Koramangala");
        req.setAddress("123 Test Street");
        req.setBedrooms(4);
        req.setBathrooms(4);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = String.valueOf(created.get("id"));
        createdPropertyIds.add(propId);

        adminService.approveProperty(adminUser, propId, "Approved");
        return propId;
    }

    private Map<String, Object> createUnit(String propId, String unitType, String name, String parentRoomId, Integer totalQty, Double price) {
        InventoryUnitRequest req = new InventoryUnitRequest();
        req.setUnitType(unitType);
        req.setUnitName(name);
        req.setParentRoomId(parentRoomId);
        req.setTotalQuantity(totalQty);
        req.setPrice(price);
        req.setStatus("active");

        Map<String, Object> unit = inventoryService.createInventoryUnit(propId, req, hostUser);
        String unitId = String.valueOf(unit.get("id"));
        createdUnitIds.add(unitId);
        return unit;
    }

    @Test
    void test1_ConcurrentBookingDifferentBedsInSameHostel() throws Exception {
        String propId = createAndApproveProperty("hostel", "monthly", 8000.0);

        Map<String, Object> bedA = createUnit(propId, "bed", "Dorm Bed A", null, 1, 8000.0);
        Map<String, Object> bedB = createUnit(propId, "bed", "Dorm Bed B", null, 1, 8000.0);
        String bedAId = String.valueOf(bedA.get("id"));
        String bedBId = String.valueOf(bedB.get("id"));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        Callable<Map<String, Object>> task1 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propId);
            req.setBookingType("monthly");
            req.setStartDate("2026-11-01");
            req.setEndDate("2026-12-01");
            req.setInventoryUnitId(bedAId);
            return bookingService.createBooking(guestUser1, req);
        };

        Callable<Map<String, Object>> task2 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propId);
            req.setBookingType("monthly");
            req.setStartDate("2026-11-01");
            req.setEndDate("2026-12-01");
            req.setInventoryUnitId(bedBId);
            return bookingService.createBooking(guestUser2, req);
        };

        Future<Map<String, Object>> future1 = executor.submit(task1);
        Future<Map<String, Object>> future2 = executor.submit(task2);

        latch.countDown();

        Map<String, Object> res1 = future1.get(10, TimeUnit.SECONDS);
        Map<String, Object> res2 = future2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertNotNull(res1);
        assertNotNull(res2);
        createdBookingIds.add(String.valueOf(res1.get("bookingId")));
        createdBookingIds.add(String.valueOf(res2.get("bookingId")));

        assertEquals("requested", res1.get("bookingStatus"));
        assertEquals("requested", res2.get("bookingStatus"));
        assertEquals(bedAId, res1.get("inventoryUnitId"));
        assertEquals(bedBId, res2.get("inventoryUnitId"));
    }

    @Test
    void test2_ConcurrentDoubleBookingSameBedRejected() throws Exception {
        String propId = createAndApproveProperty("hostel", "monthly", 8000.0);
        Map<String, Object> bed = createUnit(propId, "bed", "Single Bed 101", null, 1, 8000.0);
        String bedId = String.valueOf(bed.get("id"));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Callable<Void> task1 = () -> {
            latch.await();
            try {
                BookingRequest req = new BookingRequest();
                req.setPropertyId(propId);
                req.setBookingType("monthly");
                req.setStartDate("2026-11-01");
                req.setEndDate("2026-12-01");
                req.setInventoryUnitId(bedId);
                Map<String, Object> res = bookingService.createBooking(guestUser1, req);
                synchronized (createdBookingIds) {
                    createdBookingIds.add(String.valueOf(res.get("bookingId")));
                }
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            latch.await();
            try {
                BookingRequest req = new BookingRequest();
                req.setPropertyId(propId);
                req.setBookingType("monthly");
                req.setStartDate("2026-11-01");
                req.setEndDate("2026-12-01");
                req.setInventoryUnitId(bedId);
                Map<String, Object> res = bookingService.createBooking(guestUser2, req);
                synchronized (createdBookingIds) {
                    createdBookingIds.add(String.valueOf(res.get("bookingId")));
                }
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(task1);
        Future<Void> f2 = executor.submit(task2);
        latch.countDown();

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one concurrent booking for the same bed must succeed");
        assertEquals(1, failureCount.get(), "The duplicate concurrent booking must be rejected");
    }

    @Test
    void test3_ConcurrentBookingSeparateHotelRooms() throws Exception {
        String propId = createAndApproveProperty("hotel", "daily", 2500.0);
        Map<String, Object> r1 = createUnit(propId, "room", "Room 201", null, 1, 2500.0);
        Map<String, Object> r2 = createUnit(propId, "room", "Room 202", null, 1, 2500.0);
        String r1Id = String.valueOf(r1.get("id"));
        String r2Id = String.valueOf(r2.get("id"));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        Callable<Map<String, Object>> t1 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propId);
            req.setBookingType("daily");
            req.setStartDate("2026-11-10");
            req.setEndDate("2026-11-12");
            req.setInventoryUnitId(r1Id);
            return bookingService.createBooking(guestUser1, req);
        };

        Callable<Map<String, Object>> t2 = () -> {
            latch.await();
            BookingRequest req = new BookingRequest();
            req.setPropertyId(propId);
            req.setBookingType("daily");
            req.setStartDate("2026-11-10");
            req.setEndDate("2026-11-12");
            req.setInventoryUnitId(r2Id);
            return bookingService.createBooking(guestUser2, req);
        };

        Future<Map<String, Object>> f1 = executor.submit(t1);
        Future<Map<String, Object>> f2 = executor.submit(t2);
        latch.countDown();

        Map<String, Object> res1 = f1.get(10, TimeUnit.SECONDS);
        Map<String, Object> res2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertNotNull(res1);
        assertNotNull(res2);
        createdBookingIds.add(String.valueOf(res1.get("bookingId")));
        createdBookingIds.add(String.valueOf(res2.get("bookingId")));
        assertEquals(r1Id, res1.get("inventoryUnitId"));
        assertEquals(r2Id, res2.get("inventoryUnitId"));
    }

    @Test
    void test4_ConcurrentBookingRoomTypeLastAvailableRoom() throws Exception {
        String propId = createAndApproveProperty("hotel", "daily", 3000.0);
        // Room type with totalQuantity = 2
        Map<String, Object> roomType = createUnit(propId, "room_type", "Deluxe Suite", null, 2, 3000.0);
        String unitId = String.valueOf(roomType.get("id"));

        // Pre-book 1 room
        BookingRequest preReq = new BookingRequest();
        preReq.setPropertyId(propId);
        preReq.setBookingType("daily");
        preReq.setStartDate("2026-11-15");
        preReq.setEndDate("2026-11-18");
        preReq.setInventoryUnitId(unitId);
        Map<String, Object> preRes = bookingService.createBooking(guestUser1, preReq);
        createdBookingIds.add(String.valueOf(preRes.get("bookingId")));

        // Now only 1 room remains available. Guest 2 and Guest 3 race for the last room
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Callable<Void> t2 = () -> {
            latch.await();
            try {
                BookingRequest req = new BookingRequest();
                req.setPropertyId(propId);
                req.setBookingType("daily");
                req.setStartDate("2026-11-15");
                req.setEndDate("2026-11-18");
                req.setInventoryUnitId(unitId);
                Map<String, Object> res = bookingService.createBooking(guestUser2, req);
                synchronized (createdBookingIds) {
                    createdBookingIds.add(String.valueOf(res.get("bookingId")));
                }
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Callable<Void> t3 = () -> {
            latch.await();
            try {
                BookingRequest req = new BookingRequest();
                req.setPropertyId(propId);
                req.setBookingType("daily");
                req.setStartDate("2026-11-15");
                req.setEndDate("2026-11-18");
                req.setInventoryUnitId(unitId);
                Map<String, Object> res = bookingService.createBooking(guestUser3, req);
                synchronized (createdBookingIds) {
                    createdBookingIds.add(String.valueOf(res.get("bookingId")));
                }
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f2 = executor.submit(t2);
        Future<Void> f3 = executor.submit(t3);
        latch.countDown();

        f2.get(10, TimeUnit.SECONDS);
        f3.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Only 1 of the 2 concurrent requests should get the last room");
        assertEquals(1, failureCount.get(), "The request that exceeded capacity must be rejected");
    }

    @Test
    void test5_WholeRoomBlocksItsIndividualBeds() {
        String propId = createAndApproveProperty("pg", "monthly", 12000.0);
        Map<String, Object> room = createUnit(propId, "room", "Private Room 1", null, 1, 12000.0);
        String roomId = String.valueOf(room.get("id"));

        Map<String, Object> bedA = createUnit(propId, "bed", "Bed 1A", roomId, 1, 6000.0);
        Map<String, Object> bedB = createUnit(propId, "bed", "Bed 1B", roomId, 1, 6000.0);
        String bedAId = String.valueOf(bedA.get("id"));
        String bedBId = String.valueOf(bedB.get("id"));

        // Book whole room
        BookingRequest roomReq = new BookingRequest();
        roomReq.setPropertyId(propId);
        roomReq.setBookingType("monthly");
        roomReq.setStartDate("2026-11-01");
        roomReq.setEndDate("2026-12-01");
        roomReq.setInventoryUnitId(roomId);
        Map<String, Object> roomRes = bookingService.createBooking(guestUser1, roomReq);
        createdBookingIds.add(String.valueOf(roomRes.get("bookingId")));

        // Attempt to book child bed A -> must fail!
        BookingRequest bedReq = new BookingRequest();
        bedReq.setPropertyId(propId);
        bedReq.setBookingType("monthly");
        bedReq.setStartDate("2026-11-01");
        bedReq.setEndDate("2026-12-01");
        bedReq.setInventoryUnitId(bedAId);

        assertThrows(IllegalStateException.class, () -> {
            bookingService.createBooking(guestUser2, bedReq);
        }, "Booking child bed must be rejected when parent room is reserved");

        // Verify availability endpoint reports unavailable for both child beds
        Map<String, Object> availBedA = propertyService.checkPropertyAvailability(
                propId, "2026-11-01", "2026-12-01", null, null, "monthly", bedAId
        );
        assertEquals(false, availBedA.get("available"));

        Map<String, Object> availBedB = propertyService.checkPropertyAvailability(
                propId, "2026-11-01", "2026-12-01", null, null, "monthly", bedBId
        );
        assertEquals(false, availBedB.get("available"));
    }

    @Test
    void test6_IndividualBedBlocksWholeRoom() {
        String propId = createAndApproveProperty("pg", "monthly", 12000.0);
        Map<String, Object> room = createUnit(propId, "room", "Shared Room 2", null, 1, 12000.0);
        String roomId = String.valueOf(room.get("id"));

        Map<String, Object> bedA = createUnit(propId, "bed", "Bed 2A", roomId, 1, 6000.0);
        String bedAId = String.valueOf(bedA.get("id"));

        // Book child Bed 2A
        BookingRequest bedReq = new BookingRequest();
        bedReq.setPropertyId(propId);
        bedReq.setBookingType("monthly");
        bedReq.setStartDate("2026-11-01");
        bedReq.setEndDate("2026-12-01");
        bedReq.setInventoryUnitId(bedAId);
        Map<String, Object> bedRes = bookingService.createBooking(guestUser1, bedReq);
        createdBookingIds.add(String.valueOf(bedRes.get("bookingId")));

        // Attempt to book parent room as a whole -> must fail!
        BookingRequest roomReq = new BookingRequest();
        roomReq.setPropertyId(propId);
        roomReq.setBookingType("monthly");
        roomReq.setStartDate("2026-11-01");
        roomReq.setEndDate("2026-12-01");
        roomReq.setInventoryUnitId(roomId);

        assertThrows(IllegalStateException.class, () -> {
            bookingService.createBooking(guestUser2, roomReq);
        }, "Booking whole room must be rejected when a child bed within it is reserved");

        // Verify availability endpoint reports room unavailable
        Map<String, Object> availRoom = propertyService.checkPropertyAvailability(
                propId, "2026-11-01", "2026-12-01", null, null, "monthly", roomId
        );
        assertEquals(false, availRoom.get("available"));
    }

    @Test
    void test7_MismatchedPropertyInventoryAndFlatInventoryRejected() {
        String hotelA = createAndApproveProperty("hotel", "daily", 2000.0);
        String hotelB = createAndApproveProperty("hotel", "daily", 2000.0);
        String flat = createAndApproveProperty("flat", "monthly", 25000.0);

        Map<String, Object> unitA = createUnit(hotelA, "room", "Room A1", null, 1, 2000.0);
        String unitAId = String.valueOf(unitA.get("id"));

        // 1. Attempt to book Hotel B with unit belonging to Hotel A
        BookingRequest reqMismatched = new BookingRequest();
        reqMismatched.setPropertyId(hotelB);
        reqMismatched.setBookingType("daily");
        reqMismatched.setStartDate("2026-11-01");
        reqMismatched.setEndDate("2026-11-03");
        reqMismatched.setInventoryUnitId(unitAId);

        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.createBooking(guestUser1, reqMismatched);
        }, "Booking with inventory unit belonging to another property must be rejected");

        // 2. Attempt to create inventory unit on a Flat -> rejected
        InventoryUnitRequest flatUnitReq = new InventoryUnitRequest();
        flatUnitReq.setUnitType("room");
        flatUnitReq.setUnitName("Bedroom 1");
        assertThrows(IllegalArgumentException.class, () -> {
            inventoryService.createInventoryUnit(flat, flatUnitReq, hostUser);
        }, "Flats cannot have inventory units");

        // 3. Attempt to book Flat with an inventory unit -> rejected
        BookingRequest reqFlatWithUnit = new BookingRequest();
        reqFlatWithUnit.setPropertyId(flat);
        reqFlatWithUnit.setBookingType("monthly");
        reqFlatWithUnit.setStartDate("2026-11-01");
        reqFlatWithUnit.setEndDate("2026-12-01");
        reqFlatWithUnit.setInventoryUnitId(unitAId);

        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.createBooking(guestUser1, reqFlatWithUnit);
        }, "Booking flats with room/bed units must be rejected");
    }

    @Test
    void test8_TerminalStatusesReleaseInventory() throws Exception {
        String propId = createAndApproveProperty("hotel", "daily", 2000.0);
        Map<String, Object> room = createUnit(propId, "room", "Cabin 1", null, 1, 2000.0);
        String roomId = String.valueOf(room.get("id"));

        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propId);
        req1.setBookingType("daily");
        req1.setStartDate("2026-11-20");
        req1.setEndDate("2026-11-22");
        req1.setInventoryUnitId(roomId);

        Map<String, Object> booking1 = bookingService.createBooking(guestUser1, req1);
        String bookingId1 = String.valueOf(booking1.get("bookingId"));
        createdBookingIds.add(bookingId1);

        // Verify unavailable
        Map<String, Object> availBefore = propertyService.checkPropertyAvailability(
                propId, "2026-11-20", "2026-11-22", null, null, "daily", roomId
        );
        assertEquals(false, availBefore.get("available"));

        // Host rejects booking1
        bookingService.rejectBooking(hostUser, bookingId1);

        // Verify available again
        Map<String, Object> availAfter = propertyService.checkPropertyAvailability(
                propId, "2026-11-20", "2026-11-22", null, null, "daily", roomId
        );
        assertEquals(true, availAfter.get("available"), "Rejected booking must release inventory");

        // Guest 2 can now book the same room for the same dates
        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propId);
        req2.setBookingType("daily");
        req2.setStartDate("2026-11-20");
        req2.setEndDate("2026-11-22");
        req2.setInventoryUnitId(roomId);

        Map<String, Object> booking2 = bookingService.createBooking(guestUser2, req2);
        assertNotNull(booking2);
        createdBookingIds.add(String.valueOf(booking2.get("bookingId")));
        assertEquals("accepted", booking2.get("bookingStatus"));
        assertEquals(Boolean.TRUE, booking2.get("isDirectBooking"));
    }

    @Test
    void test9_LegacyWholePropertyBookingBlocksAllUnitsAndMissingUnitRejected() throws Exception {
        // Property has no inventory units initially
        String propId = createAndApproveProperty("hotel", "daily", 1500.0);

        // Guest 1 books whole property (legacy booking, no inventoryUnitId)
        BookingRequest wholeReq = new BookingRequest();
        wholeReq.setPropertyId(propId);
        wholeReq.setBookingType("daily");
        wholeReq.setStartDate("2026-12-01");
        wholeReq.setEndDate("2026-12-05");

        Map<String, Object> wholeBooking = bookingService.createBooking(guestUser1, wholeReq);
        createdBookingIds.add(String.valueOf(wholeBooking.get("bookingId")));

        // Now host adds a room unit to the property
        Map<String, Object> room = createUnit(propId, "room", "Room 1", null, 1, 1500.0);
        String roomId = String.valueOf(room.get("id"));

        // Guest 2 attempts to book Room 1 during the whole-property booked dates -> must conflict!
        BookingRequest roomReq = new BookingRequest();
        roomReq.setPropertyId(propId);
        roomReq.setBookingType("daily");
        roomReq.setStartDate("2026-12-02");
        roomReq.setEndDate("2026-12-04");
        roomReq.setInventoryUnitId(roomId);

        assertThrows(IllegalStateException.class, () -> {
            bookingService.createBooking(guestUser2, roomReq);
        }, "Active whole-property booking must block room-level bookings for overlapping dates");

        // Booking without inventoryUnitId on a property with inventory units -> rejected
        BookingRequest missingUnitReq = new BookingRequest();
        missingUnitReq.setPropertyId(propId);
        missingUnitReq.setBookingType("daily");
        missingUnitReq.setStartDate("2026-12-10");
        missingUnitReq.setEndDate("2026-12-12");

        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.createBooking(guestUser2, missingUnitReq);
        }, "Booking a property that has inventory units without supplying an inventoryUnitId must be rejected");
    }

    @Test
    void test10_InventoryQuantityReductionAndDeactivationGuards() {
        String propId = createAndApproveProperty("hotel", "daily", 3000.0);
        Map<String, Object> roomType = createUnit(propId, "room_type", "Executive Suite", null, 3, 3000.0);
        String unitId = String.valueOf(roomType.get("id"));

        // Create 2 active bookings for this room_type
        BookingRequest req1 = new BookingRequest();
        req1.setPropertyId(propId);
        req1.setBookingType("daily");
        req1.setStartDate("2026-11-10");
        req1.setEndDate("2026-11-15");
        req1.setInventoryUnitId(unitId);
        Map<String, Object> b1 = bookingService.createBooking(guestUser1, req1);
        createdBookingIds.add(String.valueOf(b1.get("bookingId")));

        BookingRequest req2 = new BookingRequest();
        req2.setPropertyId(propId);
        req2.setBookingType("daily");
        req2.setStartDate("2026-11-12");
        req2.setEndDate("2026-11-16");
        req2.setInventoryUnitId(unitId);
        Map<String, Object> b2 = bookingService.createBooking(guestUser2, req2);
        createdBookingIds.add(String.valueOf(b2.get("bookingId")));

        // 1. Host tries to reduce totalQuantity to 1 (below active count of 2) -> rejected
        InventoryUnitRequest reduceReq = new InventoryUnitRequest();
        reduceReq.setTotalQuantity(1);
        assertThrows(IllegalStateException.class, () -> {
            inventoryService.updateInventoryUnit(propId, unitId, reduceReq, hostUser);
        }, "Cannot reduce inventory totalQuantity below active bookings count");

        // 2. Host tries to deactivate unit with active bookings -> rejected
        InventoryUnitRequest deactReq = new InventoryUnitRequest();
        deactReq.setStatus("inactive");
        assertThrows(IllegalStateException.class, () -> {
            inventoryService.updateInventoryUnit(propId, unitId, deactReq, hostUser);
        }, "Cannot deactivate inventory unit with active bookings");

        // 3. Host tries to delete unit with active bookings -> rejected
        assertThrows(IllegalStateException.class, () -> {
            inventoryService.deleteInventoryUnit(propId, unitId, hostUser);
        }, "Cannot delete inventory unit with active bookings");

        // 4. Host reduces totalQuantity to 2 (allowed since active count is 2)
        InventoryUnitRequest validReduce = new InventoryUnitRequest();
        validReduce.setTotalQuantity(2);
        Map<String, Object> updated = inventoryService.updateInventoryUnit(propId, unitId, validReduce, hostUser);
        assertEquals(2, updated.get("totalQuantity"));
    }
}
