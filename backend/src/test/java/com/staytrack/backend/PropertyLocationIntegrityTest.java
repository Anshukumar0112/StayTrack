package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.dto.search.SearchRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.BookingService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.service.SearchService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PropertyLocationIntegrityTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private SearchService searchService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    private Firestore db;
    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdBookingIds = new ArrayList<>();
    private final String hostUid = "test_host_loc_001";
    private final String guestUid = "test_guest_loc_002";
    private final String otherGuestUid = "test_guest_loc_003";
    private final String adminUid = "test_admin_loc_004";
    private final String subId = "test_sub_loc_001";

    private AuthenticatedUser hostUser;
    private AuthenticatedUser guestUser;
    private AuthenticatedUser otherGuestUser;
    private AuthenticatedUser adminUser;

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();
        hostUser = new AuthenticatedUser(hostUid, "+919888877777", "host");
        guestUser = new AuthenticatedUser(guestUid, "+919777766666", "customer");
        otherGuestUser = new AuthenticatedUser(otherGuestUid, "+919666655555", "customer");
        adminUser = new AuthenticatedUser(adminUid, "+919000000001", "admin");

        // Seed active host subscription
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
        for (String id : createdBookingIds) {
            try {
                bookingRepository.delete(id);
            } catch (Exception ignored) {}
        }
        for (String id : createdPropertyIds) {
            try {
                db.collection("properties").document(id).delete().get();
            } catch (Exception ignored) {}
        }
        try { db.collection("subscriptions").document(subId).delete().get(); } catch (Exception ignored) {}
        try { db.collection("users").document(hostUid).delete().get(); } catch (Exception ignored) {}
        try { db.collection("users").document(guestUid).delete().get(); } catch (Exception ignored) {}
        try { db.collection("users").document(otherGuestUid).delete().get(); } catch (Exception ignored) {}
        try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
    }

    private PropertyRequest createBaseRequest() {
        PropertyRequest req = new PropertyRequest();
        req.setHostType("owner");
        req.setTitle("Location Integrity Test Property");
        req.setDescription("Testing coordinates validation and address privacy.");
        req.setPropertyType("bnb");
        req.setCategory("BNB");
        req.setStayTypes(List.of("daily"));
        req.setDailyPrice(2500.0);
        req.setAddress("Flat 402, Tower B, Cyber City Residences");
        req.setCity("Gurugram");
        req.setArea("Cyber City");
        req.setBedrooms(2);
        req.setBathrooms(2);
        req.setFurnished(true);
        return req;
    }

    @Test
    void testValidCoordinatesAreAcceptedAndPersisted() {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.4950);
        req.setLongitude(77.0895);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        assertNotNull(created);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        assertEquals(28.4950, ((Number) created.get("latitude")).doubleValue(), 0.0001);
        assertEquals(77.0895, ((Number) created.get("longitude")).doubleValue(), 0.0001);
        assertEquals("Flat 402, Tower B, Cyber City Residences", created.get("address"));
    }

    @Test
    void testInvalidCoordinatesAreRejected() {
        // Latitude > 90
        PropertyRequest req1 = createBaseRequest();
        req1.setLatitude(91.5);
        req1.setLongitude(77.0895);
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () ->
                propertyService.createProperty(hostUser, req1));
        assertTrue(ex1.getMessage().contains("Latitude must be a valid number between -90 and 90"));

        // Latitude < -90
        PropertyRequest req2 = createBaseRequest();
        req2.setLatitude(-95.0);
        req2.setLongitude(77.0895);
        assertThrows(IllegalArgumentException.class, () ->
                propertyService.createProperty(hostUser, req2));

        // Longitude > 180
        PropertyRequest req3 = createBaseRequest();
        req3.setLatitude(28.4950);
        req3.setLongitude(185.0);
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, () ->
                propertyService.createProperty(hostUser, req3));
        assertTrue(ex3.getMessage().contains("Longitude must be a valid number between -180 and 180"));

        // Longitude < -180
        PropertyRequest req4 = createBaseRequest();
        req4.setLatitude(28.4950);
        req4.setLongitude(-181.0);
        assertThrows(IllegalArgumentException.class, () ->
                propertyService.createProperty(hostUser, req4));

        // Partial coordinates (lat provided, lng null)
        PropertyRequest req5 = createBaseRequest();
        req5.setLatitude(28.4950);
        req5.setLongitude(null);
        IllegalArgumentException ex5 = assertThrows(IllegalArgumentException.class, () ->
                propertyService.createProperty(hostUser, req5));
        assertTrue(ex5.getMessage().contains("Both latitude and longitude must be provided together"));
    }

    @Test
    void testMissingCoordinatesHandledGracefullyWithoutArbitraryCityCenter() {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(null);
        req.setLongitude(null);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        assertNotNull(created);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        assertNull(created.get("latitude"), "Latitude must remain null when not supplied, not replaced by city center");
        assertNull(created.get("longitude"), "Longitude must remain null when not supplied, not replaced by city center");

        // Public view of property without coordinates must not invent coordinates
        adminService.approveProperty(adminUser, propId, "Approved");
        Map<String, Object> publicView = propertyService.getProperty(propId, null);
        assertNull(publicView.get("latitude"));
        assertNull(publicView.get("longitude"));
        assertNull(publicView.get("approximateLatitude"));
        assertNull(publicView.get("approximateLongitude"));
    }

    @Test
    void testOwnerCanStillRetrieveAndEditTheirExactLocation() {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.4950);
        req.setLongitude(77.0895);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Owner retrieves property and receives exact location
        Map<String, Object> ownerView = propertyService.getProperty(propId, hostUser);
        assertEquals("Flat 402, Tower B, Cyber City Residences", ownerView.get("address"));
        assertEquals(28.4950, ((Number) ownerView.get("latitude")).doubleValue(), 0.0001);
        assertEquals(77.0895, ((Number) ownerView.get("longitude")).doubleValue(), 0.0001);
        assertEquals(Boolean.TRUE, ownerView.get("isExactLocation"));

        // Owner updates address and coordinates
        PropertyRequest updateReq = createBaseRequest();
        updateReq.setAddress("Villa 12, Phase 5, DLF Cyber City");
        updateReq.setLatitude(28.5010);
        updateReq.setLongitude(77.0920);

        Map<String, Object> updated = propertyService.updateProperty(hostUser, propId, updateReq);
        assertNotNull(updated);
        assertEquals("Villa 12, Phase 5, DLF Cyber City", updated.get("address"));
        assertEquals(28.5010, ((Number) updated.get("latitude")).doubleValue(), 0.0001);
        assertEquals(77.0920, ((Number) updated.get("longitude")).doubleValue(), 0.0001);
    }

    @Test
    void testAnonymousPropertyDetailAndSearchResponsesDoNotExposeExactCoordinatesOrStreetAddress() throws Exception {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.495024);
        req.setLongitude(77.089512);
        req.setAddress("Secret Street 999, Private Compound");

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Approve and activate property
        adminService.approveProperty(adminUser, propId, "Approved for testing");

        // 1. Anonymous visitor detail view MUST NOT contain address or exact coordinates
        Map<String, Object> publicView = propertyService.getProperty(propId, null);
        assertNull(publicView.get("address"), "Public visitor must NOT see private street address");
        assertNull(publicView.get("latitude"), "Public visitor must NOT receive exact latitude");
        assertNull(publicView.get("longitude"), "Public visitor must NOT receive exact longitude");
        assertNull(publicView.get("lat"));
        assertNull(publicView.get("lng"));
        assertEquals(Boolean.FALSE, publicView.get("isExactLocation"));

        // Must provide deliberate approximate coordinates for public maps
        assertNotNull(publicView.get("approximateLatitude"), "Public view should provide approximate latitude for map");
        assertNotNull(publicView.get("approximateLongitude"), "Public view should provide approximate longitude for map");
        assertNotEquals(28.495024, ((Number) publicView.get("approximateLatitude")).doubleValue(), 0.0001,
                "Approximate latitude must not match stored exact coordinate");
        assertNotEquals(77.089512, ((Number) publicView.get("approximateLongitude")).doubleValue(), 0.0001,
                "Approximate longitude must not match stored exact coordinate");

        // 2. Public marketplace listings do NOT expose address or exact coordinates
        List<Map<String, Object>> publicListings = propertyService.getPublicProperties();
        for (Map<String, Object> p : publicListings) {
            if (propId.equals(p.get("propertyId"))) {
                assertNull(p.get("address"), "Public marketplace listings must sanitize address");
                assertNull(p.get("latitude"), "Public marketplace listings must sanitize exact latitude");
                assertNull(p.get("longitude"), "Public marketplace listings must sanitize exact longitude");
                assertNotNull(p.get("approximateLatitude"));
            }
        }

        // 3. Public search results do NOT leak address or exact coordinates
        SearchRequest searchReq = new SearchRequest();
        searchReq.setCity("Gurugram");
        Map<String, Object> searchResult = searchService.search(searchReq);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) searchResult.get("results");
        assertNotNull(items);
        for (Map<String, Object> item : items) {
            if (propId.equals(item.get("propertyId"))) {
                assertNull(item.get("address"), "Public search results must sanitize address");
                assertNull(item.get("latitude"), "Public search results must sanitize exact latitude");
                assertNull(item.get("longitude"), "Public search results must sanitize exact longitude");
                assertNotNull(item.get("approximateLatitude"));
            }
        }
    }

    @Test
    void testUnrelatedGuestCannotObtainExactLocationDetails() {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.495024);
        req.setLongitude(77.089512);
        req.setAddress("Hidden Manor 42");

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved");

        Map<String, Object> guestView = propertyService.getProperty(propId, guestUser);
        assertNull(guestView.get("address"), "Unrelated guest must NOT see street address");
        assertNull(guestView.get("latitude"), "Unrelated guest must NOT see exact latitude");
        assertNull(guestView.get("longitude"), "Unrelated guest must NOT see exact longitude");
        assertEquals(Boolean.FALSE, guestView.get("isExactLocation"));
        assertNotNull(guestView.get("approximateLatitude"));
    }

    @Test
    void testGuestWithAcceptedOrPaymentPendingBookingCannotObtainExactLocationDetails() throws Exception {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.495024);
        req.setLongitude(77.089512);
        req.setAddress("Private Villa 77");

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved");

        // Guest creates booking
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-11-10");
        bReq.setEndDate("2026-11-12");

        Map<String, Object> booking = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Host accepts booking (state transitions to accepted / payment_pending)
        bookingService.acceptBooking(hostUser, bookingId);

        // Verify booking in accepted state
        Map<String, Object> acceptedBooking = bookingService.getBooking(guestUser, bookingId);
        assertEquals("accepted", acceptedBooking.get("bookingStatus"));

        // Guest must NOT receive exact address or exact coordinates in booking response
        assertNull(acceptedBooking.get("address"), "Accepted booking must NOT reveal exact street address");
        assertNull(acceptedBooking.get("latitude"), "Accepted booking must NOT reveal exact latitude");
        assertNull(acceptedBooking.get("longitude"), "Accepted booking must NOT reveal exact longitude");

        // Guest must NOT receive exact address or exact coordinates in property detail view
        Map<String, Object> propertyView = propertyService.getProperty(propId, guestUser);
        assertNull(propertyView.get("address"), "Guest with accepted booking must NOT see exact street address");
        assertNull(propertyView.get("latitude"), "Guest with accepted booking must NOT see exact latitude");
        assertNull(propertyView.get("longitude"), "Guest with accepted booking must NOT see exact longitude");
        assertEquals(Boolean.FALSE, propertyView.get("isExactLocation"));
    }

    @Test
    void testConfirmedGuestCanObtainPermittedExactLocationDetails() throws Exception {
        PropertyRequest req = createBaseRequest();
        req.setLatitude(28.495024);
        req.setLongitude(77.089512);
        req.setAddress("Confirmed Luxury Suite 100");

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved");

        // Guest creates booking
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-12-01");
        bReq.setEndDate("2026-12-05");

        Map<String, Object> booking = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Transition booking to confirmed
        Map<String, Object> updates = new HashMap<>();
        updates.put("bookingStatus", "confirmed");
        updates.put("status", "confirmed");
        updates.put("paymentStatus", "paid");
        bookingRepository.update(bookingId, updates);

        // 1. Confirmed booking response MUST now contain exact location
        Map<String, Object> confirmedBooking = bookingService.getBooking(guestUser, bookingId);
        assertEquals("confirmed", confirmedBooking.get("bookingStatus"));
        assertEquals("Confirmed Luxury Suite 100", confirmedBooking.get("address"),
                "Confirmed booking must reveal exact street address to guest");
        assertEquals(28.495024, ((Number) confirmedBooking.get("latitude")).doubleValue(), 0.0001,
                "Confirmed booking must reveal exact latitude to guest");
        assertEquals(77.089512, ((Number) confirmedBooking.get("longitude")).doubleValue(), 0.0001,
                "Confirmed booking must reveal exact longitude to guest");

        // 2. Confirmed property detail view MUST now contain exact location
        Map<String, Object> propertyView = propertyService.getProperty(propId, guestUser);
        assertEquals("Confirmed Luxury Suite 100", propertyView.get("address"),
                "Confirmed guest must receive exact street address on property detail page");
        assertEquals(28.495024, ((Number) propertyView.get("latitude")).doubleValue(), 0.0001);
        assertEquals(77.089512, ((Number) propertyView.get("longitude")).doubleValue(), 0.0001);
        assertEquals(Boolean.TRUE, propertyView.get("isExactLocation"));
    }

    @Test
    void testConfirmedBookingForDifferentPropertyDoesNotGrantAccess() throws Exception {
        // Property 1 (Guest has confirmed booking)
        PropertyRequest req1 = createBaseRequest();
        req1.setTitle("Property 1 with confirmed booking");
        req1.setAddress("Confirmed Address 1");
        req1.setLatitude(28.4100);
        req1.setLongitude(77.0200);

        Map<String, Object> p1 = propertyService.createProperty(hostUser, req1);
        String p1Id = (String) p1.get("propertyId");
        createdPropertyIds.add(p1Id);
        adminService.approveProperty(adminUser, p1Id, "Approved");

        BookingRequest bReq1 = new BookingRequest();
        bReq1.setPropertyId(p1Id);
        bReq1.setBookingType("daily");
        bReq1.setStartDate("2026-12-10");
        bReq1.setEndDate("2026-12-12");
        Map<String, Object> booking1 = bookingService.createBooking(guestUser, bReq1);
        String b1Id = (String) booking1.get("bookingId");
        createdBookingIds.add(b1Id);

        bookingRepository.update(b1Id, Map.of("bookingStatus", "confirmed", "status", "confirmed"));

        // Property 2 (Guest does NOT have any booking for Property 2)
        PropertyRequest req2 = createBaseRequest();
        req2.setTitle("Property 2 unbooked by guest");
        req2.setAddress("Secret Address 2");
        req2.setLatitude(28.4800);
        req2.setLongitude(77.0900);

        Map<String, Object> p2 = propertyService.createProperty(hostUser, req2);
        String p2Id = (String) p2.get("propertyId");
        createdPropertyIds.add(p2Id);
        adminService.approveProperty(adminUser, p2Id, "Approved");

        // Guest views Property 2: MUST NOT receive exact address or exact coordinates
        Map<String, Object> p2View = propertyService.getProperty(p2Id, guestUser);
        assertNull(p2View.get("address"), "Confirmed booking for Property 1 must NOT grant access to Property 2 address");
        assertNull(p2View.get("latitude"), "Confirmed booking for Property 1 must NOT grant access to Property 2 latitude");
        assertNull(p2View.get("longitude"), "Confirmed booking for Property 1 must NOT grant access to Property 2 longitude");
        assertEquals(Boolean.FALSE, p2View.get("isExactLocation"));
    }
}

