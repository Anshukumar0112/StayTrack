package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.conversation.ConversationRequest;
import com.staytrack.backend.dto.conversation.MessageRequest;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.ConversationService;
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
public class VisitAndChatPhoneValidationTest {

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    private Firestore db;
    private AuthenticatedUser hostUser;
    private AuthenticatedUser adminUser;
    private AuthenticatedUser guestUser;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdConversationIds = new ArrayList<>();
    private final List<String> createdSubIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        String hostUid = "test_host_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919811122233", "host");

        String adminUid = "test_admin_" + UUID.randomUUID().toString().substring(0, 8);
        adminUser = new AuthenticatedUser(adminUid, "+919000033344", "admin");

        String guestUid = "test_guest_" + UUID.randomUUID().toString().substring(0, 8);
        guestUser = new AuthenticatedUser(guestUid, "+919711144455", "customer");
        userService.getOrCreateUser(guestUser);

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

    private String createAndApproveProperty(String type, String title) throws Exception {
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

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);
        adminService.approveProperty(adminUser, propId, "Approved for testing");
        return propId;
    }

    @Test
    void testVisitInquiryWithValidPhoneNumberAllowed() throws Exception {
        String propId = createAndApproveProperty("pg", "Green View PG Noida");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(propId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        MessageRequest msgReq = new MessageRequest();
        msgReq.setMessageType("visit_request");
        msgReq.setVisitorPhone("9876543210");
        msgReq.setContent("[SCHEDULED VISIT REQUEST]\n" +
                "Date: 2026-11-01\n" +
                "Time: 11:00 AM\n" +
                "Visitor Name: Rahul Sharma\n" +
                "Contact Phone: 9876543210\n" +
                "Notes: Want to inspect double sharing room");

        Map<String, Object> sent = conversationService.sendMessage(guestUser, convId, msgReq);
        assertNotNull(sent, "Visit message should be sent successfully");
        assertEquals("visit_request", sent.get("messageType"));
        assertTrue(sent.get("content").toString().contains("Visitor Name: Rahul Sharma"));
        assertEquals("9876543210", sent.get("visitorPhone"));

        // Verify conversation in DB has message
        DocumentSnapshot convDoc = db.collection("conversations").document(convId).get().get();
        assertTrue(convDoc.exists());
        assertTrue(convDoc.getString("lastMessage").contains("[SCHEDULED VISIT REQUEST]"));

        // Verify NO booking record was created
        List<?> bookings = db.collection("bookings")
                .whereEqualTo("propertyId", propId)
                .get()
                .get()
                .getDocuments();
        assertEquals(0, bookings.size(), "In-person visit requests must NEVER create a booking record");
    }

    @Test
    void testRegularChatMessageWithPhoneNumberRejected() throws Exception {
        String propId = createAndApproveProperty("pg", "Sunshine PG Sector 62");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(propId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        // Standard chat message with phone number
        MessageRequest msgReq = new MessageRequest();
        msgReq.setContent("Hey host, call me directly at 9876543210 to discuss rent");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            conversationService.sendMessage(guestUser, convId, msgReq);
        });

        assertTrue(ex.getMessage().contains("Phone numbers cannot be shared in StayTrack chat"),
                "Regular chat messages with phone numbers must be strictly rejected");
    }

    @Test
    void testVisitInquiryWithInvalidPhoneNumberFormatRejected() throws Exception {
        String propId = createAndApproveProperty("hostel", "Youth Living Hostel");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(propId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        // Visit inquiry with invalid phone format (only 5 digits)
        MessageRequest msgReq = new MessageRequest();
        msgReq.setMessageType("visit_request");
        msgReq.setVisitorPhone("12345");
        msgReq.setContent("[SCHEDULED VISIT REQUEST]\n" +
                "Date: 2026-11-05\n" +
                "Time: 03:00 PM\n" +
                "Visitor Name: Alex\n" +
                "Contact Phone: 12345");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            conversationService.sendMessage(guestUser, convId, msgReq);
        });

        assertTrue(ex.getMessage().contains("Invalid phone number format in visit inquiry"),
                "Visit inquiries with fewer than 10 or more than 15 digits must be rejected");
    }

    @Test
    void testVisitInquiryOnHotelOrBnbRejected() throws Exception {
        // Hotel property
        String hotelId = createAndApproveProperty("hotel", "Grand Palace Hotel");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(hotelId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        MessageRequest msgReq = new MessageRequest();
        msgReq.setMessageType("visit_request");
        msgReq.setVisitorPhone("9876543210");
        msgReq.setContent("[SCHEDULED VISIT REQUEST]\n" +
                "Date: 2026-11-10\n" +
                "Time: 10:00 AM\n" +
                "Visitor Name: Visitor One\n" +
                "Contact Phone: 9876543210");

        IllegalArgumentException exHotel = assertThrows(IllegalArgumentException.class, () -> {
            conversationService.sendMessage(guestUser, convId, msgReq);
        });

        assertTrue(exHotel.getMessage().contains("In-person visits are not available for Hotel and B&B accommodations"),
                "Visits for Hotel accommodations must be rejected at API layer");

        // BNB property
        String bnbId = createAndApproveProperty("bnb", "Cozy Villa B&B");

        ConversationRequest convReqBnb = new ConversationRequest();
        convReqBnb.setPropertyId(bnbId);
        Map<String, Object> convBnb = conversationService.createConversation(guestUser, convReqBnb);
        String convIdBnb = (String) convBnb.get("conversationId");
        createdConversationIds.add(convIdBnb);

        IllegalArgumentException exBnb = assertThrows(IllegalArgumentException.class, () -> {
            conversationService.sendMessage(guestUser, convIdBnb, msgReq);
        });

        assertTrue(exBnb.getMessage().contains("In-person visits are not available for Hotel and B&B accommodations"),
                "Visits for B&B accommodations must be rejected at API layer");
    }

    @Test
    void testVisitInquiryDoesNotAffectInventoryOrHold() throws Exception {
        String propId = createAndApproveProperty("flat", "Independent 2BHK Flat");

        ConversationRequest convReq = new ConversationRequest();
        convReq.setPropertyId(propId);
        Map<String, Object> conversation = conversationService.createConversation(guestUser, convReq);
        String convId = (String) conversation.get("conversationId");
        createdConversationIds.add(convId);

        MessageRequest msgReq = new MessageRequest();
        msgReq.setMessageType("visit_request");
        msgReq.setVisitorPhone("+91-9876543210");
        msgReq.setContent("[SCHEDULED VISIT REQUEST]\n" +
                "Date: 2026-11-12\n" +
                "Time: 04:00 PM\n" +
                "Visitor Name: Priya Verma\n" +
                "Contact Phone: +91-9876543210\n" +
                "Notes: Family looking to rent 2BHK");

        Map<String, Object> result = conversationService.sendMessage(guestUser, convId, msgReq);
        assertNotNull(result);

        // Verify zero booking documents
        List<?> bookings = db.collection("bookings")
                .whereEqualTo("propertyId", propId)
                .get()
                .get()
                .getDocuments();
        assertTrue(bookings.isEmpty(), "Zero bookings must exist after visit request");
    }
}
