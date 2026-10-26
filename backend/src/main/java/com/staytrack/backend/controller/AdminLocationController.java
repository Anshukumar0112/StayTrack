package com.staytrack.backend.controller;

import com.staytrack.backend.dto.location.AreaRequest;
import com.staytrack.backend.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin
@RestController
@RequestMapping("/api/admin/locations")
public class AdminLocationController {

    private final LocationService locationService;

    public AdminLocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(locationService.getAllForAdmin());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody AreaRequest request) {
        return ResponseEntity.ok(locationService.createArea(request));
    }

    @PutMapping("/{areaId}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable String areaId,
            @RequestBody AreaRequest request) {
        return ResponseEntity.ok(locationService.updateArea(areaId, request));
    }

    @DeleteMapping("/{areaId}")
    public ResponseEntity<Map<String, Object>> deactivate(
            @PathVariable String areaId) {
        return ResponseEntity.ok(locationService.deactivateArea(areaId));
    }
}
