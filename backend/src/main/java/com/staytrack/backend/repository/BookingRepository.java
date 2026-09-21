package com.staytrack.backend.repository;

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
import com.google.firebase.cloud.FirestoreClient;

@Repository
public class BookingRepository {

    private static final String COLLECTION = "bookings";
    private static final String LOCK_COLLECTION =
            "propertyBookingLocks";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
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

        db.runTransaction(transaction -> {

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

            for (QueryDocumentSnapshot document
                    : snapshot.getDocuments()) {

                /*
                 * Never compare the booking against itself.
                 */
                if (document.getId().equals(bookingId)) {
                    continue;
                }

                Map<String, Object> existing =
                        document.getData();

                if (existing == null) {
                    continue;
                }

                String status =
                        String.valueOf(
                                existing.getOrDefault(
                                        "bookingStatus",
                                        ""
                                )
                        )
                                .trim()
                                .toLowerCase();

                /*
                 * These states occupy the property.
                 */
                if (!"requested".equals(status)
                        && !"accepted".equals(status)
                        && !"payment_pending".equals(status)
                        && !"confirmed".equals(status)) {

                    continue;
                }

                String existingStartDate =
                        String.valueOf(
                                existing.getOrDefault(
                                        "startDate",
                                        ""
                                )
                        ).trim();

                String existingEndDate =
                        String.valueOf(
                                existing.getOrDefault(
                                        "endDate",
                                        ""
                                )
                        ).trim();

                if (existingStartDate.isBlank()
                        || existingEndDate.isBlank()) {

                    /*
                     * A booking with invalid date data should
                     * not accidentally allow another booking
                     * through.
                     */
                    throw new IllegalStateException(
                            "Existing booking has invalid date data"
                    );
                }

                boolean datesOverlap =
                        dateRangesOverlap(
                                startDate,
                                endDate,
                                existingStartDate,
                                existingEndDate
                        );

                if (!datesOverlap) {
                    continue;
                }

                /*
                 * Daily and monthly bookings conflict with
                 * any overlapping occupied booking.
                 */
                if (!"hourly".equalsIgnoreCase(
                        bookingType
                )) {

                    throw new IllegalStateException(
                            "Property is already booked for the requested period"
                    );
                }

                /*
                 * Hourly booking.
                 *
                 * If the bookings are on different starting
                 * dates, they do not occupy the same hourly slot.
                 */
                if (!startDate.equals(existingStartDate)) {
                    continue;
                }

                String existingStartTime =
                        String.valueOf(
                                existing.getOrDefault(
                                        "startTime",
                                        ""
                                )
                        ).trim();

                String existingEndTime =
                        String.valueOf(
                                existing.getOrDefault(
                                        "endTime",
                                        ""
                                )
                        ).trim();

                if (timesOverlap(
                        startTime,
                        endTime,
                        existingStartTime,
                        existingEndTime
                )) {

                    throw new IllegalStateException(
                            "Property is already booked for the requested period"
                    );
                }
            }

            /*
             * No conflicting booking was found.
             *
             * Perform writes now that all transaction reads are complete.
             */
            Timestamp now = Timestamp.now();

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

        }).get();
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

        LocalDate requestedStartDate =
                LocalDate.parse(
                        requestedStart
                );

        LocalDate requestedEndDate =
                LocalDate.parse(
                        requestedEnd
                );

        LocalDate existingStartDate =
                LocalDate.parse(
                        existingStart
                );

        LocalDate existingEndDate =
                LocalDate.parse(
                        existingEnd
                );

        return requestedStartDate.isBefore(
                existingEndDate
        )
                && existingStartDate.isBefore(
                requestedEndDate
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

        if (requestedStart == null
                || requestedStart.isBlank()
                || requestedEnd == null
                || requestedEnd.isBlank()
                || existingStart == null
                || existingStart.isBlank()
                || existingEnd == null
                || existingEnd.isBlank()) {

            /*
             * Missing time information is treated as
             * conflicting rather than allowing an unsafe
             * booking through.
             */
            return true;
        }

        LocalTime requestedStartTime =
                LocalTime.parse(
                        requestedStart.trim()
                );

        LocalTime requestedEndTime =
                LocalTime.parse(
                        requestedEnd.trim()
                );

        LocalTime existingStartTime =
                LocalTime.parse(
                        existingStart.trim()
                );

        LocalTime existingEndTime =
                LocalTime.parse(
                        existingEnd.trim()
                );

        return requestedStartTime.isBefore(
                existingEndTime
        )
                && existingStartTime.isBefore(
                requestedEndTime
        );
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