package com.staytrack.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class RunningApplicationSmokeTest {

    private static final String API_KEY = "AIzaSyA6opnmjv0SeF25LZcSL7pae9qRfrElIGM";
    private static final String BACKEND_BASE = "http://localhost:8080";
    private static final String FRONTEND_BASE = "http://localhost:3000";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Firestore db;
    private final String hostUid = "smoke_host_" + UUID.randomUUID().toString().substring(0, 8);
    private final String guestUid = "smoke_guest_" + UUID.randomUUID().toString().substring(0, 8);
    private final String guest2Uid = "smoke_guest2_" + UUID.randomUUID().toString().substring(0, 8);
    private final String subscriptionId = "smoke_sub_" + UUID.randomUUID().toString().substring(0, 8);

    private String hostIdToken;
    private String guestIdToken;
    private String guest2IdToken;
    private String adminSession;

    private final List<String> createdPropertyIds = new ArrayList<>();
    private final List<String> createdBookingIds = new ArrayList<>();

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();

        // 1. Seed host and guest users in Firestore
        Map<String, Object> hostUserData = new HashMap<>();
        hostUserData.put("uid", hostUid);
        hostUserData.put("name", "Smoke Host");
        hostUserData.put("role", "host");
        hostUserData.put("status", "active");
        hostUserData.put("createdAt", Timestamp.now());
        db.collection("users").document(hostUid).set(hostUserData).get();

        Map<String, Object> guestUserData = new HashMap<>();
        guestUserData.put("uid", guestUid);
        guestUserData.put("name", "Smoke Guest");
        guestUserData.put("role", "customer");
        guestUserData.put("status", "active");
        guestUserData.put("createdAt", Timestamp.now());
        db.collection("users").document(guestUid).set(guestUserData).get();

        Map<String, Object> guest2UserData = new HashMap<>();
        guest2UserData.put("uid", guest2Uid);
        guest2UserData.put("name", "Smoke Guest 2");
        guest2UserData.put("role", "customer");
        guest2UserData.put("status", "active");
        guest2UserData.put("createdAt", Timestamp.now());
        db.collection("users").document(guest2Uid).set(guest2UserData).get();

        // 2. Seed active host subscription
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subscriptionId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos((System.currentTimeMillis() + 864000000L) / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subscriptionId).set(subData).get();

        // 3. Obtain real Firebase ID tokens by exchanging custom tokens
        hostIdToken = exchangeCustomToken(hostUid);
        guestIdToken = exchangeCustomToken(guestUid);
        guest2IdToken = exchangeCustomToken(guest2Uid);

        // 4. Create admin session token for approval endpoint
        adminSession = generateAdminSessionToken("admin", "staytrack_local_secret_key_2026");
    }

    @AfterEach
    void tearDown() {
        for (String bookingId : createdBookingIds) {
            try { db.collection("bookings").document(bookingId).delete(); } catch (Exception ignored) {}
        }
        for (String propId : createdPropertyIds) {
            try { db.collection("properties").document(propId).delete(); } catch (Exception ignored) {}
        }
        try { db.collection("subscriptions").document(subscriptionId).delete(); } catch (Exception ignored) {}
        try { db.collection("users").document(hostUid).delete(); } catch (Exception ignored) {}
        try { db.collection("users").document(guestUid).delete(); } catch (Exception ignored) {}
        try { db.collection("users").document(guest2Uid).delete(); } catch (Exception ignored) {}
    }

    private String exchangeCustomToken(String uid) throws Exception {
        String customToken = FirebaseAuth.getInstance().createCustomToken(uid);
        String exchangeUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" + API_KEY;
        String payload = objectMapper.writeValueAsString(Map.of("token", customToken, "returnSecureToken", true));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(exchangeUrl))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), "Failed to exchange custom token for ID token: " + response.body());

        JsonNode json = objectMapper.readTree(response.body());
        return json.get("idToken").asText();
    }

    private String generateAdminSessionToken(String adminId, String secret) throws Exception {
        long timestamp = System.currentTimeMillis();
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hmacBytes = mac.doFinal((adminId + ":" + timestamp).getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hmacBytes) {
            hex.append(String.format("%02x", b));
        }
        return adminId + ":" + timestamp + ":" + hex;
    }

    @Test
    @DisplayName("Running Application Smoke Test: Host B&B Lifecycle -> Field Update -> Guest Direct Booking & Protection")
    void testRunningApplicationSmokeTest() throws Exception {
        System.out.println("=== Starting Running Application Smoke Test ===");

        // STEP 1: Host creates a Bed & Breakfast property via running backend HTTP API
        Map<String, Object> createPayload = new HashMap<>();
        createPayload.put("title", "Running App Sunset Villa B&B");
        createPayload.put("description", "Luxurious heritage B&B in Jaipur");
        createPayload.put("propertyType", "bnb");
        createPayload.put("category", "bnb");
        createPayload.put("bookingType", "daily");
        createPayload.put("stayTypes", List.of("daily"));
        createPayload.put("dailyPrice", 2800.0);
        createPayload.put("city", "Jaipur");
        createPayload.put("area", "C Scheme");
        createPayload.put("address", "12 Heritage Lane, C Scheme");
        createPayload.put("latitude", 26.9124);
        createPayload.put("longitude", 75.7873);
        createPayload.put("bedrooms", 2);
        createPayload.put("bathrooms", 2);
        createPayload.put("furnished", true);
        createPayload.put("spaceType", "entire_place");
        createPayload.put("maxGuests", 4);
        createPayload.put("bedsCount", 2);

        HttpRequest createPropReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/properties"))
                .header("Authorization", "Bearer " + hostIdToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(createPayload)))
                .build();

        HttpResponse<String> createPropRes = httpClient.send(createPropReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, createPropRes.statusCode(), "Property creation must succeed on running backend: " + createPropRes.body());

        JsonNode createdJson = objectMapper.readTree(createPropRes.body());
        String propertyId = createdJson.get("propertyId").asText();
        assertNotNull(propertyId);
        createdPropertyIds.add(propertyId);
        System.out.println("1. Created B&B Property on running backend. ID: " + propertyId);

        // STEP 2: Admin approves the property so it is active
        HttpRequest approveReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/admin/properties/" + propertyId + "/approve?note=SmokeTestApproval"))
                .header("X-Admin-Session", adminSession)
                .PUT(HttpRequest.BodyPublishers.noBody())
                .build();

        HttpResponse<String> approveRes = httpClient.send(approveReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, approveRes.statusCode(), "Admin approval must succeed: " + approveRes.body());
        System.out.println("2. Approved Property via Admin API.");

        // STEP 3: Host updates a supported property field (e.g., dailyPrice to 3200.0, bedrooms to 3, area to Civil Lines)
        Map<String, Object> updatePayload = new HashMap<>(createPayload);
        updatePayload.put("dailyPrice", 3200.0);
        updatePayload.put("bedrooms", 3);
        updatePayload.put("area", "Civil Lines");

        HttpRequest updatePropReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/properties/" + propertyId))
                .header("Authorization", "Bearer " + hostIdToken)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(updatePayload)))
                .build();

        HttpResponse<String> updatePropRes = httpClient.send(updatePropReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, updatePropRes.statusCode(), "Property update must succeed on running backend: " + updatePropRes.body());
        System.out.println("3. Updated supported property fields (dailyPrice=3200, bedrooms=3, area=Civil Lines).");

        // STEP 4: Guest opens the property via running backend API and Next.js frontend route
        HttpRequest guestGetReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/properties/" + propertyId))
                .header("Authorization", "Bearer " + guestIdToken)
                .GET()
                .build();

        HttpResponse<String> guestGetRes = httpClient.send(guestGetReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, guestGetRes.statusCode(), "Guest must be able to view approved property: " + guestGetRes.body());

        JsonNode guestViewJson = objectMapper.readTree(guestGetRes.body());
        assertEquals("bnb", guestViewJson.get("category").asText().toLowerCase());
        assertEquals(3200.0, guestViewJson.get("dailyPrice").asDouble());
        assertEquals("Civil Lines", guestViewJson.get("area").asText());
        System.out.println("4. Guest retrieved property details over HTTP. Verified category='bnb' and dailyPrice=3200.0.");

        // Check Next.js frontend property route responds
        HttpRequest frontendReq = HttpRequest.newBuilder()
                .uri(URI.create(FRONTEND_BASE + "/properties/" + propertyId))
                .GET()
                .build();
        HttpResponse<String> frontendRes = httpClient.send(frontendReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(frontendRes.statusCode() == 200 || frontendRes.statusCode() == 307,
                "Next.js frontend property route must respond: " + frontendRes.statusCode());
        System.out.println("   Frontend route /properties/" + propertyId + " responded with HTTP " + frontendRes.statusCode());

        // STEP 5: Guest books available inventory via real HTTP POST /api/bookings
        String startDate = LocalDate.now().plusMonths(2).toString();
        String endDate = LocalDate.now().plusMonths(2).plusDays(3).toString();

        Map<String, Object> bookingPayload = new HashMap<>();
        bookingPayload.put("propertyId", propertyId);
        bookingPayload.put("bookingType", "daily");
        bookingPayload.put("startDate", startDate);
        bookingPayload.put("endDate", endDate);
        bookingPayload.put("guestName", "Smoke Guest");
        bookingPayload.put("contactPhone", "+919876543210");

        HttpRequest bookReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/bookings"))
                .header("Authorization", "Bearer " + guestIdToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(bookingPayload)))
                .build();

        HttpResponse<String> bookRes = httpClient.send(bookReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, bookRes.statusCode(), "Direct booking request must succeed on running backend: " + bookRes.body());

        JsonNode bookingJson = objectMapper.readTree(bookRes.body());
        String bookingId = bookingJson.get("bookingId").asText();
        assertNotNull(bookingId);
        createdBookingIds.add(bookingId);

        // STEP 6: Verify direct-booking status and payment requirements
        assertEquals(Boolean.TRUE, bookingJson.get("isDirectBooking").asBoolean(),
                "Direct booking flag must be true for B&B");
        assertEquals("accepted", bookingJson.get("bookingStatus").asText(),
                "Booking status must be 'accepted' immediately ready for guest payment");
        assertEquals("created", bookingJson.get("paymentStatus").asText(),
                "Payment status must be 'created' awaiting guest payment");
        assertNotNull(bookingJson.get("holdExpiresAt"), "30-minute payment hold timestamp must be set");
        System.out.println("5. Booking created: id=" + bookingId
                + ", isDirectBooking=" + bookingJson.get("isDirectBooking")
                + ", bookingStatus=" + bookingJson.get("bookingStatus")
                + ", paymentStatus=" + bookingJson.get("paymentStatus"));

        // STEP 7: Verify property category remains intact in Firestore
        DocumentSnapshot propDoc = db.collection("properties").document(propertyId).get().get();
        assertTrue(propDoc.exists());
        assertEquals("bnb", propDoc.getString("category"),
                "Property category in Firestore must remain 'bnb' and NOT be cleared or corrupted");
        assertEquals(3200.0, propDoc.getDouble("dailyPrice"));
        assertEquals("Civil Lines", propDoc.getString("area"));
        System.out.println("6. Persisted Firestore state confirmed: category=" + propDoc.getString("category")
                + ", dailyPrice=" + propDoc.getDouble("dailyPrice"));

        // STEP 8: Verify existing booking and inventory protections
        // Confirm first booking in Firestore
        db.collection("bookings").document(bookingId).update(
                "bookingStatus", "confirmed",
                "paymentStatus", "captured"
        ).get();

        // Attempting an overlapping booking from a second guest must be blocked by running backend
        Map<String, Object> overlapPayload = new HashMap<>(bookingPayload);
        overlapPayload.put("guestName", "Smoke Guest 2");
        overlapPayload.put("contactPhone", "+919876543211");

        HttpRequest overlapReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/bookings"))
                .header("Authorization", "Bearer " + guest2IdToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(overlapPayload)))
                .build();

        HttpResponse<String> overlapRes = httpClient.send(overlapReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(409, overlapRes.statusCode(),
                "Overlapping booking on locked inventory must return HTTP 409 Conflict! Status: " + overlapRes.statusCode() + ", body: " + overlapRes.body());

        JsonNode overlapErrorJson = objectMapper.readTree(overlapRes.body());
        assertTrue(overlapErrorJson.has("error"), "Response must contain 'error' message");
        assertTrue(overlapErrorJson.get("error").asText().toLowerCase().contains("already booked"),
                "Error message must specify property is already booked: " + overlapErrorJson.get("error").asText());

        // Confirm no conflicting booking document was persisted in Firestore
        long bookingsCountForGuest2 = db.collection("bookings")
                .whereEqualTo("customerId", guest2Uid)
                .get().get().size();
        assertEquals(0, bookingsCountForGuest2, "No booking document must be created for the rejected conflict request");
        System.out.println("7. Overlapping booking correctly rejected with HTTP 409 Conflict. Zero booking documents persisted for guest 2.");

        System.out.println("=== Running Application Smoke Test PASSED COMPLETELY ===");
    }
}
