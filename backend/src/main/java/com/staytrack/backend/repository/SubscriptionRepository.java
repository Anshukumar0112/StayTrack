package com.staytrack.backend.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class SubscriptionRepository {

    private static final String COLLECTION = "subscriptions";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String subscriptionId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(subscriptionId)
                .get()
                .get();
    }

    public List<QueryDocumentSnapshot> findByHostId(String hostId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo("hostId", hostId)
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findActiveByHostId(String hostId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo("hostId", hostId)
                .whereEqualTo("status", "active")
                .get()
                .get()
                .getDocuments();
    }

    public void create(
            String subscriptionId,
            Map<String, Object> subscription)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(subscriptionId)
                .set(subscription)
                .get();
    }

    public void update(
            String subscriptionId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(subscriptionId)
                .update(updates)
                .get();
    }
}