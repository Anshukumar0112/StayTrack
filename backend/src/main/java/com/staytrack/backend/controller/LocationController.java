package com.staytrack.backend.controller;

import com.staytrack.backend.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin
@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/cities")
    public ResponseEntity<List<Map<String, Object>>> getCities() {
        return ResponseEntity.ok(locationService.getCities());
    }

    @GetMapping("/areas")
    public ResponseEntity<List<Map<String, Object>>> getAreas(
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(locationService.getAreas(city));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam String q) {
        return ResponseEntity.ok(locationService.searchLocations(q));
    }

    @GetMapping("/{areaId}")
    public ResponseEntity<Map<String, Object>> getArea(
            @org.springframework.web.bind.annotation.PathVariable String areaId) {
        return ResponseEntity.ok(locationService.getArea(areaId));
    }
}
