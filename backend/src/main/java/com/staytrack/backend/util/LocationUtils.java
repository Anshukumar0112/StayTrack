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
}
