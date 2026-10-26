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
public class VisitRepository {

    private static final String COLLECTION = "visits";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public void save(String visitId, Map<String, Object> data) {
        try {
            getDb().collection(COLLECTION).document(visitId).set(data).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to save visit", e);
        }
    }

    public DocumentSnapshot findById(String visitId) {
        try {
            return getDb().collection(COLLECTION).document(visitId).get().get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to find visit", e);
        }
    }

    public List<QueryDocumentSnapshot> findByCustomerId(String customerId) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("customerId", customerId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to find customer visits", e);
        }
    }

    public List<QueryDocumentSnapshot> findByHostId(String hostId) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("hostId", hostId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to find host visits", e);
        }
    }

    public List<QueryDocumentSnapshot> findByPropertyId(String propertyId) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("propertyId", propertyId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to find property visits", e);
        }
    }

    public void update(String visitId, Map<String, Object> updates) {
        try {
            getDb().collection(COLLECTION).document(visitId).update(updates).get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to update visit", e);
        }
    }

    public void delete(String visitId) {
        try {
            getDb().collection(COLLECTION).document(visitId).delete().get();
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Unable to delete visit", e);
        }
    }
}
