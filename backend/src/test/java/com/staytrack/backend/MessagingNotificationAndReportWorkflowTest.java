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
import com.staytrack.backend.service.NotificationService;
import com.staytrack.backend.service.PropertyService;
import com.staytrack.backend.service.UserService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class MessagingNotificationAndReportWorkflowTest {

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PropertyService propertyService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;

    @Test
    void testMessagingNotificationAndReportWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        String hostUid = "test_user_host_applicant_001";
        AuthenticatedUser hostUser = new AuthenticatedUser(hostUid, "+919999988888", "host");

        String adminUid = "test_admin_001";
        AuthenticatedUser adminUser = new AuthenticatedUser(adminUid, "+919000000000", "admin");

        String customerUid = "test_user_customer_001";
        AuthenticatedUser customerUser = new AuthenticatedUser(customerUid, "+919777766666", "customer");
        userService.getOrCreateUser(customerUser);

        // 1. Ensure active host subscription
        String subId = "test_sub_host_001";
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();

        // 2. Create property & approve
        PropertyRequest pReq = new PropertyRequest();
        pReq.setHostType("pg_owner");
        pReq.setTitle("Chat & Notification Test Hotel");
        pReq.setPropertyType("hotel");
        pReq.setStayTypes(List.of("daily"));
        pReq.setDailyPrice(1100.0);
        pReq.setAddress("101 HSR Layout");
        pReq.setCity("Bengaluru");
        pReq.setArea("HSR Layout");
        pReq.setLatitude(12.9121);
        pReq.setLongitude(77.6445);
        pReq.setBedrooms(3);
        pReq.setBathrooms(3);

        String propertyId = null;
        String conversationId = null;
        String notificationId = null;
        String webhookId = "evt_test_webhook_001";
        String reportId = "rep_test_report_001";

        try {
            Map<String, Object> property = propertyService.createProperty(hostUser, pReq);
            propertyId = (String) property.get("propertyId");
            adminService.approveProperty(adminUser, propertyId, "Approved");

            // 3. Customer creates conversation (Task I)
            ConversationRequest cReq = new ConversationRequest();
            cReq.setPropertyId(propertyId);

            Map<String, Object> conversation = conversationService.createConversation(customerUser, cReq);
            assertNotNull(conversation, "Conversation should not be null");

            conversationId = (String) conversation.get("conversationId");
            assertNotNull(conversationId, "Conversation ID should be returned");

            // 4. Customer sends message (Task I)
            MessageRequest mReq = new MessageRequest();
            mReq.setContent("Hi Host, is check-in flexible around 2 PM?");
            Map<String, Object> sentMessage = conversationService.sendMessage(customerUser, conversationId, mReq);
            assertNotNull(sentMessage, "Sent message payload should not be null");

            // 5. Host replies to message (Task I)
            MessageRequest rReq = new MessageRequest();
            rReq.setContent("Yes, 2 PM check-in works fine!");
            Map<String, Object> replyMessage = conversationService.sendMessage(hostUser, conversationId, rReq);
            assertNotNull(replyMessage, "Reply message payload should not be null");

            // Verify conversation document in live Firestore
            DocumentSnapshot convDoc = db.collection("conversations").document(conversationId).get().get();
            assertTrue(convDoc.exists(), "Conversation document must exist in Firestore");
            assertEquals(hostUid, convDoc.getString("hostId"));
            assertEquals(customerUid, convDoc.getString("customerId"));

            // 6. Test Notification Creation (Task J)
            Map<String, Object> notification = notificationService.createNotification(
                    customerUid,
                    "BOOKING_CONFIRMED",
                    "Booking Confirmed!",
                    "Your booking for Chat & Notification Test PG is confirmed.",
                    propertyId,
                    "property"
            );
            assertNotNull(notification, "Notification should not be null");

            notificationId = (String) notification.get("notificationId");
            assertNotNull(notificationId, "Notification ID should be returned");

            // Verify notification document in live Firestore
            DocumentSnapshot notifDoc = db.collection("notifications").document(notificationId).get().get();
            assertTrue(notifDoc.exists(), "Notification document must exist in Firestore");
            assertEquals("BOOKING_CONFIRMED", notifDoc.getString("type"));
            assertEquals(false, notifDoc.getBoolean("read"));

            // 7. Seed Webhook Event & System Report (Task K)
            Map<String, Object> webhookData = new HashMap<>();
            webhookData.put("eventId", webhookId);
            webhookData.put("event", "payment.captured");
            webhookData.put("status", "processed");
            webhookData.put("createdAt", Timestamp.now());
            db.collection("webhookEvents").document(webhookId).set(webhookData).get();

            DocumentSnapshot webhookDoc = db.collection("webhookEvents").document(webhookId).get().get();
            assertTrue(webhookDoc.exists(), "Webhook event document must exist in Firestore");

            Map<String, Object> reportData = new HashMap<>();
            reportData.put("reportId", reportId);
            reportData.put("type", "daily_summary");
            reportData.put("generatedAt", Timestamp.now());
            db.collection("reports").document(reportId).set(reportData).get();

            DocumentSnapshot reportDoc = db.collection("reports").document(reportId).get().get();
            assertTrue(reportDoc.exists(), "Report document must exist in Firestore");
        } finally {
            if (notificationId != null) {
                try { db.collection("notifications").document(notificationId).delete().get(); } catch (Exception ignored) {}
            }
            if (conversationId != null) {
                try { db.collection("conversations").document(conversationId).delete().get(); } catch (Exception ignored) {}
            }
            if (propertyId != null) {
                try { db.collection("properties").document(propertyId).delete().get(); } catch (Exception ignored) {}
            }
            try { db.collection("webhookEvents").document(webhookId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("reports").document(reportId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("subscriptions").document(subId).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(hostUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(adminUid).delete().get(); } catch (Exception ignored) {}
            try { db.collection("users").document(customerUid).delete().get(); } catch (Exception ignored) {}
        }
    }
}
