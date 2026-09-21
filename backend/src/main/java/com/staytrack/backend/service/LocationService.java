package com.staytrack.backend.service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.location.AreaRequest;
import com.staytrack.backend.model.Area;
import com.staytrack.backend.repository.AreaRepository;
import com.staytrack.backend.security.SecurityUtils;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class LocationService {

    private final AreaRepository areaRepository;

    public LocationService(AreaRepository areaRepository) {
        this.areaRepository = areaRepository;
    }

    public List<Map<String, Object>> getCities() {
        List<QueryDocumentSnapshot> documents = areaRepository.findAllActive();
        Map<String, Map<String, Object>> cities = new LinkedHashMap<>();

        for (DocumentSnapshot document : documents) {
            String city = stringValue(document.get("city"));
            if (city.isBlank()) {
                continue;
            }
            String key = city.toLowerCase(Locale.ROOT);
            if (!cities.containsKey(key)) {
                Map<String, Object> value = new LinkedHashMap<>();
                value.put("city", city);
                value.put("state", stringValue(document.get("state")));
                value.put("country", stringValue(document.get("country")));
                cities.put(key, value);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(cities.values());
        result.sort(Comparator.comparing(
                item -> stringValue(item.get("city")),
                String.CASE_INSENSITIVE_ORDER
        ));
        return result;
    }

    public List<Map<String, Object>> getAreas(String city) {
        List<QueryDocumentSnapshot> documents;
        if (city == null || city.isBlank()) {
            documents = areaRepository.findAllActive();
        } else {
            documents = areaRepository.findActiveByCity(city.trim());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (DocumentSnapshot document : documents) {
            result.add(toResponse(document));
        }
        result.sort(Comparator.comparing(
                item -> stringValue(item.get("name")),
                String.CASE_INSENSITIVE_ORDER
        ));
        return result;
    }

    public List<Map<String, Object>> searchLocations(String query) {
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return getAreas(null);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (QueryDocumentSnapshot document : areaRepository.findAllActive()) {
            String name = stringValue(document.get("name")).toLowerCase(Locale.ROOT);
            String city = stringValue(document.get("city")).toLowerCase(Locale.ROOT);
            String state = stringValue(document.get("state")).toLowerCase(Locale.ROOT);

            if (name.contains(normalized) || city.contains(normalized) || state.contains(normalized)) {
                Map<String, Object> response = toResponse(document);
                int priority = name.equals(normalized) ? 0
                        : name.startsWith(normalized) ? 1
                        : city.equals(normalized) ? 2
                        : city.startsWith(normalized) ? 3
                        : 4;
                response.put("matchPriority", priority);
                result.add(response);
            }
        }

        result.sort(
                Comparator
                        .comparingInt(
                                (Map<String, Object> item) ->
                                        intValue(item.get("matchPriority"))
                        )
                        .thenComparing(
                                (Map<String, Object> item) ->
                                        stringValue(item.get("name")),
                                String.CASE_INSENSITIVE_ORDER
                        )
        );

        for (Map<String, Object> item : result) {
            item.remove("matchPriority");
        }
        return result;
    }

    public Map<String, Object> getArea(String areaId) {
        requireText(areaId, "Area ID is required");
        DocumentSnapshot document = areaRepository.findById(areaId.trim());
        if (!document.exists()) {
            throw new IllegalArgumentException("Area not found");
        }
        return toResponse(document);
    }

    public Map<String, Object> createArea(AreaRequest request) {
        requireAdmin();
        validateRequest(request, true);

        String name = normalizeName(request.getName());
        String city = normalizeName(request.getCity());
        String state = normalizeName(request.getState());
        String country = normalizeName(request.getCountry());

        for (QueryDocumentSnapshot document : areaRepository.findAll()) {
            if (name.equalsIgnoreCase(stringValue(document.get("name")))
                    && city.equalsIgnoreCase(stringValue(document.get("city")))
                    && state.equalsIgnoreCase(stringValue(document.get("state")))) {
                throw new IllegalArgumentException("This area already exists in the city");
            }
        }

        String areaId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        Area area = new Area();
        area.setAreaId(areaId);
        area.setName(name);
        area.setCity(city);
        area.setState(state);
        area.setCountry(country);
        area.setActive(request.getActive() == null || request.getActive());
        area.setCreatedAt(now);
        area.setUpdatedAt(now);
        area.setCreatedBy(SecurityUtils.getCurrentUserId());
        area.setUpdatedBy(SecurityUtils.getCurrentUserId());

        areaRepository.create(areaId, area);
        return area.toMap();
    }

    public Map<String, Object> updateArea(String areaId, AreaRequest request) {
        requireAdmin();
        requireText(areaId, "Area ID is required");
        validateRequest(request, false);

        DocumentSnapshot existing = areaRepository.findById(areaId.trim());
        if (!existing.exists()) {
            throw new IllegalArgumentException("Area not found");
        }

        Map<String, Object> updates = new HashMap<>();
        if (request.getName() != null) updates.put("name", normalizeName(request.getName()));
        if (request.getCity() != null) updates.put("city", normalizeName(request.getCity()));
        if (request.getState() != null) updates.put("state", normalizeName(request.getState()));
        if (request.getCountry() != null) updates.put("country", normalizeName(request.getCountry()));
        if (request.getActive() != null) updates.put("active", request.getActive());
        updates.put("updatedAt", Instant.now());
        updates.put("updatedBy", SecurityUtils.getCurrentUserId());

        areaRepository.update(areaId.trim(), updates);
        return getArea(areaId.trim());
    }

    public Map<String, Object> deactivateArea(String areaId) {
        requireAdmin();
        requireText(areaId, "Area ID is required");
        DocumentSnapshot existing = areaRepository.findById(areaId.trim());
        if (!existing.exists()) {
            throw new IllegalArgumentException("Area not found");
        }
        Map<String, Object> updates = new HashMap<>();
        updates.put("active", false);
        updates.put("updatedAt", Instant.now());
        updates.put("updatedBy", SecurityUtils.getCurrentUserId());
        areaRepository.update(areaId.trim(), updates);
        return getArea(areaId.trim());
    }

    public List<Map<String, Object>> getAllForAdmin() {
        requireAdmin();
        List<Map<String, Object>> result = new ArrayList<>();
        for (QueryDocumentSnapshot document : areaRepository.findAll()) {
            result.add(toResponse(document));
        }
        result.sort(
                Comparator
                        .comparing(
                                (Map<String, Object> item) ->
                                        stringValue(item.get("city")),
                                String.CASE_INSENSITIVE_ORDER
                        )
                        .thenComparing(
                                (Map<String, Object> item) ->
                                        stringValue(item.get("name")),
                                String.CASE_INSENSITIVE_ORDER
                        )
        );
        return result;
    }

    private void validateRequest(AreaRequest request, boolean create) {
        if (request == null) throw new IllegalArgumentException("Request body is required");
        if (create || request.getName() != null) {
            requireText(request.getName(), "Area name is required");
        }
        if (create || request.getCity() != null) {
            requireText(request.getCity(), "City is required");
        }
        if (create || request.getState() != null) {
            requireText(request.getState(), "State is required");
        }
        if (create || request.getCountry() != null) {
            requireText(request.getCountry(), "Country is required");
        }
    }

    private void requireAdmin() {
        if (!SecurityUtils.isAdmin()) {
            throw new SecurityException("Admin access required");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private String normalizeName(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private Map<String, Object> toResponse(DocumentSnapshot document) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("areaId", document.getId());
        result.put("name", stringValue(document.get("name")));
        result.put("city", stringValue(document.get("city")));
        result.put("state", stringValue(document.get("state")));
        result.put("country", stringValue(document.get("country")));
        result.put("active", booleanValue(document.get("active")));
        result.put("createdAt", document.get("createdAt"));
        result.put("updatedAt", document.get("updatedAt"));
        return result;
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private boolean booleanValue(Object value) {
        return value instanceof Boolean && (Boolean) value;
    }

    private int intValue(Object value) {
        return value instanceof Number ? ((Number) value).intValue() : Integer.MAX_VALUE;
    }
}
