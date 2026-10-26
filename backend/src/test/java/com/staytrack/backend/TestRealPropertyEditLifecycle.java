package com.staytrack.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class TestRealPropertyEditLifecycle {

    private static final String API_KEY = "AIzaSyA6opnmjv0SeF25LZcSL7pae9qRfrElIGM";
    private static final String BACKEND_BASE = "http://localhost:8080";
    private static final String TARGET_PROP_ID = "5b9e6b88-676b-4b7d-b350-4e659791d5c5";
    private static final String HOST_UID = "rd3TX5ucG6Zd3Sq0Y9sSGQcH2cU2";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        assertEquals(200, response.statusCode(), "Failed to exchange custom token: " + response.body());

        JsonNode json = objectMapper.readTree(response.body());
        return json.get("idToken").asText();
    }

    @Test
    void testRealEditPropertyHttpFlow() throws Exception {
        System.out.println("=== Testing Real Edit Property HTTP Flow ===");
        String customToken = FirebaseAuth.getInstance().createCustomToken(HOST_UID);
        String idToken = exchangeCustomToken(HOST_UID);
        System.out.println("Obtained real Firebase ID token for host: " + HOST_UID);
        java.nio.file.Files.writeString(
                java.nio.file.Path.of("C:\\Users\\anshu\\.gemini\\antigravity\\brain\\ef2846b5-5833-4eac-a3ba-0424e77fa21d\\scratch\\custom_token.txt"),
                customToken
        );
        java.nio.file.Files.writeString(
                java.nio.file.Path.of("C:\\Users\\anshu\\.gemini\\antigravity\\brain\\ef2846b5-5833-4eac-a3ba-0424e77fa21d\\scratch\\host_token.json"),
                idToken
        );

        // 1. GET property before update
        HttpRequest getReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/properties/" + TARGET_PROP_ID))
                .header("Authorization", "Bearer " + idToken)
                .GET()
                .build();

        HttpResponse<String> getRes = httpClient.send(getReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("GET Response Status: " + getRes.statusCode());
        System.out.println("GET Response Body: " + getRes.body());
        assertEquals(200, getRes.statusCode());

        // 2. PUT property update (simulating exact frontend payload)
        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("title", "Browser Test Sunset Villa");
        updatePayload.put("description", "Updated description from browser test flow");
        updatePayload.put("propertyType", "BNB");
        updatePayload.put("category", "BNB");
        updatePayload.put("bookingType", "daily");
        updatePayload.put("stayTypes", List.of("daily"));
        updatePayload.put("dailyPrice", 1850.0);
        updatePayload.put("price", 1850.0);
        updatePayload.put("city", "Greater Noida");
        updatePayload.put("area", "PARAMOUNT");
        updatePayload.put("address", "");
        updatePayload.put("bedrooms", 1);
        updatePayload.put("bathrooms", 1);
        updatePayload.put("furnished", true);
        updatePayload.put("images", List.of());
        updatePayload.put("spaceType", "entire_place");
        updatePayload.put("maxGuests", 2);
        updatePayload.put("bedsCount", 1);
        updatePayload.put("checkInTime", "02:00 PM");
        updatePayload.put("checkOutTime", "11:00 AM");
        updatePayload.put("houseRules", List.of("Quiet hours after 10 PM"));

        HttpRequest putReq = HttpRequest.newBuilder()
                .uri(URI.create(BACKEND_BASE + "/api/properties/" + TARGET_PROP_ID))
                .header("Authorization", "Bearer " + idToken)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(updatePayload)))
                .build();

        long startTime = System.currentTimeMillis();
        HttpResponse<String> putRes = httpClient.send(putReq, HttpResponse.BodyHandlers.ofString());
        long duration = System.currentTimeMillis() - startTime;
        System.out.println("PUT Response Status: " + putRes.statusCode() + " (took " + duration + "ms)");
        System.out.println("PUT Response Headers: " + putRes.headers().map());
        System.out.println("PUT Response Body: " + putRes.body());
        assertEquals(200, putRes.statusCode());

        // 3. GET property after update to verify persistence
        HttpResponse<String> verifyRes = httpClient.send(getReq, HttpResponse.BodyHandlers.ofString());
        System.out.println("VERIFY GET Response Body: " + verifyRes.body());
        JsonNode verifyJson = objectMapper.readTree(verifyRes.body());
        assertEquals("Browser Test Sunset Villa", verifyJson.get("title").asText());
        assertEquals("Updated description from browser test flow", verifyJson.get("description").asText());
        assertEquals(1850.0, verifyJson.get("dailyPrice").asDouble());

        System.out.println("=== Real Edit Property HTTP Flow PASSED ===");
    }
}
