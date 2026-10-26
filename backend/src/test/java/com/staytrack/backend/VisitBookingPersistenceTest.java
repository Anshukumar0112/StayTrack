package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.conversation.ConversationRequest;
import com.staytrack.backend.dto.conversation.MessageRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.dto.visit.VisitRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class VisitBookingPersistenceTest {

    @Autowired
    private VisitService visitService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    @Autowired
    private ConversationService conversationService;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser guestUser;
    private AuthenticatedUser otherGuestUser;
    private AuthenticatedUser otherHostUser;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdVisitIds = new ArrayList<>();
    private final List<String> createdConversationIds = new ArrayList<>();
    private final List<String> createdSubIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_host_v_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811122233", "host");

        String otherHostUid = "test_other_host_v_" + UUID.randomUUID().toString().substring(0, 8);
        otherHostUser = new AuthenticatedUser(otherHostUid, "+919811122244", "host");

        String adminUid = "test_admin_v_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000033344", "admin");

        String guestUid = "test_guest_v_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser = new AuthenticatedUser(guestUid, "+919711144455", "customer");
        userService.getOrCreateUser(guestUser);

        String otherGuestUid = "test_other_guest_v_" + UUID.randomUUID().toString().substring(0, 8);
        otherGuestUser = new AuthenticatedUser(otherGuestUid, "+919711144466", "customer");
        userService.getOrCreateUser(otherGuestUser);

        setupActiveSubscription(hostUid);
        setupActiveSubscription(otherHostUid);
    }

    private void setupActiveSubscription(String hostUid) throws Exception {
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
        for (String visitId : createdVisitIds) {
            try {
                db.collection("visits").document(visitId).delete().get();
            } catch (Exception ignored) {
            }
        }
        for (String convId : createdConversationIds) {
            try {
                db.collection("conversations").document(convId).delete().get();
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

    private String createAndApproveProperty(AuthenticatedUser host, String type, String title) throws Exception {
        PropertyRequest req = new PropertyRequest();
        req.setHostType("pg_owner");
        req.setTitle(title);
        req.setPropertyType(type);
        if ("hotel".equalsIgnoreCase(type) || "bnb".equalsIgnoreCase(type)) {
            req.setStayTypes(List.of("daily"));
            req.setDailyPrice(2500.0);
        } else {
            req.setStayTypes(List.of("monthly"));
            req.setMonthlyPrice(12000.0);
        }
        req.setAddress("Sector 62");
        req.setCity("Noida");
        req.setArea("Sector 62");
        req.setLatitude(28.6280);
        req.setLongitude(77.3649);
        req.setBedrooms(4);
        req.setBathrooms(4);

        Map<String, Object> created = propertyService.createProperty(host, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved for testing");
        return propId;
    }

    @Test
    void testScheduleVisitWithoutPhoneNumberSucceedsAndPersists() throws Exception {
        String propId = createAndApproveProperty(hostUser, "pg", "Green View PG Noida");

        VisitRequest vReq = new VisitRequest();
        vReq.setPropertyId(propId);
        vReq.setVisitDate("2026-11-15");
        vReq.setTimeSlot("Morning (10:00 AM - 01:00 PM)");
        vReq.setVisitorName("Aarav Mehta");
        vReq.setNotes("Interested in single sharing occupancy with balcony.");

        // Guest schedules visit without supplying phone number
        Map<String, Object> visit = visitService.createVisit(guestUser, vReq);
        assertNotNull(visit, "Visit must be created successfully");
        String visitId = (String) visit.get("visitId");
        assertNotNull(visitId, "Visit ID must be generated");
        createdVisitIds.add(visitId);

        String referenceId = (String) visit.get("referenceId");
        assertNotNull(referenceId, "Reference ID must be generated");
        assertTrue(referenceId.startsWith("VIS-"), "Reference ID must follow VIS-XXXXXX format");
        assertEquals("scheduled", visit.get("status"));
        assertEquals("Green View PG Noida", visit.get("propertyTitle"));
        assertEquals("Noida", visit.get("city"));
        assertEquals("Sector 62", visit.get("area"));
        assertEquals(guestUser.getUid(), visit.get("customerId"));
        assertEquals(hostUser.getUid(), visit.get("hostId"));
        assertEquals("Aarav Mehta", visit.get("visitorName"));
        assertEquals("2026-11-15", visit.get("visitDate"));
        assertEquals("Morning (10:00 AM - 01:00 PM)", visit.get("timeSlot"));

        // Verify live Firestore persistence in 'visits' collection
        DocumentSnapshot visitDoc = db.collection("visits").document(visitId).get().get();
        assertTrue(visitDoc.exists(), "Visit document must exist in Firestore visits collection");
        assertEquals("scheduled", visitDoc.getString("status"));
        assertEquals(guestUser.getUid(), visitDoc.getString("customerId"));
        assertEquals(hostUser.getUid(), visitDoc.getString("hostId"));
        assertEquals(referenceId, visitDoc.getString("referenceId"));

        // Verify zero inventory hold: NO accommodation booking created
        List<?> bookings = db.collection("bookings")
                .whereEqualTo("propertyId", propId)
                .get()
                .get()
                .getDocuments();
        assertEquals(0, bookings.size(), "Visit scheduling must NEVER create an accommodation booking or inventory hold");
    }

    @Test
    void testGuestPrivacyAndRoleIsolation() throws Exception {
        String propId = createAndApproveProperty(hostUser, "hostel", "Stanza Hostel North Campus");

        VisitRequest vReq = new VisitRequest();
        vReq.setPropertyId(propId);
        vReq.setVisitDate("2026-11-20");
        vReq.setTimeSlot("Afternoon (01:00 PM - 05:00 PM)");
        vReq.setVisitorName("Neha Gupta");

        Map<String, Object> visit = visitService.createVisit(guestUser, vReq);
        String visitId = (String) visit.get("visitId");
        createdVisitIds.add(visitId);

        // Guest 1 can view their own visits
        List<Map<String, Object>> guest1Visits = visitService.getMyVisits(guestUser);
        assertFalse(guest1Visits.isEmpty(), "Guest 1 should see their scheduled visit");
        assertTrue(guest1Visits.stream().anyMatch(v -> visitId.equals(v.get("visitId"))));

        // Guest 2 cannot see Guest 1's visits in getMyVisits
        List<Map<String, Object>> guest2Visits = visitService.getMyVisits(otherGuestUser);
        assertTrue(guest2Visits.stream().noneMatch(v -> visitId.equals(v.get("visitId"))),
                "Guest 2 must not see Guest 1's visit in their visits list");

        // Guest 2 cannot fetch Guest 1's visit by ID directly
        assertThrows(SecurityException.class, () -> {
            visitService.getVisit(otherGuestUser, visitId);
        }, "Unauthorized guest must be rejected when accessing another guest's visit pass");

        // Host of the property can view this visit
        List<Map<String, Object>> hostVisits = visitService.getHostVisits(hostUser);
        assertTrue(hostVisits.stream().anyMatch(v -> visitId.equals(v.get("visitId"))),
                "Host of the property must see the scheduled visit");

        // Other host cannot see this visit
        List<Map<String, Object>> otherHostVisits = visitService.getHostVisits(otherHostUser);
        assertTrue(otherHostVisits.stream().noneMatch(v -> visitId.equals(v.get("visitId"))),
                "Unrelated hosts must not see visits for properties they do not own");
    }

    @Test
    void testVisitOnHotelOrBnbRejected() throws Exception {
        String hotelId = createAndApproveProperty(hostUser, "hotel", "Grand Luxury Hotel");
        String bnbId = createAndApproveProperty(hostUser, "bnb", "Hilltop Haven B&B");

        VisitRequest hotelReq = new VisitRequest();
        hotelReq.setPropertyId(hotelId);
        hotelReq.setVisitDate("2026-11-25");
        hotelReq.setTimeSlot("Morning (10:00 AM - 01:00 PM)");
        hotelReq.setVisitorName("Rohan Das");

        IllegalArgumentException hotelEx = assertThrows(IllegalArgumentException.class, () -> {
            visitService.createVisit(guestUser, hotelReq);
        });
        assertTrue(hotelEx.getMessage().contains("In-person visits are not available for Hotel and B&B accommodations"),
                "Hotel in-person visits must be rejected");

        VisitRequest bnbReq = new VisitRequest();
        bnbReq.setPropertyId(bnbId);
        bnbReq.setVisitDate("2026-11-26");
        bnbReq.setTimeSlot("Morning (10:00 AM - 01:00 PM)");
        bnbReq.setVisitorName("Rohan Das");

        IllegalArgumentException bnbEx = assertThrows(IllegalArgumentException.class, () -> {
            visitService.createVisit(guestUser, bnbReq);
        });
        assertTrue(bnbEx.getMessage().contains("In-person visits are not available for Hotel and B&B accommodations"),
                "B&B in-person visits must be rejected");
    }

    @Test
    void testCancelVisitWorkflow() throws Exception {
        String propId = createAndApproveProperty(hostUser, "flat", "Cyber City 3BHK");

        VisitRequest vReq = new VisitRequest();
        vReq.setPropertyId(propId);
        vReq.setVisitDate("2026-12-01");
        vReq.setTimeSlot("Evening (05:00 PM - 08:00 PM)");
        vReq.setVisitorName("Vikram Singh");

        Map<String, Object> visit = visitService.createVisit(guestUser, vReq);
        String visitId = (String) visit.get("visitId");
        createdVisitIds.add(visitId);
        assertEquals("scheduled", visit.get("status"));

        // Unauthorized user cannot cancel
        assertThrows(SecurityException.class, () -> {
            visitService.cancelVisit(otherGuestUser, visitId);
        });

        // Guest cancels visit
        Map<String, Object> cancelled = visitService.cancelVisit(guestUser, visitId);
        assertEquals("cancelled", cancelled.get("status"));

        // Verify in DB
        DocumentSnapshot cancelledDoc = db.collection("visits").document(visitId).get().get();
        assertEquals("cancelled", cancelledDoc.getString("status"));
        assertEquals("cancelled", cancelledDoc.getString("status"));
    }

    @Test
    void testChatPhoneNumberBlockingRemainsActiveForRegularMessages() throws Exception {
        String propId = createAndApproveProperty(hostUser, "pg", "Metro PG Delhi");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(propId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        MessageRequest msgReq = new MessageRequest();
        msgReq.setContent("Call me at 9876543210 for offline booking");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            conversationService.sendMessage(guestUser, convId, msgReq);
        });

        assertTrue(ex.getMessage().contains("Phone numbers cannot be shared in StayTrack chat"),
                "Regular chat messages containing phone numbers must continue to be strictly blocked");
    }
}
