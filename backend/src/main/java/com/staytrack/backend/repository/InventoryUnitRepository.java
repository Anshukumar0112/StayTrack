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
public class InventoryUnitRepository {

    private static final String COLLECTION = "inventoryUnits";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public String create(String unitId, Object unit)
            throws ExecutionException, InterruptedException {
        getDb()
                .collection(COLLECTION)
                .document(unitId)
                .set(unit)
                .get();
        return unitId;
    }

    public DocumentSnapshot findById(String unitId)
            throws ExecutionException, InterruptedException {
        return getDb()
                .collection(COLLECTION)
                .document(unitId)
                .get()
                .get();
    }

    public List<QueryDocumentSnapshot> findByPropertyId(String propertyId)
            throws ExecutionException, InterruptedException {
        return getDb()
                .collection(COLLECTION)
                .whereEqualTo("propertyId", propertyId)
                .get()
                .get()
                .getDocuments();
    }

    public void update(String unitId, Map<String, Object> updates)
            throws ExecutionException, InterruptedException {
        getDb()
                .collection(COLLECTION)
                .document(unitId)
                .update(updates)
                .get();
    }

    public void delete(String unitId)
            throws ExecutionException, InterruptedException {
        getDb()
                .collection(COLLECTION)
                .document(unitId)
                .delete()
                .get();
    }
}
