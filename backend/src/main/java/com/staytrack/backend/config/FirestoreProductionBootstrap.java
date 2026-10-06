package com.staytrack.backend.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

/**
 * One-time, idempotent Firestore production bootstrap.
 *
 * This class creates only system/configuration documents that are safe
 * to initialize without real users or transactions. It never creates
 * fake users, properties, bookings, payments, reviews, messages, etc.
 *
 * Enable explicitly with:
 *   --staytrack.bootstrap.enabled=true
 *
 * After the bootstrap completes successfully, run the application
 * normally without the property.
 */
@Component
@ConditionalOnProperty(
        name = "staytrack.bootstrap.enabled",
        havingValue = "true"
)
public class FirestoreProductionBootstrap implements ApplicationRunner {

    private final Firestore db;

    public FirestoreProductionBootstrap() {
        this.db = FirestoreClient.getFirestore();
    }

    @Override
    public void run(ApplicationArguments args) {
        System.out.println("==============================================");
        System.out.println("StayTrack Firestore production bootstrap");
        System.out.println("Project: staytrack1");
        System.out.println("==============================================");

        ensureSubscriptionSettings();
        ensureBookingSettings();
        ensurePlatformSettings();
        ensureAiSettings();

        verifyExistingCollections();

        System.out.println("==============================================");
        System.out.println("StayTrack Firestore bootstrap completed.");
        System.out.println("No fake application/business records were created.");
        System.out.println("Disable bootstrap mode before normal startup.");
        System.out.println("==============================================");
    }

    private void ensureSubscriptionSettings() {
        Map<String, Object> defaults = new HashMap<>();

        defaults.put("introductoryPrice", 20L);
        defaults.put("standardPrice", 20L);
        defaults.put("introductoryEnabled", false);
        defaults.put("billingPeriod", "MONTHLY");
        defaults.put("billingInterval", 1L);
        defaults.put("listingPropertyLimit", 10L);
        defaults.put("currency", "INR");

        ensureDocument(
                "settings",
                "subscription",
                defaults,
                "subscription settings"
        );
    }

    private void ensureBookingSettings() {
        Map<String, Object> defaults = new HashMap<>();

        defaults.put("maxBookingDays", 365L);
        defaults.put("minBookingHours", 1L);

        ensureDocument(
                "settings",
                "booking",
                defaults,
                "booking settings"
        );
    }

    private void ensurePlatformSettings() {
        Map<String, Object> defaults = new HashMap<>();

        defaults.put("brokerage", 0L);
        defaults.put("currency", "INR");
        defaults.put("maintenanceMode", false);
        defaults.put("platformName", "StayTrack");
        defaults.put("supportEmail", "");
        defaults.put("supportPhone", "");

        ensureDocument(
                "settings",
                "platform",
                defaults,
                "platform settings"
        );
    }

    private void ensureAiSettings() {
        /*
         * AI is intentionally disabled until a real provider/model and
         * server-side API key are configured. No secret is stored here.
         */
        Map<String, Object> defaults = new HashMap<>();

        defaults.put("enabled", false);
        defaults.put("provider", "");
        defaults.put("model", "");

        ensureDocument(
                "settings",
                "ai",
                defaults,
                "AI settings"
        );
    }

    private void ensureDocument(
            String collection,
            String documentId,
            Map<String, Object> defaults,
            String description
    ) {
        try {
            DocumentSnapshot existing = db.collection(collection)
                    .document(documentId)
                    .get()
                    .get();

            if (existing.exists()) {
                System.out.println(
                        "[OK] Existing " + description
                                + ": " + collection + "/" + documentId
                );
                return;
            }

            Map<String, Object> data = new HashMap<>(defaults);
            data.put("updatedAt", Timestamp.now());

            db.collection(collection)
                    .document(documentId)
                    .set(data)
                    .get();

            System.out.println(
                    "[CREATED] " + description
                            + ": " + collection + "/" + documentId
            );

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Unable to initialize "
                            + collection + "/" + documentId,
                    e
            );
        }
    }

    private void verifyExistingCollections() {
        String[] expectedCollections = {
                "users",
                "hostApplications",
                "properties",
                "bookings",
                "payments",
                "subscriptions",
                "transfers",
                "reviews",
                "conversations",
                "notifications",
                "areas",
                "settings",
                "webhookEvents",
                "reports"
        };

        System.out.println();
        System.out.println("Firestore operational collections:");

        for (String collection : expectedCollections) {
            try {
                /*
                 * Firestore has no meaningful "empty collection" object.
                 * A collection exists only after its first document is
                 * written. Therefore empty business collections are
                 * reported as READY FOR FIRST RECORD rather than populated
                 * with fake documents.
                 */
                int count = db.collection(collection)
                        .limit(1)
                        .get()
                        .get()
                        .getDocuments()
                        .size();

                if (count > 0) {
                    System.out.println(
                            "[READY] " + collection
                    );
                } else {
                    System.out.println(
                            "[EMPTY/READY] " + collection
                                    + " - waiting for real production data"
                    );
                }

            } catch (Exception e) {
                throw new IllegalStateException(
                        "Unable to verify Firestore collection: "
                                + collection,
                        e
                );
            }
        }
    }
}
