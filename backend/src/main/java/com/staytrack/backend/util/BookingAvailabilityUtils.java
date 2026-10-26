package com.staytrack.backend.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.Map;
import java.util.Set;

import com.google.cloud.Timestamp;

public final class BookingAvailabilityUtils {

    // 24 hours for host response
    public static final long HOST_REQUEST_HOLD_MILLIS = 24L * 60L * 60L * 1000L;

    // 30 minutes for guest payment
    public static final long PAYMENT_HOLD_MILLIS = 30L * 60L * 1000L;

    private static final Set<String> TERMINAL_NON_BLOCKING_STATUSES = Set.of(
            "rejected",
            "cancelled",
            "expired",
            "completed",
            "refunded"
    );

    private BookingAvailabilityUtils() {
    }

    /**
     * Extracts an Instant from various timestamp representation formats
     * stored in Firestore (Timestamp, Number epoch millis, Date, ISO-8601 String).
     */
    public static Instant extractInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp ts) {
            return ts.toDate().toInstant();
        }
        if (value instanceof Number num) {
            return Instant.ofEpochMilli(num.longValue());
        }
        if (value instanceof Date date) {
            return date.toInstant();
        }
        if (value instanceof String str && !str.isBlank()) {
            try {
                return Instant.parse(str.trim());
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    /**
     * Checks if a booking's temporary hold window has expired.
     */
    public static boolean isHoldExpired(Map<String, Object> booking, Instant now) {
        if (booking == null) {
            return false;
        }

        String status = String.valueOf(booking.getOrDefault("bookingStatus", "")).trim().toLowerCase();
        if (status.isBlank() && booking.containsKey("status")) {
            status = String.valueOf(booking.get("status")).trim().toLowerCase();
        }

        if ("expired".equals(status)) {
            return true;
        }

        // Only "requested", "accepted", and "payment_pending" are subject to hold expiration
        if (!"requested".equals(status) && !"accepted".equals(status) && !"payment_pending".equals(status)) {
            return false;
        }

        Instant holdExpiresAt = extractInstant(booking.get("holdExpiresAt"));
        if (holdExpiresAt != null) {
            return now.isAfter(holdExpiresAt);
        }

        // Fallback calculation if holdExpiresAt was not explicitly saved
        if ("requested".equals(status)) {
            Instant created = extractInstant(booking.get("createdAt"));
            if (created != null) {
                return now.isAfter(created.plusMillis(HOST_REQUEST_HOLD_MILLIS));
            }
        } else {
            // "accepted" or "payment_pending"
            Instant updated = extractInstant(booking.get("updatedAt"));
            if (updated == null) {
                updated = extractInstant(booking.get("createdAt"));
            }
            if (updated != null) {
                return now.isAfter(updated.plusMillis(PAYMENT_HOLD_MILLIS));
            }
        }

        return false;
    }

    /**
     * Determines whether an existing booking actively blocks calendar inventory.
     */
    public static boolean isBlocking(Map<String, Object> booking, Instant now) {
        if (booking == null) {
            return false;
        }

        String status = String.valueOf(booking.getOrDefault("bookingStatus", "")).trim().toLowerCase();
        if (status.isBlank() && booking.containsKey("status")) {
            status = String.valueOf(booking.get("status")).trim().toLowerCase();
        }

        if (TERMINAL_NON_BLOCKING_STATUSES.contains(status)) {
            return false;
        }

        String paymentStatus = String.valueOf(booking.getOrDefault("paymentStatus", "")).trim().toLowerCase();
        if ("failed".equals(paymentStatus) && ("payment_pending".equals(status) || "accepted".equals(status))) {
            return false;
        }

        if ("confirmed".equals(status)) {
            return true;
        }

        if ("requested".equals(status) || "accepted".equals(status) || "payment_pending".equals(status)) {
            return !isHoldExpired(booking, now);
        }

        return false;
    }

    /**
     * Checks if checkout-style date intervals overlap.
     * Checkout day does not conflict with new check-in day.
     * E.g.: [2026-10-01, 2026-10-05] and [2026-10-05, 2026-10-08] do NOT overlap.
     */
    public static boolean dateRangesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        if (requestedStart == null || requestedStart.isBlank()
                || requestedEnd == null || requestedEnd.isBlank()
                || existingStart == null || existingStart.isBlank()
                || existingEnd == null || existingEnd.isBlank()) {
            return false;
        }

        try {
            LocalDate reqStart = LocalDate.parse(requestedStart.trim());
            LocalDate reqEnd = LocalDate.parse(requestedEnd.trim());
            LocalDate extStart = LocalDate.parse(existingStart.trim());
            LocalDate extEnd = LocalDate.parse(existingEnd.trim());

            return reqStart.isBefore(extEnd) && extStart.isBefore(reqEnd);
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    /**
     * Checks if time intervals overlap for hourly stays.
     */
    public static boolean timesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        if (requestedStart == null || requestedStart.isBlank()
                || requestedEnd == null || requestedEnd.isBlank()
                || existingStart == null || existingStart.isBlank()
                || existingEnd == null || existingEnd.isBlank()) {
            // Missing time info is treated as conflicting to prevent unsafe collision
            return true;
        }

        try {
            LocalTime reqStart = LocalTime.parse(requestedStart.trim());
            LocalTime reqEnd = LocalTime.parse(requestedEnd.trim());
            LocalTime extStart = LocalTime.parse(existingStart.trim());
            LocalTime extEnd = LocalTime.parse(existingEnd.trim());

            return reqStart.isBefore(extEnd) && extStart.isBefore(reqEnd);
        } catch (DateTimeParseException e) {
            return true;
        }
    }

    /**
     * Checks whether an existing booking blocks and overlaps in date and time window.
     */
    public static boolean datesAndTimesOverlap(
            String requestedBookingType,
            String requestedStart,
            String requestedEnd,
            String requestedStartTime,
            String requestedEndTime,
            Map<String, Object> existingBooking,
            Instant now
    ) {
        if (!isBlocking(existingBooking, now)) {
            return false;
        }

        String existingStart = String.valueOf(existingBooking.getOrDefault("startDate", "")).trim();
        String existingEnd = String.valueOf(existingBooking.getOrDefault("endDate", "")).trim();
        if (existingStart.isBlank() || existingEnd.isBlank()) {
            return false;
        }

        if (!dateRangesOverlap(requestedStart, requestedEnd, existingStart, existingEnd)) {
            return false;
        }

        // Daily / Monthly booking conflicts with any overlapping active booking
        if (!"hourly".equalsIgnoreCase(requestedBookingType)) {
            return true;
        }

        // Hourly booking: only conflicts if on the exact same date and times overlap
        if (!requestedStart.trim().equals(existingStart)) {
            return false;
        }

        String existingStartTime = String.valueOf(existingBooking.getOrDefault("startTime", "")).trim();
        String existingEndTime = String.valueOf(existingBooking.getOrDefault("endTime", "")).trim();

        return timesOverlap(requestedStartTime, requestedEndTime, existingStartTime, existingEndTime);
    }

    /**
     * Checks whether an overlapping active booking conflicts at the inventory unit level.
     * Evaluates whole-property bookings, discrete beds/rooms, and parent room / child bed hierarchies.
     */
    public static boolean unitConflicts(
            String requestedUnitId,
            String requestedUnitType,
            String requestedParentRoomId,
            Map<String, Object> existingBooking
    ) {
        String existingUnitId = existingBooking.get("inventoryUnitId") != null
                ? String.valueOf(existingBooking.get("inventoryUnitId")).trim()
                : "";
        String existingUnitType = existingBooking.get("unitType") != null
                ? String.valueOf(existingBooking.get("unitType")).trim()
                : "";
        String existingParentRoomId = existingBooking.get("parentRoomId") != null
                ? String.valueOf(existingBooking.get("parentRoomId")).trim()
                : "";

        // Whole property collisions:
        // If either requested booking or existing active booking has no inventoryUnitId,
        // it locks or collides with the entire property.
        if (requestedUnitId == null || requestedUnitId.isBlank() || existingUnitId.isBlank()) {
            return true;
        }

        // Room-type aggregate capacity is evaluated by counting total overlapping bookings
        if ("room_type".equalsIgnoreCase(requestedUnitType) || "room_type".equalsIgnoreCase(existingUnitType)) {
            return false;
        }

        // 1. Same discrete unit (bed or room) booked twice
        if (requestedUnitId.equalsIgnoreCase(existingUnitId)) {
            return true;
        }

        // 2. Hierarchy conflict: Requested unit is a whole room, and an existing booking is for a bed in this room
        if ("room".equalsIgnoreCase(requestedUnitType)
                && !existingParentRoomId.isBlank()
                && requestedUnitId.equalsIgnoreCase(existingParentRoomId)) {
            return true;
        }

        // 3. Hierarchy conflict: Requested unit is a bed, and an existing booking is for its parent room
        if ("bed".equalsIgnoreCase(requestedUnitType)
                && requestedParentRoomId != null
                && !requestedParentRoomId.isBlank()
                && requestedParentRoomId.equalsIgnoreCase(existingUnitId)) {
            return true;
        }

        // Distinct units (e.g. 2 different beds in same or different rooms, or 2 different rooms)
        return false;
    }

    /**
     * Comprehensive booking conflict check evaluating inventory blocking status,
     * hold expiration, date range overlap, and hourly time window overlap.
     */
    public static boolean bookingConflicts(
            String requestedBookingType,
            String requestedStart,
            String requestedEnd,
            String requestedStartTime,
            String requestedEndTime,
            Map<String, Object> existingBooking,
            Instant now
    ) {
        return bookingConflicts(
                requestedBookingType,
                requestedStart,
                requestedEnd,
                requestedStartTime,
                requestedEndTime,
                null,
                null,
                null,
                existingBooking,
                now
        );
    }

    /**
     * Comprehensive booking conflict check evaluating inventory unit and hierarchy conflicts.
     */
    public static boolean bookingConflicts(
            String requestedBookingType,
            String requestedStart,
            String requestedEnd,
            String requestedStartTime,
            String requestedEndTime,
            String requestedUnitId,
            String requestedUnitType,
            String requestedParentRoomId,
            Map<String, Object> existingBooking,
            Instant now
    ) {
        if (!datesAndTimesOverlap(
                requestedBookingType,
                requestedStart,
                requestedEnd,
                requestedStartTime,
                requestedEndTime,
                existingBooking,
                now
        )) {
            return false;
        }

        return unitConflicts(
                requestedUnitId,
                requestedUnitType,
                requestedParentRoomId,
                existingBooking
        );
    }
}