package com.staytrack.backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PaymentRepository;
import com.staytrack.backend.repository.TransferRepository;

@Service
public class TransferService {

    private final TransferRepository transferRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final PaymentProvider paymentProvider;

    public TransferService(
            TransferRepository transferRepository,
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            PaymentProvider paymentProvider
    ) {
        this.transferRepository = transferRepository;
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.paymentProvider = paymentProvider;
    }

    /**
     * Creates a local transfer record if one does not already exist.
     *
     * This method does not move money.
     */
    public Map<String, Object> createPendingTransfer(
            String paymentId,
            String bookingId,
            String hostId,
            String linkedAccountId,
            long amount,
            String currency
    ) {

        validateRequired(paymentId, "paymentId");
        validateRequired(bookingId, "bookingId");
        validateRequired(hostId, "hostId");
        validateRequired(linkedAccountId, "linkedAccountId");

        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "Transfer amount must be greater than zero"
            );
        }

        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException(
                    "Transfer currency is required"
            );
        }

        try {

            List<QueryDocumentSnapshot> existing =
                    transferRepository.findByPaymentId(paymentId);

            if (existing != null && !existing.isEmpty()) {
                return existing.get(0).getData();
            }

            String transferId = paymentId;

            Timestamp now =
                    Timestamp.now();

            Map<String, Object> transfer =
                    new HashMap<>();

            transfer.put(
                    "transferId",
                    transferId
            );

            transfer.put(
                    "paymentId",
                    paymentId
            );

            transfer.put(
                    "bookingId",
                    bookingId
            );

            transfer.put(
                    "hostId",
                    hostId
            );

            /*
             * This value is required internally for Route.
             * It is never returned to customers.
             */
            transfer.put(
                    "linkedAccountId",
                    linkedAccountId
            );

            transfer.put(
                    "gatewayTransferId",
                    ""
            );

            transfer.put(
                    "amount",
                    amount
            );

            transfer.put(
                    "currency",
                    currency.toUpperCase()
            );

            transfer.put(
                    "status",
                    "pending"
            );

            transfer.put(
                    "settlementStatus",
                    "pending"
            );

            transfer.put(
                    "error",
                    ""
            );

            transfer.put(
                    "createdAt",
                    now
            );

            transfer.put(
                    "updatedAt",
                    now
            );

            try {
                transferRepository.createForPayment(
                        paymentId,
                        transfer
                );
                return transfer;
            } catch (RuntimeException createFailure) {
                List<QueryDocumentSnapshot> raced =
                        transferRepository.findByPaymentId(paymentId);
                if (raced != null && raced.size() == 1) {
                    Map<String, Object> racedData = raced.get(0).getData();
                    if (racedData != null) {
                        return racedData;
                    }
                }
                throw createFailure;
            }

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create transfer record",
                    e
            );
        }
    }

    /**
     * Automatically settles a captured booking payment
     * to the host through Razorpay Route.
     *
     * This method is intentionally idempotent:
     * if a transfer has already been created for the payment,
     * it will not create another transfer.
     */
    public Map<String, Object> settleCapturedBookingPayment(
            String paymentId
    ) {

        validateRequired(
                paymentId,
                "paymentId"
        );

        try {

            /*
             * ---------------------------------------------------------
             * 1. Load StayTrack payment
             * ---------------------------------------------------------
             */

            DocumentSnapshot paymentDocument =
                    paymentRepository.findById(paymentId);

            if (paymentDocument == null
                    || !paymentDocument.exists()) {

                throw new IllegalStateException(
                        "Payment not found: " + paymentId
                );
            }

            Map<String, Object> payment =
                    paymentDocument.getData();

            if (payment == null) {
                throw new IllegalStateException(
                        "Payment data is missing"
                );
            }

            String paymentType =
                    getString(
                            payment,
                            "type"
                    );

            if (!"booking".equalsIgnoreCase(
                    paymentType
            )) {

                throw new IllegalArgumentException(
                        "Only booking payments can be transferred"
                );
            }

            String paymentStatus =
                    getString(
                            payment,
                            "status"
                    );

            if (!"captured".equalsIgnoreCase(
                    paymentStatus
            )) {

                throw new IllegalStateException(
                        "Booking payment is not captured"
                );
            }

            /*
             * Razorpay Route does not allow a transfer to be initiated
             * once a refund has been initiated for the payment.
             * Keep this guard local as well so a cancellation/refund
             * race cannot accidentally trigger host settlement.
             */
            String refundStatus = getString(payment, "refundStatus");
            if (!refundStatus.isBlank()
                    && !"none".equalsIgnoreCase(refundStatus)) {
                throw new IllegalStateException(
                        "Host settlement is blocked because a refund is "
                                + "already in progress or completed"
                );
            }

            String bookingId =
                    getString(
                            payment,
                            "bookingId"
                    );

            if (bookingId.isBlank()) {

                throw new IllegalStateException(
                        "Booking payment has no booking ID"
                );
            }

            long paymentAmount =
                    getLong(
                            payment.get("amount"),
                            "Payment amount"
                    );

            if (paymentAmount <= 0) {

                throw new IllegalStateException(
                        "Payment amount is invalid"
                );
            }

            String currency =
                    getString(
                            payment,
                            "currency"
                    );

            if (currency.isBlank()) {
                currency = "INR";
            }

            /*
             * ---------------------------------------------------------
             * 2. Load booking
             * ---------------------------------------------------------
             */

            DocumentSnapshot bookingDocument =
                    bookingRepository.findById(
                            bookingId
                    );

            if (bookingDocument == null
                    || !bookingDocument.exists()) {

                throw new IllegalStateException(
                        "Booking not found: " + bookingId
                );
            }

            Map<String, Object> booking =
                    bookingDocument.getData();

            if (booking == null) {

                throw new IllegalStateException(
                        "Booking data is missing"
                );
            }

            String bookingHostId =
                    getString(
                            booking,
                            "hostId"
                    );

            if (bookingHostId.isBlank()) {

                throw new IllegalStateException(
                        "Booking has no host ID"
                );
            }

            if (!bookingId.equals(
                    getString(
                            payment,
                            "bookingId"
                    )
            )) {

                throw new SecurityException(
                        "Payment and booking relationship mismatch"
                );
            }

            long bookingAmount =
                    getLong(
                            booking.get("amount"),
                            "Booking amount"
                    );

            if (bookingAmount != paymentAmount) {

                throw new SecurityException(
                        "Payment amount does not match booking amount"
                );
            }

            String bookingStatus =
                    getString(
                            booking,
                            "bookingStatus"
                    );

            if ("cancelled".equalsIgnoreCase(
                    bookingStatus
            )
                    || "rejected".equalsIgnoreCase(
                    bookingStatus
            )) {

                throw new IllegalStateException(
                        "Cannot transfer payment for cancelled or rejected booking"
                );
            }

            String bookingPaymentStatus =
                    getString(booking, "paymentStatus");
            if (bookingPaymentStatus.equalsIgnoreCase("refund_pending")
                    || bookingPaymentStatus.equalsIgnoreCase("refunded")
                    || bookingPaymentStatus.equalsIgnoreCase("refund_failed")) {
                throw new IllegalStateException(
                        "Cannot transfer a booking with refund state: "
                                + bookingPaymentStatus
                );
            }

            /*
             * ---------------------------------------------------------
             * 3. Load host payment account
             * ---------------------------------------------------------
             */

            DocumentSnapshot hostDocument =
                    FirestoreClient
                            .getFirestore()
                            .collection("users")
                            .document(bookingHostId)
                            .get()
                            .get();

            if (hostDocument == null
                    || !hostDocument.exists()) {

                throw new IllegalStateException(
                        "Host user profile not found"
                );
            }

            Map<String, Object> host =
                    hostDocument.getData();

            if (host == null) {

                throw new IllegalStateException(
                        "Host user data is missing"
                );
            }

            String hostRole =
                    getString(
                            host,
                            "role"
                    );

            if (!"host".equalsIgnoreCase(
                    hostRole
            )) {

                throw new IllegalStateException(
                        "Booking host is not an approved host"
                );
            }

            Map<String, Object> paymentAccount =
                    getMap(
                            host,
                            "paymentAccount"
                    );

            if (paymentAccount == null) {

                throw new IllegalStateException(
                        "Host payment account is not configured"
                );
            }

            String provider =
                    getString(
                            paymentAccount,
                            "provider"
                    );

            if (!"razorpay".equalsIgnoreCase(
                    provider
            )) {

                throw new IllegalStateException(
                        "Unsupported host payment provider"
                );
            }

            String accountStatus =
                    getString(
                            paymentAccount,
                            "status"
                    );

            if (!"active".equalsIgnoreCase(
                    accountStatus
            )) {

                throw new IllegalStateException(
                        "Host payment account is not active"
                );
            }

            String linkedAccountId =
                    getString(
                            paymentAccount,
                            "linkedAccountId"
                    );

            if (linkedAccountId.isBlank()) {

                throw new IllegalStateException(
                        "Host Razorpay linked account is missing"
                );
            }

            /*
             * ---------------------------------------------------------
             * 4. Check existing transfer
             * ---------------------------------------------------------
             */

            List<QueryDocumentSnapshot> existing =
                    transferRepository.findByPaymentId(
                            paymentId
                    );

            if (existing != null
                    && !existing.isEmpty()) {

                Map<String, Object> existingTransfer =
                        existing.get(0).getData();

                if (existingTransfer == null) {
                    throw new IllegalStateException(
                            "Existing transfer data is missing"
                    );
                }

                String existingGatewayTransferId =
                        getString(
                                existingTransfer,
                                "gatewayTransferId"
                        );

                String existingStatus =
                        getString(
                                existingTransfer,
                                "status"
                        );

                /*
                 * A transfer already created at Razorpay must never
                 * be submitted again.
                 */
                if (!existingGatewayTransferId.isBlank()) {
                    return existingTransfer;
                }

                /*
                 * If the local transfer is still pending and does
                 * not have a gateway transfer ID, continue below.
                 */
                if ("processed".equalsIgnoreCase(
                        existingStatus
                )
                        || "completed".equalsIgnoreCase(
                        existingStatus
                )) {

                    return existingTransfer;
                }
            }

            /*
             * ---------------------------------------------------------
             * 5. Create local transfer record
             * ---------------------------------------------------------
             */

            Map<String, Object> transfer =
                    createPendingTransfer(
                            paymentId,
                            bookingId,
                            bookingHostId,
                            linkedAccountId,
                            paymentAmount,
                            currency
                    );

            String transferId =
                    getString(
                            transfer,
                            "transferId"
                    );

            /*
             * Atomically claim the local transfer. This prevents two
             * webhook/retry paths from creating two Route transfers.
             */
            TransferRepository.TransferClaimResult claim =
                    transferRepository.claimForProcessing(transferId);

            if (claim.hasGatewayTransfer()) {
                return claim.getData();
            }

            if (!claim.isClaimed()) {
                Map<String, Object> current = claim.getData();
                if (current != null) {
                    String currentStatus = getString(current, "status");
                    if ("processed".equalsIgnoreCase(currentStatus)
                            || "reversed".equalsIgnoreCase(currentStatus)) {
                        return current;
                    }
                }
                throw new IllegalStateException(
                        "Transfer is already being processed or is not eligible for processing"
                );
            }

            /*
             * ---------------------------------------------------------
             * 6. Create actual Razorpay Route transfer
             * ---------------------------------------------------------
             */

            Map<String, Object> notes =
                    new HashMap<>();

            notes.put(
                    "staytrackPaymentId",
                    paymentId
            );

            notes.put(
                    "bookingId",
                    bookingId
            );

            notes.put(
                    "staytrackTransferId",
                    transferId
            );

            notes.put(
                    "hostId",
                    bookingHostId
            );

            Map<String, Object> gatewayTransfer =
                    paymentProvider.createRouteTransfer(
                            paymentId,
                            linkedAccountId,
                            paymentAmount,
                            currency,
                            notes
                    );

            String gatewayTransferId =
                    getString(
                            gatewayTransfer,
                            "transferId"
                    );

            if (gatewayTransferId.isBlank()) {

                throw new IllegalStateException(
                        "Razorpay did not return a transfer ID"
                );
            }

            String gatewayStatus =
                    getString(
                            gatewayTransfer,
                            "transferStatus"
                    );

            if (gatewayStatus.isBlank()) {
                gatewayStatus =
                        getString(
                                gatewayTransfer,
                                "status"
                        );
            }

            if (gatewayStatus.isBlank()) {
                gatewayStatus = "created";
            }

            String settlementStatus =
                    getString(
                            gatewayTransfer,
                            "settlementStatus"
                    );

            if (settlementStatus.isBlank()) {
                settlementStatus = "pending";
            }

            /*
             * ---------------------------------------------------------
             * 7. Save gateway transfer information
             * ---------------------------------------------------------
             */

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "gatewayTransferId",
                    gatewayTransferId
            );

            updates.put(
                    "status",
                    normalizeTransferStatus(
                            gatewayStatus
                    )
            );

            updates.put(
                    "settlementStatus",
                    normalizeSettlementStatus(
                            settlementStatus
                    )
            );

            updates.put(
                    "error",
                    ""
            );

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            transferRepository.update(
                    transferId,
                    updates
            );

            transfer.putAll(
                    updates
            );

            return transfer;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Transfer processing was interrupted",
                    e
            );

        } catch (IllegalStateException
                | IllegalArgumentException
                | SecurityException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to settle booking payment",
                    e
            );
        }
    }

    /**
     * Reconciles a local transfer with Razorpay without creating a new transfer.
     *
     * This is used by recovery after a process/network failure where Razorpay may
     * have created the transfer but StayTrack did not persist the gateway ID.
     */
    public Map<String, Object> reconcileTransfer(String paymentId) {
        validateRequired(paymentId, "Payment ID");

        try {
            DocumentSnapshot paymentDocument =
                    paymentRepository.findById(paymentId);

            if (paymentDocument == null || !paymentDocument.exists()) {
                throw new IllegalStateException(
                        "Payment not found: " + paymentId
                );
            }

            Map<String, Object> payment = paymentDocument.getData();
            if (payment == null) {
                throw new IllegalStateException("Payment data is missing");
            }

            String gatewayPaymentId = getString(payment.get("gatewayPaymentId"));
            if (gatewayPaymentId.isBlank()) {
                throw new IllegalStateException(
                        "Payment has no Razorpay payment ID for transfer reconciliation"
                );
            }

            List<QueryDocumentSnapshot> localTransfers =
                    transferRepository.findByPaymentId(paymentId);

            if (localTransfers == null || localTransfers.isEmpty()) {
                throw new IllegalStateException(
                        "StayTrack transfer record not found for payment: " + paymentId
                );
            }

            if (localTransfers.size() > 1) {
                throw new IllegalStateException(
                        "Multiple StayTrack transfers exist for payment: " + paymentId
                );
            }

            QueryDocumentSnapshot localDocument = localTransfers.get(0);
            Map<String, Object> localData = localDocument.getData();
            if (localData == null) {
                throw new IllegalStateException("Transfer data is missing");
            }

            String knownGatewayTransferId =
                    getString(localData.get("gatewayTransferId"));

            List<Map<String, Object>> gatewayTransfers =
                    paymentProvider.fetchRouteTransfers(gatewayPaymentId);

            if (gatewayTransfers == null || gatewayTransfers.isEmpty()) {
                Map<String, Object> result = new HashMap<>(localData);
                result.put("transferId", localDocument.getId());
                result.put("reconciled", false);
                return result;
            }

            Map<String, Object> matched = null;

            if (!knownGatewayTransferId.isBlank()) {
                for (Map<String, Object> candidate : gatewayTransfers) {
                    if (candidate != null && knownGatewayTransferId.equals(
                            getString(candidate.get("id")))) {
                        matched = candidate;
                        break;
                    }
                }
            }

            if (matched == null) {
                String localTransferId =
                        getString(localData.get("transferId"));
                for (Map<String, Object> candidate : gatewayTransfers) {
                    if (candidate == null) {
                        continue;
                    }
                    String candidateId = getString(candidate.get("id"));
                    String notesTransferId = extractNote(
                            candidate.get("notes"), "staytrackTransferId"
                    );
                    if (!localTransferId.isBlank() && localTransferId.equals(notesTransferId)) {
                        matched = candidate;
                        break;
                    }
                    if (!candidateId.isBlank() && gatewayTransfers.size() == 1) {
                        matched = candidate;
                    }
                }
            }

            if (matched == null) {
                Map<String, Object> result = new HashMap<>(localData);
                result.put("transferId", localDocument.getId());
                result.put("reconciled", false);
                return result;
            }

            String gatewayTransferId = getString(matched.get("id"));
            if (gatewayTransferId.isBlank()) {
                throw new IllegalStateException(
                        "Razorpay transfer response has no transfer ID"
                );
            }

            String status = getString(matched.get("status"));
            String settlementStatus = getString(matched.get("settlement_status"));
            if (settlementStatus.isBlank()) {
                settlementStatus = getString(matched.get("settlementStatus"));
            }
            String error = getString(matched.get("error"));

            Map<String, Object> updates = new HashMap<>();
            updates.put("gatewayTransferId", gatewayTransferId);
            updates.put("status", normalizeTransferStatus(status));
            updates.put("settlementStatus", normalizeSettlementStatus(settlementStatus));
            updates.put("error", error);
            updates.put("reconciliationStatus", "reconciled");
            updates.put("lastReconciliationAt", Timestamp.now());
            updates.put("reconciliationError", "");
            updates.put("updatedAt", Timestamp.now());

            transferRepository.update(localDocument.getId(), updates);

            Map<String, Object> result = new HashMap<>(localData);
            result.put("transferId", localDocument.getId());
            result.putAll(updates);
            result.put("reconciled", true);
            return result;

        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to reconcile transfer", e
            );
        }
    }

    private String extractNote(Object notesValue, String key) {
        if (notesValue instanceof Map<?, ?> notes) {
            Object value = notes.get(key);
            return value == null ? "" : String.valueOf(value);
        }
        return "";
    }

    /**
     * Updates a local transfer after a Razorpay Route webhook.
     */
    public Map<String, Object> updateTransferFromGateway(
            String gatewayTransferId,
            String status,
            String settlementStatus,
            String error
    ) {

        validateRequired(
                gatewayTransferId,
                "Gateway transfer ID"
        );

        try {

            List<QueryDocumentSnapshot> transfers =
                    transferRepository.findByGatewayTransferId(
                            gatewayTransferId
                    );

            if (transfers == null
                    || transfers.isEmpty()) {

                /*
                 * We intentionally do not create local transfer
                 * records from webhook data.
                 */
                throw new IllegalStateException(
                        "StayTrack transfer not found for gateway transfer: "
                                + gatewayTransferId
                );
            }

            if (transfers.size() > 1) {

                throw new IllegalStateException(
                        "Multiple StayTrack transfers match gateway transfer"
                );
            }

            QueryDocumentSnapshot transfer =
                    transfers.get(0);

            Map<String, Object> updates =
                    new HashMap<>();

            if (status != null
                    && !status.isBlank()) {

                updates.put(
                        "status",
                        normalizeTransferStatus(
                                status
                        )
                );
            }

            if (settlementStatus != null
                    && !settlementStatus.isBlank()) {

                updates.put(
                        "settlementStatus",
                        normalizeSettlementStatus(
                                settlementStatus
                        )
                );
            }

            if (error != null) {

                updates.put(
                        "error",
                        error
                );
            }

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            transferRepository.update(
                    transfer.getId(),
                    updates
            );

            Map<String, Object> persisted = transfer.getData();
            if (persisted == null) {
                persisted = new HashMap<>();
            }
            persisted.putAll(updates);

            String paymentId = getString(persisted, "paymentId");
            if (!paymentId.isBlank()) {
                Map<String, Object> paymentUpdates = new HashMap<>();
                String normalizedStatus = normalizeTransferStatus(status);
                String normalizedSettlement = normalizeSettlementStatus(settlementStatus);
                paymentUpdates.put("transferId", transfer.getId());
                paymentUpdates.put("gatewayTransferId", gatewayTransferId);
                paymentUpdates.put("settlementStatus", normalizedSettlement);
                paymentUpdates.put("settlementError", error != null ? error : "");
                if ("failed".equals(normalizedStatus)) {
                    paymentUpdates.put("settlementStatus", "failed");
                } else if ("reversed".equals(normalizedStatus)
                        || "partially_reversed".equals(normalizedStatus)) {
                    paymentUpdates.put("settlementStatus", normalizedStatus);
                }
                paymentUpdates.put("updatedAt", System.currentTimeMillis());
                paymentRepository.update(paymentId, paymentUpdates);
            }

            Map<String, Object> result = persisted;

            result.put(
                    "transferId",
                    transfer.getId()
            );

            result.putAll(
                    updates
            );

            return result;

        } catch (IllegalStateException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update transfer status",
                    e
            );
        }
    }

    /**
     * Gets a transfer by local StayTrack transfer ID.
     */
    public Map<String, Object> getTransfer(
            String transferId
    ) {

        validateRequired(
                transferId,
                "transferId"
        );

        try {

            DocumentSnapshot transfer =
                    transferRepository.findById(
                            transferId
                    );

            if (transfer == null
                    || !transfer.exists()) {

                throw new IllegalArgumentException(
                        "Transfer not found"
                );
            }

            Map<String, Object> data =
                    transfer.getData();

            if (data == null) {

                throw new IllegalStateException(
                        "Transfer data is missing"
                );
            }

            data.put(
                    "transferId",
                    transfer.getId()
            );

            /*
             * Do not expose the host's linked account ID
             * through generic transfer responses.
             */
            data.remove(
                    "linkedAccountId"
            );

            return data;

        } catch (IllegalArgumentException
                | IllegalStateException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get transfer",
                    e
            );
        }
    }

    /**
     * Gets all transfers belonging to a host.
     *
     * Linked account IDs are removed from the response.
     */
    public List<Map<String, Object>> getHostTransfers(
            String hostId
    ) {

        validateRequired(
                hostId,
                "hostId"
        );

        try {

            List<QueryDocumentSnapshot> documents =
                    transferRepository.findByHostId(
                            hostId
                    );

            List<Map<String, Object>> result =
                    new java.util.ArrayList<>();

            if (documents == null) {
                return result;
            }

            for (QueryDocumentSnapshot document
                    : documents) {

                Map<String, Object> data =
                        document.getData();

                if (data == null) {
                    continue;
                }

                data.put(
                        "transferId",
                        document.getId()
                );

                data.remove(
                        "linkedAccountId"
                );

                result.add(data);
            }

            return result;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get host transfers",
                    e
            );
        }
    }

    private String normalizeTransferStatus(
            String status
    ) {

        if (status == null
                || status.isBlank()) {

            return "pending";
        }

        String value =
                status.trim()
                        .toLowerCase();

        switch (value) {

            case "created":
            case "pending":
            case "processed":
            case "failed":
            case "reversed":
            case "partially_reversed":
                return value;

            default:
                return "pending";
        }
    }

    private String normalizeSettlementStatus(
            String status
    ) {

        if (status == null
                || status.isBlank()) {

            return "pending";
        }

        String value =
                status.trim()
                        .toLowerCase();

        switch (value) {

            case "pending":
            case "on_hold":
            case "settled":
                return value;

            default:
                return "pending";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(
            Map<String, Object> data,
            String field
    ) {

        if (data == null) {
            return null;
        }

        Object value =
                data.get(field);

        if (!(value instanceof Map)) {
            return null;
        }

        return new HashMap<>(
                (Map<String, Object>) value
        );
    }

    private String getString(
            Map<String, Object> data,
            String field
    ) {

        if (data == null) {
            return "";
        }

        Object value =
                data.get(field);

        if (value == null) {
            return "";
        }

        return String.valueOf(value);
    }

    private String getString(Object value) {

        if (value == null) {
                return "";
        }

        return String.valueOf(value);
}

    private long getLong(
            Object value,
            String field
    ) {

        if (value == null) {

            throw new IllegalStateException(
                    field + " is missing"
            );
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {

            return Long.parseLong(
                    String.valueOf(value)
            );

        } catch (NumberFormatException e) {

            throw new IllegalStateException(
                    field + " is invalid"
            );
        }
    }

    private void validateRequired(
            String value,
            String field
    ) {

        if (value == null
                || value.isBlank()) {

            throw new IllegalArgumentException(
                    field + " is required"
            );
        }
    }
}