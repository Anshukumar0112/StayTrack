package com.staytrack.backend.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ReviewRepository {

    private static final String COLLECTION = "reviews";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String reviewId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(reviewId)
                    .get()
                    .get();
        } catch (Exception e) {
            throw new RuntimeException("Unable to find review", e);
        }
    }

    public DocumentSnapshot findByReviewerAndBooking(
            String reviewerId,
            String bookingId
    ) {
        String reviewId = buildReviewId(reviewerId, bookingId);
        return findById(reviewId);
    }

    public List<QueryDocumentSnapshot> findByPropertyId(String propertyId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("propertyId", propertyId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException("Unable to find property reviews", e);
        }
    }

    public List<QueryDocumentSnapshot> findByReviewerId(String reviewerId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("reviewerId", reviewerId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException("Unable to find user reviews", e);
        }
    }

    public List<QueryDocumentSnapshot> findByBookingId(String bookingId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("bookingId", bookingId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException("Unable to find booking reviews", e);
        }
    }

    public void create(String reviewId, java.util.Map<String, Object> data) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(reviewId)
                    .create(data)
                    .get();
        } catch (Exception e) {
            throw new RuntimeException("Unable to create review", e);
        }
    }

    public void delete(String reviewId) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(reviewId)
                    .delete()
                    .get();
        } catch (Exception e) {
            throw new RuntimeException("Unable to delete review", e);
        }
    }

    public static String buildReviewId(
            String reviewerId,
            String bookingId
    ) {
        return bookingId + "_" + reviewerId;
    }
}
