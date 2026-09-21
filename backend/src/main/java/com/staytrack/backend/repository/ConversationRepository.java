package com.staytrack.backend.repository;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ConversationRepository {

    private static final String COLLECTION = "conversations";
    private static final String MESSAGES = "messages";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public DocumentSnapshot findById(String conversationId) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(conversationId)
                    .get()
                    .get();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find conversation",
                    e
            );
        }
    }

    public DocumentSnapshot findByParticipantsAndProperty(
            String customerId,
            String hostId,
            String propertyId
    ) {
        String conversationId =
                buildConversationId(
                        customerId,
                        hostId,
                        propertyId
                );

        return findById(conversationId);
    }

    public List<QueryDocumentSnapshot> findByParticipant(
            String field,
            String userId
    ) {
        if (!"customerId".equals(field)
                && !"hostId".equals(field)) {
            throw new IllegalArgumentException(
                    "Invalid participant field"
            );
        }

        try {
            return getDb()
                    .collection(COLLECTION)
                    .whereEqualTo(field, userId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find conversations",
                    e
            );
        }
    }

    public void create(
            String conversationId,
            Map<String, Object> data
    ) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(conversationId)
                    .create(data)
                    .get();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to create conversation",
                    e
            );
        }
    }

    public void update(
            String conversationId,
            Map<String, Object> data
    ) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(conversationId)
                    .update(data)
                    .get();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to update conversation",
                    e
            );
        }
    }

    public void addMessage(
            String conversationId,
            String messageId,
            Map<String, Object> data
    ) {
        try {
            getDb()
                    .collection(COLLECTION)
                    .document(conversationId)
                    .collection(MESSAGES)
                    .document(messageId)
                    .create(data)
                    .get();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to create message",
                    e
            );
        }
    }

    public List<QueryDocumentSnapshot> findMessages(
            String conversationId
    ) {
        try {
            return getDb()
                    .collection(COLLECTION)
                    .document(conversationId)
                    .collection(MESSAGES)
                    .orderBy(
                            "createdAt",
                            com.google.cloud.firestore.Query.Direction.ASCENDING
                    )
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find messages",
                    e
            );
        }
    }

    public static String buildConversationId(
            String customerId,
            String hostId,
            String propertyId
    ) {
        return customerId + "_" + hostId + "_" + propertyId;
    }
}
