package com.staytrack.backend;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.PropertyService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PropertyCategoryTermsValidationTest {

    @Autowired
    private PropertyService propertyService;

    private Firestore db;
    private final List<String> createdPropertyIds = new ArrayList<>();
    private String hostUid;
    private String subId;
    private AuthenticatedUser hostUser;

    @BeforeEach
    void setUp() throws Exception {
        db = FirestoreClient.getFirestore();
        hostUid = "test_host_terms_" + UUID.randomUUID().toString().substring(0, 8);
        subId = "test_sub_terms_" + UUID.randomUUID().toString().substring(0, 8);
        hostUser = new AuthenticatedUser(hostUid, "+919888812345", "host");

        // Seed active subscription for host with deterministic future date (30 days from now)
        Map<String, Object> subData = new HashMap<>();
        subData.put("subscriptionId", subId);
        subData.put("hostId", hostUid);
        subData.put("status", "active");
        long futureMillis = System.currentTimeMillis() + (30L * 24 * 60 * 60 * 1000L);
        subData.put("endDate", Timestamp.ofTimeSecondsAndNanos(futureMillis / 1000, 0));
        subData.put("createdAt", Timestamp.now());
        db.collection("subscriptions").document(subId).set(subData).get();
    }

    @AfterEach
    void tearDown() {
        for (String id : createdPropertyIds) {
            try {
                db.collection("properties").document(id).delete().get();
            } catch (Exception ignored) {}
        }
        if (subId != null) {
            try {
                db.collection("subscriptions").document(subId).delete().get();
            } catch (Exception ignored) {}
        }
    }

    private PropertyRequest createBaseRequest(String propertyType) {
        PropertyRequest request = new PropertyRequest();
        request.setTitle("Test " + propertyType + " " + UUID.randomUUID().toString().substring(0, 8));
        request.setDescription("Clean test listing for terms validation");
        request.setPropertyType(propertyType);
        request.setCategory(propertyType);
        request.setCity("Gurugram");
        request.setArea("Cyber City");
        request.setAddress("DLF Phase 2");
        request.setLatitude(28.4900);
        request.setLongitude(77.0900);
        request.setBedrooms(2);
        request.setBathrooms(2);
        request.setFurnished(true);
        request.setAreaSqFt(800.0);
        return request;
    }

    @Test
    void testValidPgListingCreation() throws Exception {
        PropertyRequest request = createBaseRequest("pg");
        request.setStayTypes(List.of("monthly"));
        request.setMonthlyPrice(8500.0);
        request.setMonthlyRentPerBed(8500.0);
        request.setContractDuration("3_months");
        request.setSecurityDepositEnabled(true);
        request.setSecurityDeposit(5000.0);
        request.setNoticePeriodDays(30);
        request.setOccupancyType("single");
        request.setGenderCategory("unisex");

        Map<String, Object> result = propertyService.createProperty(hostUser, request);
        assertNotNull(result);
        String propertyId = (String) result.get("propertyId");
        createdPropertyIds.add(propertyId);

        DocumentSnapshot snapshot = db.collection("properties").document(propertyId).get().get();
        assertTrue(snapshot.exists());
        assertEquals("3_months", snapshot.getString("contractDuration"));
        assertEquals(8500.0, snapshot.getDouble("monthlyRentPerBed"));
        assertEquals(Boolean.TRUE, snapshot.getBoolean("securityDepositEnabled"));
        assertEquals(5000.0, snapshot.getDouble("securityDeposit"));
        assertEquals(30L, snapshot.getLong("noticePeriodDays"));
        assertNull(snapshot.getString("customDurationUnit"));
        assertNull(snapshot.getLong("customDurationValue"));
    }

    @Test
    void testValidHostelListingCreation() throws Exception {
        PropertyRequest request = createBaseRequest("hostel");
        request.setStayTypes(List.of("monthly"));
        request.setMonthlyPrice(6000.0);
        request.setMonthlyRentPerBed(6000.0);
        request.setPriceModel("per_bed");
        request.setContractDuration("custom");
        request.setCustomDurationValue(45);
        request.setCustomDurationUnit("days");
        request.setSecurityDepositEnabled(false);
        request.setNoticePeriodDays(15);
        request.setRoomType("dormitory");
        request.setTotalBeds(6);
        request.setAvailableBeds(4);

        Map<String, Object> result = propertyService.createProperty(hostUser, request);
        assertNotNull(result);
        String propertyId = (String) result.get("propertyId");
        createdPropertyIds.add(propertyId);

        DocumentSnapshot snapshot = db.collection("properties").document(propertyId).get().get();
        assertTrue(snapshot.exists());
        assertEquals("custom", snapshot.getString("contractDuration"));
        assertEquals(45L, snapshot.getLong("customDurationValue"));
        assertEquals("days", snapshot.getString("customDurationUnit"));
        assertEquals(Boolean.FALSE, snapshot.getBoolean("securityDepositEnabled"));
        assertNull(snapshot.get("securityDeposit"));
        assertEquals(15L, snapshot.getLong("noticePeriodDays"));
    }

    @Test
    void testInvalidCustomDurationRejected() {
        // Missing customDurationValue
        PropertyRequest req1 = createBaseRequest("pg");
        req1.setStayTypes(List.of("monthly"));
        req1.setMonthlyPrice(7000.0);
        req1.setContractDuration("custom");
        req1.setCustomDurationUnit("months");
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req1));

        // Non-positive customDurationValue (0)
        PropertyRequest req2 = createBaseRequest("pg");
        req2.setStayTypes(List.of("monthly"));
        req2.setMonthlyPrice(7000.0);
        req2.setContractDuration("custom");
        req2.setCustomDurationValue(0);
        req2.setCustomDurationUnit("months");
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req2));

        // Unsupported customDurationUnit ("years")
        PropertyRequest req3 = createBaseRequest("pg");
        req3.setStayTypes(List.of("monthly"));
        req3.setMonthlyPrice(7000.0);
        req3.setContractDuration("custom");
        req3.setCustomDurationValue(2);
        req3.setCustomDurationUnit("years");
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req3));
    }

    @Test
    void testInvalidContractDurationRejected() {
        PropertyRequest req = createBaseRequest("pg");
        req.setStayTypes(List.of("monthly"));
        req.setMonthlyPrice(7000.0);
        req.setContractDuration("2_months"); // Only 3, 4, 6, 10, 12, custom supported

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req));
        assertTrue(ex.getMessage().contains("Invalid contract duration"));
    }

    @Test
    void testNegativePricesAndDepositRejected() {
        // Negative monthlyRentPerBed
        PropertyRequest req1 = createBaseRequest("pg");
        req1.setStayTypes(List.of("monthly"));
        req1.setMonthlyPrice(7000.0);
        req1.setMonthlyRentPerBed(-500.0);
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req1));

        // Deposit enabled with zero or negative deposit
        PropertyRequest req2 = createBaseRequest("pg");
        req2.setStayTypes(List.of("monthly"));
        req2.setMonthlyPrice(7000.0);
        req2.setSecurityDepositEnabled(true);
        req2.setSecurityDeposit(0.0);
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req2));

        // Negative notice period days
        PropertyRequest req3 = createBaseRequest("pg");
        req3.setStayTypes(List.of("monthly"));
        req3.setMonthlyPrice(7000.0);
        req3.setNoticePeriodDays(-5);
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, req3));
    }

    @Test
    void testIncompatibleCategoryTermsRejected() {
        // Hotel with contractDuration
        PropertyRequest hotelReq1 = createBaseRequest("hotel");
        hotelReq1.setStayTypes(List.of("daily"));
        hotelReq1.setDailyPrice(3500.0);
        hotelReq1.setContractDuration("3_months");
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hotelReq1));

        // Hotel with monthlyRentPerBed
        PropertyRequest hotelReq2 = createBaseRequest("hotel");
        hotelReq2.setStayTypes(List.of("daily"));
        hotelReq2.setDailyPrice(3500.0);
        hotelReq2.setMonthlyRentPerBed(8000.0);
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hotelReq2));

        // BNB with contractDuration
        PropertyRequest bnbReq = createBaseRequest("bnb");
        bnbReq.setStayTypes(List.of("daily"));
        bnbReq.setDailyPrice(2500.0);
        bnbReq.setContractDuration("custom");
        bnbReq.setCustomDurationValue(15);
        bnbReq.setCustomDurationUnit("days");
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, bnbReq));

        // Flat with bed-based pricing
        PropertyRequest flatReq = createBaseRequest("flat");
        flatReq.setStayTypes(List.of("monthly"));
        flatReq.setMonthlyPrice(25000.0);
        flatReq.setMonthlyRentPerBed(12000.0);
        assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, flatReq));
    }

    @Test
    void testDepositTogglingClearsStaleFieldOnUpdate() throws Exception {
        // 1. Create flat listing with deposit enabled (₹20,000)
        PropertyRequest createReq = createBaseRequest("flat");
        createReq.setStayTypes(List.of("monthly"));
        createReq.setMonthlyPrice(22000.0);
        createReq.setSecurityDepositEnabled(true);
        createReq.setSecurityDeposit(20000.0);
        createReq.setMaintenanceCharges(1500.0);

        Map<String, Object> created = propertyService.createProperty(hostUser, createReq);
        String propertyId = (String) created.get("propertyId");
        createdPropertyIds.add(propertyId);

        DocumentSnapshot initialDoc = db.collection("properties").document(propertyId).get().get();
        assertEquals(Boolean.TRUE, initialDoc.getBoolean("securityDepositEnabled"));
        assertEquals(20000.0, initialDoc.getDouble("securityDeposit"));

        // 2. Update listing toggling deposit disabled
        PropertyRequest updateReq = createBaseRequest("flat");
        updateReq.setStayTypes(List.of("monthly"));
        updateReq.setMonthlyPrice(22000.0);
        updateReq.setSecurityDepositEnabled(false);
        updateReq.setSecurityDeposit(null);
        updateReq.setMaintenanceCharges(1500.0);

        propertyService.updateProperty(hostUser, propertyId, updateReq);

        DocumentSnapshot updatedDoc = db.collection("properties").document(propertyId).get().get();
        assertEquals(Boolean.FALSE, updatedDoc.getBoolean("securityDepositEnabled"));
        assertNull(updatedDoc.get("securityDeposit"), "Security deposit must be cleared when deposit is toggled disabled");
    }

    @Test
    void testBackwardCompatibilityEnrichesSafeFallbacks() throws Exception {
        String legacyId = "legacy_property_" + UUID.randomUUID().toString().substring(0, 8);
        createdPropertyIds.add(legacyId);

        // Seed older legacy document missing Step 3 fields
        Map<String, Object> legacyData = new HashMap<>();
        legacyData.put("propertyId", legacyId);
        legacyData.put("id", legacyId);
        legacyData.put("hostId", hostUid);
        legacyData.put("title", "Legacy PG Listing");
        legacyData.put("propertyType", "pg");
        legacyData.put("stayTypes", List.of("monthly"));
        legacyData.put("monthlyPrice", 9500.0);
        legacyData.put("securityDeposit", 4500.0);
        legacyData.put("listingStatus", "active");
        legacyData.put("verificationStatus", "approved");
        legacyData.put("city", "Delhi");
        legacyData.put("area", "Hauz Khas");
        legacyData.put("latitude", 28.5494);
        legacyData.put("longitude", 77.2001);

        db.collection("properties").document(legacyId).set(legacyData).get();

        // Host reads the property via propertyService.getProperty
        Map<String, Object> retrieved = propertyService.getProperty(legacyId, hostUser);
        assertNotNull(retrieved);
        assertEquals("Legacy PG Listing", retrieved.get("title"));
        // Check fallback enrichment
        assertEquals(Boolean.TRUE, retrieved.get("securityDepositEnabled"));
        assertEquals(9500.0, ((Number) retrieved.get("monthlyRentPerBed")).doubleValue());
    }

    @Test
    void testInvalidStayModelForCategoryRejected() {
        // 1. PG cannot have daily or hourly
        PropertyRequest pgDaily = createBaseRequest("pg");
        pgDaily.setStayTypes(List.of("daily"));
        pgDaily.setDailyPrice(1000.0);
        IllegalArgumentException exPgDaily = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, pgDaily));
        assertTrue(exPgDaily.getMessage().contains("PG accommodations only support monthly stay model"));

        PropertyRequest pgHourly = createBaseRequest("pg");
        pgHourly.setStayTypes(List.of("hourly"));
        pgHourly.setHourlyPrice(200.0);
        IllegalArgumentException exPgHourly = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, pgHourly));
        assertTrue(exPgHourly.getMessage().contains("PG accommodations only support monthly stay model"));

        // 2. Flat cannot have daily or hourly
        PropertyRequest flatDaily = createBaseRequest("flat");
        flatDaily.setStayTypes(List.of("daily"));
        flatDaily.setDailyPrice(2000.0);
        IllegalArgumentException exFlatDaily = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, flatDaily));
        assertTrue(exFlatDaily.getMessage().contains("Residential flat rentals only support monthly stay model"));

        // 3. Hotel cannot have monthly
        PropertyRequest hotelMonthly = createBaseRequest("hotel");
        hotelMonthly.setStayTypes(List.of("monthly"));
        hotelMonthly.setMonthlyPrice(45000.0);
        IllegalArgumentException exHotelMonthly = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hotelMonthly));
        assertTrue(exHotelMonthly.getMessage().contains("HOTEL accommodations do not support monthly stay model"));

        // 4. BNB cannot have monthly
        PropertyRequest bnbMonthly = createBaseRequest("bnb");
        bnbMonthly.setStayTypes(List.of("monthly"));
        bnbMonthly.setMonthlyPrice(35000.0);
        IllegalArgumentException exBnbMonthly = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, bnbMonthly));
        assertTrue(exBnbMonthly.getMessage().contains("BNB accommodations do not support monthly stay model"));

        // 5. Hostel cannot have hourly
        PropertyRequest hostelHourly = createBaseRequest("hostel");
        hostelHourly.setStayTypes(List.of("hourly"));
        hostelHourly.setHourlyPrice(150.0);
        IllegalArgumentException exHostelHourly = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hostelHourly));
        assertTrue(exHostelHourly.getMessage().contains("Hostels do not support hourly stay model"));
    }

    @Test
    void testHostelDailyRejectsMonthlyLeaseTerms() {
        // Hostel daily cannot specify contractDuration
        PropertyRequest hostelDailyContract = createBaseRequest("hostel");
        hostelDailyContract.setStayTypes(List.of("daily"));
        hostelDailyContract.setDailyPrice(800.0);
        hostelDailyContract.setContractDuration("3_months");
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hostelDailyContract));
        assertTrue(ex1.getMessage().contains("Hostels with daily stay model cannot have contractual lease durations or monthly bed rent"));

        // Hostel daily cannot specify monthlyRentPerBed
        PropertyRequest hostelDailyRent = createBaseRequest("hostel");
        hostelDailyRent.setStayTypes(List.of("daily"));
        hostelDailyRent.setDailyPrice(800.0);
        hostelDailyRent.setMonthlyRentPerBed(6500.0);
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> propertyService.createProperty(hostUser, hostelDailyRent));
        assertTrue(ex2.getMessage().contains("Hostels with daily stay model cannot have contractual lease durations or monthly bed rent"));
    }

    @Test
    void testValidCategoryStayModelCombinations() throws Exception {
        // 1. Hostel in daily stay model (valid)
        PropertyRequest hostelDaily = createBaseRequest("hostel");
        hostelDaily.setStayTypes(List.of("daily"));
        hostelDaily.setDailyPrice(900.0);
        hostelDaily.setRoomType("dormitory");
        hostelDaily.setTotalBeds(8);
        Map<String, Object> hDailyRes = propertyService.createProperty(hostUser, hostelDaily);
        assertNotNull(hDailyRes);
        createdPropertyIds.add((String) hDailyRes.get("propertyId"));

        // 2. Hotel in hourly stay model (valid)
        PropertyRequest hotelHourly = createBaseRequest("hotel");
        hotelHourly.setStayTypes(List.of("hourly"));
        hotelHourly.setHourlyPrice(500.0);
        hotelHourly.setBedType("king");
        Map<String, Object> hotelHourlyRes = propertyService.createProperty(hostUser, hotelHourly);
        assertNotNull(hotelHourlyRes);
        createdPropertyIds.add((String) hotelHourlyRes.get("propertyId"));

        // 3. BNB in hourly stay model (valid)
        PropertyRequest bnbHourly = createBaseRequest("bnb");
        bnbHourly.setStayTypes(List.of("hourly"));
        bnbHourly.setHourlyPrice(600.0);
        bnbHourly.setSpaceType("private_room");
        Map<String, Object> bnbHourlyRes = propertyService.createProperty(hostUser, bnbHourly);
        assertNotNull(bnbHourlyRes);
        createdPropertyIds.add((String) bnbHourlyRes.get("propertyId"));
    }

    @Test
    void testCategoryAndStayModelUpdateClearsIncompatibleFields() throws Exception {
        // 1. Create a PG listing with contractDuration, monthlyRentPerBed, and securityDeposit
        PropertyRequest pgReq = createBaseRequest("pg");
        pgReq.setStayTypes(List.of("monthly"));
        pgReq.setMonthlyPrice(9000.0);
        pgReq.setMonthlyRentPerBed(9000.0);
        pgReq.setContractDuration("6_months");
        pgReq.setSecurityDepositEnabled(true);
        pgReq.setSecurityDeposit(5000.0);
        pgReq.setNoticePeriodDays(30);

        Map<String, Object> pgCreated = propertyService.createProperty(hostUser, pgReq);
        String propId = (String) pgCreated.get("propertyId");
        createdPropertyIds.add(propId);

        DocumentSnapshot pgDoc = db.collection("properties").document(propId).get().get();
        assertEquals("6_months", pgDoc.getString("contractDuration"));
        assertEquals(9000.0, pgDoc.getDouble("monthlyRentPerBed"));
        assertEquals(5000.0, pgDoc.getDouble("securityDeposit"));

        // 2. Update listing to Hotel with daily stay model
        PropertyRequest hotelUpdate = createBaseRequest("hotel");
        hotelUpdate.setStayTypes(List.of("daily"));
        hotelUpdate.setBookingType("daily");
        hotelUpdate.setDailyPrice(3200.0);
        hotelUpdate.setBedType("queen");

        propertyService.updateProperty(hostUser, propId, hotelUpdate);

        DocumentSnapshot updatedDoc = db.collection("properties").document(propId).get().get();
        assertEquals("hotel", updatedDoc.getString("propertyType").toLowerCase());
        assertEquals("daily", updatedDoc.getString("bookingType"));
        assertNull(updatedDoc.getString("contractDuration"), "Hotel update must clear contractDuration");
        assertNull(updatedDoc.get("monthlyRentPerBed"), "Hotel update must clear monthlyRentPerBed");
        assertNull(updatedDoc.get("securityDeposit"), "Hotel update must clear securityDeposit");
        assertEquals(Boolean.FALSE, updatedDoc.getBoolean("securityDepositEnabled"));
    }

    @Test
    void testEditPgPropertySavesAllCategoryTermsReliably() throws Exception {
        // 1. Host creates an initial PG property in Gurugram
        PropertyRequest initialReq = createBaseRequest("pg");
        initialReq.setTitle("Initial PG Listing in Gurugram");
        initialReq.setCity("Gurugram");
        initialReq.setArea("Sector 14");
        initialReq.setStayTypes(List.of("monthly"));
        initialReq.setMonthlyPrice(7500.0);
        initialReq.setMonthlyRentPerBed(7500.0);
        initialReq.setContractDuration("3_months");
        initialReq.setSecurityDepositEnabled(true);
        initialReq.setSecurityDeposit(3000.0);
        initialReq.setNoticePeriodDays(30);

        Map<String, Object> created = propertyService.createProperty(hostUser, initialReq);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // 2. Host edits the PG property: update title to 'Updated Premium PG in Noida', update to Noida Sector 62, 9000 rent, custom 5 months, 6000 deposit
        PropertyRequest editReq = createBaseRequest("pg");
        editReq.setTitle("Updated Premium PG in Noida");
        editReq.setCity("Noida");
        editReq.setArea("sector 62");
        editReq.setAddress("Tower B, Flat 402, Sector 62");
        editReq.setStayTypes(List.of("monthly"));
        editReq.setMonthlyPrice(9000.0);
        editReq.setMonthlyRentPerBed(9000.0);
        editReq.setContractDuration("custom");
        editReq.setCustomDurationValue(5);
        editReq.setCustomDurationUnit("months");
        editReq.setSecurityDepositEnabled(true);
        editReq.setSecurityDeposit(6000.0);
        editReq.setNoticePeriodDays(45);

        Map<String, Object> updated = propertyService.updateProperty(hostUser, propId, editReq);
        assertNotNull(updated);
        assertEquals("Updated Premium PG in Noida", updated.get("title"));
        assertEquals("Noida", updated.get("city"));
        assertEquals("sector 62", updated.get("area"));
        assertEquals(9000.0, ((Number) updated.get("price")).doubleValue());
        assertEquals(9000.0, ((Number) updated.get("monthlyPrice")).doubleValue());
        assertEquals(9000.0, ((Number) updated.get("monthlyRentPerBed")).doubleValue());
        assertEquals("custom", updated.get("contractDuration"));
        assertEquals(5, ((Number) updated.get("customDurationValue")).intValue());
        assertEquals("months", updated.get("customDurationUnit"));
        assertEquals(6000.0, ((Number) updated.get("securityDeposit")).doubleValue());
        assertEquals(45, ((Number) updated.get("noticePeriodDays")).intValue());

        // 3. Verify Firestore direct persistence
        DocumentSnapshot directDoc = db.collection("properties").document(propId).get().get();
        assertEquals("Updated Premium PG in Noida", directDoc.getString("title"));
        assertEquals("Noida", directDoc.getString("city"));
        assertEquals("sector 62", directDoc.getString("area"));
        assertEquals("Tower B, Flat 402, Sector 62", directDoc.getString("address"));
        assertEquals(9000.0, directDoc.getDouble("monthlyPrice"));
        assertEquals(9000.0, directDoc.getDouble("monthlyRentPerBed"));
        assertEquals("custom", directDoc.getString("contractDuration"));
        assertEquals(5L, directDoc.getLong("customDurationValue"));
        assertEquals("months", directDoc.getString("customDurationUnit"));
        assertEquals(6000.0, directDoc.getDouble("securityDeposit"));
        assertEquals(45L, directDoc.getLong("noticePeriodDays"));

        // 4. Verify getProperty returns all updated values to host
        Map<String, Object> fetched = propertyService.getProperty(propId, hostUser);
        assertEquals("Updated Premium PG in Noida", fetched.get("title"));
        assertEquals("Noida", fetched.get("city"));
        assertEquals("sector 62", fetched.get("area"));
        assertEquals(9000.0, ((Number) fetched.get("monthlyRentPerBed")).doubleValue());
        assertEquals(9000.0, ((Number) fetched.get("monthlyPrice")).doubleValue());
    }

    @Test
    void testEditPgPropertyAutoSyncsBedRentWhenOmitted() throws Exception {
        // Create base PG listing
        PropertyRequest req = createBaseRequest("pg");
        req.setStayTypes(List.of("monthly"));
        req.setMonthlyPrice(8000.0);
        req.setMonthlyRentPerBed(8000.0);

        Map<String, Object> created = propertyService.createProperty(hostUser, req);
        String propId = (String) created.get("propertyId");
        createdPropertyIds.add(propId);

        // Update with new price/monthlyPrice but null monthlyRentPerBed
        PropertyRequest editReq = createBaseRequest("pg");
        editReq.setStayTypes(List.of("monthly"));
        editReq.setMonthlyPrice(9500.0);
        editReq.setPrice(9500.0);
        editReq.setMonthlyRentPerBed(null);

        Map<String, Object> updated = propertyService.updateProperty(hostUser, propId, editReq);
        assertEquals(9500.0, ((Number) updated.get("monthlyRentPerBed")).doubleValue(),
                "Omitting monthlyRentPerBed must auto-sync with updated monthlyPrice");

        DocumentSnapshot doc = db.collection("properties").document(propId).get().get();
        assertEquals(9500.0, doc.getDouble("monthlyRentPerBed"),
                "Firestore monthlyRentPerBed must reflect the synced price");
    }
}
