package com.staytrack.backend.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.model.Notification;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Repository
public class NotificationRepository {

    private static final String COLLECTION = "notifications";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String notificationId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(notificationId)
                    .get()
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while reading notification", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to read notification", e
            );
        }
    }

    public List<QueryDocumentSnapshot> findByUserId(
            String userId,
            int limit) {

        try {
            ApiFuture<QuerySnapshot> future = getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("userId", userId)
                    .orderBy(
                            "createdAt",
                            Query.Direction.DESCENDING
                    )
                    .limit(limit)
                    .get();

            return future.get().getDocuments();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while reading notifications", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to read notifications", e
            );
        }
    }

    public List<QueryDocumentSnapshot> findUnreadByUserId(
            String userId,
            int limit) {

        try {
            ApiFuture<QuerySnapshot> future = getDb()
                    .collection(COLLECTION)
                    .whereEqualTo("userId", userId)
                    .whereEqualTo("read", false)
                    .orderBy(
                            "createdAt",
                            Query.Direction.DESCENDING
                    )
                    .limit(limit)
                    .get();

            return future.get().getDocuments();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while reading unread notifications", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to read unread notifications", e
            );
        }
    }

    public void create(
            String notificationId,
            Notification notification) {

        try {
            getDb()
                    .collection(COLLECTION)
                    .document(notificationId)
                    .create(notification.toMap())
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while creating notification", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to create notification", e
            );
        }
    }

    public void markAsRead(String notificationId) {

        try {
            getDb()
                    .collection(COLLECTION)
                    .document(notificationId)
                    .update("read", true)
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while updating notification", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to update notification", e
            );
        }
    }

    public void markAllAsRead(String userId) {

        try {
            List<QueryDocumentSnapshot> documents =
                    getDb()
                            .collection(COLLECTION)
                            .whereEqualTo("userId", userId)
                            .whereEqualTo("read", false)
                            .get()
                            .get()
                            .getDocuments();

            if (documents.isEmpty()) {
                return;
            }

            var batch = getDb().batch();

            for (QueryDocumentSnapshot document : documents) {
                batch.update(
                        document.getReference(),
                        "read",
                        true
                );
            }

            batch.commit().get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while marking notifications as read", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to mark notifications as read", e
            );
        }
    }

    public void delete(String notificationId) {

        try {
            getDb()
                    .collection(COLLECTION)
                    .document(notificationId)
                    .delete()
                    .get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while deleting notification", e
            );

        } catch (ExecutionException e) {
            throw new RuntimeException(
                    "Failed to delete notification", e
            );
        }
    }
}