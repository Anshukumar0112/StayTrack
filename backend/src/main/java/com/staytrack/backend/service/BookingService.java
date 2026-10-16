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
    private final NotificationService notificationService;

    public BookingService(
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository,
            RefundService refundService,
            @org.springframework.context.annotation.Lazy NotificationService notificationService
    ) {
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.refundService = refundService;
        this.notificationService = notificationService;
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

            /*
             * Persist guest details and property display metadata
             * so that both guest and host views can display human-readable
             * information without exposing raw UUIDs.
             */
            String guestName = request.getGuestName() != null && !request.getGuestName().isBlank()
                    ? request.getGuestName().trim()
                    : "Guest";
            booking.put("guestName", guestName);
            booking.put("userName", guestName);

            String contactPhone = request.getContactPhone() != null && !request.getContactPhone().isBlank()
                    ? request.getContactPhone().trim()
                    : "";
            booking.put("contactPhone", contactPhone);

            String propertyTitle = stringValue(propertyData.get("title"));
            if (propertyTitle.isBlank()) {
                propertyTitle = stringValue(propertyData.get("name"));
            }
            booking.put("propertyTitle", propertyTitle);

            String propertyImage = "";
            Object imagesObj = propertyData.get("images");
            if (imagesObj instanceof List && !((List<?>) imagesObj).isEmpty()) {
                propertyImage = String.valueOf(((List<?>) imagesObj).get(0));
            } else if (propertyData.get("imageUrl") != null) {
                propertyImage = String.valueOf(propertyData.get("imageUrl"));
            }
            booking.put("propertyImage", propertyImage);
            booking.put("city", stringValue(propertyData.get("city")));
            booking.put("area", stringValue(propertyData.get("area")));
            booking.put("propertyType", stringValue(propertyData.get("propertyType")));

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

            try {
                notificationService.createNotification(
                        hostId,
                        "booking_request",
                        "New Booking Request",
                        "You received a new booking request for your property.",
                        bookingId,
                        "booking"
                );
            } catch (Exception ignored) {}

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

            booking.put(
                    "id",
                    document.getId()
            );

            if (!booking.containsKey("status") && booking.containsKey("bookingStatus")) {
                booking.put("status", booking.get("bookingStatus"));
            }

            if (!booking.containsKey("totalAmount") && booking.containsKey("amount")) {
                booking.put("totalAmount", booking.get("amount"));
            }

            if (!booking.containsKey("totalPrice") && booking.containsKey("amount")) {
                booking.put("totalPrice", booking.get("amount"));
            }

            // Fallback enrichment for bookings missing propertyTitle or details
            if (isBlank(stringValue(booking.get("propertyTitle")))) {
                String propId = stringValue(booking.get("propertyId"));
                if (!propId.isBlank()) {
                    try {
                        DocumentSnapshot propDoc = propertyRepository.findById(propId);
                        if (propDoc.exists()) {
                            Map<String, Object> pData = propDoc.getData();
                            if (pData != null) {
                                String title = stringValue(pData.get("title"));
                                if (title.isBlank()) title = stringValue(pData.get("name"));
                                booking.put("propertyTitle", title);
                                if (isBlank(stringValue(booking.get("city")))) {
                                    booking.put("city", stringValue(pData.get("city")));
                                }
                                if (isBlank(stringValue(booking.get("area")))) {
                                    booking.put("area", stringValue(pData.get("area")));
                                }
                                if (isBlank(stringValue(booking.get("propertyImage")))) {
                                    Object imgs = pData.get("images");
                                    if (imgs instanceof List && !((List<?>) imgs).isEmpty()) {
                                        booking.put("propertyImage", String.valueOf(((List<?>) imgs).get(0)));
                                    }
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

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

        String hostId = stringValue(booking.get("hostId"));
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getUid().equals(hostId)) {
            throw new SecurityException(
                    "Only the host of this property can accept this booking"
            );
        }

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

        String propertyId = stringValue(booking.get("propertyId"));
        String startDate = stringValue(booking.get("startDate"));
        String endDate = stringValue(booking.get("endDate"));
        String startTime = stringValue(booking.get("startTime"));
        String endTime = stringValue(booking.get("endTime"));
        String bookingType = stringValue(booking.get("bookingType"));

        try {
            List<QueryDocumentSnapshot> existingBookings = bookingRepository.findByPropertyId(propertyId);
            for (QueryDocumentSnapshot doc : existingBookings) {
                if (doc.getId().equals(bookingId)) continue;
                Map<String, Object> existing = doc.getData();
                if (existing == null) continue;

                String status = stringValue(existing.get("bookingStatus")).toLowerCase();
                if (!java.util.Set.of("accepted", "payment_pending", "confirmed").contains(status)) {
                    continue;
                }

                String existingStart = stringValue(existing.get("startDate"));
                String existingEnd = stringValue(existing.get("endDate"));
                if (existingStart.isBlank() || existingEnd.isBlank()) continue;

                if (dateRangesOverlap(startDate, endDate, existingStart, existingEnd)) {
                    if (!"hourly".equalsIgnoreCase(bookingType)) {
                        throw new IllegalStateException("Property is already booked for the requested period");
                    }
                    if (startDate.equals(existingStart)) {
                        String existingStartTime = stringValue(existing.get("startTime"));
                        String existingEndTime = stringValue(existing.get("endTime"));
                        if (timesOverlap(startTime, endTime, existingStartTime, existingEndTime)) {
                            throw new IllegalStateException("Property is already booked for the requested period");
                        }
                    }
                }
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception ignored) {
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

            try {
                String customerId = stringValue(booking.get("customerId"));
                if (!customerId.isBlank()) {
                    notificationService.createNotification(
                            customerId,
                            "booking_accepted",
                            "Booking Request Accepted",
                            "Your booking request was accepted! Complete payment to confirm your stay.",
                            bookingId,
                            "booking"
                    );
                }
            } catch (Exception ignored) {}

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

        String hostId = stringValue(booking.get("hostId"));
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getUid().equals(hostId)) {
            throw new SecurityException(
                    "Only the host of this property can reject this booking"
            );
        }

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

            try {
                String customerId = stringValue(booking.get("customerId"));
                if (!customerId.isBlank()) {
                    notificationService.createNotification(
                            customerId,
                            "booking_rejected",
                            "Booking Request Rejected",
                            "Your booking request was rejected by the host.",
                            bookingId,
                            "booking"
                    );
                }
            } catch (Exception ignored) {}

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

        String customerId = stringValue(booking.get("customerId"));
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getUid().equals(customerId)) {
            throw new SecurityException(
                    "Only the guest who made this booking can cancel it"
            );
        }

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

        String customerId = stringValue(booking.get("customerId"));
        if (!"admin".equalsIgnoreCase(user.getRole()) && !user.getUid().equals(customerId)) {
            throw new SecurityException(
                    "Only the guest who made this booking can perform this action"
            );
        }

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

        boolean supported = false;

        if (stayTypesObject instanceof List<?>) {
            supported = ((List<?>) stayTypesObject).stream()
                    .anyMatch(value -> bookingType.equalsIgnoreCase(String.valueOf(value)));
        }

        if (!supported) {
            String propBookingType = stringValue(property.get("bookingType"));
            if (propBookingType.isBlank()) propBookingType = stringValue(property.get("stayModel"));
            if (!propBookingType.isBlank() && bookingType.equalsIgnoreCase(propBookingType)) {
                supported = true;
            }
        }

        if (!supported && stayTypesObject == null && isBlank(stringValue(property.get("bookingType")))) {
            supported = "daily".equalsIgnoreCase(bookingType);
        }

        if (!supported) {
            throw new RuntimeException(
                    "Property does not support "
                            + bookingType
                            + " bookings"
            );
        }
    }

    private boolean dateRangesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        try {
            LocalDate reqStart = LocalDate.parse(requestedStart.trim());
            LocalDate reqEnd = LocalDate.parse(requestedEnd.trim());
            LocalDate extStart = LocalDate.parse(existingStart.trim());
            LocalDate extEnd = LocalDate.parse(existingEnd.trim());
            return reqStart.isBefore(extEnd) && extStart.isBefore(reqEnd);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean timesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        try {
            LocalTime reqStart = LocalTime.parse(requestedStart.trim());
            LocalTime reqEnd = LocalTime.parse(requestedEnd.trim());
            LocalTime extStart = LocalTime.parse(existingStart.trim());
            LocalTime extEnd = LocalTime.parse(existingEnd.trim());
            return reqStart.isBefore(extEnd) && extStart.isBefore(reqEnd);
        } catch (Exception e) {
            return false;
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
                price = numberValue(property.get("hourlyPrice"));
                if (price <= 0) price = numberValue(property.get("pricePerHour"));
                if (price <= 0) price = numberValue(property.get("price"));
                break;

            case "daily":
                price = numberValue(property.get("dailyPrice"));
                if (price <= 0) price = numberValue(property.get("pricePerNight"));
                if (price <= 0) price = numberValue(property.get("price"));
                break;

            case "monthly":
                price = numberValue(property.get("monthlyPrice"));
                if (price <= 0) price = numberValue(property.get("pricePerMonth"));
                if (price <= 0) {
                    double daily = numberValue(property.get("dailyPrice"));
                    if (daily <= 0) daily = numberValue(property.get("pricePerNight"));
                    if (daily <= 0) daily = numberValue(property.get("price"));
                    if (daily > 0) price = daily * 30.0;
                }
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

                if (units == 0) {
                    units = 1;
                }

                break;

            case "monthly":

                long bookedDays =
                        java.time.temporal.ChronoUnit
                                .DAYS
                                .between(
                                        startDate,
                                        endDate
                                );

                if (bookedDays == 0) {
                    bookedDays = 1;
                }

                units = (long) Math.ceil(bookedDays / 30.0);

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

                booking.put(
                        "id",
                        document.getId()
                );

                if (!booking.containsKey("status") && booking.containsKey("bookingStatus")) {
                    booking.put("status", booking.get("bookingStatus"));
                }

                if (!booking.containsKey("totalAmount") && booking.containsKey("amount")) {
                    booking.put("totalAmount", booking.get("amount"));
                }

                if (!booking.containsKey("totalPrice") && booking.containsKey("amount")) {
                    booking.put("totalPrice", booking.get("amount"));
                }

                // Fallback enrichment if property metadata is missing
                String propTitle = stringValue(booking.get("propertyTitle"));
                if (propTitle.isBlank()) {
                    String propId = stringValue(booking.get("propertyId"));
                    if (!propId.isBlank()) {
                        try {
                            DocumentSnapshot propDoc = propertyRepository.findById(propId);
                            if (propDoc != null && propDoc.exists()) {
                                Map<String, Object> pData = propDoc.getData();
                                if (pData != null) {
                                    String title = stringValue(pData.get("title"));
                                    if (title.isBlank()) title = stringValue(pData.get("name"));
                                    booking.put("propertyTitle", title);
                                    if (stringValue(booking.get("city")).isBlank()) {
                                        booking.put("city", stringValue(pData.get("city")));
                                    }
                                    if (stringValue(booking.get("area")).isBlank()) {
                                        booking.put("area", stringValue(pData.get("area")));
                                    }
                                    if (stringValue(booking.get("propertyImage")).isBlank()) {
                                        Object imgs = pData.get("images");
                                        if (imgs instanceof List && !((List<?>) imgs).isEmpty()) {
                                            booking.put("propertyImage", String.valueOf(((List<?>) imgs).get(0)));
                                        }
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                }

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

        if (value == null) {
            return 0;
        }

        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
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

        String role = user.getRole();
        if (!"customer".equalsIgnoreCase(role)
                && !"host".equalsIgnoreCase(role)
                && !"admin".equalsIgnoreCase(role)) {

            throw new SecurityException(
                    "Only customers or hosts can perform this action"
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