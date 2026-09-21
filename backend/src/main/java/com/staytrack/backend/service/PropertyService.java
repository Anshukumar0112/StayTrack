package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;

import com.staytrack.backend.dto.property.PropertyRequest;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.security.AuthenticatedUser;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final SubscriptionService subscriptionService;

    public PropertyService(
            PropertyRepository propertyRepository,
            SubscriptionService subscriptionService) {

        this.propertyRepository = propertyRepository;
        this.subscriptionService = subscriptionService;
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
         * A host must have an active subscription before
         * creating a property listing.
         *
         * The subscription status is determined by the
         * backend and cannot be supplied by the client.
         */
        if (!subscriptionService.hasActiveSubscription(
                user.getUid())) {

            throw new RuntimeException(
                    "An active subscription is required to create a property listing"
            );
        }

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

        property.put(
                "address",
                request.getAddress()
        );

        property.put(
                "city",
                request.getCity()
        );

        property.put(
                "area",
                request.getArea()
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

    public List<Map<String, Object>> getPublicProperties() {

        try {

            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findApprovedActive();

            List<Map<String, Object>> properties =
                    new ArrayList<>();

            for (DocumentSnapshot document :
                    documents) {

                Map<String, Object> property =
                        document.getData();

                if (property != null) {

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
                    "Unable to get properties",
                    e
            );
        }
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
}