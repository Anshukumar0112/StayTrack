package com.staytrack.backend.repository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Repository;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.Transaction;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.exception.BookingConflictException;
import com.staytrack.backend.util.BookingAvailabilityUtils;

@Repository
public class BookingRepository {

    private static final String COLLECTION = "bookings";
    private static final String LOCK_COLLECTION =
            "propertyBookingLocks";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    private <T> T executeTransaction(Transaction.Function<T> function) throws Exception {
        try {
            return getDb().runTransaction(function).get();
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException re) {
                throw re;
            }
            if (cause instanceof Exception ex) {
                throw ex;
            }
            throw new RuntimeException(cause);
        }
    }

    public DocumentSnapshot findById(String bookingId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(bookingId)
                .get()
                .get();
    }

    public List<QueryDocumentSnapshot> findByCustomerId(
            String customerId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "customerId",
                        customerId
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByHostId(
            String hostId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "hostId",
                        hostId
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByPropertyId(
            String propertyId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "propertyId",
                        propertyId
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByCustomerIdAndStatus(
            String customerId,
            String status)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "customerId",
                        customerId
                )
                .whereEqualTo(
                        "bookingStatus",
                        status
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByHostIdAndStatus(
            String hostId,
            String status)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "hostId",
                        hostId
                )
                .whereEqualTo(
                        "bookingStatus",
                        status
                )
                .get()
                .get()
                .getDocuments();
    }

    /*
     * Standard booking creation.
     *
     * Kept for compatibility with other backend code.
     */
    public void create(
            String bookingId,
            Map<String, Object> booking)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(bookingId)
                .set(booking)
                .get();
    }

    /*
     * Atomic booking creation with availability check.
     *
     * Every booking attempt for the same property uses
     * the same lock document.
     *
     * The availability check and booking creation happen
     * inside the same Firestore transaction.
     */
    public void createIfAvailable(
            String propertyId,
            String bookingId,
            Map<String, Object> booking,
            String bookingType,
            String startDate,
            String endDate,
            String startTime,
            String endTime
    ) throws Exception {

        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException(
                    "Property ID is required"
            );
        }

        if (bookingId == null || bookingId.isBlank()) {
            throw new IllegalArgumentException(
                    "Booking ID is required"
            );
        }

        if (booking == null) {
            throw new IllegalArgumentException(
                    "Booking data is required"
            );
        }

        Firestore db = getDb();

        DocumentReference lockReference =
                db.collection(LOCK_COLLECTION)
                        .document(propertyId);

        DocumentReference bookingReference =
                db.collection(COLLECTION)
                        .document(bookingId);

        executeTransaction(transaction -> {

            /*
             * Read the property-specific lock.
             *
             * This makes concurrent booking attempts for
             * the same property contend on the same document.
             */
            DocumentSnapshot lockSnapshot =
                    transaction
                            .get(lockReference)
                            .get();

            /*
             * Re-check availability inside the transaction.
             * IMPORTANT: In Firestore Java SDK, all READ calls
             * must occur BEFORE any WRITE calls in a transaction.
             */
            QuerySnapshot snapshot =
                    transaction
                            .get(
                                    db.collection(COLLECTION)
                                            .whereEqualTo(
                                                    "propertyId",
                                                    propertyId
                                            )
                            )
                            .get();

            Instant nowInstant = Instant.now();
            checkBookingAvailabilityInternal(bookingId, booking, snapshot.getDocuments(), nowInstant, false);

            /*
             * No conflicting booking was found.
             *
             * Perform writes now that all transaction reads are complete.
             */
            Timestamp now = Timestamp.now();

            if (!booking.containsKey("holdExpiresAt")) {
                long expiresMillis = System.currentTimeMillis()
                        + BookingAvailabilityUtils.HOST_REQUEST_HOLD_MILLIS;
                booking.put(
                        "holdExpiresAt",
                        Timestamp.ofTimeSecondsAndNanos(expiresMillis / 1000, 0)
                );
            }

            if (!lockSnapshot.exists()) {
                Map<String, Object> lockData = new HashMap<>();
                lockData.put("propertyId", propertyId);
                lockData.put("updatedAt", now);
                transaction.create(lockReference, lockData);
            } else {
                transaction.update(lockReference, "updatedAt", now);
            }

            transaction.create(
                    bookingReference,
                    booking
            );

            return null;

        });
    }

    /*
     * Atomic host acceptance with availability and hold expiration check.
     */
    public Map<String, Object> acceptWithAvailabilityCheck(
            String propertyId,
            String bookingId
    ) throws Exception {

        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException("Property ID is required");
        }
        if (bookingId == null || bookingId.isBlank()) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        Firestore db = getDb();
        DocumentReference lockReference = db.collection(LOCK_COLLECTION).document(propertyId);
        DocumentReference bookingReference = db.collection(COLLECTION).document(bookingId);

        return executeTransaction(transaction -> {
            DocumentSnapshot lockSnapshot = transaction.get(lockReference).get();
            DocumentSnapshot bookingSnapshot = transaction.get(bookingReference).get();

            if (!bookingSnapshot.exists()) {
                throw new IllegalStateException("Booking not found");
            }

            Map<String, Object> bookingData = bookingSnapshot.getData();
            if (bookingData == null) {
                throw new IllegalStateException("Booking data is empty");
            }

            String currentStatus = String.valueOf(bookingData.getOrDefault("bookingStatus", "")).trim().toLowerCase();
            if (!"requested".equals(currentStatus)) {
                throw new IllegalStateException("Only requested bookings can be accepted");
            }

            Instant nowInstant = Instant.now();
            if (BookingAvailabilityUtils.isHoldExpired(bookingData, nowInstant)) {
                throw new IllegalStateException("Booking request has expired and can no longer be accepted");
            }

            String bookingType = String.valueOf(bookingData.getOrDefault("bookingType", "")).trim();
            String startDate = String.valueOf(bookingData.getOrDefault("startDate", "")).trim();
            String endDate = String.valueOf(bookingData.getOrDefault("endDate", "")).trim();
            String startTime = String.valueOf(bookingData.getOrDefault("startTime", "")).trim();
            String endTime = String.valueOf(bookingData.getOrDefault("endTime", "")).trim();

            QuerySnapshot snapshot = transaction.get(
                    db.collection(COLLECTION).whereEqualTo("propertyId", propertyId)
            ).get();

            checkBookingAvailabilityInternal(bookingId, bookingData, snapshot.getDocuments(), nowInstant, true);

            Timestamp now = Timestamp.now();
            long paymentHoldExpiryMillis = System.currentTimeMillis() + BookingAvailabilityUtils.PAYMENT_HOLD_MILLIS;
            Timestamp holdExpiresAt = Timestamp.ofTimeSecondsAndNanos(paymentHoldExpiryMillis / 1000, 0);

            if (!lockSnapshot.exists()) {
                Map<String, Object> lockData = new HashMap<>();
                lockData.put("propertyId", propertyId);
                lockData.put("updatedAt", now);
                transaction.create(lockReference, lockData);
            } else {
                transaction.update(lockReference, "updatedAt", now);
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("bookingStatus", "accepted");
            updates.put("paymentStatus", "created");
            updates.put("updatedAt", now);
            updates.put("holdExpiresAt", holdExpiresAt);

            transaction.update(bookingReference, updates);

            Map<String, Object> updatedBooking = new HashMap<>(bookingData);
            updatedBooking.putAll(updates);
            return updatedBooking;
        });
    }

    /*
     * Atomic payment confirmation with availability and hold check.
     */
    public Map<String, Object> confirmWithAvailabilityCheck(
            String propertyId,
            String bookingId
    ) throws Exception {

        if (bookingId == null || bookingId.isBlank()) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        Firestore db = getDb();
        DocumentReference bookingReference = db.collection(COLLECTION).document(bookingId);

        DocumentSnapshot preCheck = bookingReference.get().get();
        if (!preCheck.exists()) {
            throw new IllegalStateException("Booking not found");
        }
        String resolvedPropertyId = propertyId != null && !propertyId.isBlank()
                ? propertyId
                : String.valueOf(preCheck.get("propertyId"));

        DocumentReference lockReference = db.collection(LOCK_COLLECTION).document(resolvedPropertyId);

        return executeTransaction(transaction -> {
            DocumentSnapshot lockSnapshot = transaction.get(lockReference).get();
            DocumentSnapshot bookingSnapshot = transaction.get(bookingReference).get();

            if (!bookingSnapshot.exists()) {
                throw new IllegalStateException("Booking not found");
            }

            Map<String, Object> bookingData = bookingSnapshot.getData();
            if (bookingData == null) {
                throw new IllegalStateException("Booking data is empty");
            }

            String currentStatus = String.valueOf(bookingData.getOrDefault("bookingStatus", "")).trim().toLowerCase();
            if ("confirmed".equals(currentStatus)) {
                return bookingData;
            }

            if ("cancelled".equals(currentStatus)
                    || "rejected".equals(currentStatus)
                    || "expired".equals(currentStatus)
                    || "completed".equals(currentStatus)) {
                throw new IllegalStateException("Booking can no longer be confirmed (status: " + currentStatus + ")");
            }

            if (!"accepted".equals(currentStatus) && !"payment_pending".equals(currentStatus)) {
                throw new IllegalStateException("Booking can only be confirmed from accepted or payment_pending status (current: " + currentStatus + ")");
            }

            Instant nowInstant = Instant.now();
            if (BookingAvailabilityUtils.isHoldExpired(bookingData, nowInstant)) {
                throw new IllegalStateException("Booking hold has expired and cannot be confirmed");
            }

            String bookingType = String.valueOf(bookingData.getOrDefault("bookingType", "")).trim();
            String startDate = String.valueOf(bookingData.getOrDefault("startDate", "")).trim();
            String endDate = String.valueOf(bookingData.getOrDefault("endDate", "")).trim();
            String startTime = String.valueOf(bookingData.getOrDefault("startTime", "")).trim();
            String endTime = String.valueOf(bookingData.getOrDefault("endTime", "")).trim();

            QuerySnapshot snapshot = transaction.get(
                    db.collection(COLLECTION).whereEqualTo("propertyId", resolvedPropertyId)
            ).get();

            checkBookingAvailabilityInternal(bookingId, bookingData, snapshot.getDocuments(), nowInstant, false);

            Timestamp now = Timestamp.now();
            if (!lockSnapshot.exists()) {
                Map<String, Object> lockData = new HashMap<>();
                lockData.put("propertyId", resolvedPropertyId);
                lockData.put("updatedAt", now);
                transaction.create(lockReference, lockData);
            } else {
                transaction.update(lockReference, "updatedAt", now);
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("bookingStatus", "confirmed");
            updates.put("paymentStatus", "captured");
            updates.put("updatedAt", now);
            updates.put("holdExpiresAt", null);

            transaction.update(bookingReference, updates);

            Map<String, Object> updatedBooking = new HashMap<>(bookingData);
            updatedBooking.putAll(updates);
            return updatedBooking;
        });
    }

    /*
     * Date intervals use checkout semantics.
     *
     * Example:
     *
     * Existing:
     * 2026-09-10 -> 2026-09-12
     *
     * Requested:
     * 2026-09-12 -> 2026-09-14
     *
     * These do NOT overlap.
     */
    private boolean dateRangesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        return BookingAvailabilityUtils.dateRangesOverlap(
                requestedStart,
                requestedEnd,
                existingStart,
                existingEnd
        );
    }

    /*
     * Standard half-open time interval comparison.
     *
     * 10:00 -> 12:00
     * 12:00 -> 14:00
     *
     * These do NOT overlap.
     */
    private boolean timesOverlap(
            String requestedStart,
            String requestedEnd,
            String existingStart,
            String existingEnd
    ) {
        return BookingAvailabilityUtils.timesOverlap(
                requestedStart,
                requestedEnd,
                existingStart,
                existingEnd
        );
    }

    private void checkBookingAvailabilityInternal(
            String bookingId,
            Map<String, Object> bookingData,
            List<QueryDocumentSnapshot> existingDocuments,
            Instant nowInstant,
            boolean filterOnlyAcceptedAndConfirmed
    ) {
        String bookingType = String.valueOf(bookingData.getOrDefault("bookingType", "")).trim();
        String startDate = String.valueOf(bookingData.getOrDefault("startDate", "")).trim();
        String endDate = String.valueOf(bookingData.getOrDefault("endDate", "")).trim();
        String startTime = String.valueOf(bookingData.getOrDefault("startTime", "")).trim();
        String endTime = String.valueOf(bookingData.getOrDefault("endTime", "")).trim();

        String requestedUnitId = bookingData.get("inventoryUnitId") != null
                ? String.valueOf(bookingData.get("inventoryUnitId")).trim()
                : "";
        String requestedUnitType = bookingData.get("unitType") != null
                ? String.valueOf(bookingData.get("unitType")).trim()
                : "";
        String requestedParentRoomId = bookingData.get("parentRoomId") != null
                ? String.valueOf(bookingData.get("parentRoomId")).trim()
                : "";
        int requestedTotalQuantity = 1;
        if (bookingData.get("totalQuantity") instanceof Number n) {
            requestedTotalQuantity = n.intValue();
        } else if (bookingData.get("totalQuantity") != null) {
            try {
                requestedTotalQuantity = Integer.parseInt(String.valueOf(bookingData.get("totalQuantity")));
            } catch (Exception ignored) {
            }
        }

        int activeRoomTypeBookingsCount = 0;

        for (QueryDocumentSnapshot document : existingDocuments) {
            if (document.getId().equals(bookingId)) {
                continue;
            }
            Map<String, Object> existing = document.getData();
            if (existing == null) {
                continue;
            }

            if (filterOnlyAcceptedAndConfirmed) {
                String existingStatus = String.valueOf(existing.getOrDefault("bookingStatus", "")).trim().toLowerCase();
                if (!"accepted".equals(existingStatus)
                        && !"payment_pending".equals(existingStatus)
                        && !"confirmed".equals(existingStatus)) {
                    continue;
                }
            }

            if (!BookingAvailabilityUtils.datesAndTimesOverlap(
                    bookingType,
                    startDate,
                    endDate,
                    startTime,
                    endTime,
                    existing,
                    nowInstant
            )) {
                continue;
            }

            String existingUnitId = existing.get("inventoryUnitId") != null
                    ? String.valueOf(existing.get("inventoryUnitId")).trim()
                    : "";
            String existingUnitType = existing.get("unitType") != null
                    ? String.valueOf(existing.get("unitType")).trim()
                    : "";
            String existingParentRoomId = existing.get("parentRoomId") != null
                    ? String.valueOf(existing.get("parentRoomId")).trim()
                    : "";

            // 1. Whole property collisions:
            // If requested has no unitId OR existing has no unitId, whole property is locked!
            if (requestedUnitId.isBlank() || existingUnitId.isBlank()) {
                throw new BookingConflictException("Property is already booked for the requested period");
            }

            // 2. Room-type aggregate capacity count
            if ("room_type".equalsIgnoreCase(requestedUnitType)) {
                if (requestedUnitId.equalsIgnoreCase(existingUnitId)) {
                    activeRoomTypeBookingsCount++;
                }
                continue;
            }

            // 3. Discrete unit collisions (same bed or room)
            if (requestedUnitId.equalsIgnoreCase(existingUnitId)) {
                throw new BookingConflictException("Selected room or bed is already booked for the requested period");
            }

            // 4. Hierarchy conflict: Requested unit is a whole room, and child bed is booked
            if ("room".equalsIgnoreCase(requestedUnitType)
                    && !existingParentRoomId.isBlank()
                    && requestedUnitId.equalsIgnoreCase(existingParentRoomId)) {
                throw new BookingConflictException("Room cannot be booked because a bed within it is already reserved");
            }

            // 5. Hierarchy conflict: Requested unit is a bed, and parent room is booked as a whole
            if ("bed".equalsIgnoreCase(requestedUnitType)
                    && !requestedParentRoomId.isBlank()
                    && requestedParentRoomId.equalsIgnoreCase(existingUnitId)) {
                throw new BookingConflictException("Bed cannot be booked because its parent room is already reserved as a whole");
            }
        }

        if ("room_type".equalsIgnoreCase(requestedUnitType)) {
            if (activeRoomTypeBookingsCount >= requestedTotalQuantity) {
                throw new BookingConflictException("No available rooms of this type for the requested period");
            }
        }
    }

    public void update(
            String bookingId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(bookingId)
                .update(updates)
                .get();
    }

    public void delete(String bookingId)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(bookingId)
                .delete()
                .get();
    }
}