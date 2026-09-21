package com.staytrack.backend.repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Repository;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;

@Repository
public class TransferRepository {

    private static final String COLLECTION = "transfers";

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    public List<QueryDocumentSnapshot> findByPaymentId(String paymentId) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("paymentId", paymentId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find transfers by payment ID",
                    e
            );
        }
    }

    public List<QueryDocumentSnapshot> findByPaymentDocumentId(
            String paymentId
    ) {
        return findByPaymentId(paymentId);
    }

    public List<QueryDocumentSnapshot> findByBookingId(
            String bookingId
    ) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("bookingId", bookingId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find transfers by booking ID",
                    e
            );
        }
    }

    public List<QueryDocumentSnapshot> findByHostId(
            String hostId
    ) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo("hostId", hostId)
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find transfers by host ID",
                    e
            );
        }
    }

    /**
     * Returns all local transfers matching a gateway transfer ID.
     */
    public List<QueryDocumentSnapshot> findByGatewayTransferId(
            String gatewayTransferId
    ) {
        try {
            return getDb().collection(COLLECTION)
                    .whereEqualTo(
                            "gatewayTransferId",
                            gatewayTransferId
                    )
                    .get()
                    .get()
                    .getDocuments();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find transfer by gateway transfer ID",
                    e
            );
        }
    }

    public DocumentSnapshot findById(String transferId) {
        try {
            return getDb().collection(COLLECTION)
                    .document(transferId)
                    .get()
                    .get();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to find transfer",
                    e
            );
        }
    }

    /**
     * Finds processing transfers whose updatedAt is older than cutoff.
     *
     * Primary path:
     *   status == processing
     *   updatedAt < cutoff
     *   order by updatedAt ASC
     *
     * This normally uses the Firestore composite index.
     *
     * Fallback:
     * If Firestore cannot execute the composite query, retrieve processing
     * transfers using the equality filter only, then apply the timestamp
     * filtering and ordering locally.
     *
     * The fallback does NOT create or modify any transfer.
     */
    public List<QueryDocumentSnapshot> findStaleProcessingTransfers(
            Timestamp cutoff,
            int limit
    ) {

        if (cutoff == null) {
            throw new IllegalArgumentException(
                    "Cutoff timestamp is required"
            );
        }

        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException(
                    "Limit must be between 1 and 100"
            );
        }

        try {

            return getDb()
                    .collection(COLLECTION)
                    .whereEqualTo(
                            "status",
                            "processing"
                    )
                    .whereLessThan(
                            "updatedAt",
                            cutoff
                    )
                    .orderBy(
                            "updatedAt",
                            Query.Direction.ASCENDING
                    )
                    .limit(limit)
                    .get()
                    .get()
                    .getDocuments();

        } catch (Exception indexedQueryException) {

            /*
             * Firestore may temporarily reject the composite query if the
             * required index is unavailable or not yet ready.
             *
             * Recovery should remain operational in that situation.
             */

            try {

                List<QueryDocumentSnapshot> processingTransfers =
                        getDb()
                                .collection(COLLECTION)
                                .whereEqualTo(
                                        "status",
                                        "processing"
                                )
                                .get()
                                .get()
                                .getDocuments();

                List<QueryDocumentSnapshot> staleTransfers =
                        new ArrayList<>();

                for (QueryDocumentSnapshot document
                        : processingTransfers) {

                    Timestamp updatedAt =
                            document.getTimestamp("updatedAt");

                    if (updatedAt == null) {
                        continue;
                    }

                    if (updatedAt.compareTo(cutoff) < 0) {
                        staleTransfers.add(document);
                    }
                }

                staleTransfers.sort(
                        Comparator.comparing(
                                document -> {
                                    Timestamp updatedAt =
                                            document.getTimestamp(
                                                    "updatedAt"
                                            );

                                    return updatedAt;
                                }
                        )
                );

                if (staleTransfers.size() > limit) {
                    return new ArrayList<>(
                            staleTransfers.subList(
                                    0,
                                    limit
                            )
                    );
                }

                return staleTransfers;

            } catch (Exception fallbackException) {

                RuntimeException combined =
                        new RuntimeException(
                                "Unable to find stale processing transfers",
                                fallbackException
                        );

                combined.addSuppressed(
                        indexedQueryException
                );

                throw combined;
            }
        }
    }

    public void create(
            String transferId,
            Map<String, Object> data
    ) {

        try {

            getDb()
                    .collection(COLLECTION)
                    .document(transferId)
                    .create(data)
                    .get();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create transfer",
                    e
            );
        }
    }

    /**
     * Deterministic one-transfer-per-payment creation.
     */
    public void createForPayment(
            String paymentId,
            Map<String, Object> data
    ) {

        if (paymentId == null || paymentId.isBlank()) {
            throw new IllegalArgumentException(
                    "PaymentID is required"
            );
        }

        try {

            getDb()
                    .collection(COLLECTION)
                    .document(paymentId)
                    .create(data)
                    .get();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create transfer for payment",
                    e
            );
        }
    }

    /**
     * Atomically moves a pending/failed local transfer to processing.
     */
    public TransferClaimResult claimForProcessing(
            String transferId
    ) {

        if (transferId == null || transferId.isBlank()) {
            throw new IllegalArgumentException(
                    "Transfer ID is required"
            );
        }

        try {

            DocumentReference reference =
                    getDb()
                            .collection(COLLECTION)
                            .document(transferId);

            return getDb()
                    .runTransaction(transaction -> {

                        DocumentSnapshot snapshot =
                                transaction
                                        .get(reference)
                                        .get();

                        if (!snapshot.exists()) {
                            return new TransferClaimResult(
                                    false,
                                    false,
                                    null
                            );
                        }

                        Map<String, Object> data =
                                snapshot.getData() != null
                                        ? new HashMap<>(
                                                snapshot.getData()
                                        )
                                        : new HashMap<>();

                        String gatewayTransferId =
                                getString(
                                        data.get(
                                                "gatewayTransferId"
                                        )
                                );

                        if (!gatewayTransferId.isBlank()) {

                            return new TransferClaimResult(
                                    false,
                                    true,
                                    data
                            );
                        }

                        String status =
                                getString(
                                        data.get("status")
                                ).toLowerCase();

                        if ("processing".equals(status)) {

                            return new TransferClaimResult(
                                    false,
                                    false,
                                    data
                            );
                        }

                        if (!"pending".equals(status)
                                && !"failed".equals(status)) {

                            return new TransferClaimResult(
                                    false,
                                    false,
                                    data
                            );
                        }

                        Timestamp now =
                                Timestamp.now();

                        transaction.update(
                                reference,
                                "status",
                                "processing",
                                "settlementStatus",
                                "pending",
                                "processingAt",
                                now,
                                "updatedAt",
                                now,
                                "error",
                                ""
                        );

                        data.put(
                                "status",
                                "processing"
                        );

                        data.put(
                                "settlementStatus",
                                "pending"
                        );

                        data.put(
                                "processingAt",
                                now
                        );

                        data.put(
                                "updatedAt",
                                now
                        );

                        data.put(
                                "error",
                                ""
                        );

                        return new TransferClaimResult(
                                true,
                                false,
                                data
                        );

                    })
                    .get();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to claim transfer for processing",
                    e
            );
        }
    }

    public void update(
            String transferId,
            Map<String, Object> data
    ) {

        if (transferId == null || transferId.isBlank()) {
            throw new IllegalArgumentException(
                    "Transfer ID is required"
            );
        }

        try {

            getDb()
                    .collection(COLLECTION)
                    .document(transferId)
                    .set(
                            data,
                            com.google.cloud.firestore.SetOptions.merge()
                    )
                    .get();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update transfer",
                    e
            );
        }
    }

    private String getString(Object value) {
        return value == null
                ? ""
                : String.valueOf(value);
    }

    public static class TransferClaimResult {

        private final boolean claimed;
        private final boolean hasGatewayTransfer;
        private final Map<String, Object> data;

        public TransferClaimResult(
                boolean claimed,
                boolean hasGatewayTransfer,
                Map<String, Object> data
        ) {
            this.claimed = claimed;
            this.hasGatewayTransfer = hasGatewayTransfer;
            this.data = data;
        }

        public boolean isClaimed() {
            return claimed;
        }

        public boolean hasGatewayTransfer() {
            return hasGatewayTransfer;
        }

        public Map<String, Object> getData() {
            return data;
        }
    }
}