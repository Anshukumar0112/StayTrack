package com.staytrack.backend.controller;

import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.PropertyService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
@CrossOrigin(origins = "http://localhost:3000")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(
            PropertyService propertyService) {

        this.propertyService = propertyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createProperty(
            @RequestBody PropertyRequest request) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return propertyService.createProperty(
                user,
                request
        );
    }

    @GetMapping("/{propertyId}")
    public Map<String, Object> getProperty(
            @PathVariable String propertyId) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return propertyService.getProperty(
                propertyId,
                user
        );
    }

    @GetMapping("/{propertyId}/availability")
    public Map<String, Object> checkAvailability(
            @PathVariable String propertyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String bookingType) {

        return propertyService.checkPropertyAvailability(
                propertyId,
                startDate,
                endDate,
                startTime,
                endTime,
                bookingType
        );
    }

    @GetMapping("/mine")
    public List<Map<String, Object>> getMyProperties() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return propertyService.getMyProperties(
                user
        );
    }

    @GetMapping("/public")
    public List<Map<String, Object>> getPublicProperties() {

        return propertyService.getPublicProperties();
    }

    @GetMapping("/top-verified")
    public List<Map<String, Object>> getTopVerifiedProperties() {

        return propertyService.getTopVerifiedProperties();
    }

    @GetMapping("/stay-section")
    public List<Map<String, Object>> getStaySectionProperties() {

        return propertyService.getStaySectionProperties();
    }

    @PutMapping("/{propertyId}")
    public Map<String, Object> updateProperty(
            @PathVariable String propertyId,
            @RequestBody PropertyRequest request) {

        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return propertyService.updateProperty(user, propertyId, request);
    }

    @DeleteMapping("/{propertyId}")
    public Map<String, Object> deleteProperty(
            @PathVariable String propertyId) {

        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return propertyService.deleteProperty(user, propertyId);
    }
}