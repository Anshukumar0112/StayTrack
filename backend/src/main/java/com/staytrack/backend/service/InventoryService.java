package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.inventory.InventoryUnitRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.InventoryUnitRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.util.BookingAvailabilityUtils;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class InventoryService {

    private final InventoryUnitRepository inventoryUnitRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;

    public InventoryService(
            InventoryUnitRepository inventoryUnitRepository,
            PropertyRepository propertyRepository,
            BookingRepository bookingRepository
    ) {
        this.inventoryUnitRepository = inventoryUnitRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
    }

    public Map<String, Object> createInventoryUnit(
            String propertyId,
            InventoryUnitRequest request,
            AuthenticatedUser user
    ) {
        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException("Property ID is required");
        }
        if (request == null) {
            throw new IllegalArgumentException("Inventory unit request cannot be empty");
        }

        Map<String, Object> property = verifyHostOwnership(propertyId.trim(), user);
        validateCategoryConstraints(property, request);

        String unitType = request.getUnitType() != null ? request.getUnitType().trim().toLowerCase() : "";
        if (unitType.isBlank()) {
            throw new IllegalArgumentException("Unit type is required ('bed', 'room', or 'room_type')");
        }

        if ("bed".equals(unitType) && request.getParentRoomId() != null && !request.getParentRoomId().isBlank()) {
            validateParentRoom(propertyId.trim(), request.getParentRoomId().trim());
        }

        String unitId = UUID.randomUUID().toString();
        Timestamp now = Timestamp.now();

        Map<String, Object> unit = new HashMap<>();
        unit.put("id", unitId);
        unit.put("inventoryUnitId", unitId);
        unit.put("propertyId", propertyId.trim());
        unit.put("unitType", unitType);
        unit.put("unitName", request.getUnitName() != null && !request.getUnitName().isBlank()
                ? request.getUnitName().trim()
                : (request.getUnitNumber() != null ? unitType + " " + request.getUnitNumber().trim() : unitType));
        unit.put("unitNumber", request.getUnitNumber() != null ? request.getUnitNumber().trim() : "");
        unit.put("parentRoomId", request.getParentRoomId() != null ? request.getParentRoomId().trim() : null);

        int capacity = request.getCapacity() != null && request.getCapacity() > 0
                ? request.getCapacity()
                : ("bed".equals(unitType) ? 1 : 2);
        unit.put("capacity", capacity);

        int totalQuantity = 1;
        if ("room_type".equals(unitType)) {
            if (request.getTotalQuantity() == null || request.getTotalQuantity() < 1) {
                throw new IllegalArgumentException("room_type requires totalQuantity >= 1");
            }
            totalQuantity = request.getTotalQuantity();
        }
        unit.put("totalQuantity", totalQuantity);

        if (request.getPrice() != null && request.getPrice() > 0) {
            unit.put("price", request.getPrice());
        } else {
            unit.put("price", null);
        }

        unit.put("occupancyType", request.getOccupancyType() != null ? request.getOccupancyType().trim() : null);
        unit.put("roomTypeId", request.getRoomTypeId() != null ? request.getRoomTypeId().trim() : null);

        String status = request.getStatus() != null ? request.getStatus().trim().toLowerCase() : "active";
        unit.put("status", "inactive".equals(status) ? "inactive" : "active");
        unit.put("createdAt", now);
        unit.put("updatedAt", now);

        try {
            inventoryUnitRepository.create(unitId, unit);
            return unit;
        } catch (Exception e) {
            throw new RuntimeException("Unable to create inventory unit", e);
        }
    }

    public Map<String, Object> updateInventoryUnit(
            String propertyId,
            String unitId,
            InventoryUnitRequest request,
            AuthenticatedUser user
    ) {
        if (propertyId == null || propertyId.isBlank() || unitId == null || unitId.isBlank()) {
            throw new IllegalArgumentException("Property ID and Unit ID are required");
        }
        if (request == null) {
            throw new IllegalArgumentException("Inventory unit request cannot be empty");
        }

        Map<String, Object> property = verifyHostOwnership(propertyId.trim(), user);
        DocumentSnapshot unitDoc;
        try {
            unitDoc = inventoryUnitRepository.findById(unitId.trim());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching inventory unit", e);
        }

        if (!unitDoc.exists()) {
            throw new IllegalArgumentException("Inventory unit not found");
        }
        Map<String, Object> existingUnit = unitDoc.getData();
        if (existingUnit == null || !propertyId.trim().equals(existingUnit.get("propertyId"))) {
            throw new IllegalArgumentException("Inventory unit does not belong to the specified property");
        }

        String currentUnitType = String.valueOf(existingUnit.getOrDefault("unitType", "")).trim().toLowerCase();
        validateCategoryConstraints(property, request);

        // Active booking guards
        boolean hasActive = hasActiveBookingsForUnit(propertyId.trim(), unitId.trim(), currentUnitType);

        if (hasActive) {
            if (request.getStatus() != null && "inactive".equalsIgnoreCase(request.getStatus().trim())) {
                throw new IllegalStateException("Cannot deactivate inventory unit with active or upcoming bookings");
            }
            if (request.getUnitType() != null && !currentUnitType.equalsIgnoreCase(request.getUnitType().trim())) {
                throw new IllegalStateException("Cannot change unit type while active bookings exist");
            }
        }

        if ("room_type".equals(currentUnitType) && request.getTotalQuantity() != null) {
            int newQuantity = request.getTotalQuantity();
            int activeCount = countActiveBookingsForUnit(propertyId.trim(), unitId.trim());
            if (newQuantity < activeCount) {
                throw new IllegalStateException("Cannot reduce inventory count below active bookings count (" + activeCount + ")");
            }
        }

        if (request.getParentRoomId() != null && !request.getParentRoomId().isBlank()) {
            validateParentRoom(propertyId.trim(), request.getParentRoomId().trim());
        }

        Map<String, Object> updates = new HashMap<>();
        if (request.getUnitName() != null) updates.put("unitName", request.getUnitName().trim());
        if (request.getUnitNumber() != null) updates.put("unitNumber", request.getUnitNumber().trim());
        if (request.getParentRoomId() != null) updates.put("parentRoomId", request.getParentRoomId().trim());
        if (request.getCapacity() != null && request.getCapacity() > 0) updates.put("capacity", request.getCapacity());
        if ("room_type".equals(currentUnitType) && request.getTotalQuantity() != null && request.getTotalQuantity() >= 1) {
            updates.put("totalQuantity", request.getTotalQuantity());
        }
        if (request.getPrice() != null) {
            updates.put("price", request.getPrice() > 0 ? request.getPrice() : null);
        }
        if (request.getOccupancyType() != null) {
            updates.put("occupancyType", request.getOccupancyType().trim());
        }
        if (request.getRoomTypeId() != null) {
            updates.put("roomTypeId", request.getRoomTypeId().trim());
        }
        if (request.getStatus() != null) {
            updates.put("status", "inactive".equalsIgnoreCase(request.getStatus().trim()) ? "inactive" : "active");
        }
        updates.put("updatedAt", Timestamp.now());

        try {
            inventoryUnitRepository.update(unitId.trim(), updates);
            Map<String, Object> updated = new HashMap<>(existingUnit);
            updated.putAll(updates);
            return updated;
        } catch (Exception e) {
            throw new RuntimeException("Unable to update inventory unit", e);
        }
    }

    public Map<String, Object> deleteInventoryUnit(
            String propertyId,
            String unitId,
            AuthenticatedUser user
    ) {
        if (propertyId == null || propertyId.isBlank() || unitId == null || unitId.isBlank()) {
            throw new IllegalArgumentException("Property ID and Unit ID are required");
        }

        verifyHostOwnership(propertyId.trim(), user);

        DocumentSnapshot unitDoc;
        try {
            unitDoc = inventoryUnitRepository.findById(unitId.trim());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching inventory unit", e);
        }

        if (!unitDoc.exists()) {
            throw new IllegalArgumentException("Inventory unit not found");
        }
        Map<String, Object> existingUnit = unitDoc.getData();
        if (existingUnit == null || !propertyId.trim().equals(existingUnit.get("propertyId"))) {
            throw new IllegalArgumentException("Inventory unit does not belong to the specified property");
        }

        String unitType = String.valueOf(existingUnit.getOrDefault("unitType", "")).trim().toLowerCase();

        // Check active bookings
        if (hasActiveBookingsForUnit(propertyId.trim(), unitId.trim(), unitType)) {
            throw new IllegalStateException("Cannot delete inventory unit with active or upcoming bookings");
        }

        // If unit is a room, check if child beds are linked to it
        if ("room".equals(unitType)) {
            try {
                List<QueryDocumentSnapshot> units = inventoryUnitRepository.findByPropertyId(propertyId.trim());
                for (QueryDocumentSnapshot doc : units) {
                    Map<String, Object> data = doc.getData();
                    if (data != null && unitId.trim().equals(data.get("parentRoomId"))) {
                        throw new IllegalStateException("Cannot delete room that contains child bed inventory units. Delete or reassign beds first.");
                    }
                }
            } catch (IllegalStateException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException("Error checking child beds", e);
            }
        }

        try {
            inventoryUnitRepository.delete(unitId.trim());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Inventory unit deleted successfully");
            response.put("unitId", unitId.trim());
            return response;
        } catch (Exception e) {
            throw new RuntimeException("Unable to delete inventory unit", e);
        }
    }

    public List<Map<String, Object>> getInventoryUnits(String propertyId) {
        if (propertyId == null || propertyId.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<QueryDocumentSnapshot> docs = inventoryUnitRepository.findByPropertyId(propertyId.trim());
            List<Map<String, Object>> result = new ArrayList<>();
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> data = doc.getData();
                if (data != null) {
                    data.put("id", doc.getId());
                    result.add(data);
                }
            }
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Unable to get inventory units", e);
        }
    }

    private Map<String, Object> verifyHostOwnership(String propertyId, AuthenticatedUser user) {
        if (user == null) {
            throw new SecurityException("Authentication is required");
        }

        DocumentSnapshot propertyDoc;
        try {
            propertyDoc = propertyRepository.findById(propertyId);
        } catch (Exception e) {
            throw new RuntimeException("Error fetching property", e);
        }

        if (!propertyDoc.exists()) {
            throw new IllegalArgumentException("Property not found");
        }

        Map<String, Object> propertyData = propertyDoc.getData();
        if (propertyData == null) {
            throw new IllegalArgumentException("Property data is empty");
        }

        String hostId = String.valueOf(propertyData.getOrDefault("hostId", "")).trim();
        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());
        boolean isOwner = hostId.equals(user.getUid());

        if (!isAdmin && !isOwner) {
            throw new SecurityException("Only the property host can manage its inventory");
        }

        return propertyData;
    }

    private void validateCategoryConstraints(Map<String, Object> property, InventoryUnitRequest request) {
        String category = String.valueOf(property.getOrDefault("propertyType", "")).trim().toLowerCase();
        if (category.isBlank()) {
            category = String.valueOf(property.getOrDefault("category", "")).trim().toLowerCase();
        }

        if ("flat".equals(category) || "apartment".equals(category) || "house".equals(category)) {
            throw new IllegalArgumentException("Flats and independent houses cannot configure room or bed inventory units");
        }

        String unitType = request.getUnitType() != null ? request.getUnitType().trim().toLowerCase() : "";
        if (unitType.isBlank()) {
            return;
        }

        if ("pg".equals(category) || "hostel".equals(category)) {
            if ("room_type".equals(unitType)) {
                throw new IllegalArgumentException("PG and Hostel properties only support discrete 'bed' and 'room' inventory units");
            }
        }

        if ("hotel".equals(category) || "bnb".equals(category) || "vacationstay".equals(category) || "vacation_stay".equals(category)) {
            if ("bed".equals(unitType)) {
                throw new IllegalArgumentException("Hotels and B&Bs only support 'room' or 'room_type' inventory units");
            }
        }
    }

    private void validateParentRoom(String propertyId, String parentRoomId) {
        try {
            DocumentSnapshot doc = inventoryUnitRepository.findById(parentRoomId);
            if (!doc.exists()) {
                throw new IllegalArgumentException("Parent room with ID " + parentRoomId + " does not exist");
            }
            Map<String, Object> data = doc.getData();
            if (data == null || !propertyId.equals(data.get("propertyId"))) {
                throw new IllegalArgumentException("Parent room does not belong to this property");
            }
            String pType = String.valueOf(data.getOrDefault("unitType", "")).trim().toLowerCase();
            if (!"room".equals(pType)) {
                throw new IllegalArgumentException("Parent unit must be of type 'room'");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error validating parent room", e);
        }
    }

    private boolean hasActiveBookingsForUnit(String propertyId, String unitId, String unitType) {
        try {
            List<QueryDocumentSnapshot> bookings = bookingRepository.findByPropertyId(propertyId);
            Instant now = Instant.now();
            for (QueryDocumentSnapshot doc : bookings) {
                Map<String, Object> data = doc.getData();
                if (data == null) continue;
                if (!BookingAvailabilityUtils.isBlocking(data, now)) continue;

                String bookedUnitId = String.valueOf(data.getOrDefault("inventoryUnitId", "")).trim();
                String bookedParentRoomId = String.valueOf(data.getOrDefault("parentRoomId", "")).trim();

                if (unitId.equalsIgnoreCase(bookedUnitId)) {
                    return true;
                }
                if ("room".equalsIgnoreCase(unitType) && unitId.equalsIgnoreCase(bookedParentRoomId)) {
                    return true;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error checking active bookings for unit", e);
        }
        return false;
    }

    private int countActiveBookingsForUnit(String propertyId, String unitId) {
        try {
            List<QueryDocumentSnapshot> bookings = bookingRepository.findByPropertyId(propertyId);
            Instant now = Instant.now();
            int count = 0;
            for (QueryDocumentSnapshot doc : bookings) {
                Map<String, Object> data = doc.getData();
                if (data == null) continue;
                if (!BookingAvailabilityUtils.isBlocking(data, now)) continue;

                String bookedUnitId = String.valueOf(data.getOrDefault("inventoryUnitId", "")).trim();
                if (unitId.equalsIgnoreCase(bookedUnitId)) {
                    count++;
                }
            }
            return count;
        } catch (Exception e) {
            throw new RuntimeException("Error counting active bookings for unit", e);
        }
    }
}
