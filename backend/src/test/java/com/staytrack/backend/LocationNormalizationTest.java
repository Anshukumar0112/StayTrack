package com.staytrack.backend;

import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.search.SearchRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.service.SearchService;
import com.staytrack.backend.util.LocationUtils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LocationNormalizationTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private QueryDocumentSnapshot propertyDoc;

    private SearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(propertyRepository, bookingRepository);
    }

    @Test
    void testNormalizeLocationUtils() {
        assertEquals("", LocationUtils.normalizeLocation(null));
        assertEquals("", LocationUtils.normalizeLocation(""));
        assertEquals("", LocationUtils.normalizeLocation("   "));
        assertEquals("greater noida", LocationUtils.normalizeLocation("  Greater   Noida  "));
        assertEquals("greater noida", LocationUtils.normalizeLocation("GREATER NOIDA"));
        assertEquals("noida", LocationUtils.normalizeLocation("Noida\u00A0"));
        assertEquals("delhi ncr", LocationUtils.normalizeLocation("  Delhi\t\tNCR  \n"));
    }

    @Test
    void testSearchServiceCityMatching() throws Exception {
        Map<String, Object> propertyData = new HashMap<>();
        propertyData.put("title", "Luxury BNB Greater Noida");
        propertyData.put("description", "A beautiful stay");
        propertyData.put("city", "Greater Noida");
        propertyData.put("cityNormalized", "greater noida");
        propertyData.put("area", "Paramount Society");
        propertyData.put("areaNormalized", "paramount society");
        propertyData.put("propertyType", "bnb");
        propertyData.put("stayTypes", List.of("daily"));
        propertyData.put("dailyPrice", 1500.0);
        propertyData.put("price", 1500.0);

        when(propertyDoc.getId()).thenReturn("prop-123");
        when(propertyDoc.getData()).thenReturn(propertyData);
        when(propertyRepository.findApprovedActive()).thenReturn(List.of(propertyDoc));

        // Test search with "Greater Noida"
        SearchRequest req1 = new SearchRequest();
        req1.setCity("Greater Noida");
        Map<String, Object> result1 = searchService.search(req1);
        assertEquals(1, ((List<?>) result1.get("results")).size());

        // Test search with "greater noida" (lowercase)
        SearchRequest req2 = new SearchRequest();
        req2.setCity("greater noida");
        Map<String, Object> result2 = searchService.search(req2);
        assertEquals(1, ((List<?>) result2.get("results")).size());

        // Test search with extra spaces "  GREATER   NOIDA  "
        SearchRequest req3 = new SearchRequest();
        req3.setCity("  GREATER   NOIDA  ");
        Map<String, Object> result3 = searchService.search(req3);
        assertEquals(1, ((List<?>) result3.get("results")).size());

        // Test search with non-matching city
        SearchRequest req4 = new SearchRequest();
        req4.setCity("Gurugram");
        Map<String, Object> result4 = searchService.search(req4);
        assertEquals(0, ((List<?>) result4.get("results")).size());
    }

    @Test
    void testSearchServiceFallbackWhenCityNormalizedMissing() throws Exception {
        Map<String, Object> propertyData = new HashMap<>();
        propertyData.put("title", "Cozy Flat Noida");
        propertyData.put("description", "Near Metro");
        propertyData.put("city", "  Greater   Noida "); // Raw unnormalized stored city without cityNormalized field
        propertyData.put("area", "Sector 62");
        propertyData.put("propertyType", "flat");
        propertyData.put("stayTypes", List.of("daily"));
        propertyData.put("dailyPrice", 2000.0);

        when(propertyDoc.getId()).thenReturn("prop-456");
        when(propertyDoc.getData()).thenReturn(propertyData);
        when(propertyRepository.findApprovedActive()).thenReturn(List.of(propertyDoc));

        SearchRequest req = new SearchRequest();
        req.setCity("greater noida");
        Map<String, Object> result = searchService.search(req);
        assertEquals(1, ((List<?>) result.get("results")).size());
    }
}
