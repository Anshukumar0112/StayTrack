package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.inventory.InventoryUnitRequest;
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
public class HostPropertyManagementEndToEndVerificationTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private VisitService visitService;

    @Autowired
    private UserService userService;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser otherHostUser;
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

        String hostUid = "test_host_mgmt_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811199001", "host");

        String otherHostUid = "test_other_host_" + UUID.randomUUID().toString().substring(0, 8);
        otherHostUser = new AuthenticatedUser(otherHostUid, "+919811199002", "host");

        String adminUid = "test_admin_mgmt_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000099003", "admin");

        String guestUid = "test_guest_mgmt_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser = new AuthenticatedUser(guestUid, "+919711199004", "customer");
        userService.getOrCreateUser(guestUser);

        String secondGuestUid = "test_guest2_mgmt_" + UUID.randomUUID().toString().substring(0, 8);
        secondGuestUser = new AuthenticatedUser(secondGuestUid, "+919711199005", "customer");
        userService.getOrCreateUser(secondGuestUser);

        // Active host subscription for property creation
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

    @Test
    @Order(1)
    @DisplayName("Scenario A: Create Property -> Validation, Persistence, Host Association, and Refresh Preservation")
    void testScenarioA_CreateProperty_Validation_Persistence_Refresh() throws Exception {
        System.out.println("=== Starting Scenario A: Create Property ===");

        // 1. Validation: Missing mandatory title must fail
        PropertyRequest invalidReq = new PropertyRequest();
        invalidReq.setHostType("pg_owner");
        invalidReq.setTitle("");
        invalidReq.setCity("Gurugram");
        invalidReq.setArea("DLF Phase 1");
        invalidReq.setDailyPrice(2500.0);
        invalidReq.setStayTypes(List.of("daily"));
        assertThrows(RuntimeException.class, () -> propertyService.createProperty(hostUser, invalidReq),
                "Missing title must be rejected by validation");

        // 2. Validation: Non-host user cannot create property
        PropertyRequest validReq = new PropertyRequest();
        validReq.setHostType("pg_owner");
        validReq.setTitle("Heritage Haveli B&B");
        validReq.setDescription("Charming homestay in Gurgaon");
        validReq.setPropertyType("bnb");
        validReq.setCategory("bnb");
        validReq.setStayTypes(List.of("daily"));
        validReq.setDailyPrice(3200.0);
        validReq.setAddress("Golf Course Road");
        validReq.setCity("Gurugram");
        validReq.setArea("DLF Phase 1");
        validReq.setBedrooms(2);
        validReq.setBathrooms(2);
        validReq.setFurnished(true);

        assertThrows(RuntimeException.class, () -> propertyService.createProperty(guestUser, validReq),
                "Non-host users must not be permitted to create properties");

        // 3. Valid creation by host
        Map<String, Object> created = propertyService.createProperty(hostUser, validReq);
        assertNotNull(created);
        String propId = (String) created.get("propertyId");
        assertNotNull(propId);
        createdPropertyIds.add(propId);

        // Verification in Firestore
        DocumentSnapshot doc = db.collection("properties").document(propId).get().get();
        assertTrue(doc.exists(), "Property must be persisted in Firestore");
        assertEquals("Heritage Haveli B&B", doc.getString("title"));
        assertEquals(hostUser.getUid(), doc.getString("hostId"), "Property must be associated with the creating host");
        assertEquals("pending", doc.getString("verificationStatus"), "Initial verificationStatus must be pending");
        assertEquals("hidden", doc.getString("listingStatus"), "Initial listingStatus must be hidden");

        // Refresh simulation: retrieve property again via getProperty
        Map<String, Object> refreshed = propertyService.getProperty(propId, hostUser);
        assertNotNull(refreshed);
        assertEquals("Heritage Haveli B&B", refreshed.get("title"));
        assertEquals("Gurugram", refreshed.get("city"));
        assertEquals("DLF Phase 1", refreshed.get("area"));
        assertEquals(hostUser.getUid(), refreshed.get("hostId"));

        System.out.println("=== Scenario A PASSED: Property created, validated, persisted, and verified on refresh ===");
    }

    @Test
    @Order(2)
    @DisplayName("Scenario B: Configure Property Category and Stay Model across Hotel, B&B, PG, Hostel, and Flat")
    void testScenarioB_CategoryAndStayModelConfiguration() throws Exception {
        System.out.println("=== Starting Scenario B: Category and Stay Model Configuration ===");

        // 1. Hotel: Transient daily stay
        PropertyRequest hotelReq = new PropertyRequest();
        hotelReq.setHostType("pg_owner");
        hotelReq.setTitle("Grand Palace Hotel");
        hotelReq.setPropertyType("hotel");
        hotelReq.setCategory("hotel");
        hotelReq.setStayTypes(List.of("daily"));
        hotelReq.setDailyPrice(4500.0);
        hotelReq.setCity("Delhi");
        hotelReq.setArea("Aerocity");
        hotelReq.setBedrooms(1);
        hotelReq.setBathrooms(1);
        hotelReq.setBedType("king");
        hotelReq.setBreakfastIncluded(true);
        hotelReq.setCancellationPolicy("flexible");

        Map<String, Object> createdHotel = propertyService.createProperty(hostUser, hotelReq);
        String hotelId = (String) createdHotel.get("propertyId");
        createdPropertyIds.add(hotelId);
        DocumentSnapshot hotelDoc = db.collection("properties").document(hotelId).get().get();
        assertEquals("hotel", hotelDoc.getString("category"));
        assertEquals("king", hotelDoc.getString("bedType"));
        assertEquals(Boolean.TRUE, hotelDoc.getBoolean("breakfastIncluded"));
        assertNull(hotelDoc.get("contractDuration"), "Hotel must not have lease contract terms");

        // 2. B&B: Transient homestay
        PropertyRequest bnbReq = new PropertyRequest();
        bnbReq.setHostType("pg_owner");
        bnbReq.setTitle("Greenwood Cottage B&B");
        bnbReq.setPropertyType("bnb");
        bnbReq.setCategory("bnb");
        bnbReq.setStayTypes(List.of("daily"));
        bnbReq.setDailyPrice(2800.0);
        bnbReq.setCity("Noida");
        bnbReq.setArea("Sector 62");
        bnbReq.setBedrooms(1);
        bnbReq.setBathrooms(1);
        bnbReq.setSpaceType("entire_place");
        bnbReq.setMaxGuests(3);
        bnbReq.setBedsCount(2);
        bnbReq.setCheckInTime("01:00 PM");
        bnbReq.setCheckOutTime("11:00 AM");

        Map<String, Object> createdBnb = propertyService.createProperty(hostUser, bnbReq);
        String bnbId = (String) createdBnb.get("propertyId");
        createdPropertyIds.add(bnbId);
        DocumentSnapshot bnbDoc = db.collection("properties").document(bnbId).get().get();
        assertEquals("bnb", bnbDoc.getString("category"));
        assertEquals("entire_place", bnbDoc.getString("spaceType"));
        assertEquals(3, bnbDoc.getLong("maxGuests"));

        // 3. PG: Monthly lease with occupancy & food terms
        PropertyRequest pgReq = new PropertyRequest();
        pgReq.setHostType("pg_owner");
        pgReq.setTitle("Stanza Living PG");
        pgReq.setPropertyType("pg");
        pgReq.setCategory("pg");
        pgReq.setStayTypes(List.of("monthly"));
        pgReq.setMonthlyPrice(11000.0);
        pgReq.setCity("Gurugram");
        pgReq.setArea("Sector 28");
        pgReq.setBedrooms(1);
        pgReq.setBathrooms(1);
        pgReq.setOccupancyType("double");
        pgReq.setGenderCategory("male");
        pgReq.setFoodIncluded(true);
        pgReq.setFoodOptions(List.of("Breakfast", "Dinner"));
        pgReq.setSecurityDeposit(11000.0);
        pgReq.setSecurityDepositEnabled(true);
        pgReq.setNoticePeriodDays(30);

        Map<String, Object> createdPg = propertyService.createProperty(hostUser, pgReq);
        String pgId = (String) createdPg.get("propertyId");
        createdPropertyIds.add(pgId);
        DocumentSnapshot pgDoc = db.collection("properties").document(pgId).get().get();
        assertEquals("pg", pgDoc.getString("category"));
        assertEquals("double", pgDoc.getString("occupancyType"));
        assertEquals(Boolean.TRUE, pgDoc.getBoolean("foodIncluded"));
        assertEquals(11000.0, pgDoc.getDouble("securityDeposit"));

        // 4. Hostel: Dual stay model (daily & monthly)
        PropertyRequest hostelReq = new PropertyRequest();
        hostelReq.setHostType("pg_owner");
        hostelReq.setTitle("Backpackers Hub Hostel");
        hostelReq.setPropertyType("hostel");
        hostelReq.setCategory("hostel");
        hostelReq.setStayTypes(List.of("daily", "monthly"));
        hostelReq.setDailyPrice(650.0);
        hostelReq.setMonthlyPrice(7500.0);
        hostelReq.setCity("Delhi");
        hostelReq.setArea("Hauz Khas");
        hostelReq.setBedrooms(4);
        hostelReq.setBathrooms(4);
        hostelReq.setRoomType("dormitory");
        hostelReq.setTotalBeds(8);
        hostelReq.setAvailableBeds(6);
        hostelReq.setSharedFacilities(List.of("Wi-Fi", "Lockers"));

        Map<String, Object> createdHostel = propertyService.createProperty(hostUser, hostelReq);
        String hostelId = (String) createdHostel.get("propertyId");
        createdPropertyIds.add(hostelId);
        DocumentSnapshot hostelDoc = db.collection("properties").document(hostelId).get().get();
        assertEquals("hostel", hostelDoc.getString("category"));
        List<?> stayTypes = (List<?>) hostelDoc.get("stayTypes");
        assertTrue(stayTypes.contains("daily") && stayTypes.contains("monthly"), "Hostel must support dual stay types");

        // 5. Flat: Residential long-term apartment
        PropertyRequest flatReq = new PropertyRequest();
        flatReq.setHostType("pg_owner");
        flatReq.setTitle("Modern 2BHK Apartment");
        flatReq.setPropertyType("flat");
        flatReq.setCategory("flat");
        flatReq.setStayTypes(List.of("monthly"));
        flatReq.setMonthlyPrice(32000.0);
        flatReq.setCity("Noida");
        flatReq.setArea("Sector 137");
        flatReq.setBedrooms(2);
        flatReq.setBathrooms(2);
        flatReq.setBhkConfig("2 BHK");
        flatReq.setMaintenanceCharges(3000.0);
        flatReq.setTenantPreference("family");
        flatReq.setParkingType("covered");

        Map<String, Object> createdFlat = propertyService.createProperty(hostUser, flatReq);
        String flatId = (String) createdFlat.get("propertyId");
        createdPropertyIds.add(flatId);
        DocumentSnapshot flatDoc = db.collection("properties").document(flatId).get().get();
        assertEquals("flat", flatDoc.getString("category"));
        assertEquals("2 BHK", flatDoc.getString("bhkConfig"));
        assertEquals(3000.0, flatDoc.getDouble("maintenanceCharges"));

        System.out.println("=== Scenario B PASSED: All 5 categories configured with appropriate stay models and attributes ===");
    }

    @Test
    @Order(3)
    @DisplayName("Scenario C: Configure Inventory and Availability -> Units persistence, availability calculation, visit independence")
    void testScenarioC_InventoryAndAvailability() throws Exception {
        System.out.println("=== Starting Scenario C: Inventory & Availability Configuration ===");

        // 1. Create property
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Co-Living Suites Sector 43");
        req.setPropertyType("pg");
        req.setCategory("pg");
        req.setStayTypes(List.of("monthly"));
        req.setMonthlyPrice(15000.0);
        req.setCity("Gurugram");
        req.setArea("Sector 43");
        req.setBedrooms(2);
        req.setBathrooms(2);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved");

        // 2. Configure inventory units via inventoryService
        InventoryUnitRequest unit1Req = new InventoryUnitRequest();
        unit1Req.setUnitName("Room 101 - Bed A");
        unit1Req.setUnitType("bed");
        unit1Req.setCapacity(1);
        unit1Req.setPrice(15000.0);
        unit1Req.setStatus("available");

        Map<String, Object> unit1 = inventoryService.createInventoryUnit(propId, unit1Req, hostUser);
        assertNotNull(unit1);
        String unit1Id = (String) unit1.get("id");
        assertNotNull(unit1Id);

        InventoryUnitRequest unit2Req = new InventoryUnitRequest();
        unit2Req.setUnitName("Room 101 - Bed B");
        unit2Req.setUnitType("bed");
        unit2Req.setCapacity(1);
        unit2Req.setPrice(15000.0);
        unit2Req.setStatus("available");

        Map<String, Object> unit2 = inventoryService.createInventoryUnit(propId, unit2Req, hostUser);
        assertNotNull(unit2);
        String unit2Id = (String) unit2.get("id");
        assertNotNull(unit2Id);

        // Verify units list
        List<Map<String, Object>> units = inventoryService.getInventoryUnits(propId);
        assertEquals(2, units.size(), "Property must have 2 configured inventory units");

        // 3. Check initial availability: both units available
        String start = LocalDate.now().plusMonths(1).toString();
        String end = LocalDate.now().plusMonths(2).toString();

        Map<String, Object> availCheck1 = propertyService.checkPropertyAvailability(
                propId, start, end, null, null, "monthly", unit1Id
        );
        assertEquals(Boolean.TRUE, availCheck1.get("available"), "Unit 1 must initially be available");

        // 4. Book Unit 1
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propId);
        bReq.setInventoryUnitId(unit1Id);
        bReq.setBookingType("monthly");
        bReq.setStartDate(start);
        bReq.setEndDate(end);

        Map<String, Object> booking = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // 5. Availability reflects actual backend records: Unit 1 unavailable, Unit 2 available
        Map<String, Object> availCheckUnit1After = propertyService.checkPropertyAvailability(
                propId, start, end, null, null, "monthly", unit1Id
        );
        assertEquals(Boolean.FALSE, availCheckUnit1After.get("available"), "Booked Unit 1 must report unavailable");

        Map<String, Object> availCheckUnit2After = propertyService.checkPropertyAvailability(
                propId, start, end, null, null, "monthly", unit2Id
        );
        assertEquals(Boolean.TRUE, availCheckUnit2After.get("available"), "Vacant Unit 2 must report available");

        // 6. Confirm visits do NOT reserve or lock accommodation inventory
        VisitRequest vReq = new VisitRequest();
        vReq.setPropertyId(propId);
        vReq.setVisitDate(LocalDate.now().plusDays(5).toString());
        vReq.setTimeSlot("02:00 PM - 03:00 PM");
        vReq.setVisitorName("Prospective Guest");

        Map<String, Object> visit = visitService.createVisit(secondGuestUser, vReq);
        createdVisitIds.add((String) visit.get("visitId"));

        Map<String, Object> availAfterVisit = propertyService.checkPropertyAvailability(
                propId, start, end, null, null, "monthly", unit2Id
        );
        assertEquals(Boolean.TRUE, availAfterVisit.get("available"), "Visit must NOT lock accommodation inventory");

        System.out.println("=== Scenario C PASSED: Inventory configured, availability calculations accurate, visits non-locking ===");
    }

    @Test
    @Order(4)
    @DisplayName("Scenario D: Submission, Approval, and Publishing -> Status transitions, marketplace visibility gating")
    void testScenarioD_SubmissionApprovalPublishing() throws Exception {
        System.out.println("=== Starting Scenario D: Submission, Approval, and Publishing ===");

        // Step 1: Host creates property
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Cyber City Executive Flat");
        req.setPropertyType("flat");
        req.setCategory("flat");
        req.setStayTypes(List.of("monthly"));
        req.setMonthlyPrice(28000.0);
        req.setCity("Gurugram");
        req.setArea("DLF Phase 2");
        req.setBedrooms(2);
        req.setBathrooms(2);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Verification Stage 1: Created -> pending & hidden
        DocumentSnapshot stage1Doc = db.collection("properties").document(propId).get().get();
        assertEquals("pending", stage1Doc.getString("verificationStatus"));
        assertEquals("hidden", stage1Doc.getString("listingStatus"));
        assertEquals(Boolean.FALSE, stage1Doc.getBoolean("showInStay"));

        // Verification Stage 2: Pending property must NOT appear in guest-facing public search/marketplace
        List<Map<String, Object>> publicListingsBefore = propertyService.getPublicProperties();
        boolean inPublicListingsBefore = publicListingsBefore.stream()
                .anyMatch(p -> propId.equals(p.get("propertyId")));
        assertFalse(inPublicListingsBefore, "Unapproved property must NOT be visible to guests");

        // Verification Stage 3: Admin approves property
        Map<String, Object> approved = adminService.approveProperty(adminUser, propId, "Documents verified");
        assertEquals("approved", approved.get("verificationStatus"));
        assertEquals("active", approved.get("listingStatus"));
        assertEquals(Boolean.TRUE, approved.get("showInStay"));

        DocumentSnapshot stage3Doc = db.collection("properties").document(propId).get().get();
        assertEquals("approved", stage3Doc.getString("verificationStatus"));
        assertEquals("active", stage3Doc.getString("listingStatus"));

        // Verification Stage 4: Approved property now appears in guest-facing marketplace
        List<Map<String, Object>> publicListingsAfter = propertyService.getPublicProperties();
        boolean inPublicListingsAfter = publicListingsAfter.stream()
                .anyMatch(p -> propId.equals(p.get("propertyId")));
        assertTrue(inPublicListingsAfter, "Approved and active property MUST be visible in guest marketplace");

        System.out.println("=== Scenario D PASSED: Status transitions and marketplace visibility gating verified ===");
    }

    @Test
    @Order(5)
    @DisplayName("Scenario E: Guest-Facing Property Details -> Accurately reflects host configuration and blocks invalid bookings")
    void testScenarioE_GuestFacingPropertyDetails() throws Exception {
        System.out.println("=== Starting Scenario E: Guest-Facing Property Details ===");

        // 1. Create and approve property with specific configuration
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Serene Heights B&B");
        req.setDescription("Quiet villa retreat near DLF Cyberhub");
        req.setPropertyType("bnb");
        req.setCategory("bnb");
        req.setStayTypes(List.of("daily"));
        req.setDailyPrice(3800.0);
        req.setCity("Gurugram");
        req.setArea("Sector 25");
        req.setBedrooms(2);
        req.setBathrooms(2);
        req.setSpaceType("entire_place");
        req.setMaxGuests(4);
        req.setCheckInTime("02:00 PM");
        req.setCheckOutTime("11:00 AM");

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Verified");

        // 2. Query property as guest
        Map<String, Object> guestView = propertyService.getProperty(propId, guestUser);
        assertNotNull(guestView);
        assertEquals("Serene Heights B&B", guestView.get("title"));
        assertEquals("Quiet villa retreat near DLF Cyberhub", guestView.get("description"));
        assertEquals("bnb", String.valueOf(guestView.get("category")).toLowerCase());
        assertEquals("Gurugram", guestView.get("city"));
        assertEquals("Sector 25", guestView.get("area"));
        assertEquals(3800.0, ((Number) guestView.get("dailyPrice")).doubleValue());
        assertEquals("entire_place", guestView.get("spaceType"));

        // 3. Confirm guests cannot book invalid stay model (e.g. monthly on a daily-only B&B)
        BookingRequest invalidModelReq = new BookingRequest();
        invalidModelReq.setPropertyId(propId);
        invalidModelReq.setBookingType("monthly");
        invalidModelReq.setStartDate(LocalDate.now().plusMonths(1).toString());
        invalidModelReq.setEndDate(LocalDate.now().plusMonths(2).toString());

        assertThrows(RuntimeException.class, () -> bookingService.createBooking(guestUser, invalidModelReq),
                "Guests must not be permitted to book unsupported stay types on property");

        System.out.println("=== Scenario E PASSED: Guest-facing details match host configuration and invalid bookings blocked ===");
    }

    @Test
    @Order(6)
    @DisplayName("Scenario F: Update Existing Property -> Persistence, Guest Reflection, and Existing Booking Protection")
    void testScenarioF_UpdateExistingProperty_BookingProtection() throws Exception {
        System.out.println("=== Starting Scenario F: Update Property & Protect Existing Bookings ===");

        // 1. Create and approve property
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle("Original Hotel Regal");
        req.setPropertyType("hotel");
        req.setCategory("hotel");
        req.setStayTypes(List.of("daily"));
        req.setDailyPrice(4000.0);
        req.setCity("Delhi");
        req.setArea("Connaught Place");
        req.setBedrooms(1);
        req.setBathrooms(1);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved");

        // 2. Create and confirm an existing booking
        String start = LocalDate.now().plusMonths(2).toString();
        String end = LocalDate.now().plusMonths(2).plusDays(3).toString();

        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propId);
        bReq.setBookingType("daily");
        bReq.setStartDate(start);
        bReq.setEndDate(end);

        Map<String, Object> booking = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);
        bookingRepository.confirmWithAvailabilityCheck(propId, bookingId);

        // 3. Host updates property attributes (pricing, area, bedrooms)
        PropertyRequest updateReq = new PropertyRequest();
        updateReq.setTitle("Original Hotel Regal");
        updateReq.setDescription("Premier hotel in Connaught Place");
        updateReq.setPropertyType("hotel");
        updateReq.setCategory("hotel");
        updateReq.setStayTypes(List.of("daily"));
        updateReq.setDailyPrice(5500.0);
        updateReq.setCity("Delhi");
        updateReq.setArea("Barakhamba Road");
        updateReq.setBedrooms(2);
        updateReq.setBathrooms(1);

        Map<String, Object> updated = propertyService.updateProperty(hostUser, propId, updateReq);
        assertNotNull(updated);
        assertEquals(5500.0, ((Number) updated.get("dailyPrice")).doubleValue());
        assertEquals("Barakhamba Road", updated.get("area"));
        assertEquals(2, ((Number) updated.get("bedrooms")).intValue());

        // Verify persistence after refresh
        Map<String, Object> refreshed = propertyService.getProperty(propId, guestUser);
        assertEquals(5500.0, ((Number) refreshed.get("dailyPrice")).doubleValue());
        assertEquals("Barakhamba Road", refreshed.get("area"));
        assertEquals(2, ((Number) refreshed.get("bedrooms")).intValue());

        // 4. Verify existing confirmed booking remains completely protected
        DocumentSnapshot existingBookingDoc = db.collection("bookings").document(bookingId).get().get();
        assertEquals("confirmed", existingBookingDoc.getString("bookingStatus"),
                "Existing confirmed booking must remain confirmed after property edits");
        assertEquals("captured", existingBookingDoc.getString("paymentStatus"));

        // 5. Verify availability protection: overlapping booking attempt is still blocked!
        BookingRequest overlapReq = new BookingRequest();
        overlapReq.setPropertyId(propId);
        overlapReq.setBookingType("daily");
        overlapReq.setStartDate(start);
        overlapReq.setEndDate(end);

        assertThrows(IllegalStateException.class, () -> bookingService.createBooking(secondGuestUser, overlapReq),
                "Property update must NOT invalidate existing availability locks or allow overlapping bookings");

        System.out.println("=== Scenario F PASSED: Property updated, refreshed, and existing bookings remain 100% protected ===");
    }
}
