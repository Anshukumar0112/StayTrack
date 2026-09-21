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
public class PropertyRepository {

    private static final String COLLECTION = "properties";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public String create(
            String propertyId,
            Object property)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(propertyId)
                .set(property)
                .get();

        return propertyId;
    }

    public DocumentSnapshot findById(
            String propertyId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(propertyId)
                .get()
                .get();
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

    public List<QueryDocumentSnapshot> findByVerificationStatus(
            String verificationStatus)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "verificationStatus",
                        verificationStatus
                )
                .get()
                .get()
                .getDocuments();
    }

    public List<QueryDocumentSnapshot> findApprovedActive()
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .whereEqualTo(
                        "verificationStatus",
                        "approved"
                )
                .whereEqualTo(
                        "listingStatus",
                        "active"
                )
                .get()
                .get()
                .getDocuments();
    }

    public void update(
            String propertyId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(propertyId)
                .update(updates)
                .get();
    }

    public void delete(
            String propertyId)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(propertyId)
                .delete()
                .get();
    }
}