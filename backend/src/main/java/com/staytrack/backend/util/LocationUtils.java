package com.staytrack.backend.util;

import java.text.Normalizer;
import java.util.Locale;

public class LocationUtils {

    /**
     * Canonical location normalization:
     * 1. Null/blank check -> returns ""
     * 2. Unicode NFKC normalization
     * 3. Trim leading and trailing whitespace
     * 4. Collapse multiple internal spaces into a single space
     * 5. Convert to lowercase using Locale.ROOT
     */
    public static String normalizeLocation(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC);
        return normalized.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    /**
     * Converts exact building coordinates to a deliberately approximate location (~700m - 1.2km offset).
     * The offset is deterministic per property ID to ensure a stable, non-jumping approximate map center,
     * while completely obscuring the exact building / rooftop coordinates from public callers.
     */
    public static double[] toApproximateCoordinates(String propertyId, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        int hash = (propertyId != null ? propertyId : "").hashCode();
        int angleDeg = Math.abs(hash % 360);
        double angleRad = Math.toRadians(angleDeg);
        // Offset by roughly ~700m - 1.2km (0.007 to 0.012 deg)
        double offsetRadius = 0.007 + (Math.abs(hash % 6) * 0.001);
        double approxLat = Math.round((latitude + Math.sin(angleRad) * offsetRadius) * 1000.0) / 1000.0;
        double approxLng = Math.round((longitude + Math.cos(angleRad) * offsetRadius) * 1000.0) / 1000.0;
        return new double[] { approxLat, approxLng };
    }

    /**
     * Strips exact location details (private street address, exact latitude, exact longitude, and all aliases)
     * and populates approximate coordinates if stored coordinates exist.
     */
    public static void sanitizePublicLocation(java.util.Map<String, Object> property) {
        if (property == null) return;

        String propId = property.get("propertyId") != null
                ? property.get("propertyId").toString()
                : (property.get("id") != null ? property.get("id").toString() : "");

        Double exactLat = property.get("latitude") instanceof Number ? ((Number) property.get("latitude")).doubleValue() : null;
        Double exactLng = property.get("longitude") instanceof Number ? ((Number) property.get("longitude")).doubleValue() : null;

        // Strip private street address
        property.remove("address");

        // Strip exact coordinates and all potential alias fields
        property.remove("latitude");
        property.remove("longitude");
        property.remove("lat");
        property.remove("lng");
        property.remove("coordinates");
        property.remove("exactCoordinates");
        property.remove("exactLocation");
        property.put("isExactLocation", false);

        // Populate deliberate approximate coordinates if listing has coordinates
        if (exactLat != null && exactLng != null) {
            double[] approx = toApproximateCoordinates(propId, exactLat, exactLng);
            if (approx != null) {
                property.put("approximateLatitude", approx[0]);
                property.put("approximateLongitude", approx[1]);
            }
        } else {
            property.remove("approximateLatitude");
            property.remove("approximateLongitude");
        }
    }
}
