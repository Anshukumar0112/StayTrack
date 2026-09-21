package com.staytrack.backend.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PaymentRepository;

@Service
public class RefundService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final String keyId;
    private final String keySecret;
    private final HttpClient httpClient;

    public RefundService(
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            @Value("${razorpay.key-id:}") String keyId,
            @Value("${razorpay.key-secret:}") String keySecret
    ) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Processes a customer cancellation after the booking has already been
     * moved to cancelled. If a captured booking payment exists, a full
     * refund is initiated. If there is no captured payment, no refund is
     * required.
     *
     * Refund policy for v1:
     * - Full refund when cancellation is allowed before the booking starts.
     * - No partial refund calculation is performed here.
     * - The final refund state comes from Razorpay/webhooks, not from the
     *   mere fact that the refund request was submitted.
     */
    public Map<String, Object> processBookingCancellation(
            String bookingId
    ) {
        if (bookingId == null || bookingId.isBlank()) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        List<QueryDocumentSnapshot> payments =
                findPaymentsByBookingId(bookingId);

        QueryDocumentSnapshot capturedPayment = null;

        for (QueryDocumentSnapshot payment : payments) {
            Map<String, Object> data = payment.getData();
            if (data == null) {
                continue;
            }

            String type = stringValue(data.get("type"));
            String status = stringValue(data.get("status"));

            if ("booking".equalsIgnoreCase(type)
                    && "captured".equalsIgnoreCase(status)) {
                if (capturedPayment != null) {
                    throw new IllegalStateException(
                            "Multiple captured payments found for booking"
                    );
                }
                capturedPayment = payment;
            }
        }

        if (capturedPayment == null) {
            updateBookingPaymentStatus(
                    bookingId,
                    "cancelled"
            );
            return Map.of(
                    "refundRequired", false,
                    "refundStatus", "not_required",
                    "bookingId", bookingId
            );
        }

        String paymentId = capturedPayment.getId();
        Map<String, Object> payment = capturedPayment.getData();

        String currentRefundStatus =
                stringValue(payment.get("refundStatus"));

        if ("processed".equalsIgnoreCase(currentRefundStatus)) {
            updateBookingPaymentStatus(
                    bookingId,
                    "refunded"
            );
            return buildRefundResponse(
                    bookingId,
                    paymentId,
                    payment
            );
        }

        if ("pending".equalsIgnoreCase(currentRefundStatus)
                || "created".equalsIgnoreCase(currentRefundStatus)) {
            updateBookingPaymentStatus(
                    bookingId,
                    "refund_pending"
            );
            return buildRefundResponse(
                    bookingId,
                    paymentId,
                    payment
            );
        }

        String gatewayPaymentId =
                stringValue(payment.get("gatewayPaymentId"));

        if (gatewayPaymentId.isBlank()) {
            throw new IllegalStateException(
                    "Captured booking payment has no Razorpay payment ID"
            );
        }

        long amount = longValue(
                payment.get("amount"),
                "Payment amount"
        );

        if (amount <= 0) {
            throw new IllegalStateException(
                    "Captured booking payment amount mustbe greater than zero"
            );
        }

        String currency =
                stringValue(payment.get("currency"));

        if (!"INR".equalsIgnoreCase(currency)) {
            throw new IllegalStateException(
                    "Only INR booking refunds are currently supported"
            );
        }

        String idempotencyKey =
                stringValue(payment.get("refundIdempotencyKey"));

        if (idempotencyKey.isBlank()) {
            idempotencyKey = "ST-REFUND-" + paymentId;
        }

        Map<String, Object> preparing = new HashMap<>();
        preparing.put("refundStatus", "pending");
        preparing.put("refundAmount", amount);
        preparing.put("refundCurrency", currency.toUpperCase());
        preparing.put("refundIdempotencyKey", idempotencyKey);
        preparing.put("refundRequestedAt", System.currentTimeMillis());
        preparing.put("refundFailureReason", "");
        preparing.put("updatedAt", System.currentTimeMillis());
        updatePayment(paymentId, preparing);

        updateBookingPaymentStatus(
                bookingId,
                "refund_pending"
        );

        try {
            Map<String, Object> refund = createRazorpayRefund(
                    gatewayPaymentId,
                    amount,
                    currency,
                    idempotencyKey,
                    bookingId,
                    paymentId
            );

            String refundId = stringValue(refund.get("refundId"));
            String refundStatus = stringValue(refund.get("status"));

            Map<String, Object> updates = new HashMap<>();
            if (!refundId.isBlank()) {
                updates.put("gatewayRefundId", refundId);
            }
            updates.put("refundStatus", normalizeRefundStatus(refundStatus));
            updates.put("refundAmount", amount);
            updates.put("refundCurrency", currency.toUpperCase());
            updates.put("refundFailureReason", "");
            updates.put("updatedAt", System.currentTimeMillis());

            if ("processed".equalsIgnoreCase(refundStatus)) {
                updates.put("refundProcessedAt", System.currentTimeMillis());
                updates.put("status", "refunded");
            }

            updatePayment(paymentId, updates);

            if ("processed".equalsIgnoreCase(refundStatus)) {
                updateBookingPaymentStatus(
                        bookingId,
                        "refunded"
                );
            }

            Map<String, Object> result = new HashMap<>();
            result.put("bookingId", bookingId);
            result.put("paymentId", paymentId);
            result.put("refundRequired", true);
            result.put("refundStatus", normalizeRefundStatus(refundStatus));
            if (!refundId.isBlank()) {
                result.put("refundId", refundId);
            }
            return result;

        } catch (Exception e) {
            Map<String, Object> failed = new HashMap<>();
            failed.put("refundStatus", "failed");
            failed.put("refundFailureReason", safeMessage(e));
            failed.put("updatedAt", System.currentTimeMillis());
            updatePayment(paymentId, failed);

            updateBookingPaymentStatus(
                    bookingId,
                    "refund_failed"
            );

            Map<String, Object> result = new HashMap<>();
            result.put("bookingId", bookingId);
            result.put("paymentId", paymentId);
            result.put("refundRequired", true);
            result.put("refundStatus", "failed");
            result.put("refundFailureReason", safeMessage(e));
            return result;
        }
    }

    /**
     * Applies an authoritative refund webhook state to the local payment
     * and booking records. This method does not trust webhook data for
     * amounts; it uses the existing StayTrack payment record as the source
     * of truth for the booking relationship.
     */
    public boolean applyRefundWebhook(
            String gatewayPaymentId,
            String gatewayRefundId,
            String refundStatus,
            String failureReason
    ) {
        if (gatewayPaymentId == null || gatewayPaymentId.isBlank()) {
            return false;
        }

        List<QueryDocumentSnapshot> payments =
                findPaymentsByGatewayPaymentId(
                        gatewayPaymentId
                );

        if (payments == null || payments.isEmpty()) {
            return false;
        }

        if (payments.size() > 1) {
            throw new IllegalStateException(
                    "Multiple StayTrack payments match Razorpay refund payment"
            );
        }

        QueryDocumentSnapshot paymentDocument = payments.get(0);
        Map<String, Object> payment = paymentDocument.getData();
        if (payment == null) {
            throw new IllegalStateException("Payment datais missing");
        }

        if (!"booking".equalsIgnoreCase(
                stringValue(payment.get("type")))) {
            return true;
        }

        String normalized = normalizeRefundStatus(refundStatus);
        String bookingId = stringValue(payment.get("bookingId"));

        Map<String, Object> updates = new HashMap<>();
        updates.put("refundStatus", normalized);
        if (gatewayRefundId != null && !gatewayRefundId.isBlank()) {
            updates.put("gatewayRefundId", gatewayRefundId);
        }
        if (failureReason != null && !failureReason.isBlank()) {
            updates.put("refundFailureReason", failureReason);
        } else if ("processed".equals(normalized)) {
            updates.put("refundFailureReason", "");
        }
        updates.put("updatedAt", System.currentTimeMillis());

        if ("processed".equals(normalized)) {
            updates.put("status", "refunded");
            updates.put("refundProcessedAt", System.currentTimeMillis());
        }

        updatePayment(
                paymentDocument.getId(),
                updates
        );

        if (!bookingId.isBlank()) {
            if ("processed".equals(normalized)) {
                updateBookingPaymentStatus(bookingId, "refunded");
            } else if ("failed".equals(normalized)) {
                updateBookingPaymentStatus(bookingId, "refund_failed");
            } else {
                updateBookingPaymentStatus(bookingId, "refund_pending");
            }
        }

        return true;
    }

    private Map<String, Object> createRazorpayRefund(
            String gatewayPaymentId,
            long amount,
            String currency,
            String idempotencyKey,
            String bookingId,
            String paymentId
    ) throws Exception {
        validateConfiguration();

        long amountInPaise = Math.multiplyExact(amount, 100L);

        JSONObject body = new JSONObject();
        body.put("amount", amountInPaise);
        body.put("currency", currency.toUpperCase());
        body.put("receipt", "ST-REFUND-" + paymentId);

        JSONObject notes = new JSONObject();
        notes.put("staytrackBookingId", bookingId);
        notes.put("staytrackPaymentId", paymentId);
        body.put("notes", notes);

        String credentials = keyId + ":" + keySecret;
        String basicAuth = Base64.getEncoder().encodeToString(
                credentials.getBytes(StandardCharsets.UTF_8)
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(
                        "https://api.razorpay.com/v1/payments/"
                                + gatewayPaymentId
                                + "/refund"
                ))
                .header(
                        "Authorization",
                        "Basic " + basicAuth
                )
                .header(
                        "Content-Type",
                        "application/json"
                )
                .header(
                        "X-Refund-Idempotency",
                        idempotencyKey
                )
                .POST(
                        HttpRequest.BodyPublishers.ofString(
                                body.toString()
                        )
                )
                .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        JSONObject responseBody =
                response.body() == null || response.body().isBlank()
                        ? new JSONObject()
                        : new JSONObject(response.body());

        if (response.statusCode() < 200
                || response.statusCode() >= 300) {
            String description =
                    extractErrorDescription(responseBody);
            throw new IllegalStateException(
                    "Razorpay refund request failed"
                            + (description.isBlank()
                            ? ""
                            : ": " + description)
            );
        }

        Map<String, Object> result = new HashMap<>();
        result.put("refundId", responseBody.optString("id", ""));
        result.put("status", responseBody.optString("status", "pending"));
        result.put("amount", responseBody.optLong("amount", amountInPaise));
        result.put("currency", responseBody.optString("currency", currency));
        return result;
    }

    private void updateBookingPaymentStatus(
            String bookingId,
            String paymentStatus
    ) {
        if (bookingId == null || bookingId.isBlank()) {
            return;
        }

        Map<String, Object> updates = new HashMap<>();
        updates.put("paymentStatus", paymentStatus);
        updates.put("updatedAt", System.currentTimeMillis());

        updateBooking(
                bookingId,
                updates
        );
    }

    private Map<String, Object> buildRefundResponse(
            String bookingId,
            String paymentId,
            Map<String, Object> payment
    ) {
        Map<String, Object> result = new HashMap<>();
        result.put("bookingId", bookingId);
        result.put("paymentId", paymentId);
        result.put("refundRequired", true);
        result.put(
                "refundStatus",
                normalizeRefundStatus(
                        stringValue(payment.get("refundStatus"))
                )
        );

        String refundId = stringValue(payment.get("gatewayRefundId"));
        if (!refundId.isBlank()) {
            result.put("refundId", refundId);
        }
        return result;
    }

    private List<QueryDocumentSnapshot> findPaymentsByBookingId(String bookingId) {
        try {
            return paymentRepository.findByBookingId(bookingId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Unable to find booking payments", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Unable to find booking payments", e);
        }
    }

    private List<QueryDocumentSnapshot> findPaymentsByGatewayPaymentId(String gatewayPaymentId) {
        try {
            return paymentRepository.findByGatewayPaymentId(gatewayPaymentId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Unable to find payment for refund webhook", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Unable to find payment for refund webhook", e);
        }
    }

    private void updatePayment(String paymentId, Map<String, Object> updates) {
        try {
            paymentRepository.update(paymentId, updates);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Unable to update payment", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Unable to update payment", e);
        }
    }

    private void updateBooking(String bookingId, Map<String, Object> updates) {
        try {
            bookingRepository.update(bookingId, updates);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Unable to update booking payment status", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Unable to update booking payment status", e);
        }
    }

    private String normalizeRefundStatus(String status) {
        if (status == null || status.isBlank()) {
            return "pending";
        }

        return switch (status.toLowerCase()) {
            case "created", "pending" -> "pending";
            case "processed" -> "processed";
            case "failed" -> "failed";
            default -> "pending";
        };
    }

    private long longValue(
            Object value,
            String field
    ) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        if (value != null) {
            try {
                return Long.parseLong(String.valueOf(value));
            } catch (NumberFormatException ignored) {
                // handled below
            }
        }

        throw new IllegalStateException(field + " is missing or invalid");
    }

    private String stringValue(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value);
    }

    private String extractErrorDescription(JSONObject body) {
        JSONObject error = body.optJSONObject("error");
        if (error == null) {
            return "";
        }
        return error.optString("description", "");
    }

    private String safeMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 500
                ? message.substring(0, 500)
                : message;
    }

    private void validateConfiguration() {
        if (keyId == null || keyId.isBlank()
                || keySecret == null || keySecret.isBlank()) {
            throw new IllegalStateException(
                    "Razorpay credentials are not configured"
            );
        }
    }
}