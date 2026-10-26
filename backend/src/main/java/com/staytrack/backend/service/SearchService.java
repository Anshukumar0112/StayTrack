package com.staytrack.backend.service;

import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.search.SearchRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.util.BookingAvailabilityUtils;
import com.staytrack.backend.util.LocationUtils;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SearchService {

    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;

    public SearchService(
            PropertyRepository propertyRepository,
            BookingRepository bookingRepository
    ) {
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
    }

    public Map<String, Object> search(SearchRequest request) {
        if (request == null) {
            request = new SearchRequest();
        }

        validateRequest(request);

        try {
            List<QueryDocumentSnapshot> documents =
                    propertyRepository.findApprovedActive();

            List<Map<String, Object>> results =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> property =
                        document.getData();

                if (property == null) {
                    continue;
                }

                property = new HashMap<>(property);
                property.put("id", document.getId());
                property.put("propertyId", document.getId());

                if (!matches(property, request)) {
                    continue;
                }

                if (hasAvailabilityWindow(request)
                        && !isAvailable(property.get("propertyId").toString(), request)) {
                    continue;
                }

                if (hasCoordinates(request)) {
                    double distance = distanceKm(
                            request.getLatitude(),
                            request.getLongitude(),
                            number(property.get("latitude")),
                            number(property.get("longitude"))
                    );

                    if (request.getRadiusKm() != null
                            && distance > request.getRadiusKm()) {
                        continue;
                    }

                    property.put("distanceKm",
                            Math.round(distance * 100.0) / 100.0);
                }

                property.put(
                        "searchPrice",
                        priceFor(property, request.getBookingType())
                );

                LocationUtils.sanitizePublicLocation(property);

                results.add(property);
            }

            applySort(results, request);

            int total = results.size();

            int page = request.getPage();
            int pageSize = request.getPageSize();

            int from = Math.min(
                    (page - 1) * pageSize,
                    total
            );
            int to = Math.min(
                    from + pageSize,
                    total
            );

            List<Map<String, Object>> pageResults =
                    new ArrayList<>(
                            results.subList(from, to)
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put("results", pageResults);
            response.put("content", pageResults);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("totalResults", total);
            response.put(
                    "totalPages",
                    total == 0
                            ? 0
                            : (int) Math.ceil(
                                    total / (double) pageSize
                            )
            );

            return response;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to search properties",
                    e
            );
        }
    }

    private boolean matches(
            Map<String, Object> property,
            SearchRequest request
    ) {
        String reqCityNorm = LocationUtils.normalizeLocation(request.getCity());
        if (!reqCityNorm.isBlank()) {
            String propCityNorm = stringValue(property.get("cityNormalized"));
            if (propCityNorm.isBlank()) {
                propCityNorm = LocationUtils.normalizeLocation(stringValue(property.get("city")));
            }
            if (!propCityNorm.contains(reqCityNorm)) {
                return false;
            }
        }

        String reqAreaNorm = LocationUtils.normalizeLocation(request.getArea());
        if (!reqAreaNorm.isBlank()) {
            String propAreaNorm = stringValue(property.get("areaNormalized"));
            if (propAreaNorm.isBlank()) {
                propAreaNorm = LocationUtils.normalizeLocation(stringValue(property.get("area")));
            }
            if (!propAreaNorm.contains(reqAreaNorm)) {
                return false;
            }
        }

        if (!contains(property.get("propertyType"),
                request.getPropertyType())) {
            return false;
        }

        String bookingType = normalize(
                request.getBookingType()
        );

        if (!bookingType.isBlank()
                && !supportsStayType(
                property.get("stayTypes"),
                bookingType
        )) {
            return false;
        }

        if (!matchesPrice(property, request)) {
            return false;
        }

        if (!matchesIntegerRange(
                property.get("bedrooms"),
                request.getMinBedrooms(),
                request.getMaxBedrooms()
        )) {
            return false;
        }

        if (!matchesIntegerRange(
                property.get("bathrooms"),
                request.getMinBathrooms(),
                request.getMaxBathrooms()
        )) {
            return false;
        }

        if (request.getFurnished() != null
                && !request.getFurnished().equals(
                booleanValue(property.get("furnished"))
        )) {
            return false;
        }

        if (request.getBhkConfig() != null && !request.getBhkConfig().isBlank()) {
            String propBhk = stringValue(property.get("bhkConfig"));
            if (propBhk.isBlank() && property.get("bedrooms") != null) {
                propBhk = property.get("bedrooms") + " BHK";
            }
            if (!normalize(propBhk).equalsIgnoreCase(normalize(request.getBhkConfig()))) {
                return false;
            }
        }

        if (request.getOccupancyType() != null && !request.getOccupancyType().isBlank()) {
            String propOcc = stringValue(property.get("occupancyType"));
            if (!propOcc.isBlank() && !normalize(propOcc).equalsIgnoreCase(normalize(request.getOccupancyType()))) {
                return false;
            }
        }

        if (request.getGenderCategory() != null && !request.getGenderCategory().isBlank()) {
            String propGender = stringValue(property.get("genderCategory"));
            if (!propGender.isBlank()) {
                String reqG = normalize(request.getGenderCategory());
                String propG = normalize(propGender);
                if (!propG.equals("unisex") && !propG.equals("coliving") && !propG.equals(reqG)) {
                    return false;
                }
            }
        }

        if (request.getRoomType() != null && !request.getRoomType().isBlank()) {
            String propRoom = stringValue(property.get("roomType"));
            if (!propRoom.isBlank() && !normalize(propRoom).contains(normalize(request.getRoomType()))) {
                return false;
            }
        }

        if (request.getMaxGuests() != null && request.getMaxGuests() > 0) {
            double propGuests = number(property.get("maxGuests"));
            if (propGuests > 0 && propGuests < request.getMaxGuests()) {
                return false;
            }
        }

        if (request.getMinRating() != null
                && number(property.get("averageRating"))
                < request.getMinRating()) {
            return false;
        }

        if (!matchesAmenities(
                property.get("amenities"),
                request.getAmenities()
        )) {
            return false;
        }

        if (hasCoordinates(request)) {
            double latitude = number(
                    property.get("latitude")
            );
            double longitude = number(
                    property.get("longitude")
            );

            if (!validCoordinate(latitude, longitude)) {
                return false;
            }
        }

        String query =
                normalize(request.getQuery());

        if (!query.isBlank()) {
            String searchable =
                    normalize(
                            stringValue(property.get("title"))
                                    + " "
                                    + stringValue(property.get("description"))
                                    + " "
                                    + stringValue(property.get("city"))
                                    + " "
                                    + stringValue(property.get("area"))
                                    + " "
                                    + stringValue(property.get("propertyType"))
                    );

            if (!searchable.contains(query)) {
                return false;
            }
        }

        return true;
    }

    private boolean matchesPrice(
            Map<String, Object> property,
            SearchRequest request
    ) {
        Double min = request.getMinPrice();
        Double max = request.getMaxPrice();

        if (min == null && max == null) {
            return true;
        }

        double price =
                priceFor(
                        property,
                        request.getBookingType()
                );

        if (price <= 0) {
            return false;
        }

        return (min == null || price >= min)
                && (max == null || price <= max);
    }

    private double priceFor(
            Map<String, Object> property,
            String bookingType
    ) {
        String type = normalize(bookingType);

        if ("hourly".equals(type)) {
            return number(property.get("hourlyPrice"));
        }

        if ("daily".equals(type)) {
            return number(property.get("dailyPrice"));
        }

        if ("monthly".equals(type)) {
            return number(property.get("monthlyPrice"));
        }

        double hourly = number(property.get("hourlyPrice"));
        double daily = number(property.get("dailyPrice"));
        double monthly = number(property.get("monthlyPrice"));

        if (daily > 0) {
            return daily;
        }

        if (monthly > 0) {
            return monthly;
        }

        return hourly;
    }

    private boolean supportsStayType(
            Object stayTypes,
            String requested
    ) {
        if (!(stayTypes instanceof List<?> list)) {
            return false;
        }

        for (Object value : list) {
            if (requested.equals(
                    normalize(stringValue(value))
            )) {
                return true;
            }
        }

        return false;
    }

    private boolean matchesAmenities(
            Object propertyAmenities,
            List<String> requestedAmenities
    ) {
        if (requestedAmenities == null
                || requestedAmenities.isEmpty()) {
            return true;
        }

        if (!(propertyAmenities instanceof List<?> list)) {
            return false;
        }

        Set<String> actual =
                new HashSet<>();

        for (Object value : list) {
            actual.add(
                    normalize(stringValue(value))
            );
        }

        for (String requested : requestedAmenities) {
            if (requested == null
                    || requested.isBlank()) {
                continue;
            }

            if (!actual.contains(
                    normalize(requested)
            )) {
                return false;
            }
        }

        return true;
    }

    private boolean matchesIntegerRange(
            Object value,
            Integer min,
            Integer max
    ) {
        if (min == null && max == null) {
            return true;
        }

        int actual = (int) number(value);

        return (min == null || actual >= min)
                && (max == null || actual <= max);
    }

    private boolean isAvailable(
            String propertyId,
            SearchRequest request
    ) {
        String from = request.getAvailableFrom();
        String to = request.getAvailableTo();
        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            return true;
        }

        String startDate = from.contains("T") ? from.substring(0, from.indexOf('T')).trim() : from.trim();
        String endDate = to.contains("T") ? to.substring(0, to.indexOf('T')).trim() : to.trim();
        String startTime = from.contains("T") ? from.substring(from.indexOf('T') + 1).trim() : "";
        String endTime = to.contains("T") ? to.substring(to.indexOf('T') + 1).trim() : "";
        String bookingType = request.getBookingType();

        try {
            List<QueryDocumentSnapshot> bookings =
                    bookingRepository.findByPropertyId(
                            propertyId
                    );
            Instant now = Instant.now();

            for (QueryDocumentSnapshot booking : bookings) {
                Map<String, Object> data = booking.getData();
                if (data == null) {
                    continue;
                }

                if (BookingAvailabilityUtils.bookingConflicts(
                        bookingType,
                        startDate,
                        endDate,
                        startTime,
                        endTime,
                        data,
                        now
                )) {
                    return false;
                }
            }

            return true;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to check property availability",
                    e
            );
        }
    }

    private boolean datesOverlap(
            LocalDate requestedStart,
            LocalDate requestedEnd,
            LocalDate bookingStart,
            LocalDate bookingEnd
    ) {
        return !requestedEnd.isBefore(bookingStart)
                && !bookingEnd.isBefore(requestedStart);
    }

    private boolean timeWindowsOverlap(
            String requestedStart,
            String requestedEnd,
            String bookingStart,
            String bookingEnd
    ) {
        try {
            LocalTime rs =
                    LocalTime.parse(
                            requestedStart.trim()
                    );
            LocalTime re =
                    LocalTime.parse(
                            requestedEnd.trim()
                    );
            LocalTime bs =
                    LocalTime.parse(
                            bookingStart.trim()
                    );
            LocalTime be =
                    LocalTime.parse(
                            bookingEnd.trim()
                    );

            return rs.isBefore(be)
                    && bs.isBefore(re);

        } catch (DateTimeParseException e) {
            return true;
        }
    }

    private void applySort(
            List<Map<String, Object>> results,
            SearchRequest request
    ) {
        String sort =
                normalize(request.getSortBy());

        Comparator<Map<String, Object>> comparator;

        switch (sort) {
            case "price_asc":
                comparator = Comparator.comparingDouble(
                        item -> number(item.get("searchPrice"))
                );
                break;

            case "price_desc":
                comparator = Comparator.comparingDouble(
                        (Map<String, Object> item) ->
                                number(item.get("searchPrice"))
                ).reversed();
                break;

            case "rating_desc":
                comparator = Comparator.comparingDouble(
                        (Map<String, Object> item) ->
                                number(item.get("averageRating"))
                ).reversed();
                break;

            case "distance_asc":
                comparator = Comparator.comparingDouble(
                        (Map<String, Object> item) ->
                                number(item.get("distanceKm"))
                );
                break;

            case "newest":
                comparator = Comparator.comparing(
                        (Map<String, Object> item) ->
                                stringValue(item.get("createdAt"))
                ).reversed();
                break;

            default:
                /*
                 * Relevance is intentionally deterministic:
                 * rating first, then lower price.
                 */
                comparator = Comparator
                        .comparingDouble(
                                (Map<String, Object> item) ->
                                        number(
                                                item.get(
                                                        "averageRating"
                                                )
                                        )
                        )
                        .reversed()
                        .thenComparingDouble(
                                item -> number(
                                        item.get("searchPrice")
                                )
                        );
                break;
        }

        results.sort(comparator);
    }

    private void validateRequest(
            SearchRequest request
    ) {
        if (request.getPage() == null
                || request.getPage() < 1) {
            request.setPage(1);
        }

        if (request.getPageSize() == null
                || request.getPageSize() < 1) {
            request.setPageSize(20);
        }

        if (request.getPageSize() > 100) {
            request.setPageSize(100);
        }

        if (request.getMinPrice() != null
                && request.getMinPrice() < 0) {
            throw new IllegalArgumentException(
                    "Minimum price cannot be negative"
            );
        }

        if (request.getMaxPrice() != null
                && request.getMaxPrice() < 0) {
            throw new IllegalArgumentException(
                    "Maximum price cannot be negative"
            );
        }

        if (request.getMinPrice() != null
                && request.getMaxPrice() != null
                && request.getMinPrice()
                > request.getMaxPrice()) {
            throw new IllegalArgumentException(
                    "Minimum price cannot exceed maximum price"
            );
        }

        if (request.getMinRating() != null
                && (request.getMinRating() < 0
                || request.getMinRating() > 5)) {
            throw new IllegalArgumentException(
                    "Rating must be between 0 and 5"
            );
        }

        if (request.getRadiusKm() != null
                && request.getRadiusKm() <= 0) {
            throw new IllegalArgumentException(
                    "Radius must be greater than zero"
            );
        }

        if (hasCoordinates(request)
                && request.getRadiusKm() == null) {
            throw new IllegalArgumentException(
                    "Radius is required when latitude and longitude are provided"
            );
        }

        if (request.getAmenities() == null) {
            request.setAmenities(new ArrayList<>());
        }

        if (hasAvailabilityWindow(request)) {
            LocalDate start =
                    parseDate(request.getAvailableFrom());
            LocalDate end =
                    parseDate(request.getAvailableTo());

            if (end.isBefore(start)) {
                throw new IllegalArgumentException(
                        "Available-to cannot be before available-from"
                );
            }
        }
    }

    private boolean hasAvailabilityWindow(
            SearchRequest request
    ) {
        return request.getAvailableFrom() != null
                && !request.getAvailableFrom().isBlank()
                && request.getAvailableTo() != null
                && !request.getAvailableTo().isBlank();
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    "Availability dates are required"
            );
        }

        String date =
                value.contains("T")
                        ? value.substring(
                                0,
                                value.indexOf('T')
                        )
                        : value;

        try {
            return LocalDate.parse(
                    date.trim()
            );
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "Availability date must use YYYY-MM-DD format"
            );
        }
    }

    private boolean hasCoordinates(
            SearchRequest request
    ) {
        return request.getLatitude() != null
                && request.getLongitude() != null;
    }

    private boolean validCoordinate(
            double latitude,
            double longitude
    ) {
        return latitude >= -90
                && latitude <= 90
                && longitude >= -180
                && longitude <= 180;
    }

    private double distanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {
        double earthRadius = 6371.0;

        double dLat =
                Math.toRadians(lat2 - lat1);
        double dLon =
                Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(dLat / 2)
                        * Math.sin(dLat / 2)
                        + Math.cos(
                        Math.toRadians(lat1)
                )
                        * Math.cos(
                        Math.toRadians(lat2)
                )
                        * Math.sin(dLon / 2)
                        * Math.sin(dLon / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return earthRadius * c;
    }

    private boolean contains(
            Object actual,
            String requested
    ) {
        if (requested == null
                || requested.isBlank()) {
            return true;
        }

        return normalize(
                stringValue(actual)
        ).contains(
                normalize(requested)
        );
    }

    private double number(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }

        if (value == null) {
            return 0.0;
        }

        try {
            return Double.parseDouble(
                    String.valueOf(value)
            );
        } catch (Exception e) {
            return 0.0;
        }
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        return Boolean.parseBoolean(
                String.valueOf(value)
        );
    }

    private String stringValue(Object value) {
        return value == null
                ? ""
                : String.valueOf(value);
    }

    private String normalize(String value) {
        return LocationUtils.normalizeLocation(value);
    }
}
