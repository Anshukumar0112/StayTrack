package com.staytrack.backend.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class UserRepository {

    private static final String COLLECTION = "users";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(
            String userId)
            throws ExecutionException, InterruptedException {

        return getDb()
                .collection(COLLECTION)
                .document(userId)
                .get()
                .get();
    }

    public void update(
            String userId,
            Map<String, Object> updates)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(userId)
                .update(updates)
                .get();
    }

    public void delete(
            String userId)
            throws ExecutionException, InterruptedException {

        getDb()
                .collection(COLLECTION)
                .document(userId)
                .delete()
                .get();
    }
}