package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;

import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.security.AuthenticatedUser;

import com.staytrack.backend.util.BookingAvailabilityUtils;
import com.staytrack.backend.util.LocationUtils;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.InventoryUnitRepository;
import com.staytrack.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final SubscriptionService subscriptionService;
    private final BookingRepository bookingRepository;
    private final InventoryUnitRepository inventoryUnitRepository;

    @Autowired(required = false)
    private UserRepository userRepository;

    public PropertyService(
            PropertyRepository propertyRepository,
            SubscriptionService subscriptionService,
            BookingRepository bookingRepository,
            InventoryUnitRepository inventoryUnitRepository) {

        this.propertyRepository = propertyRepository;
        this.subscriptionService = subscriptionService;
        this.bookingRepository = bookingRepository;
        this.inventoryUnitRepository = inventoryUnitRepository;
    }

    public Map<String, Object> createProperty(
            AuthenticatedUser user,
            PropertyRequest request) {

        validateProperty(request);

        if (!"host".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException(
                    "Only approved hosts can create properties"
            );
        }

        /*
         * Property creation gate:
         * In free mode, approved hosts can list properties without a subscription.
         * In paid mode, an active subscription is strictly required.
         */
        String subMode = subscriptionService.getSubscriptionMode();
        if ("paid".equalsIgnoreCase(subMode)) {
            if (!subscriptionService.isSubscriptionActiveInPaidMode(user.getUid())) {
                throw new RuntimeException(
                        "An active subscription is required to create a property listing"
                );
            }
        }

        /*
         * Server-side listing limit check:
         */
        try {
            Map<String, Object> plan = subscriptionService.getCurrentPlan();
            Number limitNum = (Number) plan.get("listingPropertyLimit");
            long limit = limitNum != null ? limitNum.longValue() : 0L;
            if (limit > 0) {
                List<QueryDocumentSnapshot> existing = propertyRepository.findByHostId(user.getUid());
                if (existing != null && existing.size() >= limit) {
                    throw new RuntimeException(
                            "Property listing limit reached (" + limit + " properties). Please upgrade or contact support."
                    );
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception ignored) {}

        String propertyId =
                UUID.randomUUID().toString();

        Map<String, Object> property =
                new HashMap<>();

        property.put(
                "propertyId",
                propertyId
        );

        property.put(
                "hostId",
                user.getUid()
        );

        property.put(
                "hostType",
                request.getHostType()
        );

        property.put(
                "title",
                request.getTitle().trim()
        );

        property.put(
                "description",
                request.getDescription() != null
                        ? request.getDescription().trim()
                        : ""
        );

        property.put(
                "propertyType",
                request.getPropertyType()
        );

        property.put(
                "stayTypes",
                request.getStayTypes()
        );

        property.put(
                "hourlyPrice",
                request.getHourlyPrice()
        );

        property.put(
                "dailyPrice",
                request.getDailyPrice()
        );

        property.put(
                "monthlyPrice",
                request.getMonthlyPrice()
        );

        Double mainPrice = request.getPrice();
        if (mainPrice == null) {
            if (request.getDailyPrice() != null) mainPrice = request.getDailyPrice();
            else if (request.getMonthlyPrice() != null) mainPrice = request.getMonthlyPrice();
            else if (request.getHourlyPrice() != null) mainPrice = request.getHourlyPrice();
        }
        property.put(
                "price",
                mainPrice
        );

        property.put(
                "address",
                request.getAddress()
        );

        property.put(
                "city",
                request.getCity()
        );

        property.put(
                "cityNormalized",
                LocationUtils.normalizeLocation(request.getCity())
        );

        property.put(
                "area",
                request.getArea()
        );

        property.put(
                "areaNormalized",
                LocationUtils.normalizeLocation(request.getArea())
        );

        property.put(
                "latitude",
                request.getLatitude()
        );

        property.put(
                "longitude",
                request.getLongitude()
        );

        property.put(
                "bedrooms",
                request.getBedrooms()
        );

        property.put(
                "bathrooms",
                request.getBathrooms()
        );

        property.put(
                "furnished",
                request.getFurnished()
        );

        property.put(
                "areaSqFt",
                request.getAreaSqFt()
        );

        property.put(
                "amenities",
                request.getAmenities() != null
                        ? request.getAmenities()
                        : new ArrayList<>()
        );

        property.put(
                "images",
                request.getImages() != null
                        ? request.getImages()
                        : new ArrayList<>()
        );

        property.put("category", request.getCategory() != null ? request.getCategory() : request.getPropertyType());

        // BNB attributes
        property.put("spaceType", request.getSpaceType());
        property.put("maxGuests", request.getMaxGuests());
        property.put("bedsCount", request.getBedsCount());
        property.put("checkInTime", request.getCheckInTime());
        property.put("checkOutTime", request.getCheckOutTime());
        property.put("houseRules", request.getHouseRules() != null ? request.getHouseRules() : new ArrayList<>());

        // PG attributes
        property.put("occupancyType", request.getOccupancyType() != null ? request.getOccupancyType().trim().toLowerCase() : null);
        property.put("genderCategory", request.getGenderCategory() != null ? request.getGenderCategory().trim().toLowerCase() : null);
        property.put("foodIncluded", request.getFoodIncluded());
        property.put("foodOptions", request.getFoodOptions() != null ? request.getFoodOptions() : new ArrayList<>());
        property.put("securityDeposit", request.getSecurityDeposit());
        property.put("securityDepositEnabled", request.getSecurityDepositEnabled() != null ? request.getSecurityDepositEnabled() : (request.getSecurityDeposit() != null && request.getSecurityDeposit() > 0));
        property.put("noticePeriodDays", request.getNoticePeriodDays());
        property.put("gateClosingTime", request.getGateClosingTime());

        // Category stay terms
        String createCat = request.getPropertyType() != null ? request.getPropertyType().trim().toLowerCase() : "";
        if (createCat.isBlank() && request.getCategory() != null) {
            createCat = request.getCategory().trim().toLowerCase();
        }
        boolean isTransientCreate = "hotel".equals(createCat) || "bnb".equals(createCat) || "vacationstay".equals(createCat) || "vacation_stay".equals(createCat) || "room".equals(createCat);
        boolean isDailyHostelCreate = "hostel".equals(createCat) && request.getStayTypes() != null && request.getStayTypes().contains("daily") && !request.getStayTypes().contains("monthly");

        if (isTransientCreate || isDailyHostelCreate) {
            property.put("contractDuration", null);
            property.put("customDurationValue", null);
            property.put("customDurationUnit", null);
            property.put("monthlyRentPerBed", null);
            if (isTransientCreate) {
                property.put("securityDepositEnabled", false);
                property.put("securityDeposit", null);
                property.put("noticePeriodDays", null);
            }
        } else if ("flat".equals(createCat) || "apartment".equals(createCat) || "house".equals(createCat)) {
            property.put("monthlyRentPerBed", null);
            property.put("contractDuration", null);
            property.put("customDurationValue", null);
            property.put("customDurationUnit", null);
        } else {
            property.put("contractDuration", request.getContractDuration());
            property.put("customDurationValue", request.getCustomDurationValue());
            property.put("customDurationUnit", request.getCustomDurationUnit());
            property.put("monthlyRentPerBed", request.getMonthlyRentPerBed());
        }

        if (request.getOccupancyOptions() != null) {
            List<Map<String, Object>> normalized = validateAndNormalizeOccupancyOptions(request.getOccupancyOptions());
            property.put("occupancyOptions", normalized);
            if (!normalized.isEmpty() && (property.get("monthlyRentPerBed") == null || ((Number) property.get("monthlyRentPerBed")).doubleValue() <= 0)) {
                double minRent = normalized.stream()
                        .mapToDouble(o -> ((Number) o.get("monthlyRentPerBed")).doubleValue())
                        .min()
                        .orElse(0.0);
                if (minRent > 0) {
                    property.put("monthlyRentPerBed", minRent);
                    if (property.get("price") == null || ((Number) property.get("price")).doubleValue() <= 0) {
                        property.put("price", minRent);
                    }
                    if (property.get("monthlyPrice") == null || ((Number) property.get("monthlyPrice")).doubleValue() <= 0) {
                        property.put("monthlyPrice", minRent);
                    }
                }
            }
        } else {
            property.put("occupancyOptions", new ArrayList<>());
        }

        // Hostel attributes
        property.put("roomType", request.getRoomType());
        property.put("totalBeds", request.getTotalBeds());
        property.put("availableBeds", request.getAvailableBeds());
        property.put("priceModel", request.getPriceModel());
        property.put("studentOrWorking", request.getStudentOrWorking());
        property.put("sharedFacilities", request.getSharedFacilities() != null ? request.getSharedFacilities() : new ArrayList<>());

        // Flat attributes
        property.put("bhkConfig", request.getBhkConfig());
        property.put("maintenanceCharges", request.getMaintenanceCharges());
        property.put("tenantPreference", request.getTenantPreference());
        property.put("floorNumber", request.getFloorNumber());
        property.put("totalFloors", request.getTotalFloors());
        property.put("parkingType", request.getParkingType());

        // Hotel attributes
        property.put("bedType", request.getBedType());
        property.put("breakfastIncluded", request.getBreakfastIncluded());
        property.put("cancellationPolicy", request.getCancellationPolicy());

        // Every new property requires admin verification.
        property.put(
                "verificationStatus",
                "pending"
        );

        property.put(
                "verificationNote",
                ""
        );

        // Pending properties are not publicly visible.
        property.put(
                "listingStatus",
                "hidden"
        );

        property.put(
                "topVerified",
                false
        );

        property.put(
                "showInStay",
                false
        );

        property.put(
                "averageRating",
                0.0
        );

        property.put(
                "reviewCount",
                0L
        );

        Timestamp now = Timestamp.now();

        property.put(
                "createdAt",
                now
        );

        property.put(
                "updatedAt",
                now
        );

        property.put(
                "id",
                propertyId
        );

        property.put(
                "propertyId",
                propertyId
        );

        try {

            propertyRepository.create(
                    propertyId,
                    property
            );

            return property;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create property",
                    e
            );
        }
    }

    public Map<String, Object> getProperty(
            String propertyId,
            AuthenticatedUser user) {

        try {

            DocumentSnapshot document =
                    propertyRepository.findById(
                            propertyId
                    );

            if (!document.exists()) {
                throw new RuntimeException(
                        "Property not found"
                );
            }

            Map<String, Object> property =
                    document.getData();

            if (property == null) {
                throw new RuntimeException(
                        "Property data is empty"
                );
            }

            boolean isOwner =
                    user != null &&
                    user.getUid().equals(
                            property.get("hostId")
                    );

            boolean isAdmin =
                    user != null &&
                    "admin".equalsIgnoreCase(
                            user.getRole()
                    );

            boolean isApprovedActive =
                    "approved".equalsIgnoreCase(
                            String.valueOf(
                                    property.get(
                                            "verificationStatus"
                                    )
                            )
                    )
                    &&
                    "active".equalsIgnoreCase(
                            String.valueOf(
                                    property.get(
                                            "listingStatus"
                                    )
                            )
                    );

            if (!isApprovedActive &&
                    !isOwner &&
                    !isAdmin) {

                throw new RuntimeException(
                        "Property is not available"
                );
            }

            property.put(
                    "id",
                    propertyId
            );

            property.put(
                    "propertyId",
                    propertyId
            );

            enrichPropertyWithFallbacks(property);

            sanitizeLocationForCaller(property, user, propertyId);

            return property;

        } catch (RuntimeException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get property",
                    e
            );
        }
    }

    public Map<String, Object> checkPropertyAvailability(
            String propertyId,
            String startDate,
            String endDate,
            String startTime,
            String endTime,
            String bookingType
    ) {
        return checkPropertyAvailability(propertyId, startDate, endDate, startTime, endTime, bookingType, null, null, null);
    }

    public Map<String, Object> checkPropertyAvailability(
            String propertyId,
            String startDate,
            String endDate,
            String startTime,
            String endTime,
            String bookingType,
            String inventoryUnitId
    ) {
        return checkPropertyAvailability(propertyId, startDate, endDate, startTime, endTime, bookingType, inventoryUnitId, null, null);
    }

    public Map<String, Object> checkPropertyAvailability(
            String propertyId,
            String startDate,
            String endDate,
            String startTime,
            String endTime,
            String bookingType,
            String inventoryUnitId,
            String occupancyType,
            String roomTypeId
    ) {
        Map<String, Object> response = new HashMap<>();
        if (propertyId == null || propertyId.isBlank()) {
            response.put("available", false);
            response.put("reason", "Property ID is required");
            return response;
        }

        if (startDate == null || startDate.isBlank() || endDate == null || endDate.isBlank()) {
            response.put("available", true);
            return response;
        }

        try {
            String requestedUnitId = inventoryUnitId != null ? inventoryUnitId.trim() : "";
            String requestedUnitType = "";
            String requestedParentRoomId = "";
            int requestedTotalQuantity = 1;

            List<QueryDocumentSnapshot> propertyUnits = Collections.emptyList();
            try {
                propertyUnits = inventoryUnitRepository.findByPropertyId(propertyId.trim());
            } catch (Exception ignored) {}

            boolean hasUnits = propertyUnits != null && !propertyUnits.isEmpty();

            // If unitId is blank but occupancyType or roomTypeId was requested on a property with inventory units
            if (requestedUnitId.isBlank() && hasUnits && ((occupancyType != null && !occupancyType.isBlank()) || (roomTypeId != null && !roomTypeId.isBlank()))) {
                List<Map<String, Object>> candidateUnits = findMatchingUnits(propertyUnits, occupancyType, roomTypeId);
                if (candidateUnits.isEmpty()) {
                    response.put("available", false);
                    response.put("reason", "No inventory configured for this occupancy option");
                    return response;
                }

                List<QueryDocumentSnapshot> bookings = bookingRepository.findByPropertyId(propertyId.trim());
                Instant now = Instant.now();

                for (Map<String, Object> cand : candidateUnits) {
                    String candId = stringValue(cand.get("id"));
                    if (candId.isBlank()) candId = stringValue(cand.get("inventoryUnitId"));
                    String candType = stringValue(cand.get("unitType")).trim();
                    String candParentRoomId = stringValue(cand.get("parentRoomId")).trim();

                    boolean hasConflict = false;
                    for (QueryDocumentSnapshot doc : bookings) {
                        Map<String, Object> data = doc.getData();
                        if (data == null) continue;
                        if (!BookingAvailabilityUtils.datesAndTimesOverlap(
                                bookingType,
                                startDate,
                                endDate,
                                startTime,
                                endTime,
                                data,
                                now
                        )) {
                            continue;
                        }

                        if (BookingAvailabilityUtils.unitConflicts(candId, candType, candParentRoomId, data)) {
                            hasConflict = true;
                            break;
                        }
                    }

                    if (!hasConflict) {
                        response.put("available", true);
                        response.put("availableUnitId", candId);
                        response.put("occupancyType", occupancyType);
                        return response;
                    }
                }

                response.put("available", false);
                response.put("reason", "No available beds for this sharing option on selected dates");
                return response;
            }

            if (!requestedUnitId.isBlank()) {
                DocumentSnapshot unitDoc = inventoryUnitRepository.findById(requestedUnitId);
                if (!unitDoc.exists()) {
                    response.put("available", false);
                    response.put("reason", "Inventory unit not found");
                    return response;
                }
                Map<String, Object> unitData = unitDoc.getData();
                if (unitData == null || !propertyId.trim().equals(unitData.get("propertyId"))) {
                    response.put("available", false);
                    response.put("reason", "Inventory unit does not belong to this property");
                    return response;
                }
                if ("inactive".equalsIgnoreCase(stringValue(unitData.get("status")).trim())) {
                    response.put("available", false);
                    response.put("reason", "Inventory unit is inactive");
                    return response;
                }
                requestedUnitType = stringValue(unitData.get("unitType")).trim();
                requestedParentRoomId = stringValue(unitData.get("parentRoomId")).trim();
                if (unitData.get("totalQuantity") instanceof Number n) {
                    requestedTotalQuantity = n.intValue();
                }
            }

            List<QueryDocumentSnapshot> bookings = bookingRepository.findByPropertyId(propertyId.trim());
            Instant now = Instant.now();
            int activeRoomTypeCount = 0;

            for (QueryDocumentSnapshot doc : bookings) {
                Map<String, Object> data = doc.getData();
                if (data == null) continue;

                if (!BookingAvailabilityUtils.datesAndTimesOverlap(
                        bookingType,
                        startDate,
                        endDate,
                        startTime,
                        endTime,
                        data,
                        now
                )) {
                    continue;
                }

                String existingUnitId = stringValue(data.get("inventoryUnitId")).trim();
                String existingUnitType = stringValue(data.get("unitType")).trim();
                String existingParentRoomId = stringValue(data.get("parentRoomId")).trim();

                // Whole property collision
                if (requestedUnitId.isBlank() || existingUnitId.isBlank()) {
                    response.put("available", false);
                    response.put("reason", "Unavailable for selected dates");
                    return response;
                }

                // Room type capacity
                if ("room_type".equalsIgnoreCase(requestedUnitType)) {
                    if (requestedUnitId.equalsIgnoreCase(existingUnitId)) {
                        activeRoomTypeCount++;
                    }
                    continue;
                }

                // Discrete unit collision
                if (requestedUnitId.equalsIgnoreCase(existingUnitId)) {
                    response.put("available", false);
                    response.put("reason", "Selected room or bed is already booked for the requested period");
                    return response;
                }

                // Whole room vs bed
                if ("room".equalsIgnoreCase(requestedUnitType)
                        && !existingParentRoomId.isBlank()
                        && requestedUnitId.equalsIgnoreCase(existingParentRoomId)) {
                    response.put("available", false);
                    response.put("reason", "Room cannot be booked because a bed within it is already reserved");
                    return response;
                }

                // Bed vs whole room
                if ("bed".equalsIgnoreCase(requestedUnitType)
                        && !requestedParentRoomId.isBlank()
                        && requestedParentRoomId.equalsIgnoreCase(existingUnitId)) {
                    response.put("available", false);
                    response.put("reason", "Bed cannot be booked because its parent room is already reserved as a whole");
                    return response;
                }
            }

            if ("room_type".equalsIgnoreCase(requestedUnitType) && activeRoomTypeCount >= requestedTotalQuantity) {
                response.put("available", false);
                response.put("reason", "No available rooms of this type for the requested period");
                return response;
            }

            response.put("available", true);
            return response;
        } catch (Exception e) {
            response.put("available", true);
            return response;
        }
    }

    public List<Map<String, Object>> getMyProperties(
            AuthenticatedUser user) {

        if (!"host".equalsIgnoreCase(
                user.getRole())) {

            throw new RuntimeException(
                    "Only hosts can access host properties"
            );
        }

        try {

            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findByHostId(
                            user.getUid()
                    );

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            for (DocumentSnapshot document :
                    documents) {

                Map<String, Object> property =
                        document.getData();

                if (property != null) {

                    property.put(
                            "id",
                            document.getId()
                    );
                    property.put(
                            "propertyId",
                            document.getId()
                    );

                    enrichPropertyWithFallbacks(property);
                    properties.add(property);
                }
            }

            return properties;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get host properties",
                    e
            );
        }
    }

    public List<Map<String, Object>> getTopVerifiedProperties() {
        try {
            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findApprovedActive();

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            for (DocumentSnapshot document : documents) {
                Map<String, Object> property = document.getData();
                if (property != null) {
                    property = new HashMap<>(property);
                    boolean isTop = isTrue(property.get("topVerified")) || isTrue(property.get("isTopVerified"));
                    if (isTop) {
                        property.put("id", document.getId());
                        property.put("propertyId", document.getId());
                        enrichPropertyWithFallbacks(property);
                        LocationUtils.sanitizePublicLocation(property);
                        properties.add(property);
                    }
                }
            }

            return properties;
        } catch (Exception e) {
            throw new RuntimeException("Unable to get top verified properties", e);
        }
    }

    public List<Map<String, Object>> getStaySectionProperties() {
        try {
            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findApprovedActive();

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            for (DocumentSnapshot document : documents) {
                Map<String, Object> property = document.getData();
                if (property != null) {
                    property = new HashMap<>(property);
                    Object val = property.get("showInStay");
                    boolean isStay = val == null || isTrue(val) || isTrue(property.get("assignedToStay")) || isTrue(property.get("isStay"));
                    if (isStay) {
                        property.put("id", document.getId());
                        property.put("propertyId", document.getId());
                        enrichPropertyWithFallbacks(property);
                        LocationUtils.sanitizePublicLocation(property);
                        properties.add(property);
                    }
                }
            }

            return properties;
        } catch (Exception e) {
            throw new RuntimeException("Unable to get stay section properties", e);
        }
    }

    public List<Map<String, Object>> getPublicProperties() {
        return getStaySectionProperties();
    }

    private boolean isTrue(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean) return (Boolean) value;
        return "true".equalsIgnoreCase(value.toString());
    }

    private void validateProperty(
            PropertyRequest request) {

        if (request == null) {

            throw new RuntimeException(
                    "Property data is required"
            );
        }

        if (request.getTitle() == null ||
                request.getTitle().isBlank()) {

            throw new RuntimeException(
                    "Property title is required"
            );
        }

        if (request.getPropertyType() == null || request.getPropertyType().isBlank()) {
            if (request.getCategory() != null && !request.getCategory().isBlank()) {
                request.setPropertyType(request.getCategory());
            } else {
                throw new RuntimeException("Property type is required");
            }
        }
        if (request.getCategory() == null || request.getCategory().isBlank()) {
            request.setCategory(request.getPropertyType());
        }

        String propTypeLower = request.getPropertyType().trim().toLowerCase();
        if ("flat".equals(propTypeLower) || "apartment".equals(propTypeLower) || "house".equals(propTypeLower)) {
            if ((request.getBhkConfig() == null || request.getBhkConfig().isBlank()) && request.getBedrooms() != null) {
                request.setBhkConfig(request.getBedrooms() + " BHK");
            } else if (request.getBedrooms() == null && request.getBhkConfig() != null) {
                String bhk = request.getBhkConfig().replaceAll("[^0-9]", "");
                if (!bhk.isBlank()) {
                    try {
                        request.setBedrooms(Integer.parseInt(bhk));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        // Auto-populate stayTypes from bookingType or stayModel if stayTypes is missing
        if (request.getStayTypes() == null || request.getStayTypes().isEmpty()) {
            String model = request.getBookingType();
            if (model == null || model.isBlank()) {
                model = request.getStayModel();
            }
            if (model != null && !model.isBlank()) {
                String clean = model.trim().toLowerCase();
                if (clean.contains("night") || clean.contains("daily")) clean = "daily";
                else if (clean.contains("month")) clean = "monthly";
                else if (clean.contains("hour")) clean = "hourly";
                request.setStayTypes(List.of(clean));
            } else {
                String catCheck = request.getPropertyType() != null ? request.getPropertyType().trim().toLowerCase() : "";
                if (catCheck.isBlank() && request.getCategory() != null) {
                    catCheck = request.getCategory().trim().toLowerCase();
                }
                if ("pg".equals(catCheck) || "flat".equals(catCheck) || "apartment".equals(catCheck) || "house".equals(catCheck) || "hostel".equals(catCheck)) {
                    request.setStayTypes(List.of("monthly"));
                } else {
                    request.setStayTypes(List.of("daily"));
                }
            }
        }

        // Auto-populate price per stayType if missing
        if (request.getStayTypes().contains("daily") && request.getDailyPrice() == null) {
            Double p = request.getPricePerNight() != null ? request.getPricePerNight() : request.getPrice();
            request.setDailyPrice(p);
        }
        if (request.getStayTypes().contains("monthly") && request.getMonthlyPrice() == null) {
            Double p = request.getPricePerMonth() != null ? request.getPricePerMonth() : request.getPrice();
            request.setMonthlyPrice(p);
        }
        if (request.getStayTypes().contains("hourly") && request.getHourlyPrice() == null) {
            Double p = request.getPricePerHour() != null ? request.getPricePerHour() : request.getPrice();
            request.setHourlyPrice(p);
        }

        if (request.getStayTypes() == null ||
                request.getStayTypes().isEmpty()) {

            throw new RuntimeException(
                    "At least one stay type is required"
            );
        }

        validatePropertyType(
                request.getPropertyType()
        );

        validateStayTypes(
                request.getStayTypes()
        );

        validateCategoryTerms(request);

        validatePrices(request);

        validateCoordinates(request.getLatitude(), request.getLongitude());
    }

    private Set<String> getRequestedStayModels(PropertyRequest request) {
        Set<String> models = new HashSet<>();
        if (request.getStayTypes() != null) {
            for (String s : request.getStayTypes()) {
                if (s != null && !s.isBlank()) {
                    String clean = s.trim().toLowerCase();
                    if (clean.contains("night") || clean.contains("daily")) models.add("daily");
                    else if (clean.contains("month")) models.add("monthly");
                    else if (clean.contains("hour")) models.add("hourly");
                    else models.add(clean);
                }
            }
        }
        if (request.getBookingType() != null && !request.getBookingType().isBlank()) {
            String bt = request.getBookingType().trim().toLowerCase();
            if (bt.contains("night") || bt.contains("daily")) models.add("daily");
            else if (bt.contains("month")) models.add("monthly");
            else if (bt.contains("hour")) models.add("hourly");
            else models.add(bt);
        }
        if (request.getStayModel() != null && !request.getStayModel().isBlank()) {
            String sm = request.getStayModel().trim().toLowerCase();
            if (sm.contains("night") || sm.contains("daily")) models.add("daily");
            else if (sm.contains("month")) models.add("monthly");
            else if (sm.contains("hour")) models.add("hourly");
            else models.add(sm);
        }
        return models;
    }

    private void validateCategoryTerms(PropertyRequest request) {
        String cat = request.getPropertyType() != null ? request.getPropertyType().trim().toLowerCase() : "";
        if (cat.isBlank() && request.getCategory() != null) {
            cat = request.getCategory().trim().toLowerCase();
        }

        Set<String> stayModels = getRequestedStayModels(request);

        // 1. Transient Stays: Hotels and B&Bs (only daily and hourly allowed)
        if ("hotel".equals(cat) || "bnb".equals(cat) || "vacationstay".equals(cat) || "vacation_stay".equals(cat) || "room".equals(cat)) {
            if (stayModels.contains("monthly")) {
                throw new IllegalArgumentException(cat.toUpperCase() + " accommodations do not support monthly stay model. Allowed models are daily and hourly.");
            }
            if ((request.getContractDuration() != null && !request.getContractDuration().isBlank())
                    || request.getCustomDurationValue() != null
                    || (request.getCustomDurationUnit() != null && !request.getCustomDurationUnit().isBlank())
                    || (request.getMonthlyRentPerBed() != null && request.getMonthlyRentPerBed() > 0)) {
                throw new IllegalArgumentException("Contractual lease durations and bed-based pricing are not permitted for hotels or vacation stays");
            }
        }

        // 2. Whole-Property Residential Rentals: Flats (only monthly allowed)
        else if ("flat".equals(cat) || "apartment".equals(cat) || "house".equals(cat)) {
            if (stayModels.contains("daily") || stayModels.contains("hourly")) {
                throw new IllegalArgumentException("Residential flat rentals only support monthly stay model.");
            }
            if (request.getMonthlyRentPerBed() != null && request.getMonthlyRentPerBed() > 0) {
                throw new IllegalArgumentException("Bed-based pricing is not applicable for whole-flat residential rentals");
            }
            if (request.getMaintenanceCharges() != null && request.getMaintenanceCharges() < 0) {
                throw new IllegalArgumentException("Maintenance charges cannot be negative");
            }
            validateDepositAndNotice(request);
        }

        // 3. PG: Paying Guest accommodations (only monthly allowed)
        else if ("pg".equals(cat)) {
            if (stayModels.contains("daily") || stayModels.contains("hourly")) {
                throw new IllegalArgumentException("PG accommodations only support monthly stay model.");
            }
            validateContractDurationAndBedRent(request);
            validateDepositAndNotice(request);
        }

        // 4. HOSTEL: Shared / Community living (monthly and daily allowed, reject hourly)
        else if ("hostel".equals(cat)) {
            if (stayModels.contains("hourly")) {
                throw new IllegalArgumentException("Hostels do not support hourly stay model. Allowed models are monthly and daily.");
            }
            boolean isDailyHostel = stayModels.contains("daily") && !stayModels.contains("monthly");
            if (isDailyHostel) {
                if ((request.getContractDuration() != null && !request.getContractDuration().isBlank())
                        || request.getCustomDurationValue() != null
                        || (request.getCustomDurationUnit() != null && !request.getCustomDurationUnit().isBlank())
                        || (request.getMonthlyRentPerBed() != null && request.getMonthlyRentPerBed() > 0)) {
                    throw new IllegalArgumentException("Hostels with daily stay model cannot have contractual lease durations or monthly bed rent");
                }
            } else {
                validateContractDurationAndBedRent(request);
                validateDepositAndNotice(request);
            }
        }
    }

    private void validateContractDurationAndBedRent(PropertyRequest request) {
        // Contract duration validation
        String contract = request.getContractDuration();
        if (contract != null && !contract.isBlank()) {
            String cleanContract = contract.trim().toLowerCase();
            switch (cleanContract) {
                case "3_months":
                case "4_months":
                case "6_months":
                case "10_months":
                case "12_months":
                    request.setContractDuration(cleanContract);
                    request.setCustomDurationValue(null);
                    request.setCustomDurationUnit(null);
                    break;
                case "custom":
                    request.setContractDuration("custom");
                    if (request.getCustomDurationValue() == null || request.getCustomDurationValue() <= 0) {
                        throw new IllegalArgumentException("Custom contract duration requires a positive numeric value");
                    }
                    String unit = request.getCustomDurationUnit() != null ? request.getCustomDurationUnit().trim().toLowerCase() : "";
                    if (!"months".equals(unit) && !"days".equals(unit)) {
                        throw new IllegalArgumentException("Custom contract duration unit must be either 'months' or 'days'");
                    }
                    request.setCustomDurationUnit(unit);
                    break;
                default:
                    throw new IllegalArgumentException("Invalid contract duration: " + contract + ". Supported options are: 3_months, 4_months, 6_months, 10_months, 12_months, custom");
            }
        }

        // Monthly rent per bed validation
        if (request.getMonthlyRentPerBed() != null) {
            if (request.getMonthlyRentPerBed() <= 0) {
                throw new IllegalArgumentException("Monthly rent per bed must be a positive amount");
            }
            // Auto sync with monthlyPrice and price if monthlyPrice is missing or 0
            if (request.getMonthlyPrice() == null || request.getMonthlyPrice() == 0.0) {
                request.setMonthlyPrice(request.getMonthlyRentPerBed());
            }
            if (request.getPrice() == null || request.getPrice() == 0.0) {
                request.setPrice(request.getMonthlyRentPerBed());
            }
        } else if (request.getOccupancyOptions() != null && !request.getOccupancyOptions().isEmpty()) {
            Double minRent = null;
            for (Map<String, Object> opt : request.getOccupancyOptions()) {
                if (opt != null && opt.get("monthlyRentPerBed") instanceof Number num && num.doubleValue() > 0) {
                    if (minRent == null || num.doubleValue() < minRent) {
                        minRent = num.doubleValue();
                    }
                }
            }
            if (minRent != null) {
                request.setMonthlyRentPerBed(minRent);
                if (request.getMonthlyPrice() == null || request.getMonthlyPrice() == 0.0) {
                    request.setMonthlyPrice(minRent);
                }
                if (request.getPrice() == null || request.getPrice() == 0.0) {
                    request.setPrice(minRent);
                }
            }
        } else {
            // Auto sync from monthlyPrice or price if monthlyRentPerBed is missing
            if (request.getMonthlyPrice() != null && request.getMonthlyPrice() > 0) {
                request.setMonthlyRentPerBed(request.getMonthlyPrice());
            } else if (request.getPrice() != null && request.getPrice() > 0) {
                request.setMonthlyRentPerBed(request.getPrice());
            }
        }
    }

    private void validateDepositAndNotice(PropertyRequest request) {
        Boolean depositEnabled = request.getSecurityDepositEnabled();
        Double deposit = request.getSecurityDeposit();

        if (Boolean.TRUE.equals(depositEnabled)) {
            if (deposit == null || deposit <= 0) {
                throw new IllegalArgumentException("Security deposit amount must be greater than zero when security deposit is enabled");
            }
        } else if (Boolean.FALSE.equals(depositEnabled)) {
            request.setSecurityDeposit(null);
        } else {
            if (deposit != null) {
                if (deposit < 0) {
                    throw new IllegalArgumentException("Security deposit cannot be negative");
                }
                if (deposit > 0) {
                    request.setSecurityDepositEnabled(true);
                } else {
                    request.setSecurityDeposit(null);
                    request.setSecurityDepositEnabled(false);
                }
            }
        }

        if (request.getNoticePeriodDays() != null && request.getNoticePeriodDays() < 0) {
            throw new IllegalArgumentException("Notice period days cannot be negative");
        }
    }

    private List<Map<String, Object>> validateAndNormalizeOccupancyOptions(List<Map<String, Object>> options) {
        if (options == null || options.isEmpty()) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (int i = 0; i < options.size(); i++) {
            Map<String, Object> opt = options.get(i);
            if (opt == null) continue;

            String name = opt.get("name") != null ? String.valueOf(opt.get("name")).trim() : "";
            String occType = opt.get("occupancyType") != null ? String.valueOf(opt.get("occupancyType")).trim().toLowerCase() : "";
            if (name.isBlank() && occType.isBlank()) {
                throw new IllegalArgumentException("Each occupancy option must have a name or occupancy type");
            }
            if (name.isBlank()) {
                name = occType.substring(0, 1).toUpperCase() + occType.substring(1) + " Sharing";
            }
            if (occType.isBlank()) {
                occType = name.toLowerCase().replaceAll("[^a-z0-9_]+", "_");
            }

            Double rent = null;
            if (opt.get("monthlyRentPerBed") instanceof Number num) {
                rent = num.doubleValue();
            } else if (opt.get("monthlyRentPerBed") != null) {
                try {
                    rent = Double.parseDouble(String.valueOf(opt.get("monthlyRentPerBed")).trim());
                } catch (Exception ignored) {}
            }
            boolean hasNightlyRate = (opt.get("nightlyPrice") instanceof Number np && np.doubleValue() > 0)
                    || (opt.get("price") instanceof Number p && p.doubleValue() > 0);

            if (rent == null || rent <= 0) {
                if (opt.get("monthlyRentPerBed") == null || hasNightlyRate) {
                    rent = 0.0;
                } else {
                    throw new IllegalArgumentException("Monthly rent per bed for '" + name + "' must be greater than zero");
                }
            }

            String id = opt.get("id") != null ? String.valueOf(opt.get("id")).trim() : "";
            if (id.isBlank()) {
                id = occType + "_" + (i + 1);
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", id);
            item.put("name", name);
            item.put("occupancyType", occType);
            item.put("monthlyRentPerBed", rent);

            if (opt.get("securityDeposit") instanceof Number dep) {
                item.put("securityDeposit", dep.doubleValue());
            } else {
                item.put("securityDeposit", null);
            }

            if (opt.get("bathrooms") instanceof Number b) {
                item.put("bathrooms", b.intValue());
            }

            if (opt.get("bathroomType") != null) {
                item.put("bathroomType", String.valueOf(opt.get("bathroomType")).trim().toLowerCase());
            }

            if (opt.get("roomCount") instanceof Number rc) {
                item.put("roomCount", rc.intValue());
            } else if (opt.get("roomCount") != null) {
                try { item.put("roomCount", Integer.parseInt(String.valueOf(opt.get("roomCount")).trim())); } catch (Exception ignored) {}
            }

            if (opt.get("bedsCount") instanceof Number bc) {
                item.put("bedsCount", bc.intValue());
            } else if (opt.get("bedsCount") != null) {
                try { item.put("bedsCount", Integer.parseInt(String.valueOf(opt.get("bedsCount")).trim())); } catch (Exception ignored) {}
            }

            if (opt.get("maxOccupancy") instanceof Number mo) {
                item.put("maxOccupancy", mo.intValue());
            } else if (opt.get("maxOccupancy") != null) {
                try { item.put("maxOccupancy", Integer.parseInt(String.valueOf(opt.get("maxOccupancy")).trim())); } catch (Exception ignored) {}
            }

            if (opt.get("bedType") != null) {
                item.put("bedType", String.valueOf(opt.get("bedType")).trim().toLowerCase());
            }

            if (opt.get("roomCategory") != null) {
                item.put("roomCategory", String.valueOf(opt.get("roomCategory")).trim().toLowerCase());
            }

            if (opt.get("amenities") instanceof List<?> am) {
                item.put("amenities", am);
            }

            if (opt.get("furnished") != null) {
                item.put("furnished", Boolean.TRUE.equals(opt.get("furnished")) || "true".equalsIgnoreCase(String.valueOf(opt.get("furnished"))));
            }

            if (opt.get("roomDetails") != null) {
                item.put("roomDetails", String.valueOf(opt.get("roomDetails")).trim());
            }

            if (opt.get("price") instanceof Number p) {
                item.put("price", p.doubleValue());
            } else if (opt.get("price") != null) {
                try { item.put("price", Double.parseDouble(String.valueOf(opt.get("price")).trim())); } catch (Exception ignored) {}
            }

            if (opt.get("nightlyPrice") instanceof Number np) {
                item.put("nightlyPrice", np.doubleValue());
                if (!item.containsKey("price")) {
                    item.put("price", np.doubleValue());
                }
            } else if (opt.get("nightlyPrice") != null) {
                try {
                    double val = Double.parseDouble(String.valueOf(opt.get("nightlyPrice")).trim());
                    item.put("nightlyPrice", val);
                    if (!item.containsKey("price")) item.put("price", val);
                } catch (Exception ignored) {}
            }

            if (opt.get("isAvailable") != null) {
                item.put("isAvailable", Boolean.TRUE.equals(opt.get("isAvailable")) || "true".equalsIgnoreCase(String.valueOf(opt.get("isAvailable"))));
            }

            normalized.add(item);
        }
        return normalized;
    }

    private static String safeString(Object val) {
        return val != null ? String.valueOf(val) : "";
    }

    public static List<Map<String, Object>> findMatchingUnits(
            List<QueryDocumentSnapshot> propertyUnits,
            String occupancyType,
            String roomTypeId
    ) {
        List<Map<String, Object>> matched = new ArrayList<>();
        if (propertyUnits == null || propertyUnits.isEmpty()) {
            return matched;
        }

        String targetOcc = occupancyType != null ? occupancyType.trim().toLowerCase() : "";
        String targetRoomType = roomTypeId != null ? roomTypeId.trim().toLowerCase() : "";

        // Track rooms that have child beds under them; container parent rooms cannot be individual occupancy units
        Set<String> parentRoomIdsWithChildren = new HashSet<>();
        for (QueryDocumentSnapshot doc : propertyUnits) {
            Map<String, Object> data = doc.getData();
            if (data == null) continue;
            String pRoomId = safeString(data.get("parentRoomId")).trim();
            if (!pRoomId.isBlank()) {
                parentRoomIdsWithChildren.add(pRoomId);
            }
        }

        // First pass: explicit roomTypeId or occupancyType match on leaf units
        for (QueryDocumentSnapshot doc : propertyUnits) {
            Map<String, Object> data = doc.getData();
            if (data == null) continue;
            if ("inactive".equalsIgnoreCase(safeString(data.get("status")).trim())) continue;

            String docId = doc.getId();
            String dataId = safeString(data.get("id")).trim();
            String dataUnitId = safeString(data.get("inventoryUnitId")).trim();
            if (parentRoomIdsWithChildren.contains(docId)
                    || (!dataId.isBlank() && parentRoomIdsWithChildren.contains(dataId))
                    || (!dataUnitId.isBlank() && parentRoomIdsWithChildren.contains(dataUnitId))) {
                // Skip parent room containers that have child beds
                continue;
            }

            String uOcc = safeString(data.get("occupancyType")).trim().toLowerCase();
            String uRId = safeString(data.get("roomTypeId")).trim().toLowerCase();

            if (!targetRoomType.isBlank() && (targetRoomType.equals(uRId) || targetRoomType.equals(uOcc))) {
                matched.add(data);
            } else if (!targetOcc.isBlank() && (targetOcc.equals(uOcc) || targetOcc.equals(uRId))) {
                matched.add(data);
            }
        }

        if (!matched.isEmpty()) {
            return matched;
        }

        // Second pass: capacity match on discrete units (bed or room)
        Integer targetCapacity = null;
        if ("single".equals(targetOcc) || targetOcc.contains("single") || targetOcc.contains("1")) targetCapacity = 1;
        else if ("double".equals(targetOcc) || targetOcc.contains("double") || targetOcc.contains("2")) targetCapacity = 2;
        else if ("triple".equals(targetOcc) || targetOcc.contains("triple") || targetOcc.contains("3")) targetCapacity = 3;
        else if ("four_sharing".equals(targetOcc) || "four_plus".equals(targetOcc) || targetOcc.contains("four") || targetOcc.contains("4")) targetCapacity = 4;

        Map<String, Integer> roomCapacities = new HashMap<>();
        for (QueryDocumentSnapshot doc : propertyUnits) {
            Map<String, Object> data = doc.getData();
            if (data == null) continue;
            if ("room".equalsIgnoreCase(safeString(data.get("unitType")))) {
                int cap = 2;
                if (data.get("capacity") instanceof Number n) cap = n.intValue();
                roomCapacities.put(doc.getId(), cap);
            }
        }

        for (QueryDocumentSnapshot doc : propertyUnits) {
            Map<String, Object> data = doc.getData();
            if (data == null) continue;
            if ("inactive".equalsIgnoreCase(safeString(data.get("status")).trim())) continue;

            String uType = safeString(data.get("unitType")).trim().toLowerCase();
            String pRoomId = safeString(data.get("parentRoomId")).trim();
            int unitCap = data.get("capacity") instanceof Number n ? n.intValue() : 1;

            if ("bed".equals(uType)) {
                Integer pCap = !pRoomId.isBlank() ? roomCapacities.get(pRoomId) : null;
                if (targetCapacity != null && pCap != null && pCap.equals(targetCapacity)) {
                    matched.add(data);
                } else if (targetCapacity != null && unitCap == targetCapacity) {
                    matched.add(data);
                } else {
                    String uName = safeString(data.get("unitName")).toLowerCase();
                    if (!targetOcc.isBlank() && uName.contains(targetOcc)) {
                        matched.add(data);
                    }
                }
            } else if ("room".equals(uType)) {
                if (targetCapacity != null && unitCap == targetCapacity) {
                    matched.add(data);
                }
            }
        }

        // If still empty but discrete beds exist, fall back to active beds
        if (matched.isEmpty()) {
            for (QueryDocumentSnapshot doc : propertyUnits) {
                Map<String, Object> data = doc.getData();
                if (data != null && !"inactive".equalsIgnoreCase(safeString(data.get("status")).trim())) {
                    if ("bed".equalsIgnoreCase(safeString(data.get("unitType")))) {
                        matched.add(data);
                    }
                }
            }
        }

        return matched;
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null && longitude == null) {
            return;
        }
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Both latitude and longitude must be provided together");
        }
        if (!Double.isFinite(latitude) || latitude < -90.0 || latitude > 90.0) {
            throw new IllegalArgumentException("Latitude must be a valid number between -90 and 90 degrees");
        }
        if (!Double.isFinite(longitude) || longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Longitude must be a valid number between -180 and 180 degrees");
        }
    }

    private void sanitizeLocationForCaller(Map<String, Object> property, AuthenticatedUser user, String propertyId) {
        if (property == null) return;

        boolean isOwner = user != null && user.getUid() != null && user.getUid().equals(property.get("hostId"));
        boolean isAdmin = user != null && "admin".equalsIgnoreCase(user.getRole());
        boolean hasConfirmedBooking = false;

        if (user != null && !isOwner && !isAdmin && propertyId != null && !propertyId.isBlank()) {
            try {
                List<QueryDocumentSnapshot> confirmedBookings = bookingRepository.findByCustomerIdAndStatus(user.getUid(), "confirmed");
                hasConfirmedBooking = confirmedBookings != null && confirmedBookings.stream()
                        .anyMatch(b -> propertyId.equals(b.getString("propertyId")));
            } catch (Exception ignored) {}
        }

        if (isOwner || isAdmin || hasConfirmedBooking) {
            // Authorized caller retains exact street address and exact building coordinates
            property.put("isExactLocation", true);
        } else {
            // Unauthorized / public caller gets address and exact coordinates removed,
            // with deliberately approximate coordinates provided if listing has coordinates.
            LocationUtils.sanitizePublicLocation(property);
        }
    }

    private void validatePropertyType(
            String propertyType) {

        switch (propertyType.toLowerCase()) {

            case "house":
            case "flat":
            case "apartment":
            case "room":
            case "pg":
            case "hostel":
            case "hotel":
            case "bnb":
            case "vacationstay":
            case "vacation_stay":
                return;

            default:
                throw new RuntimeException(
                        "Invalid property type"
                );
        }
    }

    private void validateStayTypes(
            List<String> stayTypes) {

        for (String stayType : stayTypes) {

            if (stayType == null) {

                throw new RuntimeException(
                        "Invalid stay type"
                );
            }

            switch (stayType.toLowerCase()) {

                case "hourly":
                case "daily":
                case "monthly":
                    break;

                default:
                    throw new RuntimeException(
                            "Invalid stay type: "
                                    + stayType
                    );
            }
        }
    }

    private void validatePrices(
            PropertyRequest request) {

        if (request.getStayTypes()
                .stream()
                .anyMatch(
                        type -> "hourly"
                                .equalsIgnoreCase(type)
                )
                &&
                invalidPrice(
                        request.getHourlyPrice()
                )) {

            throw new RuntimeException(
                    "Hourly price is required"
            );
        }

        if (request.getStayTypes()
                .stream()
                .anyMatch(
                        type -> "daily"
                                .equalsIgnoreCase(type)
                )
                &&
                invalidPrice(
                        request.getDailyPrice()
                )) {

            throw new RuntimeException(
                    "Daily price is required"
            );
        }

        if (request.getStayTypes()
                .stream()
                .anyMatch(
                        type -> "monthly"
                                .equalsIgnoreCase(type)
                )
                &&
                invalidPrice(
                        request.getMonthlyPrice()
                )) {

            throw new RuntimeException(
                    "Monthly price is required"
            );
        }
    }

    private boolean invalidPrice(
            Double price) {

        return price == null || price < 0;
    }

    public Map<String, Object> updateProperty(
            AuthenticatedUser user,
            String propertyId,
            PropertyRequest request) {

        if (user == null) {
            throw new SecurityException("User authentication required");
        }

        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException("Property ID is required");
        }

        if (request == null) {
            throw new IllegalArgumentException("Property update request is required");
        }

        try {
            DocumentSnapshot existingDoc = propertyRepository.findById(propertyId.trim());
            if (!existingDoc.exists()) {
                throw new RuntimeException("Property not found");
            }

            Map<String, Object> existing = existingDoc.getData();
            if (existing == null) {
                throw new RuntimeException("Property data is empty");
            }

            String hostId = stringValue(existing.get("hostId"));
            boolean isOwner = user.getUid().equals(hostId);
            boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());

            if (!isOwner && !isAdmin) {
                throw new SecurityException("You do not have permission to edit this property");
            }

            // 1. Resolve Category and Property Type:
            String effectiveCategory = request.getCategory();
            if (effectiveCategory == null || effectiveCategory.isBlank()) {
                effectiveCategory = request.getPropertyType();
            }
            if (effectiveCategory == null || effectiveCategory.isBlank()) {
                effectiveCategory = stringValue(existing.get("category"));
            }
            if (effectiveCategory.isBlank()) {
                effectiveCategory = stringValue(existing.get("propertyType"));
            }
            if (effectiveCategory.isBlank()) {
                effectiveCategory = "bnb";
            }
            effectiveCategory = effectiveCategory.trim();

            // 2. Resolve Booking Type / Stay Model:
            String bookingType = request.getBookingType();
            if (bookingType == null || bookingType.isBlank()) {
                bookingType = request.getStayModel();
            }
            if (bookingType == null || bookingType.isBlank()) {
                bookingType = stringValue(existing.get("bookingType"));
            }
            if (bookingType == null || bookingType.isBlank()) {
                bookingType = stringValue(existing.get("stayModel"));
            }
            if (bookingType == null || bookingType.isBlank()) {
                Object stObj = existing.get("stayTypes");
                if (stObj instanceof List<?> list && !list.isEmpty()) {
                    bookingType = stringValue(list.get(0));
                }
            }
            if (bookingType == null || bookingType.isBlank()) {
                String catLower = effectiveCategory.toLowerCase();
                if ("pg".equals(catLower) || "flat".equals(catLower) || "apartment".equals(catLower) || "house".equals(catLower)) {
                    bookingType = "monthly";
                } else {
                    bookingType = "daily";
                }
            }
            bookingType = bookingType.trim().toLowerCase();

            // 3. Resolve Pricing:
            Double dailyPrice = request.getDailyPrice() != null ? request.getDailyPrice() : request.getPricePerNight();
            if (dailyPrice == null && "daily".equals(bookingType)) {
                dailyPrice = request.getPrice();
            }
            if (dailyPrice == null) {
                Object edp = existing.get("dailyPrice");
                if (edp == null) edp = existing.get("pricePerNight");
                if (edp instanceof Number n) dailyPrice = n.doubleValue();
            }

            Double monthlyPrice = request.getMonthlyPrice() != null ? request.getMonthlyPrice() : request.getPricePerMonth();
            if (monthlyPrice == null && "monthly".equals(bookingType)) {
                monthlyPrice = request.getPrice();
            }
            if (monthlyPrice == null) {
                Object emp = existing.get("monthlyPrice");
                if (emp == null) emp = existing.get("pricePerMonth");
                if (emp instanceof Number n) monthlyPrice = n.doubleValue();
            }

            Double hourlyPrice = request.getHourlyPrice() != null ? request.getHourlyPrice() : request.getPricePerHour();
            if (hourlyPrice == null && "hourly".equals(bookingType)) {
                hourlyPrice = request.getPrice();
            }
            if (hourlyPrice == null) {
                Object ehp = existing.get("hourlyPrice");
                if (ehp == null) ehp = existing.get("pricePerHour");
                if (ehp instanceof Number n) hourlyPrice = n.doubleValue();
            }

            double mainPrice = 0.0;
            if ("hourly".equals(bookingType) && hourlyPrice != null) {
                mainPrice = hourlyPrice;
            } else if ("monthly".equals(bookingType) && monthlyPrice != null) {
                mainPrice = monthlyPrice;
            } else if (dailyPrice != null) {
                mainPrice = dailyPrice;
            } else if (request.getPrice() != null && request.getPrice() > 0) {
                mainPrice = request.getPrice();
            } else {
                Object ep = existing.get("price");
                if (ep instanceof Number n) mainPrice = n.doubleValue();
            }

            // Validate coordinates if provided
            validateCoordinates(
                    request.getLatitude() != null ? request.getLatitude() : (existing.get("latitude") instanceof Number n ? n.doubleValue() : null),
                    request.getLongitude() != null ? request.getLongitude() : (existing.get("longitude") instanceof Number n ? n.doubleValue() : null)
            );

            // 4. Resolve Category-Specific Terms & Cleanups:
            String updateCat = effectiveCategory.toLowerCase();
            boolean isTransient = "hotel".equals(updateCat) || "bnb".equals(updateCat) || "vacationstay".equals(updateCat) || "vacation_stay".equals(updateCat) || "room".equals(updateCat);
            boolean isDailyHostel = "hostel".equals(updateCat) && "daily".equals(bookingType);
            boolean isFlat = "flat".equals(updateCat) || "apartment".equals(updateCat) || "house".equals(updateCat);

            String resolvedContractDuration = request.getContractDuration();
            Integer resolvedCustomDurationValue = request.getCustomDurationValue();
            String resolvedCustomDurationUnit = request.getCustomDurationUnit();
            Double resolvedMonthlyRentPerBed = request.getMonthlyRentPerBed();
            Double resolvedSecurityDeposit = request.getSecurityDeposit();
            Boolean resolvedDepositEnabled = request.getSecurityDepositEnabled();
            Integer resolvedNoticePeriodDays = request.getNoticePeriodDays();

            if (isTransient || isDailyHostel) {
                resolvedContractDuration = null;
                resolvedCustomDurationValue = null;
                resolvedCustomDurationUnit = null;
                resolvedMonthlyRentPerBed = null;
                if (isTransient) {
                    resolvedSecurityDeposit = null;
                    resolvedDepositEnabled = false;
                    resolvedNoticePeriodDays = null;
                }
            } else if (isFlat) {
                resolvedContractDuration = null;
                resolvedCustomDurationValue = null;
                resolvedCustomDurationUnit = null;
                resolvedMonthlyRentPerBed = null;
                if (resolvedDepositEnabled == null) {
                    resolvedDepositEnabled = Boolean.TRUE.equals(existing.get("securityDepositEnabled"));
                }
                if (resolvedDepositEnabled != null && !resolvedDepositEnabled) {
                    resolvedSecurityDeposit = null;
                } else if (resolvedSecurityDeposit == null && Boolean.TRUE.equals(resolvedDepositEnabled)) {
                    if (existing.get("securityDeposit") instanceof Number n) resolvedSecurityDeposit = n.doubleValue();
                }
                if (resolvedNoticePeriodDays == null && existing.get("noticePeriodDays") instanceof Number n) {
                    resolvedNoticePeriodDays = n.intValue();
                }
            } else {
                // PG or monthly Hostel
                if (resolvedContractDuration == null) {
                    resolvedContractDuration = stringValue(existing.get("contractDuration"));
                    if (resolvedCustomDurationValue == null && existing.get("customDurationValue") instanceof Number n) {
                        resolvedCustomDurationValue = n.intValue();
                    }
                    if (resolvedCustomDurationUnit == null) {
                        resolvedCustomDurationUnit = stringValue(existing.get("customDurationUnit"));
                    }
                }
                if (resolvedMonthlyRentPerBed == null) {
                    if (request.getOccupancyOptions() != null && !request.getOccupancyOptions().isEmpty()) {
                        Double minOptRent = null;
                        for (Map<String, Object> opt : request.getOccupancyOptions()) {
                            if (opt != null && opt.get("monthlyRentPerBed") instanceof Number num && num.doubleValue() > 0) {
                                if (minOptRent == null || num.doubleValue() < minOptRent) {
                                    minOptRent = num.doubleValue();
                                }
                            }
                        }
                        if (minOptRent != null) {
                            resolvedMonthlyRentPerBed = minOptRent;
                        }
                    }
                    if (resolvedMonthlyRentPerBed == null) {
                        if (request.getMonthlyPrice() != null && request.getMonthlyPrice() > 0) {
                            resolvedMonthlyRentPerBed = request.getMonthlyPrice();
                        } else if (request.getPrice() != null && request.getPrice() > 0) {
                            resolvedMonthlyRentPerBed = request.getPrice();
                        } else if (existing.get("monthlyRentPerBed") instanceof Number n) {
                            resolvedMonthlyRentPerBed = n.doubleValue();
                        } else if (monthlyPrice != null && monthlyPrice > 0) {
                            resolvedMonthlyRentPerBed = monthlyPrice;
                        } else if (mainPrice > 0) {
                            resolvedMonthlyRentPerBed = mainPrice;
                        }
                    }
                }
                if (resolvedDepositEnabled == null) {
                    resolvedDepositEnabled = Boolean.TRUE.equals(existing.get("securityDepositEnabled"));
                }
                if (resolvedDepositEnabled != null && !resolvedDepositEnabled) {
                    resolvedSecurityDeposit = null;
                } else if (resolvedSecurityDeposit == null && Boolean.TRUE.equals(resolvedDepositEnabled)) {
                    if (existing.get("securityDeposit") instanceof Number n) {
                        resolvedSecurityDeposit = n.doubleValue();
                    }
                }
                if (resolvedNoticePeriodDays == null && existing.get("noticePeriodDays") instanceof Number n) {
                    resolvedNoticePeriodDays = n.intValue();
                }
            }

            // Populate merged fields into a temporary request for validateCategoryTerms
            PropertyRequest mergedCheck = new PropertyRequest();
            mergedCheck.setCategory(effectiveCategory);
            mergedCheck.setPropertyType(effectiveCategory);
            mergedCheck.setBookingType(bookingType);
            mergedCheck.setStayModel(bookingType);
            List<String> stayTypes = request.getStayTypes();
            if (stayTypes == null || stayTypes.isEmpty()) {
                stayTypes = List.of(bookingType);
            }
            mergedCheck.setStayTypes(stayTypes);
            mergedCheck.setDailyPrice(dailyPrice);
            mergedCheck.setMonthlyPrice(monthlyPrice);
            mergedCheck.setHourlyPrice(hourlyPrice);
            mergedCheck.setPrice(mainPrice);
            mergedCheck.setContractDuration(resolvedContractDuration);
            mergedCheck.setCustomDurationValue(resolvedCustomDurationValue);
            mergedCheck.setCustomDurationUnit(resolvedCustomDurationUnit);
            mergedCheck.setMonthlyRentPerBed(resolvedMonthlyRentPerBed);
            mergedCheck.setSecurityDeposit(resolvedSecurityDeposit);
            mergedCheck.setSecurityDepositEnabled(resolvedDepositEnabled);
            mergedCheck.setNoticePeriodDays(resolvedNoticePeriodDays);
            mergedCheck.setOccupancyOptions(request.getOccupancyOptions());

            validateCategoryTerms(mergedCheck);

            // Build updates map starting with a shallow copy of existing fields
            Map<String, Object> updates = new HashMap<>(existing);

            // TITLE AND NAME: Save explicitly when provided, preserve existing when omitted
            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                updates.put("title", request.getTitle().trim());
                updates.put("name", request.getTitle().trim());
            }

            // DESCRIPTION: Save explicitly when provided, preserve existing when omitted
            if (request.getDescription() != null) {
                updates.put("description", request.getDescription().trim());
            }

            // CATEGORY AND PROPERTY TYPE
            updates.put("category", effectiveCategory);
            updates.put("propertyType", effectiveCategory);
            updates.put("bookingType", bookingType);
            updates.put("stayModel", bookingType);
            updates.put("stayTypes", stayTypes);

            // PRICING: Set non-null resolved prices
            if (dailyPrice != null) {
                updates.put("dailyPrice", dailyPrice);
                updates.put("pricePerNight", dailyPrice);
            }
            if (monthlyPrice != null) {
                updates.put("monthlyPrice", monthlyPrice);
                updates.put("pricePerMonth", monthlyPrice);
            }
            if (hourlyPrice != null) {
                updates.put("hourlyPrice", hourlyPrice);
                updates.put("pricePerHour", hourlyPrice);
            }
            if (mainPrice > 0) {
                updates.put("price", mainPrice);
            }

            // LOCATION AND ADDRESS
            if (request.getAddress() != null) {
                updates.put("address", request.getAddress().trim());
            }
            if (request.getCity() != null && !request.getCity().isBlank()) {
                updates.put("city", request.getCity().trim());
                updates.put("cityNormalized", LocationUtils.normalizeLocation(request.getCity()));
            }
            if (request.getArea() != null && !request.getArea().isBlank()) {
                updates.put("area", request.getArea().trim());
                updates.put("areaNormalized", LocationUtils.normalizeLocation(request.getArea()));
            }
            if (request.getLatitude() != null && request.getLongitude() != null) {
                updates.put("latitude", request.getLatitude());
                updates.put("longitude", request.getLongitude());
            }

            // BASIC ATTRIBUTES
            if (request.getBedrooms() != null) updates.put("bedrooms", request.getBedrooms());
            if (request.getBathrooms() != null) updates.put("bathrooms", request.getBathrooms());
            if (request.getFurnished() != null) updates.put("furnished", request.getFurnished());
            if (request.getAreaSqFt() != null) updates.put("areaSqFt", request.getAreaSqFt());
            if (request.getAmenities() != null) updates.put("amenities", request.getAmenities());
            if (request.getImages() != null) updates.put("images", request.getImages());

            // BNB attributes
            if (request.getSpaceType() != null) updates.put("spaceType", request.getSpaceType());
            if (request.getMaxGuests() != null) updates.put("maxGuests", request.getMaxGuests());
            if (request.getBedsCount() != null) updates.put("bedsCount", request.getBedsCount());
            if (request.getCheckInTime() != null) updates.put("checkInTime", request.getCheckInTime());
            if (request.getCheckOutTime() != null) updates.put("checkOutTime", request.getCheckOutTime());
            if (request.getHouseRules() != null) updates.put("houseRules", request.getHouseRules());

            // PG attributes
            if (request.getOccupancyType() != null) updates.put("occupancyType", request.getOccupancyType().trim().toLowerCase());
            if (request.getGenderCategory() != null) updates.put("genderCategory", request.getGenderCategory().trim().toLowerCase());
            if (request.getFoodIncluded() != null) {
                updates.put("foodIncluded", request.getFoodIncluded());
                if (Boolean.FALSE.equals(request.getFoodIncluded())) {
                    updates.put("foodOptions", new ArrayList<>());
                }
            }
            if (request.getFoodOptions() != null && !Boolean.FALSE.equals(request.getFoodIncluded())) {
                updates.put("foodOptions", request.getFoodOptions());
            }
            if (request.getGateClosingTime() != null) updates.put("gateClosingTime", request.getGateClosingTime());

            // Category-specific stay terms (PG, Hostel, Flat, Transient)
            updates.put("contractDuration", resolvedContractDuration);
            updates.put("customDurationValue", resolvedCustomDurationValue);
            updates.put("customDurationUnit", resolvedCustomDurationUnit);
            updates.put("monthlyRentPerBed", resolvedMonthlyRentPerBed);
            updates.put("securityDepositEnabled", resolvedDepositEnabled != null ? resolvedDepositEnabled : false);
            updates.put("securityDeposit", resolvedSecurityDeposit);
            updates.put("noticePeriodDays", resolvedNoticePeriodDays);

            // Occupancy options
            if (request.getOccupancyOptions() != null) {
                List<Map<String, Object>> normalized = validateAndNormalizeOccupancyOptions(request.getOccupancyOptions());
                updates.put("occupancyOptions", normalized);
                if (!normalized.isEmpty() && request.getMonthlyRentPerBed() == null) {
                    double minRent = normalized.stream()
                            .mapToDouble(o -> ((Number) o.get("monthlyRentPerBed")).doubleValue())
                            .min()
                            .orElse(0.0);
                    if (minRent > 0) {
                        updates.put("monthlyRentPerBed", minRent);
                    }
                }
            }

            // Hostel attributes
            if (request.getRoomType() != null) updates.put("roomType", request.getRoomType());
            if (request.getTotalBeds() != null) updates.put("totalBeds", request.getTotalBeds());
            if (request.getAvailableBeds() != null) updates.put("availableBeds", request.getAvailableBeds());
            if (request.getPriceModel() != null) updates.put("priceModel", request.getPriceModel());
            if (request.getStudentOrWorking() != null) updates.put("studentOrWorking", request.getStudentOrWorking());
            if (request.getSharedFacilities() != null) updates.put("sharedFacilities", request.getSharedFacilities());

            // Flat attributes
            if (request.getBhkConfig() != null) updates.put("bhkConfig", request.getBhkConfig());
            if (request.getMaintenanceCharges() != null) updates.put("maintenanceCharges", request.getMaintenanceCharges());
            if (request.getTenantPreference() != null) updates.put("tenantPreference", request.getTenantPreference());
            if (request.getFloorNumber() != null) updates.put("floorNumber", request.getFloorNumber());
            if (request.getTotalFloors() != null) updates.put("totalFloors", request.getTotalFloors());
            if (request.getParkingType() != null) updates.put("parkingType", request.getParkingType());

            // Hotel attributes
            if (request.getBedType() != null) updates.put("bedType", request.getBedType());
            if (request.getBreakfastIncluded() != null) updates.put("breakfastIncluded", request.getBreakfastIncluded());
            if (request.getCancellationPolicy() != null) updates.put("cancellationPolicy", request.getCancellationPolicy());

            updates.put("updatedAt", Timestamp.now());
            updates.put("id", propertyId.trim());
            updates.put("propertyId", propertyId.trim());

            propertyRepository.update(propertyId.trim(), updates);
            return updates;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Unable to update property", e);
        }
    }

    public Map<String, Object> deleteProperty(
            AuthenticatedUser user,
            String propertyId) {

        if (user == null) {
            throw new SecurityException("User authentication required");
        }

        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException("Property ID is required");
        }

        try {
            DocumentSnapshot existingDoc = propertyRepository.findById(propertyId.trim());
            if (!existingDoc.exists()) {
                throw new RuntimeException("Property not found");
            }

            Map<String, Object> existing = existingDoc.getData();
            if (existing == null) {
                throw new RuntimeException("Property data is empty");
            }

            String hostId = stringValue(existing.get("hostId"));
            boolean isOwner = user.getUid().equals(hostId);
            boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());

            if (!isOwner && !isAdmin) {
                throw new SecurityException("You do not have permission to delete this property");
            }

            propertyRepository.delete(propertyId.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Property deleted successfully");
            response.put("id", propertyId.trim());
            response.put("propertyId", propertyId.trim());
            return response;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Unable to delete property", e);
        }
    }

    private String stringValue(Object val) {
        return val != null ? val.toString() : "";
    }

    private double number(Object value) {
        if (value instanceof Number num) {
            return num.doubleValue();
        }
        if (value == null) {
            return 0.0;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0.0;
        }
    }

    private void enrichPropertyWithFallbacks(Map<String, Object> property) {
        if (property == null) return;

        // Ensure hostName is present and friendly
        if (property.get("hostName") == null || stringValue(property.get("hostName")).isBlank()) {
            String hostId = stringValue(property.get("hostId")).trim();
            if (!hostId.isBlank() && userRepository != null) {
                try {
                    DocumentSnapshot userDoc = userRepository.findById(hostId);
                    if (userDoc != null && userDoc.exists()) {
                        String name = userDoc.getString("name");
                        if (name == null || name.isBlank()) {
                            name = userDoc.getString("displayName");
                        }
                        if (name != null && !name.isBlank()) {
                            property.put("hostName", name);
                        }
                    }
                } catch (Exception ignored) {}
            }
            if (property.get("hostName") == null || stringValue(property.get("hostName")).isBlank()) {
                property.put("hostName", "StayTrack Verified Host");
            }
        }

        String type = stringValue(property.get("propertyType")).trim().toLowerCase();
        if (type.isBlank()) {
            type = stringValue(property.get("category")).trim().toLowerCase();
        }

        // BNB
        if ("bnb".equals(type) || "vacationstay".equals(type) || "vacation_stay".equals(type)) {
            if (property.get("spaceType") == null) property.put("spaceType", "Entire place");
            if (property.get("maxGuests") == null) {
                int beds = (int) number(property.get("bedrooms"));
                property.put("maxGuests", beds > 0 ? beds * 2 : 2);
            }
            if (property.get("bedsCount") == null) {
                int beds = (int) number(property.get("bedrooms"));
                property.put("bedsCount", beds > 0 ? beds : 1);
            }
            if (property.get("checkInTime") == null) property.put("checkInTime", "02:00 PM");
            if (property.get("checkOutTime") == null) property.put("checkOutTime", "11:00 AM");
        }

        // PG
        else if ("pg".equals(type)) {
            if (property.get("occupancyType") == null) {
                int beds = (int) number(property.get("bedrooms"));
                property.put("occupancyType", beds == 1 ? "single" : "double");
            }
            if (property.get("genderCategory") == null) property.put("genderCategory", "unisex");
            if (property.get("foodIncluded") == null) property.put("foodIncluded", false);
            if (property.get("gateClosingTime") == null) property.put("gateClosingTime", "10:30 PM");
            if (property.get("monthlyRentPerBed") == null && property.get("monthlyPrice") != null) {
                property.put("monthlyRentPerBed", property.get("monthlyPrice"));
            }
            if (property.get("securityDepositEnabled") == null) {
                property.put("securityDepositEnabled", property.get("securityDeposit") != null && number(property.get("securityDeposit")) > 0);
            }
        }

        // Hostel
        else if ("hostel".equals(type)) {
            if (property.get("roomType") == null) property.put("roomType", "Dormitory");
            if (property.get("totalBeds") == null) {
                int beds = (int) number(property.get("bedrooms"));
                property.put("totalBeds", beds > 0 ? beds : 4);
            }
            if (property.get("availableBeds") == null) {
                property.put("availableBeds", property.get("totalBeds"));
            }
            if (property.get("priceModel") == null) property.put("priceModel", "per_bed");
            if (property.get("studentOrWorking") == null) property.put("studentOrWorking", "open_to_all");
            if (property.get("monthlyRentPerBed") == null && property.get("monthlyPrice") != null) {
                property.put("monthlyRentPerBed", property.get("monthlyPrice"));
            }
            if (property.get("securityDepositEnabled") == null) {
                property.put("securityDepositEnabled", property.get("securityDeposit") != null && number(property.get("securityDeposit")) > 0);
            }
        }

        // Flat
        else if ("flat".equals(type) || "apartment".equals(type) || "house".equals(type)) {
            if (property.get("bhkConfig") == null) {
                int beds = (int) number(property.get("bedrooms"));
                property.put("bhkConfig", (beds > 0 ? beds : 1) + " BHK");
            }
            if (property.get("tenantPreference") == null) property.put("tenantPreference", "Any");
            if (property.get("parkingType") == null) property.put("parkingType", "Open");
            if (property.get("securityDepositEnabled") == null) {
                property.put("securityDepositEnabled", property.get("securityDeposit") != null && number(property.get("securityDeposit")) > 0);
            }
        }

        // Hotel
        else if ("hotel".equals(type) || "room".equals(type)) {
            if (property.get("roomType") == null) property.put("roomType", "Standard Room");
            if (property.get("bedType") == null) property.put("bedType", "Queen Bed");
            if (property.get("maxGuests") == null) property.put("maxGuests", 2);
            if (property.get("checkInTime") == null) property.put("checkInTime", "12:00 PM");
            if (property.get("checkOutTime") == null) property.put("checkOutTime", "11:00 AM");
            if (property.get("breakfastIncluded") == null) property.put("breakfastIncluded", false);
        }
    }
}