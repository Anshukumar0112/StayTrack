package com.staytrack.backend.service;

import java.util.List;
import java.util.Map;

public interface PaymentProvider {

    Map<String, Object> createOrder(
            long amount,
            String currency,
            String receipt,
            Map<String, Object> notes
    );

    boolean verifyPaymentSignature(
            String orderId,
            String paymentId,
            String signature
    );

    boolean verifyWebhookSignature(
            String payload,
            String signature
    );

    Map<String, Object> fetchPayment(
            String paymentId
    );

    Map<String, Object> fetchOrder(
            String orderId
    );

    /**
     * Fetch Route product configuration for a linked account.
     *
     * Sensitive settlement information must not be exposed
     * to the rest of the application.
     */
    Map<String, Object> fetchRouteProductConfiguration(
            String linkedAccountId,
            String productId
    );

    /**
     * Create a Route transfer from a captured Razorpay payment
     * to a verified Razorpay Linked Account.
     *
     * amount is expressed in INR, not paise.
     */
    Map<String, Object> createRouteTransfer(
            String paymentId,
            String linkedAccountId,
            long amount,
            String currency,
            Map<String, Object> notes
    );

    /**
     * Fetch all Route transfers created from a Razorpay payment.
     *
     * Used for reconciliation when a transfer may have been created
     * at Razorpay but StayTrack did not persist the gateway transfer ID.
     */
    List<Map<String, Object>> fetchRouteTransfers(
            String paymentId
    );

    String getKeyId();
}
