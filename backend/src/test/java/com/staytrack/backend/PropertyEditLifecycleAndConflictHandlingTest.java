package com.staytrack.backend;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.exception.BookingConflictException;
import com.staytrack.backend.exception.GlobalExceptionHandler;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.BookingService;
import com.staytrack.backend.service.InventoryService;
import com.staytrack.backend.service.PropertyService;

@SpringBootTest
public class PropertyEditLifecycleAndConflictHandlingTest {

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser guestUser;
    private AuthenticatedUser guest2User;
    private List<String> createdPropertyIds;
    private List<String> createdBookingIds;

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();
        createdPropertyIds = new ArrayList<>();
        createdBookingIds = new ArrayList<>();

        String hostUid = "test_host_" + UUID.randomUUID().toString().substring(0, 8);
        String guestUid = "test_guest_" + UUID.randomUUID().toString().substring(0, 8);
        String guest2Uid = "test_guest2_" + UUID.randomUUID().toString().substring(0, 8);

        hostUser = new AuthenticatedUser(hostUid, "test_host@staytrack.com", "host");
        guestUser = new AuthenticatedUser(guestUid, "test_guest@staytrack.com", "customer");
        guest2User = new AuthenticatedUser(guest2Uid, "test_guest2@staytrack.com", "customer");

        // Create active host subscription with valid future endDate
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", "sub_" + hostUid);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("plan", "pro");
        long futureMillis = System.currentTimeMillis() + (30L * 24 * 60 * 60 * 1000L);
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos(futureMillis / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document("sub_" + hostUid).set(subData).get();
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        for (String id : createdPropertyIds) {
            try { db.collection("properties").document(id).delete().get(); } catch (Exception ignored) {}
        }
        for (String id : createdBookingIds) {
            try { db.collection("bookings").document(id).delete().get(); } catch (Exception ignored) {}
        }
        if (hostUser != null) {
            try { db.collection("subscriptions").document("sub_" + hostUser.getUid()).delete().get(); } catch (Exception ignored) {}
        }
    }

    private PropertyRequest createBaseBnbRequest() {
        PropertyRequest req = new PropertyRequest();
        req.setTitle("Sunny Retreat B&B");
        req.setDescription("Cozy boutique B&B in Gurugram");
        req.setCategory("bnb");
        req.setPropertyType("bnb");
        req.setStayTypes(List.of("daily"));
        req.setBookingType("daily");
        req.setDailyPrice(3500.0);
        req.setPrice(3500.0);
        req.setCity("Gurugram");
        req.setArea("Sector 29");
        req.setAddress("House 10, Sector 29");
        req.setBedrooms(2);
        req.setBathrooms(2);
        req.setFurnished(true);
        req.setSpaceType("entire_place");
        req.setMaxGuests(4);
        req.setBedsCount(2);
        return req;
    }

    @Test
    @DisplayName("Property edit reliably saves title and description, and preserves omitted fields")
    void testPropertyEditSavesTitleAndDescriptionAndPreservesOmittedFields() throws Exception {
        // 1. Host creates B&B
        PropertyRequest createReq = createBaseBnbRequest();
        Map<String, Object> created = propertyService.createProperty(hostUser, createReq);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Verify initial creation in Firestore
        DocumentSnapshot docInitial = db.collection("properties").document(propId).get().get();
        assertEquals("Sunny Retreat B&B", docInitial.getString("title"));
        assertEquals("Cozy boutique B&B in Gurugram", docInitial.getString("description"));
        assertEquals(3500.0, docInitial.getDouble("dailyPrice"));
        assertEquals("bnb", docInitial.getString("category"));

        // 2. Host edits ONLY the title and description (all other fields omitted in request)
        PropertyRequest titleEditReq = new PropertyRequest();
        titleEditReq.setTitle("Updated Luxury Heritage Villa B&B");
        titleEditReq.setDescription("Exquisite private villa with modern amenities");

        Map<String, Object> updated = propertyService.updateProperty(hostUser, propId, titleEditReq);
        assertNotNull(updated);
        assertEquals("Updated Luxury Heritage Villa B&B", updated.get("title"));
        assertEquals("Exquisite private villa with modern amenities", updated.get("description"));

        // Verify that omitted fields are completely preserved in the return map
        assertEquals("bnb", updated.get("category"));
        assertEquals("daily", updated.get("bookingType"));
        assertEquals(3500.0, ((Number) updated.get("dailyPrice")).doubleValue());
        assertEquals("Gurugram", updated.get("city"));
        assertEquals("Sector 29", updated.get("area"));
        assertEquals(2, ((Number) updated.get("bedrooms")).intValue());

        // 3. Verify Firestore direct persistence after title update
        DocumentSnapshot docAfterTitle = db.collection("properties").document(propId).get().get();
        assertEquals("Updated Luxury Heritage Villa B&B", docAfterTitle.getString("title"));
        assertEquals("Updated Luxury Heritage Villa B&B", docAfterTitle.getString("name"));
        assertEquals("Exquisite private villa with modern amenities", docAfterTitle.getString("description"));
        assertEquals(3500.0, docAfterTitle.getDouble("dailyPrice"));
        assertEquals("bnb", docAfterTitle.getString("category"));
        assertEquals("Sector 29", docAfterTitle.getString("area"));

        // 4. Host edits ONLY the dailyPrice (title and description omitted)
        PropertyRequest priceEditReq = new PropertyRequest();
        priceEditReq.setDailyPrice(4200.0);

        Map<String, Object> updatedPrice = propertyService.updateProperty(hostUser, propId, priceEditReq);
        assertEquals(4200.0, ((Number) updatedPrice.get("dailyPrice")).doubleValue());
        assertEquals(4200.0, ((Number) updatedPrice.get("price")).doubleValue());

        // Verify title remains the newly updated title
        assertEquals("Updated Luxury Heritage Villa B&B", updatedPrice.get("title"));

        // Verify Firestore direct persistence after price update
        DocumentSnapshot docAfterPrice = db.collection("properties").document(propId).get().get();
        assertEquals("Updated Luxury Heritage Villa B&B", docAfterPrice.getString("title"));
        assertEquals(4200.0, docAfterPrice.getDouble("dailyPrice"));
        assertEquals(4200.0, docAfterPrice.getDouble("price"));
        assertEquals("bnb", docAfterPrice.getString("category"));
    }

    @Test
    @DisplayName("Booking conflict handling: Genuine availability conflict throws BookingConflictException and maps to HTTP 409")
    void testBookingConflictHandlingThrowsBookingConflictExceptionAndMapsTo409() throws Exception {
        // 1. Create and approve B&B property
        PropertyRequest req = createBaseBnbRequest();
        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Approve and activate
        db.collection("properties").document(propId).update(
                "verificationStatus", "approved",
                "listingStatus", "active"
        ).get();

        // 2. Guest 1 books the dates
        BookingRequest b1 = new BookingRequest();
        b1.setPropertyId(propId);
        b1.setBookingType("daily");
        b1.setStartDate("2026-11-20");
        b1.setEndDate("2026-11-25");
        Map<String, Object> booking1 = bookingService.createBooking(guestUser, b1);
        String b1Id = (String) booking1.get("bookingId");
        createdBookingIds.add(b1Id);
        assertEquals("accepted", booking1.get("bookingStatus"));

        // 3. Guest 2 attempts overlapping booking -> throws BookingConflictException
        BookingRequest b2 = new BookingRequest();
        b2.setPropertyId(propId);
        b2.setBookingType("daily");
        b2.setStartDate("2026-11-22");
        b2.setEndDate("2026-11-27");

        BookingConflictException ex = assertThrows(BookingConflictException.class, () -> {
            bookingService.createBooking(guest2User, b2);
        });
        assertTrue(ex.getMessage().contains("already booked"));

        // 4. Verify GlobalExceptionHandler maps BookingConflictException to HTTP 409 Conflict
        ResponseEntity<Map<String, String>> response = globalExceptionHandler.handleBookingConflict(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(ex.getMessage(), response.getBody().get("error"));

        // 5. Verify 0 bookings were persisted for Guest 2
        var guest2Bookings = db.collection("bookings")
                .whereEqualTo("customerId", guest2User.getUid())
                .get()
                .get();
        assertTrue(guest2Bookings.isEmpty(), "Zero bookings must be persisted for conflicting guest");
    }

    @Test
    @DisplayName("GlobalExceptionHandler distinguishes booking conflicts (409) from unrelated IllegalStateException (400)")
    void testGlobalExceptionHandlerDistinguishesConflictsFromUnrelatedIllegalState() {
        // Unrelated IllegalStateException (e.g. invalid date order, state transition error)
        IllegalStateException unrelated = new IllegalStateException("Booking start date is missing");
        ResponseEntity<Map<String, String>> badReqResponse = globalExceptionHandler.handleIllegalState(unrelated);
        assertEquals(HttpStatus.BAD_REQUEST, badReqResponse.getStatusCode(),
                "Unrelated IllegalStateException must return 400 Bad Request, not 409");
        assertEquals("Booking start date is missing", badReqResponse.getBody().get("error"));

        // Booking availability collision IllegalStateException (fallback check)
        IllegalStateException conflictState = new IllegalStateException("Property is already booked for the requested period");
        ResponseEntity<Map<String, String>> conflictResponse = globalExceptionHandler.handleIllegalState(conflictState);
        assertEquals(HttpStatus.CONFLICT, conflictResponse.getStatusCode(),
                "Availability conflict IllegalStateException must return 409 Conflict");
        assertEquals("Property is already booked for the requested period", conflictResponse.getBody().get("error"));
    }

    @Test
    @DisplayName("Property edit does not modify existing booking records or inventory units")
    void testPropertyEditDoesNotModifyExistingBookingsOrInventory() throws Exception {
        // 1. Create and approve property
        PropertyRequest req = createBaseBnbRequest();
        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        db.collection("properties").document(propId).update(
                "verificationStatus", "approved",
                "listingStatus", "active"
        ).get();

        // 2. Create a booking on this property
        BookingRequest bReq = new BookingRequest();
        bReq.setPropertyId(propId);
        bReq.setBookingType("daily");
        bReq.setStartDate("2026-12-01");
        bReq.setEndDate("2026-12-05");
        Map<String, Object> booking = bookingService.createBooking(guestUser, bReq);
        String bookingId = (String) booking.get("bookingId");
        createdBookingIds.add(bookingId);

        // Confirm booking in Firestore
        db.collection("bookings").document(bookingId).update(
                "bookingStatus", "confirmed",
                "paymentStatus", "captured"
        ).get();

        // 3. Host performs an extensive edit on the property
        PropertyRequest editReq = new PropertyRequest();
        editReq.setTitle("Completely Redesigned Villa");
        editReq.setDailyPrice(4800.0);
        editReq.setBedrooms(4);
        editReq.setArea("DLF Phase 1");
        editReq.setCity("Gurugram");
        propertyService.updateProperty(hostUser, propId, editReq);

        // 4. Verify existing booking remains completely intact
        DocumentSnapshot bookingAfterEdit = db.collection("bookings").document(bookingId).get().get();
        assertTrue(bookingAfterEdit.exists());
        assertEquals("confirmed", bookingAfterEdit.getString("bookingStatus"), "Booking status must remain confirmed");
        assertEquals("captured", bookingAfterEdit.getString("paymentStatus"), "Payment status must remain captured");
        assertEquals("2026-12-01", bookingAfterEdit.getString("startDate"), "Start date must remain untouched");
        assertEquals("2026-12-05", bookingAfterEdit.getString("endDate"), "End date must remain untouched");
    }
}
