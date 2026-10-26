package com.staytrack.backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;
import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PaymentRepository;
import com.staytrack.backend.repository.WebhookEventRepository;

@Service
public class RazorpayWebhookService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final WebhookEventRepository webhookEventRepository;
    private final PaymentProvider paymentProvider;
    private final SubscriptionService subscriptionService;
    private final TransferService transferService;
    private final RefundService refundService;

    public RazorpayWebhookService(
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            WebhookEventRepository webhookEventRepository,
            PaymentProvider paymentProvider,
            SubscriptionService subscriptionService,
            TransferService transferService,
            RefundService refundService
    ) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.paymentProvider = paymentProvider;
        this.subscriptionService = subscriptionService;
        this.transferService = transferService;
        this.refundService = refundService;
    }

    /**
     * Processes a Razorpay webhook.
     *
     * Returns true when the event was successfully processed
     * or intentionally ignored.
     *
     * Returns false when Razorpay should retry the webhook.
     */
    public boolean processWebhook(
            String payload,
            String signature,
            String eventId
    ) {

        if (payload == null || payload.isBlank()) {

            throw new IllegalArgumentException(
                    "Webhook payload is required"
            );
        }

        if (signature == null || signature.isBlank()) {

            throw new SecurityException(
                    "Webhook signature is required"
            );
        }

        if (eventId == null || eventId.isBlank()) {

            throw new SecurityException(
                    "Webhook event ID is required"
            );
        }

        /*
         * Verify the signature against the original
         * raw request body.
         */
        if (!paymentProvider.verifyWebhookSignature(
                payload,
                signature
        )) {

            throw new SecurityException(
                    "Invalid Razorpay webhook signature"
            );
        }

        /*
         * Idempotency.
         */
        if (webhookEventRepository.exists(
                eventId
        )) {

            return true;
        }

        JSONObject root =
                new JSONObject(payload);

        String eventType =
                root.optString(
                        "event",
                        ""
                );

        if (eventType.isBlank()) {

            throw new IllegalArgumentException(
                    "Webhook event type is missing"
            );
        }

        boolean processed;

        switch (eventType) {

            case "payment.authorized":

                processed =
                        handlePaymentAuthorized(
                                root
                        );

                break;

            case "payment.captured":

                processed =
                        handlePaymentCaptured(
                                root
                        );

                break;

            case "payment.failed":

                processed =
                        handlePaymentFailed(
                                root
                        );

                break;

            case "order.paid":

                processed =
                        handleOrderPaid(
                                root
                        );

                break;

            case "transfer.processed":

                processed =
                        handleTransferProcessed(
                                root
                        );

                break;

            case "transfer.failed":

                processed =
                        handleTransferFailed(
                                root
                        );

                break;

            case "transfer.reversed":

                processed =
                        handleTransferReversed(
                                root
                        );

                break;

            case "refund.created":
            case "refund.processed":
            case "refund.failed":

                processed = handleRefundEvent(root, eventType);

                break;

            default:

                /*
                 * Unknown events are acknowledged.
                 */
                processed = true;

                break;
        }

        /*
         * Only record the webhook after successful processing.
         */
        if (processed) {

            webhookEventRepository.create(
                    eventId,
                    eventType
            );
        }

        return processed;
    }

    // ============================================================
    // PAYMENT AUTHORIZED
    // ============================================================

    private boolean handlePaymentAuthorized(
            JSONObject root
    ) {

        JSONObject payment =
                getPaymentEntity(root);

        if (payment == null) {
            return true;
        }

        String gatewayPaymentId =
                payment.optString(
                        "id",
                        ""
                );

        String gatewayOrderId =
                payment.optString(
                        "order_id",
                        ""
                );

        if (gatewayPaymentId.isBlank()
                && gatewayOrderId.isBlank()) {

            return true;
        }

        return updatePaymentStatus(
                gatewayPaymentId,
                gatewayOrderId,
                "authorized"
        );
    }

    // ============================================================
    // PAYMENT CAPTURED
    // ============================================================

    private boolean handlePaymentCaptured(
            JSONObject root
    ) {

        JSONObject payment =
                getPaymentEntity(root);

        if (payment == null) {
            return true;
        }

        String gatewayPaymentId =
                payment.optString(
                        "id",
                        ""
                );

        String gatewayOrderId =
                payment.optString(
                        "order_id",
                        ""
                );

        if (gatewayPaymentId.isBlank()
                && gatewayOrderId.isBlank()) {

            return true;
        }

        /*
         * Reconcile against Razorpay API instead of
         * trusting only the webhook payload.
         */
        if (gatewayPaymentId.isBlank()) {
            return false;
        }

        Map<String, Object> gatewayPayment =
                paymentProvider.fetchPayment(
                        gatewayPaymentId
                );

        String actualStatus =
                String.valueOf(
                        gatewayPayment.get(
                                "status"
                        )
                );

        if (!"captured".equalsIgnoreCase(
                actualStatus
        )) {

            return false;
        }

        if (!gatewayOrderId.isBlank()) {

            String actualOrderId =
                    String.valueOf(
                            gatewayPayment.get(
                                    "orderId"
                            )
                    );

            if (!gatewayOrderId.equals(
                    actualOrderId
            )) {

                throw new SecurityException(
                        "Webhook payment order mismatch"
                );
            }
        }

        return updatePaymentStatus(
                gatewayPaymentId,
                gatewayOrderId,
                "captured"
        );
    }

    // ============================================================
    // PAYMENT FAILED
    // ============================================================

    private boolean handlePaymentFailed(
            JSONObject root
    ) {

        JSONObject payment =
                getPaymentEntity(root);

        if (payment == null) {
            return true;
        }

        String gatewayPaymentId =
                payment.optString(
                        "id",
                        ""
                );

        String gatewayOrderId =
                payment.optString(
                        "order_id",
                        ""
                );

        if (gatewayPaymentId.isBlank()
                && gatewayOrderId.isBlank()) {

            return true;
        }

        return updatePaymentStatus(
                gatewayPaymentId,
                gatewayOrderId,
                "failed"
        );
    }

    // ============================================================
    // ORDER PAID
    // ============================================================

    private boolean handleOrderPaid(
            JSONObject root
    ) {

        JSONObject payment =
                getPaymentEntity(root);

        if (payment == null) {
            return true;
        }

        String gatewayPaymentId =
                payment.optString(
                        "id",
                        ""
                );

        String gatewayOrderId =
                payment.optString(
                        "order_id",
                        ""
                );

        if (gatewayPaymentId.isBlank()) {
            return false;
        }

        Map<String, Object> gatewayPayment =
                paymentProvider.fetchPayment(
                        gatewayPaymentId
                );

        String actualStatus =
                String.valueOf(
                        gatewayPayment.get(
                                "status"
                        )
                );

        if (!"captured".equalsIgnoreCase(
                actualStatus
        )) {

            return false;
        }

        if (!gatewayOrderId.isBlank()) {

            String actualOrderId =
                    String.valueOf(
                            gatewayPayment.get(
                                    "orderId"
                            )
                    );

            if (!gatewayOrderId.equals(
                    actualOrderId
            )) {

                throw new SecurityException(
                        "Webhook payment order mismatch"
                );
            }
        }

        return updatePaymentStatus(
                gatewayPaymentId,
                gatewayOrderId,
                "captured"
        );
    }

    // ============================================================
    // TRANSFER PROCESSED
    // ============================================================

    private boolean handleTransferProcessed(
            JSONObject root
    ) {

        JSONObject transfer =
                getTransferEntity(root);

        if (transfer == null) {
            return true;
        }

        String gatewayTransferId =
                transfer.optString(
                        "id",
                        ""
                );

        if (gatewayTransferId.isBlank()) {
            return false;
        }

        String status =
                transfer.optString(
                        "status",
                        "processed"
                );

        String settlementStatus =
                transfer.optString(
                        "settlement_status",
                        ""
                );

        return updateLocalTransfer(
                gatewayTransferId,
                status,
                settlementStatus,
                ""
        );
    }

    // ============================================================
    // TRANSFER FAILED
    // ============================================================

    private boolean handleTransferFailed(
            JSONObject root
    ) {

        JSONObject transfer =
                getTransferEntity(root);

        if (transfer == null) {
            return true;
        }

        String gatewayTransferId =
                transfer.optString(
                        "id",
                        ""
                );

        if (gatewayTransferId.isBlank()) {
            return false;
        }

        String status =
                transfer.optString(
                        "status",
                        "failed"
                );

        String settlementStatus =
                transfer.optString(
                        "settlement_status",
                        ""
                );

        String error =
                extractTransferError(
                        transfer
                );

        return updateLocalTransfer(
                gatewayTransferId,
                status,
                settlementStatus,
                error
        );
    }

    // ============================================================
    // TRANSFER REVERSED
    // ============================================================

    private boolean handleTransferReversed(
            JSONObject root
    ) {

        JSONObject transfer =
                getTransferEntity(root);

        if (transfer == null) {
            return true;
        }

        String gatewayTransferId =
                transfer.optString(
                        "id",
                        ""
                );

        if (gatewayTransferId.isBlank()) {
            return false;
        }

        String status =
                transfer.optString(
                        "status",
                        "reversed"
                );

        String settlementStatus =
                transfer.optString(
                        "settlement_status",
                        ""
                );

        return updateLocalTransfer(
                gatewayTransferId,
                status,
                settlementStatus,
                ""
        );
    }

    // ============================================================
    // REFUND WEBHOOKS
    // ============================================================

    private boolean handleRefundEvent(
            JSONObject root,
            String eventType
    ) {
        JSONObject refund = getRefundEntity(root);
        if (refund == null) {
            return true;
        }

        String gatewayRefundId = refund.optString("id", "");
        String gatewayPaymentId = refund.optString("payment_id", "");
        if (gatewayPaymentId.isBlank()) {
            JSONObject payment = root.optJSONObject("payload") == null
                    ? null
                    : root.optJSONObject("payload")
                            .optJSONObject("payment");
            if (payment != null) {
                JSONObject entity = payment.optJSONObject("entity");
                if (entity != null) {
                    gatewayPaymentId = entity.optString("id", "");
                }
            }
        }

        if (gatewayPaymentId.isBlank()) {
            return false;
        }

        String status = refund.optString("status", "");
        if (status.isBlank()) {
            if ("refund.created".equals(eventType)) {
                status = "created";
            } else if ("refund.processed".equals(eventType)) {
                status = "processed";
            } else if ("refund.failed".equals(eventType)) {
                status = "failed";
            }
        }

        String failureReason = "";
        JSONObject error = refund.optJSONObject("error");
        if (error != null) {
            failureReason = error.optString("description", "");
            if (failureReason.isBlank()) {
                failureReason = error.optString("reason", "");
            }
        }

        try {
            return refundService.applyRefundWebhook(
                    gatewayPaymentId,
                    gatewayRefundId,
                    status,
                    failureReason
            );
        } catch (IllegalStateException e) {
            return false;
        }
    }

    private JSONObject getRefundEntity(JSONObject root) {
        JSONObject payload = root.optJSONObject("payload");
        if (payload == null) {
            return null;
        }
        JSONObject refund = payload.optJSONObject("refund");
        if (refund == null) {
            return null;
        }
        return refund.optJSONObject("entity");
    }

    // ============================================================
    // LOCAL TRANSFER UPDATE
    // ============================================================

    private boolean updateLocalTransfer(
            String gatewayTransferId,
            String status,
            String settlementStatus,
            String error
    ) {

        try {

            transferService.updateTransferFromGateway(
                    gatewayTransferId,
                    status,
                    settlementStatus,
                    error
            );

            return true;

        } catch (IllegalStateException e) {

            /*
             * Do not silently accept a transfer that did not
             * originate from StayTrack.
             *
             * Returning false makes Razorpay retry the event.
             */
            return false;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to process Razorpay transfer webhook",
                    e
            );
        }
    }

    // ============================================================
    // UPDATE LOCAL PAYMENT
    // ============================================================

    private boolean updatePaymentStatus(
            String gatewayPaymentId,
            String gatewayOrderId,
            String status
    ) {

        try {

            List<QueryDocumentSnapshot> payments =
                    null;

            /*
             * First lookup:
             * Razorpay payment ID.
             */
            if (gatewayPaymentId != null
                    && !gatewayPaymentId.isBlank()) {

                payments =
                        paymentRepository.findByGatewayPaymentId(
                                gatewayPaymentId
                        );
            }

            /*
             * Fallback lookup:
             * Razorpay order ID.
             */
            if ((payments == null
                    || payments.isEmpty())
                    && gatewayOrderId != null
                    && !gatewayOrderId.isBlank()) {

                payments =
                        paymentRepository.findByGatewayOrderId(
                                gatewayOrderId
                        );
            }

            /*
             * Never create a payment from webhook data.
             */
            if (payments == null
                    || payments.isEmpty()) {

                return false;
            }

            if (payments.size() > 1) {

                throw new IllegalStateException(
                        "Multiple StayTrack payments match the Razorpay payment/order"
                );
            }

            QueryDocumentSnapshot payment =
                    payments.get(0);

            String paymentId =
                    payment.getId();

            Map<String, Object> paymentData =
                    payment.getData();

            if (paymentData == null) {

                throw new IllegalStateException(
                        "Payment data is missing"
                );
            }

            String storedGatewayPaymentId =
                    String.valueOf(
                            paymentData.get(
                                    "gatewayPaymentId"
                            )
                    );

            Map<String, Object> updates =
                    new HashMap<>();

            if (gatewayPaymentId != null
                    && !gatewayPaymentId.isBlank()
                    && (storedGatewayPaymentId.isBlank()
                    || "null".equalsIgnoreCase(
                    storedGatewayPaymentId
            ))) {

                updates.put(
                        "gatewayPaymentId",
                        gatewayPaymentId
                );
            }

            String currentStatus =
                    String.valueOf(
                            paymentData.get(
                                    "status"
                            )
                    );

            /*
             * Never downgrade a captured payment.
             */
            if ("captured".equalsIgnoreCase(
                    currentStatus
            )) {

                if ("booking".equalsIgnoreCase(
                        String.valueOf(
                                paymentData.get(
                                        "type"
                                )
                        )
                )) {

                    confirmBookingFromPayment(
                            paymentData
                    );

                    /*
                     * The payment may already have been
                     * captured before this webhook arrived.
                     *
                     * Ensure settlement is also attempted.
                     */
                    settleBookingPayment(
                            paymentId
                    );
                }

                if (!updates.isEmpty()) {

                    updates.put(
                            "updatedAt",
                            System.currentTimeMillis()
                    );

                    paymentRepository.update(
                            paymentId,
                            updates
                    );
                }

                return true;
            }

            /*
             * Prevent failed -> authorized.
             */
            if ("failed".equalsIgnoreCase(
                    currentStatus
            )
                    && "authorized".equalsIgnoreCase(
                    status
            )) {

                if (!updates.isEmpty()) {

                    updates.put(
                            "updatedAt",
                            System.currentTimeMillis()
                    );

                    paymentRepository.update(
                            paymentId,
                            updates
                    );
                }

                return true;
            }

            updates.put(
                    "status",
                    status
            );

            updates.put(
                    "updatedAt",
                    System.currentTimeMillis()
            );

            paymentRepository.update(
                    paymentId,
                    updates
            );

            /*
             * Captured payment triggers the corresponding
             * StayTrack business action.
             */
            if ("captured".equalsIgnoreCase(
                    status
            )) {

                String type =
                        String.valueOf(
                                paymentData.get(
                                        "type"
                                )
                        );

                if ("subscription".equalsIgnoreCase(
                        type
                )) {

                    activateSubscription(
                            paymentData
                    );

                } else if ("booking".equalsIgnoreCase(
                        type
                )) {

                    confirmBookingFromPayment(
                            paymentData
                    );

                    /*
                     * Booking is confirmed first.
                     * Settlement is independent and retryable.
                     */
                    settleBookingPayment(
                            paymentId
                    );
                }
            } else if ("failed".equalsIgnoreCase(status)) {
                String type =
                        String.valueOf(
                                paymentData.get(
                                        "type"
                                )
                        );
                if ("booking".equalsIgnoreCase(type)) {
                    handleBookingPaymentFailed(paymentData);
                }
            }

            return true;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Webhook payment processing was interrupted",
                    e
            );

        } catch (SecurityException e) {

            throw e;

        } catch (IllegalStateException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to process Razorpay payment webhook",
                    e
            );
        }
    }

    /**
     * Settlement failure should cause the webhook to retry.
     *
     * The booking itself is already confirmed because customer
     * payment capture and host settlement are separate operations.
     */
    private void settleBookingPayment(
            String paymentId
    ) {

        try {
            DocumentSnapshot payDoc = paymentRepository.findById(paymentId);
            if (payDoc != null && payDoc.exists()) {
                Map<String, Object> pData = payDoc.getData();
                if (pData != null) {
                    String refundStatus = String.valueOf(pData.getOrDefault("refundStatus", "")).trim().toLowerCase();
                    if (!refundStatus.isBlank() && !"none".equals(refundStatus)) {
                        return;
                    }

                    String bookingId = String.valueOf(pData.getOrDefault("bookingId", "")).trim();
                    if (!bookingId.isBlank()) {
                        DocumentSnapshot bDoc = bookingRepository.findById(bookingId);
                        if (bDoc.exists()) {
                            String bStatus = String.valueOf(bDoc.get("bookingStatus")).trim().toLowerCase();
                            if (!"confirmed".equals(bStatus)) {
                                return;
                            }
                        }
                    }
                }
            }

            transferService
                    .settleCapturedBookingPayment(
                            paymentId
                    );

        } catch (IllegalStateException e) {

            /*
             * Configuration/business problems such as an inactive
             * host payment account must be retried after the account
             * is fixed.
             */
            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to settle captured booking payment",
                    e
            );
        }
    }

    // ============================================================
    // SUBSCRIPTION ACTIVATION
    // ============================================================

    private void activateSubscription(
            Map<String, Object> paymentData
    ) {

        String hostId =
                String.valueOf(
                        paymentData.get(
                                "userId"
                        )
                );

        if (hostId == null
                || hostId.isBlank()
                || "null".equalsIgnoreCase(
                hostId
        )) {

            throw new IllegalStateException(
                    "Subscription payment has no host ID"
            );
        }

        subscriptionService
                .activateSubscriptionAfterPayment(
                        hostId,
                        paymentData
                );
    }

    // ============================================================
    // BOOKING CONFIRMATION
    // ============================================================

    private void confirmBookingFromPayment(
            Map<String, Object> paymentData
    ) {

        String bookingId =
                String.valueOf(
                        paymentData.get(
                                "bookingId"
                        )
                );

        if (bookingId == null
                || bookingId.isBlank()
                || "null".equalsIgnoreCase(
                bookingId
        )) {

            throw new IllegalStateException(
                    "Booking payment has no booking ID"
            );
        }

        try {

            DocumentSnapshot booking =
                    bookingRepository.findById(
                            bookingId
                    );

            if (!booking.exists()) {

                throw new IllegalStateException(
                        "Booking not found: "
                                + bookingId
                );
            }

            Map<String, Object> bookingData =
                    booking.getData();

            if (bookingData == null) {

                throw new IllegalStateException(
                        "Booking data not found: "
                                + bookingId
                );
            }

            String currentStatus =
                    String.valueOf(
                            bookingData.get(
                                    "bookingStatus"
                            )
                    );

            /*
             * Idempotent confirmation: if already confirmed, do nothing.
             */
            if ("confirmed".equalsIgnoreCase(
                    currentStatus
            )) {
                return;
            }

            /*
             * If booking is in a terminal state (cancelled, rejected, expired, completed),
             * never confirm. If payment was captured, ensure refund is initiated safely.
             */
            if ("cancelled".equalsIgnoreCase(currentStatus)
                    || "rejected".equalsIgnoreCase(currentStatus)
                    || "expired".equalsIgnoreCase(currentStatus)
                    || "completed".equalsIgnoreCase(currentStatus)) {

                if ("captured".equalsIgnoreCase(String.valueOf(paymentData.get("status")))) {
                    try {
                        refundService.processBookingCancellation(bookingId);
                    } catch (Exception refundEx) {
                        throw new RuntimeException("Unable to process refund for terminal booking", refundEx);
                    }
                }
                return;
            }

            String bookingCustomerId =
                    String.valueOf(
                            bookingData.get(
                                    "customerId"
                            )
                    );

            String paymentCustomerId =
                    String.valueOf(
                            paymentData.get(
                                    "userId"
                            )
                    );

            if (!paymentCustomerId.equals(
                    bookingCustomerId
            )) {

                throw new SecurityException(
                        "Booking payment customer does not match booking customer"
                );
            }

            long bookingAmount =
                    getLongValue(
                            bookingData.get(
                                    "amount"
                            ),
                            "Booking amount"
                    );

            long paymentAmount =
                    getLongValue(
                            paymentData.get(
                                    "amount"
                            ),
                            "Payment amount"
                    );

            if (bookingAmount != paymentAmount) {

                throw new SecurityException(
                        "Booking payment amount does not match booking amount"
                );
            }

            String propertyId =
                    String.valueOf(
                            bookingData.get(
                                    "propertyId"
                            )
                    );

            try {
                bookingRepository.confirmWithAvailabilityCheck(
                        propertyId,
                        bookingId
                );
            } catch (IllegalStateException e) {
                // If late payment arrives after hold expired or conflict occurred:
                // 1. Mark booking cancelled and release hold
                Map<String, Object> bookingUpdates = new HashMap<>();
                bookingUpdates.put("bookingStatus", "cancelled");
                bookingUpdates.put("updatedAt", Timestamp.now());
                bookingUpdates.put("holdExpiresAt", null);
                bookingUpdates.put("cancellationReason", "Late payment: " + e.getMessage());
                try {
                    bookingRepository.update(bookingId, bookingUpdates);
                } catch (Exception ignored) {}

                // 2. Trigger automatic refund
                try {
                    refundService.processBookingCancellation(bookingId);
                } catch (Exception refundEx) {
                    throw new RuntimeException("Late payment conflict: unable to process automatic refund", refundEx);
                }
                return;
            }

        } catch (SecurityException e) {

            throw e;

        } catch (IllegalStateException e) {

            throw e;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Booking confirmation was interrupted",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to confirm booking from payment",
                    e
            );
        }
    }

    private void handleBookingPaymentFailed(
            Map<String, Object> paymentData
    ) {
        String bookingId =
                String.valueOf(
                        paymentData.get(
                                "bookingId"
                        )
                );

        if (bookingId == null
                || bookingId.isBlank()
                || "null".equalsIgnoreCase(bookingId)) {
            return;
        }

        try {
            DocumentSnapshot doc =
                    bookingRepository.findById(
                            bookingId
                    );
            if (!doc.exists()) {
                return;
            }
            Map<String, Object> booking = doc.getData();
            if (booking == null) {
                return;
            }
            String currentStatus =
                    String.valueOf(
                            booking.getOrDefault(
                                    "bookingStatus",
                                    ""
                            )
                    ).trim().toLowerCase();

            // Release hold immediately if payment failed while in hold state
            if ("payment_pending".equals(currentStatus)
                    || "accepted".equals(currentStatus)) {
                Map<String, Object> updates =
                        new HashMap<>();
                updates.put(
                        "bookingStatus",
                        "cancelled"
                );
                updates.put(
                        "paymentStatus",
                        "failed"
                );
                updates.put(
                        "updatedAt",
                        Timestamp.now()
                );
                updates.put(
                        "holdExpiresAt",
                        null
                );
                bookingRepository.update(
                        bookingId,
                        updates
                );
            }
        } catch (Exception ignored) {
        }
    }

    // ============================================================
    // PAYMENT ENTITY
    // ============================================================

    private JSONObject getPaymentEntity(
            JSONObject root
    ) {

        JSONObject payload =
                root.optJSONObject(
                        "payload"
                );

        if (payload == null) {
            return null;
        }

        JSONObject payment =
                payload.optJSONObject(
                        "payment"
                );

        if (payment == null) {
            return null;
        }

        return payment.optJSONObject(
                "entity"
        );
    }

    // ============================================================
    // TRANSFER ENTITY
    // ============================================================

    private JSONObject getTransferEntity(
            JSONObject root
    ) {

        JSONObject payload =
                root.optJSONObject(
                        "payload"
                );

        if (payload == null) {
            return null;
        }

        JSONObject transfer =
                payload.optJSONObject(
                        "transfer"
                );

        if (transfer == null) {
            return null;
        }

        return transfer.optJSONObject(
                "entity"
        );
    }

    // ============================================================
    // TRANSFER ERROR
    // ============================================================

    private String extractTransferError(
            JSONObject transfer
    ) {

        JSONObject error =
                transfer.optJSONObject(
                        "error"
                );

        if (error == null) {
            return "";
        }

        String code =
                error.optString(
                        "code",
                        ""
                );

        String description =
                error.optString(
                        "description",
                        ""
                );

        if (!code.isBlank()
                && !description.isBlank()) {

            return code + ": " + description;
        }

        if (!description.isBlank()) {
            return description;
        }

        return code;
    }


    // ============================================================
    // VALUE HELPERS
    // ============================================================

    private long getLongValue(
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
}