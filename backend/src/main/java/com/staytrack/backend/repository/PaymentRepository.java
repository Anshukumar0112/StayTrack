package com.staytrack.backend.repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;

@Repository
public class PaymentRepository {

    private static final String COLLECTION = "payments";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String paymentId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(paymentId)
                .get()
                .get();
    }

    public List<QueryDocumentSnapshot> findByUserId(String userId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo("userId", userId)
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByBookingId(String bookingId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo("bookingId", bookingId)
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findBySubscriptionId(
            String subscriptionId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "subscriptionId",
                        subscriptionId
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByGatewayPaymentId(
            String gatewayPaymentId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "gatewayPaymentId",
                        gatewayPaymentId
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findByGatewayOrderId(
            String gatewayOrderId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "gatewayOrderId",
                        gatewayOrderId
                )
                .get()
                .get()
                .getDocuments();
    }

    public void create(
            String paymentId,
            Map<String, Object> payment)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(paymentId)
                .set(payment)
                .get();
    }

    public void update(
            String paymentId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(paymentId)
                .update(updates)
                .get();
    }
}