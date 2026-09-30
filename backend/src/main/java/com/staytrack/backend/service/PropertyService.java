package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;

import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.security.AuthenticatedUser;

import com.staytrack.backend.util.LocationUtils;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.staytrack.backend.repository.BookingRepository;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final SubscriptionService subscriptionService;
    private final BookingRepository bookingRepository;

    public PropertyService(
            PropertyRepository propertyRepository,
            SubscriptionService subscriptionService,
            BookingRepository bookingRepository) {

        this.propertyRepository = propertyRepository;
        this.subscriptionService = subscriptionService;
        this.bookingRepository = bookingRepository;
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
            List<QueryDocumentSnapshot> bookings = bookingRepository.findByPropertyId(propertyId.trim());
            java.time.LocalDate requestedStart = java.time.LocalDate.parse(startDate.trim());
            java.time.LocalDate requestedEnd = java.time.LocalDate.parse(endDate.trim());

            for (QueryDocumentSnapshot doc : bookings) {
                Map<String, Object> data = doc.getData();
                if (data == null) continue;

                String status = String.valueOf(data.getOrDefault("bookingStatus", "")).trim().toLowerCase();
                if (!java.util.Set.of("accepted", "payment_pending", "confirmed").contains(status)) {
                    continue;
                }

                String bStartStr = String.valueOf(data.getOrDefault("startDate", "")).trim();
                String bEndStr = String.valueOf(data.getOrDefault("endDate", "")).trim();
                if (bStartStr.isBlank() || bEndStr.isBlank()) continue;

                java.time.LocalDate bStart = java.time.LocalDate.parse(bStartStr);
                java.time.LocalDate bEnd = java.time.LocalDate.parse(bEndStr);

                boolean datesOverlap = requestedStart.isBefore(bEnd) && bStart.isBefore(requestedEnd);
                if (!datesOverlap) continue;

                if (!"hourly".equalsIgnoreCase(bookingType)) {
                    response.put("available", false);
                    response.put("reason", "Unavailable for selected dates");
                    return response;
                }

                if (requestedStart.equals(bStart)) {
                    String bStartTimeStr = String.valueOf(data.getOrDefault("startTime", "")).trim();
                    String bEndTimeStr = String.valueOf(data.getOrDefault("endTime", "")).trim();
                    if (!bStartTimeStr.isBlank() && !bEndTimeStr.isBlank() && startTime != null && !startTime.isBlank() && endTime != null && !endTime.isBlank()) {
                        java.time.LocalTime reqS = java.time.LocalTime.parse(startTime.trim());
                        java.time.LocalTime reqE = java.time.LocalTime.parse(endTime.trim());
                        java.time.LocalTime bS = java.time.LocalTime.parse(bStartTimeStr);
                        java.time.LocalTime bE = java.time.LocalTime.parse(bEndTimeStr);

                        if (reqS.isBefore(bE) && bS.isBefore(reqE)) {
                            response.put("available", false);
                            response.put("reason", "Unavailable for selected dates");
                            return response;
                        }
                    } else {
                        response.put("available", false);
                        response.put("reason", "Unavailable for selected dates");
                        return response;
                    }
                }
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
                    boolean isTop = isTrue(property.get("topVerified")) || isTrue(property.get("isTopVerified"));
                    if (isTop) {
                        property.put("id", document.getId());
                        property.put("propertyId", document.getId());
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
                    Object val = property.get("showInStay");
                    boolean isStay = val == null || isTrue(val) || isTrue(property.get("assignedToStay")) || isTrue(property.get("isStay"));
                    if (isStay) {
                        property.put("id", document.getId());
                        property.put("propertyId", document.getId());
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

        if (request.getPropertyType() == null ||
                request.getPropertyType().isBlank()) {

            throw new RuntimeException(
                    "Property type is required"
            );
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
                request.setStayTypes(List.of("daily"));
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

        validatePrices(request);
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

        validateProperty(request);

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

            String bookingType = request.getBookingType();
            if (bookingType == null || bookingType.isBlank()) {
                bookingType = request.getStayModel();
            }
            if (bookingType == null || bookingType.isBlank()) {
                bookingType = "daily";
            }
            bookingType = bookingType.trim().toLowerCase();

            Double dailyPrice = request.getDailyPrice() != null ? request.getDailyPrice() : request.getPricePerNight();
            Double monthlyPrice = request.getMonthlyPrice() != null ? request.getMonthlyPrice() : request.getPricePerMonth();
            Double hourlyPrice = request.getHourlyPrice() != null ? request.getHourlyPrice() : request.getPricePerHour();

            double mainPrice = 0.0;
            if ("hourly".equals(bookingType) && hourlyPrice != null) {
                mainPrice = hourlyPrice;
            } else if ("monthly".equals(bookingType) && monthlyPrice != null) {
                mainPrice = monthlyPrice;
            } else if (dailyPrice != null) {
                mainPrice = dailyPrice;
            } else if (request.getPrice() != null) {
                mainPrice = request.getPrice();
            }

            Map<String, Object> updates = new HashMap<>(existing);

            updates.put("title", request.getTitle().trim());
            updates.put("description", request.getDescription() != null ? request.getDescription().trim() : "");
            updates.put("category", request.getCategory() != null ? request.getCategory().trim() : "");
            updates.put("propertyType", request.getPropertyType().trim());
            updates.put("bookingType", bookingType);
            updates.put("stayModel", bookingType);
            updates.put("stayTypes", request.getStayTypes() != null ? request.getStayTypes() : List.of(bookingType));

            updates.put("dailyPrice", dailyPrice != null ? dailyPrice : 0.0);
            updates.put("monthlyPrice", monthlyPrice != null ? monthlyPrice : 0.0);
            updates.put("hourlyPrice", hourlyPrice != null ? hourlyPrice : 0.0);
            updates.put("pricePerNight", dailyPrice != null ? dailyPrice : 0.0);
            updates.put("pricePerMonth", monthlyPrice != null ? monthlyPrice : 0.0);
            updates.put("pricePerHour", hourlyPrice != null ? hourlyPrice : 0.0);
            updates.put("price", mainPrice);

            if (request.getAddress() != null) updates.put("address", request.getAddress().trim());
            if (request.getCity() != null) {
                updates.put("city", request.getCity().trim());
                updates.put("cityNormalized", LocationUtils.normalizeLocation(request.getCity()));
            }
            if (request.getArea() != null) {
                updates.put("area", request.getArea().trim());
                updates.put("areaNormalized", LocationUtils.normalizeLocation(request.getArea()));
            }
            if (request.getBedrooms() != null) updates.put("bedrooms", request.getBedrooms());
            if (request.getBathrooms() != null) updates.put("bathrooms", request.getBathrooms());
            if (request.getFurnished() != null) updates.put("furnished", request.getFurnished());
            if (request.getAreaSqFt() != null) updates.put("areaSqFt", request.getAreaSqFt());
            if (request.getAmenities() != null) updates.put("amenities", request.getAmenities());
            if (request.getImages() != null) updates.put("images", request.getImages());

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
}