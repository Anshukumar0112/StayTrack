package com.staytrack.backend.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.model.Area;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class AreaRepository {

    private static final String COLLECTION = "areas";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String areaId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(areaId)
                    .get()
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while reading area", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to read area", e);
        }
    }

    public List<QueryDocumentSnapshot> findAllActive() {
        try {
            ApiFuture<QuerySnapshot> future = getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("active", true)
                    .get();

            return future.get().getDocuments();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while reading areas", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to read areas", e);
        }
    }

    public List<QueryDocumentSnapshot> findActiveByCity(String city) {
        try {
            ApiFuture<QuerySnapshot> future = getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("active", true)
                    .whereEqualTo("city", city)
                    .get();

            return future.get().getDocuments();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while reading city areas", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to read city areas", e
            );
        }
    }

    public List<QueryDocumentSnapshot> findAll() {
        try {
            ApiFuture<QuerySnapshot> future = getDb()
                    .collection(COLLECTION)
                    .get();

            return future.get().getDocuments();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while reading all areas", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to read all areas", e);
        }
    }

    public void create(String areaId, Area area) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(areaId)
                    .create(area.toMap())
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while creating area", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to create area", e);
        }
    }

    public void update(String areaId, Map<String, Object> updates) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(areaId)
                    .update(updates)
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while updating area", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to update area", e);
        }
    }

    public void delete(String areaId) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(areaId)
                    .delete()
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while deleting area", e);

        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to delete area", e);
        }
    }
}