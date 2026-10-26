package com.staytrack.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class InspectRealPropertyTest {

    @Test
    void inspectTargetProperty() throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        DocumentSnapshot doc = db.collection("properties").document("5b9e6b88-676b-4b7d-b350-4e659791d5c5").get().get();
        if (!doc.exists()) {
            System.out.println("TARGET PROPERTY DOES NOT EXIST!");
            return;
        }
        System.out.println("TARGET_PROPERTY_EXISTS: true");
        ObjectMapper mapper = new ObjectMapper();
        System.out.println("TARGET_PROPERTY_DATA: " + mapper.writeValueAsString(doc.getData()));

        String hostId = doc.getString("hostId");
        System.out.println("TARGET_PROPERTY_HOST_ID: " + hostId);

        if (hostId != null) {
            DocumentSnapshot hostDoc = db.collection("users").document(hostId).get().get();
            if (hostDoc.exists()) {
                System.out.println("TARGET_PROPERTY_HOST_USER: " + mapper.writeValueAsString(hostDoc.getData()));
            } else {
                System.out.println("HOST USER NOT FOUND IN users COLLECTION FOR UID: " + hostId);
            }
        }
    }
}
