package com.staytrack.backend.controller;

import com.staytrack.backend.dto.search.SearchRequest;
import com.staytrack.backend.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "http://localhost:3000")
public class SearchController {

    private final SearchService searchService;

    public SearchController(
            SearchService searchService
    ) {
        this.searchService = searchService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> search(
            @RequestBody(required = false) SearchRequest request
    ) {
        return ResponseEntity.ok(
                searchService.search(request)
        );
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> searchGet(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) String bookingType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Integer minBedrooms,
            @RequestParam(required = false) Integer maxBedrooms,
            @RequestParam(required = false) Integer minBathrooms,
            @RequestParam(required = false) Integer maxBathrooms,
            @RequestParam(required = false) Boolean furnished,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) String availableFrom,
            @RequestParam(required = false) String availableTo,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false, defaultValue = "relevance") String sortBy,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer pageSize
    ) {
        SearchRequest request = new SearchRequest();

        request.setQuery(query);
        request.setCity(city);
        request.setArea(area);
        request.setPropertyType(propertyType);
        request.setBookingType(bookingType);
        request.setMinPrice(minPrice);
        request.setMaxPrice(maxPrice);
        request.setMinBedrooms(minBedrooms);
        request.setMaxBedrooms(maxBedrooms);
        request.setMinBathrooms(minBathrooms);
        request.setMaxBathrooms(maxBathrooms);
        request.setFurnished(furnished);
        request.setMinRating(minRating);
        request.setAvailableFrom(availableFrom);
        request.setAvailableTo(availableTo);
        request.setLatitude(latitude);
        request.setLongitude(longitude);
        request.setRadiusKm(radiusKm);
        request.setSortBy(sortBy);
        request.setPage(page);
        request.setPageSize(pageSize);

        return ResponseEntity.ok(
                searchService.search(request)
        );
    }
}
