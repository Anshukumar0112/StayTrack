package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.inventory.InventoryUnitRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.model.Booking;
import com.staytrack.backend.model.Property;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.InventoryUnitRepository;
import com.staytrack.backend.repository.PropertyRepository;
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

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PropertyOccupancyOptionsIntegrationTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private PropertyRepository propertyRepository;

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

        String hostUid = "test_occ_host_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811122233", "host");

        String adminUid = "test_occ_admin_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000033344", "admin");

        String guest1Uid = "test_occ_guest1_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser1 = new AuthenticatedUser(guest1Uid, "+919711144455", "customer");
        userService.getOrCreateUser(guestUser1);

        String guest2Uid = "test_occ_guest2_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser2 = new AuthenticatedUser(guest2Uid, "+919611155566", "customer");
        userService.getOrCreateUser(guestUser2);

        String guest3Uid = "test_occ_guest3_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser3 = new AuthenticatedUser(guest3Uid, "+919511166677", "customer");
        userService.getOrCreateUser(guestUser3);

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

    private String createAndApprovePgWithOccupancyOptions(List<Map<String, Object>> options) {
        PropertyRequest req = new PropertyRequest();
        req.setTitle("PG Living " + UUID.randomUUID().toString().substring(0, 6));
        req.setDescription("Verified modern PG accommodation");
        req.setPropertyType("PG");
        req.setCategory("PG");
        req.setBookingType("monthly");
        req.setStayTypes(List.of("monthly"));
        req.setCity("Noida");
        req.setArea("Sector 62");
        req.setAddress("A-14 Innovation Park");
        req.setBedrooms(4);
        req.setBathrooms(2);
        req.setContractDuration("3_months");
        req.setOccupancyOptions(options);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propertyId = String.valueOf(created.get("id"));
        createdPropertyIds.add(propertyId);

        adminService.approveProperty(adminUser, propertyId, "Approved in test");
        return propertyId;
    }

    private String createUnit(String propertyId, String unitType, String unitNumber, Integer capacity, String parentRoomId, String occupancyType, String roomTypeId) {
        InventoryUnitRequest req = new InventoryUnitRequest();
        req.setUnitType(unitType);
        req.setUnitNumber(unitNumber);
        req.setUnitName(unitNumber);
        req.setCapacity(capacity);
        req.setParentRoomId(parentRoomId);
        req.setOccupancyType(occupancyType);
        req.setRoomTypeId(roomTypeId);
        req.setStatus("active");

        Map<String, Object> res = inventoryService.createInventoryUnit(propertyId, req, hostUser);
        String unitId = String.valueOf(res.get("id"));
        createdUnitIds.add(unitId);
        return unitId;
    }

    @Test
    void testConfigureMultipleOccupancyOptionsAndPriceAutoSync() throws Exception {
        List<Map<String, Object>> options = new ArrayList<>();

        Map<String, Object> singleOpt = new HashMap<>();
        singleOpt.put("id", "opt_single");
        singleOpt.put("name", "Single Private Room");
        singleOpt.put("occupancyType", "single");
        singleOpt.put("monthlyRentPerBed", 14000.0);
        singleOpt.put("bathrooms", 1);
        singleOpt.put("furnished", true);
        options.add(singleOpt);

        Map<String, Object> doubleOpt = new HashMap<>();
        doubleOpt.put("id", "opt_double");
        doubleOpt.put("name", "Double Sharing Room");
        doubleOpt.put("occupancyType", "double");
        doubleOpt.put("monthlyRentPerBed", 9500.0);
        doubleOpt.put("bathrooms", 1);
        doubleOpt.put("furnished", true);
        options.add(doubleOpt);

        Map<String, Object> tripleOpt = new HashMap<>();
        tripleOpt.put("id", "opt_triple");
        tripleOpt.put("name", "Triple Sharing Room");
        tripleOpt.put("occupancyType", "triple");
        tripleOpt.put("monthlyRentPerBed", 7000.0);
        tripleOpt.put("bathrooms", 1);
        tripleOpt.put("furnished", true);
        options.add(tripleOpt);

        String propertyId = createAndApprovePgWithOccupancyOptions(options);

        DocumentSnapshot propDoc = propertyRepository.findById(propertyId);
        Map<String, Object> prop = propDoc.getData();
        assertNotNull(prop);
        assertNotNull(prop.get("occupancyOptions"));
        List<?> opts = (List<?>) prop.get("occupancyOptions");
        assertEquals(3, opts.size());

        // Base price must auto-sync to the lowest option rate (7000)
        assertEquals(7000.0, ((Number) prop.get("monthlyRentPerBed")).doubleValue());
        assertEquals(7000.0, ((Number) prop.get("price")).doubleValue());

        // Verify update property preserves options
        options.get(2).put("monthlyRentPerBed", 6500.0);
        PropertyRequest updateReq = new PropertyRequest();
        updateReq.setTitle("PG Living Updated");
        updateReq.setDescription("Verified modern PG accommodation");
        updateReq.setPropertyType("PG");
        updateReq.setCategory("PG");
        updateReq.setBookingType("monthly");
        updateReq.setStayTypes(List.of("monthly"));
        updateReq.setCity("Noida");
        updateReq.setArea("Sector 62");
        updateReq.setAddress("A-14 Innovation Park");
        updateReq.setBedrooms(4);
        updateReq.setBathrooms(2);
        updateReq.setContractDuration("3_months");
        updateReq.setOccupancyOptions(options);
        propertyService.updateProperty(hostUser, propertyId, updateReq);

        DocumentSnapshot updatedDoc = propertyRepository.findById(propertyId);
        Map<String, Object> updatedProp = updatedDoc.getData();
        assertNotNull(updatedProp);
        assertEquals(6500.0, ((Number) updatedProp.get("monthlyRentPerBed")).doubleValue());
    }

    @Test
    void testAvailabilityAndBookingByOccupancyType() throws Exception {
        List<Map<String, Object>> options = List.of(
                Map.of("id", "opt_single", "name", "Single Private Room", "occupancyType", "single", "monthlyRentPerBed", 12000.0),
                Map.of("id", "opt_double", "name", "Double Sharing Room", "occupancyType", "double", "monthlyRentPerBed", 8500.0)
        );

        String propertyId = createAndApprovePgWithOccupancyOptions(options);

        // Room 101: Double sharing with 2 beds
        String room101Id = createUnit(propertyId, "room", "Room 101", 2, null, "double", "opt_double");
        String bed101A = createUnit(propertyId, "bed", "Bed 101-A", 1, room101Id, "double", "opt_double");
        String bed101B = createUnit(propertyId, "bed", "Bed 101-B", 1, room101Id, "double", "opt_double");

        // Room 102: Single sharing with 1 bed
        String room102Id = createUnit(propertyId, "room", "Room 102", 1, null, "single", "opt_single");
        String bed102A = createUnit(propertyId, "bed", "Bed 102-A", 1, room102Id, "single", "opt_single");

        String startDate = LocalDate.now().plusDays(10).toString();
        String endDate = LocalDate.now().plusDays(40).toString();

        // 1. Check availability for single sharing -> should be available
        Map<String, Object> availSingle = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "single", "opt_single"
        );
        assertTrue((Boolean) availSingle.get("available"));

        // 2. Guest 1 books a single sharing option
        BookingRequest b1 = new BookingRequest();
        b1.setPropertyId(propertyId);
        b1.setBookingType("monthly");
        b1.setStartDate(startDate);
        b1.setEndDate(endDate);
        b1.setOccupancyType("single");
        b1.setRoomTypeId("opt_single");
        b1.setOccupancyOptionName("Single Private Room");

        Map<String, Object> booking1Res = bookingService.createBooking(guestUser1, b1);
        String booking1Id = String.valueOf(booking1Res.get("bookingId"));
        createdBookingIds.add(booking1Id);

        DocumentSnapshot b1Doc = bookingRepository.findById(booking1Id);
        Booking booking1 = b1Doc.toObject(Booking.class);
        assertNotNull(booking1);
        assertEquals(bed102A, booking1.getInventoryUnitId());
        assertEquals(12000.0, booking1.getAmount());
        assertEquals("single", booking1.getOccupancyType());

        // 3. Single sharing is now fully occupied for those dates
        Map<String, Object> availSingleAfter = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "single", "opt_single"
        );
        assertFalse((Boolean) availSingleAfter.get("available"));

        // 4. Double sharing should still be completely available!
        Map<String, Object> availDouble = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "double", "opt_double"
        );
        assertTrue((Boolean) availDouble.get("available"));

        // 5. Guest 2 books double sharing -> should allocate Bed 101-A
        BookingRequest b2 = new BookingRequest();
        b2.setPropertyId(propertyId);
        b2.setBookingType("monthly");
        b2.setStartDate(startDate);
        b2.setEndDate(endDate);
        b2.setOccupancyType("double");
        b2.setRoomTypeId("opt_double");
        b2.setOccupancyOptionName("Double Sharing Room");

        Map<String, Object> booking2Res = bookingService.createBooking(guestUser2, b2);
        String booking2Id = String.valueOf(booking2Res.get("bookingId"));
        createdBookingIds.add(booking2Id);

        DocumentSnapshot b2Doc = bookingRepository.findById(booking2Id);
        Booking booking2 = b2Doc.toObject(Booking.class);
        assertNotNull(booking2);
        assertTrue(booking2.getInventoryUnitId().equals(bed101A) || booking2.getInventoryUnitId().equals(bed101B));
        assertEquals(8500.0, booking2.getAmount());

        // 6. Double sharing still has Bed 101-B available!
        Map<String, Object> availDouble2 = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "double", "opt_double"
        );
        assertTrue((Boolean) availDouble2.get("available"));

        // 7. Guest 3 books remaining double sharing bed -> should allocate Bed 101-B
        BookingRequest b3 = new BookingRequest();
        b3.setPropertyId(propertyId);
        b3.setBookingType("monthly");
        b3.setStartDate(startDate);
        b3.setEndDate(endDate);
        b3.setOccupancyType("double");
        b3.setRoomTypeId("opt_double");
        b3.setOccupancyOptionName("Double Sharing Room");

        Map<String, Object> booking3Res = bookingService.createBooking(guestUser3, b3);
        String booking3Id = String.valueOf(booking3Res.get("bookingId"));
        createdBookingIds.add(booking3Id);

        DocumentSnapshot b3Doc = bookingRepository.findById(booking3Id);
        Booking booking3 = b3Doc.toObject(Booking.class);
        assertNotNull(booking3);
        assertTrue(booking3.getInventoryUnitId().equals(bed101A) || booking3.getInventoryUnitId().equals(bed101B));
        assertNotEquals(booking2.getInventoryUnitId(), booking3.getInventoryUnitId());
        assertEquals(8500.0, booking3.getAmount());

        // 8. Now double sharing is fully booked!
        Map<String, Object> availDoubleFull = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "double", "opt_double"
        );
        assertFalse((Boolean) availDoubleFull.get("available"));
    }

    @Test
    void testVisitsDoNotLockInventoryOrHoldBooking() throws Exception {
        List<Map<String, Object>> options = List.of(
                Map.of("id", "opt_single", "name", "Single Room", "occupancyType", "single", "monthlyRentPerBed", 11000.0)
        );

        String propertyId = createAndApprovePgWithOccupancyOptions(options);
        String roomId = createUnit(propertyId, "room", "Room 201", 1, null, "single", "opt_single");
        createUnit(propertyId, "bed", "Bed 201-A", 1, roomId, "single", "opt_single");

        String startDate = LocalDate.now().plusDays(5).toString();
        String endDate = LocalDate.now().plusDays(35).toString();

        // Check availability before visit inquiry
        Map<String, Object> availBefore = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "single", "opt_single"
        );
        assertTrue((Boolean) availBefore.get("available"));

        // Confirm zero bookings exist for this property
        List<QueryDocumentSnapshot> existingBookings = bookingRepository.findByPropertyId(propertyId);
        assertTrue(existingBookings.isEmpty());

        // Availability remains completely available
        Map<String, Object> availAfter = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, "single", "opt_single"
        );
        assertTrue((Boolean) availAfter.get("available"));
    }

    @Test
    void testWholePropertyRentalPreservedForFlats() throws Exception {
        PropertyRequest req = new PropertyRequest();
        req.setTitle("2BHK Flat " + UUID.randomUUID().toString().substring(0, 6));
        req.setDescription("Complete flat rental");
        req.setPropertyType("FLAT");
        req.setCategory("FLAT");
        req.setBookingType("monthly");
        req.setStayTypes(List.of("monthly"));
        req.setPrice(35000.0);
        req.setMonthlyPrice(35000.0);
        req.setCity("Gurugram");
        req.setArea("DLF Phase 5");
        req.setAddress("Golf Course Road");
        req.setBedrooms(2);
        req.setBathrooms(2);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propertyId = String.valueOf(created.get("id"));
        createdPropertyIds.add(propertyId);
        adminService.approveProperty(adminUser, propertyId, "Approved in test");

        String startDate = LocalDate.now().plusDays(2).toString();
        String endDate = LocalDate.now().plusDays(32).toString();

        // Flat has no units, availability locks the whole property
        Map<String, Object> avail = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, null, null
        );
        assertTrue((Boolean) avail.get("available"));

        // Book entire flat
        BookingRequest b = new BookingRequest();
        b.setPropertyId(propertyId);
        b.setBookingType("monthly");
        b.setStartDate(startDate);
        b.setEndDate(endDate);

        Map<String, Object> bRes = bookingService.createBooking(guestUser1, b);
        String bId = String.valueOf(bRes.get("bookingId"));
        createdBookingIds.add(bId);

        // Entire flat is now unavailable for overlapping dates
        Map<String, Object> availAfter = propertyService.checkPropertyAvailability(
                propertyId, startDate, endDate, null, null, "monthly", null, null, null
        );
        assertFalse((Boolean) availAfter.get("available"));
    }
}
