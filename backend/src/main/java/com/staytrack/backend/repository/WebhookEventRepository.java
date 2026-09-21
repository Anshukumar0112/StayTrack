package com.staytrack.backend.repository;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Repository;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

@Repository
public class WebhookEventRepository {

    private static final String COLLECTION = "webhookEvents";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public boolean exists(String eventId) {

        if (eventId == null || eventId.isBlank()) {
            return false;
        }

        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(eventId)
                    .get()
                    .get()
                    .exists();

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Webhook event lookup was interrupted",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to check webhook event",
                    e
            );
        }
    }

    public void create(
            String eventId,
            String eventType
    ) {

        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException(
                    "Webhook event ID is required"
            );
        }

        Map<String, Object> data =
                new HashMap<>();

        data.put(
                "eventId",
                eventId
        );

        data.put(
                "eventType",
                eventType != null
                        ? eventType
                        : ""
        );

        data.put(
                "createdAt",
                com.google.cloud.Timestamp.now()
        );

        try {

            getDb()
                    .collection(COLLECTION)
                    .document(eventId)
                    .set(data)
                    .get();

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Webhook event creation was interrupted",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to record webhook event",
                    e
            );
        }
    }
}