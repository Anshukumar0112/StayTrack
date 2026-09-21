package com.staytrack.backend.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;
import com.staytrack.backend.dto.ai.AiSearchRequest;
import com.staytrack.backend.dto.search.SearchRequest;

@Service
public class AiService {

    private static final String DEFAULT_MODEL = "gemini-3.8-flash";

    private static final int MAX_RETRIES = 3;

    private static final long INITIAL_RETRY_DELAY_MS = 1000L;

    private final ObjectMapper objectMapper;
    private final SearchService searchService;

    public AiService(
            ObjectMapper objectMapper,
            SearchService searchService
    ) {
        this.objectMapper = objectMapper;
        this.searchService = searchService;
    }

    public Map<String, Object> naturalLanguageSearch(
            AiSearchRequest request
    ) {

        if (request == null
                || request.getQuery() == null
                || request.getQuery().trim().isBlank()) {

            throw new IllegalArgumentException(
                    "Search query is required"
            );
        }

        String query = request.getQuery().trim();

        if (query.length() > 1000) {
            throw new IllegalArgumentException(
                    "Search query must not exceed 1000 characters"
            );
        }

        AiSettings settings = loadSettings();

        if (!settings.enabled()) {
            throw new IllegalStateException(
                    "AI search is currently disabled"
            );
        }

        if (!"gemini".equalsIgnoreCase(settings.provider())) {
            throw new IllegalStateException(
                    "Unsupported AI provider: " + settings.provider()
            );
        }

        if (settings.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY is not configured"
            );
        }

        try {

            SearchRequest filters = extractFilters(
                    query,
                    settings
            );

            Map<String, Object> searchResults =
                    searchService.search(filters);

            Map<String, Object> response =
                    new LinkedHashMap<>();

            response.put("query", query);

            response.put(
                    "filters",
                    filtersToMap(filters)
            );

            response.put(
                    "results",
                    searchResults.get("results")
            );

            response.put(
                    "page",
                    searchResults.get("page")
            );

            response.put(
                    "pageSize",
                    searchResults.get("pageSize")
            );

            response.put(
                    "totalResults",
                    searchResults.get("totalResults")
            );

            response.put(
                    "totalPages",
                    searchResults.get("totalPages")
            );

            return response;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "AI search request was interrupted",
                    e
            );


        } catch (Exception e) {

            e.printStackTrace();

            throw new RuntimeException(
                    "AI search request failed: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage(),
                    e
            );
        }
    }

    private SearchRequest extractFilters(
            String query,
            AiSettings settings
    ) throws Exception {

        Client client = Client.builder()
                .apiKey(settings.apiKey())
                .build();

        String systemPrompt = buildSystemPrompt();

        GenerateContentConfig config =
                GenerateContentConfig.builder()
                        .systemInstruction(
                                com.google.genai.types.Content.fromParts(
                                        com.google.genai.types.Part.fromText(
                                                systemPrompt
                                        )
                                )
                        )
                        .responseMimeType(
                                "application/json"
                        )
                        .candidateCount(1)
                        .maxOutputTokens(1024)
                        .responseSchema(
                                searchSchema()
                        )
                        .build();

        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {

            try {

                GenerateContentResponse response =
                        client.models.generateContent(
                                settings.model(),
                                query,
                                config
                        );

                String output = response.text();

                if (output == null || output.isBlank()) {
                    throw new IllegalStateException(
                            "Gemini returned no structured search result"
                    );
                }

                SearchRequest filters =
                        objectMapper.readValue(
                                output,
                                SearchRequest.class
                        );

                validateAndNormalizeFilters(filters);

                return filters;

            } catch (Exception e) {

                lastException = e;

                if (!isTransientGeminiError(e)
                        || attempt >= MAX_RETRIES) {

                    throw e;
                }

                long delay =
                        INITIAL_RETRY_DELAY_MS
                                * (1L << (attempt - 1));

                System.err.println(
                        "Gemini temporary failure on attempt "
                                + attempt
                                + "/"
                                + MAX_RETRIES
                                + ". Retrying in "
                                + delay
                                + " ms."
                );

                try {
                    Thread.sleep(delay);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    throw interruptedException;
                }
            }
        }

        throw lastException != null
                ? lastException
                : new IllegalStateException(
                        "Gemini request failed"
                );
    }

    private boolean isTransientGeminiError(
            Exception exception
    ) {

        Throwable current = exception;

        while (current != null) {

            String message = current.getMessage();

            if (message != null) {

                String normalized =
                        message.toUpperCase();

                if (normalized.contains("503")
                        || normalized.contains("UNAVAILABLE")
                        || normalized.contains("429")
                        || normalized.contains("RESOURCE_EXHAUSTED")
                        || normalized.contains("TOO MANY REQUESTS")
                        || normalized.contains("SERVICE UNAVAILABLE")) {

                    return true;
                }
            }

            current = current.getCause();
        }

        return false;
    }

    private Schema searchSchema() {

        Map<String, Schema> properties =
                new LinkedHashMap<>();

        Schema nullableString =
                Schema.builder()
                        .type(Type.Known.STRING)
                        .nullable(true)
                        .build();

        Schema nullableNumber =
                Schema.builder()
                        .type(Type.Known.NUMBER)
                        .nullable(true)
                        .build();

        Schema nullableInteger =
                Schema.builder()
                        .type(Type.Known.INTEGER)
                        .nullable(true)
                        .build();

        Schema nullableBoolean =
                Schema.builder()
                        .type(Type.Known.BOOLEAN)
                        .nullable(true)
                        .build();

        Schema string =
                Schema.builder()
                        .type(Type.Known.STRING)
                        .build();

        Schema integer =
                Schema.builder()
                        .type(Type.Known.INTEGER)
                        .build();

        Schema amenities =
                Schema.builder()
                        .type(Type.Known.ARRAY)
                        .items(string)
                        .build();

        properties.put("query", nullableString);
        properties.put("city", nullableString);
        properties.put("area", nullableString);
        properties.put("propertyType", nullableString);
        properties.put("bookingType", nullableString);
        properties.put("minPrice", nullableNumber);
        properties.put("maxPrice", nullableNumber);
        properties.put("minBedrooms", nullableInteger);
        properties.put("maxBedrooms", nullableInteger);
        properties.put("minBathrooms", nullableInteger);
        properties.put("maxBathrooms", nullableInteger);
        properties.put("furnished", nullableBoolean);
        properties.put("amenities", amenities);
        properties.put("minRating", nullableNumber);
        properties.put("availableFrom", nullableString);
        properties.put("availableTo", nullableString);
        properties.put("latitude", nullableNumber);
        properties.put("longitude", nullableNumber);
        properties.put("radiusKm", nullableNumber);
        properties.put("sortBy", string);
        properties.put("page", integer);
        properties.put("pageSize", integer);

        return Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(properties)
                .build();
    }

    private Map<String, Object> nullableStringSchema() {

        return Map.of(
                "type",
                List.of(
                        "string",
                        "null"
                )
        );
    }

    private Map<String, Object> nullableNumberSchema() {

        return Map.of(
                "type",
                List.of(
                        "number",
                        "null"
                )
        );
    }

    private Map<String, Object> nullableIntegerSchema() {

        return Map.of(
                "type",
                List.of(
                        "integer",
                        "null"
                )
        );
    }

    private Map<String, Object> nullableBooleanSchema() {

        return Map.of(
                "type",
                List.of(
                        "boolean",
                        "null"
                )
        );
    }

    private String buildSystemPrompt() {

        return """
                You are StayTrack's natural-language property search parser.

                Your job is ONLY to convert the user's property-search request
                into the supplied structured JSON search schema.

                Do NOT search the database.
                Do NOT invent properties.
                Do NOT invent prices.
                Do NOT invent availability.
                Do NOT invent ratings.
                Do NOT invent amenities.
                Do NOT invent coordinates.

                The application will perform the actual database search.

                Use null for filters that the user did not specify.

                Keep amenities as an empty array when the user did not
                request specific amenities.

                Normalize propertyType to one of:
                house, flat, apartment, room, pg, hostel, hotel, vacationstay.

                Normalize bookingType to one of:
                hourly, daily, monthly.

                Interpret:
                "1BHK" as minBedrooms=1 and maxBedrooms=1.
                "2BHK" as minBedrooms=2 and maxBedrooms=2.
                "3 bedroom" as minBedrooms=3 and maxBedrooms=3.

                Interpret:
                "under 15000" as maxPrice=15000.
                "below 15000" as maxPrice=15000.
                "less than 15000" as maxPrice=15000.

                Interpret:
                "above 10000" as minPrice=10000.
                "over 10000" as minPrice=10000.
                "more than 10000" as minPrice=10000.

                Interpret:
                "furnished" as furnished=true.
                "unfurnished" as furnished=false.

                Do not infer a price period unless the user
                explicitly specifies hourly, daily, or monthly.

                Preserve the user's requested city and area as accurately
                as possible.

                Do not add a location merely because it is common in Delhi NCR.

                The application, not the AI, performs the actual property search.
                """;
    }

    private void validateAndNormalizeFilters(
            SearchRequest filters
    ) {

        if (filters == null) {

            throw new IllegalArgumentException(
                    "Gemini returned empty search filters"
            );
        }

        filters.setPropertyType(
                normalizeNullable(
                        filters.getPropertyType()
                )
        );

        filters.setBookingType(
                normalizeNullable(
                        filters.getBookingType()
                )
        );

        if (filters.getPropertyType() != null) {

            filters.setPropertyType(
                    normalizePropertyType(
                            filters.getPropertyType()
                    )
            );
        }

        if (filters.getBookingType() != null) {

            String bookingType =
                    filters.getBookingType()
                            .trim()
                            .toLowerCase();

            if (!List.of(
                    "hourly",
                    "daily",
                    "monthly"
            ).contains(bookingType)) {

                filters.setBookingType(null);

            } else {

                filters.setBookingType(
                        bookingType
                );
            }
        }

        if (filters.getMinPrice() != null
                && filters.getMinPrice() < 0) {

            filters.setMinPrice(null);
        }

        if (filters.getMaxPrice() != null
                && filters.getMaxPrice() < 0) {

            filters.setMaxPrice(null);
        }

        if (filters.getMinBedrooms() != null
                && filters.getMinBedrooms() < 0) {

            filters.setMinBedrooms(null);
        }

        if (filters.getMaxBedrooms() != null
                && filters.getMaxBedrooms() < 0) {

            filters.setMaxBedrooms(null);
        }

        if (filters.getMinBathrooms() != null
                && filters.getMinBathrooms() < 0) {

            filters.setMinBathrooms(null);
        }

        if (filters.getMaxBathrooms() != null
                && filters.getMaxBathrooms() < 0) {

            filters.setMaxBathrooms(null);
        }

        if (filters.getMinRating() != null) {

            filters.setMinRating(
                    Math.max(
                            0.0,
                            Math.min(
                                    5.0,
                                    filters.getMinRating()
                            )
                    )
            );
        }

        if (filters.getRadiusKm() != null
                && filters.getRadiusKm() < 0) {

            filters.setRadiusKm(null);
        }

        filters.setPage(1);
        filters.setPageSize(20);

        if (filters.getAmenities() == null) {

            filters.setAmenities(
                    new ArrayList<>()
            );
        }
    }

    private String normalizePropertyType(
            String value
    ) {

        String normalized =
                value.trim()
                        .toLowerCase()
                        .replace(" ", "")
                        .replace("-", "_");

        return switch (normalized) {

            case "house" ->
                    "house";

            case "flat" ->
                    "flat";

            case "apartment",
                 "apartments" ->
                    "apartment";

            case "room",
                 "rooms" ->
                    "room";

            case "pg" ->
                    "pg";

            case "hostel",
                 "hostels" ->
                    "hostel";

            case "hotel",
                 "hotels" ->
                    "hotel";

            case "vacationstay",
                 "vacation_stay" ->
                    "vacationstay";

            default ->
                    null;
        };
    }

    private String normalizeNullable(
            String value
    ) {

        if (value == null
                || value.trim().isBlank()) {

            return null;
        }

        return value.trim();
    }

    private Map<String, Object> filtersToMap(
            SearchRequest filters
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "query",
                filters.getQuery()
        );

        map.put(
                "city",
                filters.getCity()
        );

        map.put(
                "area",
                filters.getArea()
        );

        map.put(
                "propertyType",
                filters.getPropertyType()
        );

        map.put(
                "bookingType",
                filters.getBookingType()
        );

        map.put(
                "minPrice",
                filters.getMinPrice()
        );

        map.put(
                "maxPrice",
                filters.getMaxPrice()
        );

        map.put(
                "minBedrooms",
                filters.getMinBedrooms()
        );

        map.put(
                "maxBedrooms",
                filters.getMaxBedrooms()
        );

        map.put(
                "minBathrooms",
                filters.getMinBathrooms()
        );

        map.put(
                "maxBathrooms",
                filters.getMaxBathrooms()
        );

        map.put(
                "furnished",
                filters.getFurnished()
        );

        map.put(
                "amenities",
                filters.getAmenities()
        );

        map.put(
                "minRating",
                filters.getMinRating()
        );

        map.put(
                "availableFrom",
                filters.getAvailableFrom()
        );

        map.put(
                "availableTo",
                filters.getAvailableTo()
        );

        map.put(
                "latitude",
                filters.getLatitude()
        );

        map.put(
                "longitude",
                filters.getLongitude()
        );

        map.put(
                "radiusKm",
                filters.getRadiusKm()
        );

        map.put(
                "sortBy",
                filters.getSortBy()
        );

        map.put(
                "page",
                filters.getPage()
        );

        map.put(
                "pageSize",
                filters.getPageSize()
        );

        return map;
    }

    private AiSettings loadSettings() {

        boolean enabled = true;

        String provider = "gemini";

        String model =
                System.getenv().getOrDefault(
                        "GEMINI_MODEL",
                        DEFAULT_MODEL
                );

        try {

            var document =
                    com.google.firebase.cloud.FirestoreClient
                            .getFirestore()
                            .collection("settings")
                            .document("ai")
                            .get()
                            .get();

            if (document.exists()) {

                Boolean storedEnabled =
                        document.getBoolean(
                                "enabled"
                        );

                String storedProvider =
                        document.getString(
                                "provider"
                        );

                String storedModel =
                        document.getString(
                                "model"
                        );

                if (storedEnabled != null) {

                    enabled =
                            storedEnabled;
                }

                if (storedProvider != null
                        && !storedProvider.isBlank()) {

                    provider =
                            storedProvider
                                    .trim()
                                    .toLowerCase();
                }

                if (storedModel != null
                        && !storedModel.isBlank()) {

                    model =
                            storedModel.trim();
                }
            }

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Unable to read AI settings",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to read AI settings",
                    e
            );
        }

        String apiKey =
                System.getenv().getOrDefault(
                        "GEMINI_API_KEY",
                        ""
                ).trim();

        return new AiSettings(
                enabled,
                provider,
                model,
                apiKey
        );
    }

    private record AiSettings(
            boolean enabled,
            String provider,
            String model,
            String apiKey
    ) {
    }
}