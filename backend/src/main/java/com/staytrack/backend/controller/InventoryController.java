package com.staytrack.backend.controller;

import com.staytrack.backend.dto.inventory.InventoryUnitRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties/{propertyId}/inventory")
@CrossOrigin
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getInventoryUnits(
            @PathVariable String propertyId
    ) {
        return ResponseEntity.ok(inventoryService.getInventoryUnits(propertyId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createInventoryUnit(
            @PathVariable String propertyId,
            @RequestBody InventoryUnitRequest request
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.createInventoryUnit(propertyId, request, user));
    }

    @PutMapping("/{unitId}")
    public ResponseEntity<Map<String, Object>> updateInventoryUnit(
            @PathVariable String propertyId,
            @PathVariable String unitId,
            @RequestBody InventoryUnitRequest request
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(inventoryService.updateInventoryUnit(propertyId, unitId, request, user));
    }

    @DeleteMapping("/{unitId}")
    public ResponseEntity<Map<String, Object>> deleteInventoryUnit(
            @PathVariable String propertyId,
            @PathVariable String unitId
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(inventoryService.deleteInventoryUnit(propertyId, unitId, user));
    }
}
