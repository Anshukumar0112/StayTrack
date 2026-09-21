package com.staytrack.backend.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final RefundService refundService;

    public BookingService(
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository,
            RefundService refundService
    ) {
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.refundService = refundService;
    }

    /*
     * CUSTOMER
     *
     * Creates a booking request.
     *
     * The amount is calculated entirely by the backend.
     * The customer cannot submit an amount.
     */
    public Map<String, Object> createBooking(
            AuthenticatedUser user,
            BookingRequest request
    ) {

        requireCustomer(user);
        validateRequest(request);

        try {

            /*
             * Load property.
             */
            DocumentSnapshot property =
                    propertyRepository.findById(
                            request.getPropertyId()
                    );

            if (!property.exists()) {
                throw new RuntimeException(
                        "Property not found"
                );
            }

            Map<String, Object> propertyData =
                    property.getData();

            if (propertyData == null) {
                throw new RuntimeException(
                        "Property data is empty"
                );
            }

            /*
             * Only approved and active properties can
             * receive booking requests.
             */
            String verificationStatus =
                    stringValue(
                            propertyData.get(
                                    "verificationStatus"
                            )
                    );

            String listingStatus =
                    stringValue(
                            propertyData.get(
                                    "listingStatus"
                            )
                    );

            if (!"approved".equalsIgnoreCase(
                    verificationStatus
            )
                    || !"active".equalsIgnoreCase(
                    listingStatus
            )) {

                throw new RuntimeException(
                        "Property is not available for booking"
                );
            }

            /*
             * Get host from the property.
             *
             * The customer never supplies hostId.
             */
            String hostId =
                    stringValue(
                            propertyData.get(
                                    "hostId"
                            )
                    );

            if (hostId.isBlank()) {
                throw new RuntimeException(
                        "Property host is missing"
                );
            }

            /*
             * A customer cannot book their own property.
             */
            if (hostId.equals(user.getUid())) {
                throw new SecurityException(
                        "You cannot book your own property"
                );
            }

            /*
             * Normalize booking type.
             */
            String bookingType =
                    request.getBookingType()
                            .trim()
                            .toLowerCase();

            /*
             * Verify that the property supports
             * the requested stay type.
             */
            validateStayType(
                    bookingType,
                    propertyData
            );

            /*
             * Parse and validate dates.
             */
            LocalDate startDate =
                    parseDate(
                            request.getStartDate(),
                            "Start date"
                    );

            LocalDate endDate =
                    parseDate(
                            request.getEndDate(),
                            "End date"
                    );

            validateDateRange(
                    startDate,
                    endDate
            );

            /*
             * Hourly bookings require valid times.
             */
            if ("hourly".equals(bookingType)) {

                validateHourlyTimes(
                        request
                );
            }

            /*
             * Calculate the amount entirely from
             * property pricing.
             *
             * The client cannot control this amount.
             */
            long amount =
                    calculateAmount(
                            bookingType,
                            startDate,
                            endDate,
                            request.getStartTime(),
                            request.getEndTime(),
                            propertyData
                    );

            /*
             * Generate StayTrack booking ID.
             */
            String bookingId =
                    UUID.randomUUID().toString();

            Timestamp now =
                    Timestamp.now();

            Map<String, Object> booking =
                    new HashMap<>();

            booking.put(
                    "bookingId",
                    bookingId
            );

            booking.put(
                    "propertyId",
                    request.getPropertyId().trim()
            );

            booking.put(
                    "customerId",
                    user.getUid()
            );

            booking.put(
                    "hostId",
                    hostId
            );

            booking.put(
                    "bookingType",
                    bookingType
            );

            booking.put(
                    "startDate",
                    request.getStartDate().trim()
            );

            booking.put(
                    "endDate",
                    request.getEndDate().trim()
            );

            booking.put(
                    "startTime",
                    request.getStartTime() != null
                            ? request.getStartTime().trim()
                            : ""
            );

            booking.put(
                    "endTime",
                    request.getEndTime() != null
                            ? request.getEndTime().trim()
                            : ""
            );

            /*
             * Amount is generated by StayTrack.
             */
            booking.put(
                    "amount",
                    amount
            );

            booking.put(
                    "paymentStatus",
                    "created"
            );

            booking.put(
                    "bookingStatus",
                    "requested"
            );

            booking.put(
                    "createdAt",
                    now
            );

            booking.put(
                    "updatedAt",
                    now
            );

            /*
             * IMPORTANT:
             *
             * Do NOT put latitude/longitude/city/area
             * into the booking.
             *
             * The booking references the property through
             * propertyId. The property's location remains
             * the source of truth.
             *
             * Atomic availability checking and booking
             * creation happen inside Firestore.
             */
            bookingRepository.createIfAvailable(
                    request.getPropertyId().trim(),
                    bookingId,
                    booking,
                    bookingType,
                    request.getStartDate().trim(),
                    request.getEndDate().trim(),
                    request.getStartTime() != null
                            ? request.getStartTime().trim()
                            : "",
                    request.getEndTime() != null
                            ? request.getEndTime().trim()
                            : ""
            );

            return booking;

        } catch (RuntimeException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create booking",
                    e
            );
        }
    }

    /*
     * CUSTOMER
     */
    public List<Map<String, Object>> getMyBookings(
            AuthenticatedUser user
    ) {

        requireCustomer(user);

        try {

            List<QueryDocumentSnapshot> documents =
                    bookingRepository.findByCustomerId(
                            user.getUid()
                    );

            return convertDocuments(
                    documents
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get customer bookings",
                    e
            );
        }
    }

    /*
     * HOST
     */
    public List<Map<String, Object>> getHostBookings(
            AuthenticatedUser user
    ) {

        requireHost(user);

        try {

            List<QueryDocumentSnapshot> documents =
                    bookingRepository.findByHostId(
                            user.getUid()
                    );

            return convertDocuments(
                    documents
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get host bookings",
                    e
            );
        }
    }

    /*
     * CUSTOMER / HOST / ADMIN
     *
     * A booking can only be viewed by:
     * - the customer
     * - the property's host
     * - admin
     */
    public Map<String, Object> getBooking(
            AuthenticatedUser user,
            String bookingId
    ) {

        requireAuthenticated(user);

        if (bookingId == null
                || bookingId.isBlank()) {

            throw new IllegalArgumentException(
                    "Booking ID is required"
            );
        }

        try {

            DocumentSnapshot document =
                    bookingRepository.findById(
                            bookingId
                    );

            if (!document.exists()) {
                throw new RuntimeException(
                        "Booking not found"
                );
            }

            Map<String, Object> booking =
                    document.getData();

            if (booking == null) {
                throw new RuntimeException(
                        "Booking data is empty"
                );
            }

            String customerId =
                    stringValue(
                            booking.get(
                                    "customerId"
                            )
                    );

            String hostId =
                    stringValue(
                            booking.get(
                                    "hostId"
                            )
                    );

            boolean admin =
                    "admin".equalsIgnoreCase(
                            user.getRole()
                    );

            boolean owner =
                    user.getUid().equals(
                            customerId
                    );

            boolean host =
                    user.getUid().equals(
                            hostId
                    );

            if (!admin && !owner && !host) {

                throw new SecurityException(
                        "You do not have access to this booking"
                );
            }

            booking.put(
                    "bookingId",
                    document.getId()
            );

            return booking;

        } catch (RuntimeException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get booking",
                    e
            );
        }
    }

    /*
     * HOST
     *
     * Accepts a requested booking.
     */
    public Map<String, Object> acceptBooking(
            AuthenticatedUser user,
            String bookingId
    ) {

        requireHost(user);

        Map<String, Object> booking =
                getBooking(
                        user,
                        bookingId
                );

        String currentStatus =
                stringValue(
                        booking.get(
                                "bookingStatus"
                        )
                );

        if (!"requested".equalsIgnoreCase(
                currentStatus
        )) {

            throw new RuntimeException(
                    "Only requested bookings can be accepted"
            );
        }

        try {

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "bookingStatus",
                    "accepted"
            );

            updates.put(
                    "paymentStatus",
                    "created"
            );

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            bookingRepository.update(
                    bookingId,
                    updates
            );

            booking.putAll(
                    updates
            );

            return booking;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to accept booking",
                    e
            );
        }
    }

    /*
     * HOST
     *
     * Rejects a requested booking.
     */
    public Map<String, Object> rejectBooking(
            AuthenticatedUser user,
            String bookingId
    ) {

        requireHost(user);

        Map<String, Object> booking =
                getBooking(
                        user,
                        bookingId
                );

        String currentStatus =
                stringValue(
                        booking.get(
                                "bookingStatus"
                        )
                );

        if (!"requested".equalsIgnoreCase(
                currentStatus
        )) {

            throw new RuntimeException(
                    "Only requested bookings can be rejected"
            );
        }

        try {

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "bookingStatus",
                    "rejected"
            );

            updates.put(
                    "paymentStatus",
                    "cancelled"
            );

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            bookingRepository.update(
                    bookingId,
                    updates
            );

            booking.putAll(
                    updates
            );

            return booking;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to reject booking",
                    e
            );
        }
    }

    /*
     * CUSTOMER
     *
     * Cancels a booking before completion.
     */
    public Map<String, Object> cancelBooking(
            AuthenticatedUser user,
            String bookingId
    ) {

        requireCustomer(user);

        Map<String, Object> booking =
                getBooking(
                        user,
                        bookingId
                );

        String currentStatus =
                stringValue(
                        booking.get(
                                "bookingStatus"
                        )
                );

        if ("completed".equalsIgnoreCase(
                currentStatus
        )
                || "cancelled".equalsIgnoreCase(
                currentStatus
        )
                || "rejected".equalsIgnoreCase(
                currentStatus
        )) {

            throw new RuntimeException(
                    "This booking cannot be cancelled"
            );
        }

        validateCancellationTiming(
                booking
        );

        try {

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "bookingStatus",
                    "cancelled"
            );

            String paymentStatus =
                    stringValue(
                            booking.get(
                                    "paymentStatus"
                            )
                    );

            if (!"captured".equalsIgnoreCase(
                    paymentStatus
            )) {

                updates.put(
                        "paymentStatus",
                        "cancelled"
                );
            }

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            bookingRepository.update(
                    bookingId,
                    updates
            );

            booking.putAll(
                    updates
            );

            /*
             * Refund processing is deliberately separated
             * from the booking state update.
             */
            Map<String, Object> refundResult =
                    refundService.processBookingCancellation(
                            bookingId
                    );

            booking.putAll(
                    refundResult
            );

            return booking;

        } catch (IllegalArgumentException
                 | IllegalStateException
                 | SecurityException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to cancel booking",
                    e
            );
        }
    }

    /*
     * CUSTOMER
     *
     * Move an accepted booking into payment_pending.
     */
    public Map<String, Object> markPaymentPending(
            AuthenticatedUser user,
            String bookingId
    ) {

        requireCustomer(user);

        Map<String, Object> booking =
                getBooking(
                        user,
                        bookingId
                );

        String status =
                stringValue(
                        booking.get(
                                "bookingStatus"
                        )
                );

        if (!"accepted".equalsIgnoreCase(status)
                && !"payment_pending".equalsIgnoreCase(
                status
        )) {

            throw new RuntimeException(
                    "Booking is not ready for payment"
            );
        }

        /*
         * If already payment_pending, return it as-is.
         * This makes the endpoint effectively idempotent.
         */
        if ("payment_pending".equalsIgnoreCase(
                status
        )) {

            return booking;
        }

        try {

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "bookingStatus",
                    "payment_pending"
            );

            updates.put(
                    "paymentStatus",
                    "created"
            );

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            bookingRepository.update(
                    bookingId,
                    updates
            );

            booking.putAll(
                    updates
            );

            return booking;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to prepare booking payment",
                    e
            );
        }
    }

    /*
     * -------------------------
     * VALIDATION
     * -------------------------
     */

    private void validateRequest(
            BookingRequest request
    ) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Booking data is required"
            );
        }

        if (isBlank(
                request.getPropertyId()
        )) {

            throw new IllegalArgumentException(
                    "Property ID is required"
            );
        }

        if (isBlank(
                request.getBookingType()
        )) {

            throw new IllegalArgumentException(
                    "Booking type is required"
            );
        }

        if (isBlank(
                request.getStartDate()
        )) {

            throw new IllegalArgumentException(
                    "Start date is required"
            );
        }

        if (isBlank(
                request.getEndDate()
        )) {

            throw new IllegalArgumentException(
                    "End date is required"
            );
        }
    }

    private void validateStayType(
            String bookingType,
            Map<String, Object> property
    ) {

        if (!List.of(
                "hourly",
                "daily",
                "monthly"
        ).contains(bookingType)) {

            throw new IllegalArgumentException(
                    "Invalid booking type"
            );
        }

        Object stayTypesObject =
                property.get(
                        "stayTypes"
                );

        if (!(stayTypesObject instanceof List<?>)) {

            throw new RuntimeException(
                    "Property has no valid stay types"
            );
        }

        boolean supported =
                ((List<?>) stayTypesObject)
                        .stream()
                        .anyMatch(
                                value ->
                                        bookingType.equalsIgnoreCase(
                                                String.valueOf(
                                                        value
                                                )
                                        )
                        );

        if (!supported) {

            throw new RuntimeException(
                    "Property does not support "
                            + bookingType
                            + " bookings"
            );
        }
    }

    private LocalDate parseDate(
            String value,
            String field
    ) {

        try {

            return LocalDate.parse(
                    value.trim()
            );

        } catch (DateTimeParseException e) {

            throw new IllegalArgumentException(
                    field
                            + " must use YYYY-MM-DD format"
            );
        }
    }

    private void validateDateRange(
            LocalDate startDate,
            LocalDate endDate
    ) {

        if (endDate.isBefore(
                startDate
        )) {

            throw new IllegalArgumentException(
                    "End date cannot be before start date"
            );
        }
    }

    private void validateHourlyTimes(
            BookingRequest request
    ) {

        if (isBlank(
                request.getStartTime()
        )
                || isBlank(
                request.getEndTime()
        )) {

            throw new IllegalArgumentException(
                    "Start time and end time are required for hourly bookings"
            );
        }

        try {

            LocalTime start =
                    LocalTime.parse(
                            request.getStartTime().trim()
                    );

            LocalTime end =
                    LocalTime.parse(
                            request.getEndTime().trim()
                    );

            LocalDate startDate =
                    parseDate(
                            request.getStartDate(),
                            "Start date"
                    );

            LocalDate endDate =
                    parseDate(
                            request.getEndDate(),
                            "End date"
                    );

            /*
             * Keep hourly bookings within one calendar day.
             *
             * This avoids ambiguity around overnight hourly
             * bookings and keeps hourly availability simple.
             */
            if (!startDate.equals(
                    endDate
            )) {

                throw new IllegalArgumentException(
                        "Hourly bookings must start and end on the same date"
                );
            }

            if (!end.isAfter(
                    start
            )) {

                throw new IllegalArgumentException(
                        "End time must be after start time"
                );
            }

        } catch (DateTimeParseException e) {

            throw new IllegalArgumentException(
                    "Time must use HH:mm format"
            );
        }
    }

    /*
     * -------------------------
     * PRICE CALCULATION
     * -------------------------
     */

    private long calculateAmount(
            String bookingType,
            LocalDate startDate,
            LocalDate endDate,
            String startTime,
            String endTime,
            Map<String, Object> property
    ) {

        double price;

        switch (bookingType) {

            case "hourly":

                price =
                        numberValue(
                                property.get(
                                        "hourlyPrice"
                                )
                        );

                break;

            case "daily":

                price =
                        numberValue(
                                property.get(
                                        "dailyPrice"
                                )
                        );

                break;

            case "monthly":

                price =
                        numberValue(
                                property.get(
                                        "monthlyPrice"
                                )
                        );

                break;

            default:

                throw new IllegalArgumentException(
                        "Unsupported booking type"
                );
        }

        if (price <= 0) {

            throw new RuntimeException(
                    "Property price is not configured correctly"
            );
        }

        long units;

        switch (bookingType) {

            case "hourly":

                LocalTime start =
                        LocalTime.parse(
                                startTime.trim()
                        );

                LocalTime end =
                        LocalTime.parse(
                                endTime.trim()
                        );

                long minutes =
                        java.time.Duration
                                .between(
                                        start,
                                        end
                                )
                                .toMinutes();

                if (minutes <= 0) {

                    throw new IllegalArgumentException(
                            "Booking duration must be greater than zero"
                    );
                }

                /*
                 * Hourly pricing is charged per started hour.
                 */
                units =
                        (minutes + 59L) / 60L;

                break;

            case "daily":

                units =
                        java.time.temporal.ChronoUnit
                                .DAYS
                                .between(
                                        startDate,
                                        endDate
                                );

                /*
                 * A same-day daily booking counts as one day.
                 */
                if (units == 0) {
                    units = 1;
                }

                break;

            case "monthly":

                Period period =
                        Period.between(
                                startDate,
                                endDate
                        );

                units =
                        period.toTotalMonths();

                if (units == 0) {
                    units = 1;
                }

                break;

            default:

                throw new IllegalArgumentException(
                        "Unsupported booking type"
                );
        }

        double total =
                price * units;

        if (total <= 0
                || total > Long.MAX_VALUE) {

            throw new RuntimeException(
                    "Calculated booking amount is invalid"
            );
        }

        return Math.round(total);
    }

    /*
     * -------------------------
     * HELPERS
     * -------------------------
     */

    private List<Map<String, Object>> convertDocuments(
            List<QueryDocumentSnapshot> documents
    ) {

        List<Map<String, Object>> bookings =
                new ArrayList<>();

        if (documents == null) {
            return bookings;
        }

        for (QueryDocumentSnapshot document
                : documents) {

            Map<String, Object> booking =
                    document.getData();

            if (booking != null) {

                booking.put(
                        "bookingId",
                        document.getId()
                );

                bookings.add(
                        booking
                );
            }
        }

        return bookings;
    }

    private double numberValue(
            Object value
    ) {

        if (!(value instanceof Number)) {
            return 0;
        }

        return ((Number) value).doubleValue();
    }

    private String stringValue(
            Object value
    ) {

        if (value == null) {
            return "";
        }

        return String.valueOf(
                value
        );
    }

    private boolean isBlank(
            String value
    ) {

        return value == null
                || value.isBlank();
    }

    private void validateCancellationTiming(
            Map<String, Object> booking
    ) {

        String startDateValue =
                stringValue(
                        booking.get(
                                "startDate"
                        )
                );

        if (startDateValue.isBlank()) {

            throw new IllegalStateException(
                    "Booking start date is missing"
            );
        }

        LocalDate startDate =
                parseDate(
                        startDateValue,
                        "Booking start date"
                );

        LocalDate today =
                LocalDate.now();

        String bookingType =
                stringValue(
                        booking.get(
                                "bookingType"
                        )
                ).toLowerCase();

        if (startDate.isBefore(
                today
        )) {

            throw new IllegalStateException(
                    "This booking has already started and cannot be cancelled"
            );
        }

        if (startDate.isAfter(
                today
        )) {

            return;
        }

        if (!"hourly".equals(
                bookingType
        )) {

            throw new IllegalStateException(
                    "This booking has already started and cannot be cancelled"
            );
        }

        String startTimeValue =
                stringValue(
                        booking.get(
                                "startTime"
                        )
                );

        if (startTimeValue.isBlank()) {

            throw new IllegalStateException(
                    "Hourly booking start time is missing"
            );
        }

        try {

            LocalTime startTime =
                    LocalTime.parse(
                            startTimeValue
                    );

            if (!LocalTime.now().isBefore(
                    startTime
            )) {

                throw new IllegalStateException(
                        "This booking has already started and cannot be cancelled"
                );
            }

        } catch (DateTimeParseException e) {

            throw new IllegalStateException(
                    "Invalid hourly booking start time",
                    e
            );
        }
    }

    private void requireAuthenticated(
            AuthenticatedUser user
    ) {

        if (user == null
                || user.getUid() == null
                || user.getUid().isBlank()) {

            throw new SecurityException(
                    "Authentication required"
            );
        }
    }

    private void requireCustomer(
            AuthenticatedUser user
    ) {

        requireAuthenticated(user);

        if (!"customer".equalsIgnoreCase(
                user.getRole()
        )) {

            throw new SecurityException(
                    "Only customers can perform this action"
            );
        }
    }

    private void requireHost(
            AuthenticatedUser user
    ) {

        requireAuthenticated(user);

        if (!"host".equalsIgnoreCase(
                user.getRole()
        )) {

            throw new SecurityException(
                    "Only hosts can perform this action"
            );
        }
    }
}