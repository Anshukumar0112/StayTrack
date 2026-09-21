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
public class HostApplicationRepository {

    private static final String COLLECTION =
            "hostApplications";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(
            String applicationId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(applicationId)
                .get()
                .get();
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

    public void create(
            String applicationId,
            Map<String, Object> application)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(applicationId)
                .set(application)
                .get();
    }

    public void update(
            String applicationId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(applicationId)
                .update(updates)
                .get();
    }
}