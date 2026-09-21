package com.staytrack.backend.service;


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.Account;
import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Transfer;
import com.razorpay.Utils;

@Service
public class RazorpayPaymentProvider implements PaymentProvider {

    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;

    public RazorpayPaymentProvider(
            @Value("${razorpay.key-id:}") String keyId,
            @Value("${razorpay.key-secret:}") String keySecret,
            @Value("${razorpay.webhook-secret:}") String webhookSecret
    ) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public Map<String, Object> createOrder(
            long amount,
            String currency,
            String receipt,
            Map<String, Object> notes
    ) {

        validateConfiguration();

        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero"
            );
        }

        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException(
                    "Currency is required"
            );
        }

        if (receipt == null || receipt.isBlank()) {
            throw new IllegalArgumentException(
                    "Receipt is required"
            );
        }

        try {

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            long amountInSubunits =
                    Math.multiplyExact(
                            amount,
                            100L
                    );

            JSONObject orderRequest =
                    new JSONObject();

            orderRequest.put(
                    "amount",
                    amountInSubunits
            );

            orderRequest.put(
                    "currency",
                    currency.toUpperCase()
            );

            orderRequest.put(
                    "receipt",
                    receipt
            );

            if (notes != null && !notes.isEmpty()) {

                JSONObject notesObject =
                        new JSONObject();

                notes.forEach(
                        notesObject::put
                );

                orderRequest.put(
                        "notes",
                        notesObject
                );
            }

            Order order =
                    razorpay.orders.create(
                            orderRequest
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "orderId",
                    order.get("id")
            );

            response.put(
                    "amount",
                    order.get("amount")
            );

            response.put(
                    "currency",
                    order.get("currency")
            );

            response.put(
                    "status",
                    order.get("status")
            );

            response.put(
                    "receipt",
                    order.get("receipt")
            );

            response.put(
                    "keyId",
                    keyId
            );

            return response;

        } catch (ArithmeticException e) {

            throw new IllegalArgumentException(
                    "Payment amount is too large",
                    e
            );

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to create Razorpay order",
                    e
            );
        }
    }

    @Override
    public boolean verifyPaymentSignature(
            String orderId,
            String paymentId,
            String signature
    ) {

        validateConfiguration();

        if (orderId == null || orderId.isBlank()) {
            return false;
        }

        if (paymentId == null || paymentId.isBlank()) {
            return false;
        }

        if (signature == null || signature.isBlank()) {
            return false;
        }

        try {

            JSONObject attributes =
                    new JSONObject();

            attributes.put(
                    "razorpay_order_id",
                    orderId
            );

            attributes.put(
                    "razorpay_payment_id",
                    paymentId
            );

            attributes.put(
                    "razorpay_signature",
                    signature
            );

            return Utils.verifyPaymentSignature(
                    attributes,
                    keySecret
            );

        } catch (Exception e) {

            return false;
        }
    }

    @Override
    public boolean verifyWebhookSignature(
            String payload,
            String signature
    ) {

        if (webhookSecret == null
                || webhookSecret.isBlank()) {

            return false;
        }

        if (payload == null
                || payload.isBlank()) {

            return false;
        }

        if (signature == null
                || signature.isBlank()) {

            return false;
        }

        try {

            Utils.verifyWebhookSignature(
                    payload,
                    signature,
                    webhookSecret
            );

            return true;

        } catch (Exception e) {

            return false;
        }
    }

    @Override
    public Map<String, Object> fetchPayment(
            String paymentId
    ) {

        validateConfiguration();

        if (paymentId == null
                || paymentId.isBlank()) {

            throw new IllegalArgumentException(
                    "Payment ID is required"
            );
        }

        try {

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            Payment payment =
                    razorpay.payments.fetch(
                            paymentId
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "paymentId",
                    payment.get("id")
            );

            response.put(
                    "orderId",
                    payment.get("order_id")
            );

            response.put(
                    "amount",
                    payment.get("amount")
            );

            response.put(
                    "currency",
                    payment.get("currency")
            );

            response.put(
                    "status",
                    payment.get("status")
            );

            return response;

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to fetch Razorpay payment",
                    e
            );
        }
    }

    @Override
    public Map<String, Object> fetchOrder(
            String orderId
    ) {

        validateConfiguration();

        if (orderId == null
                || orderId.isBlank()) {

            throw new IllegalArgumentException(
                    "Order ID is required"
            );
        }

        try {

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            Order order =
                    razorpay.orders.fetch(
                            orderId
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "orderId",
                    order.get("id")
            );

            response.put(
                    "amount",
                    order.get("amount")
            );

            response.put(
                    "currency",
                    order.get("currency")
            );

            response.put(
                    "status",
                    order.get("status")
            );

            response.put(
                    "receipt",
                    order.get("receipt")
            );

            return response;

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to fetch Razorpay order",
                    e
            );
        }
    }

    @Override
    public Map<String, Object> fetchRouteProductConfiguration(
            String linkedAccountId,
            String productId
    ) {

        validateConfiguration();

        if (linkedAccountId == null
                || linkedAccountId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay linked account ID is required"
            );
        }

        if (productId == null
                || productId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay product ID is required"
            );
        }

        try {

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            Account product =
                    razorpay.product.fetch(
                            linkedAccountId,
                            productId
                    );

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "id",
                    product.get("id")
            );

            result.put(
                    "accountId",
                    product.get("account_id")
            );

            result.put(
                    "productName",
                    product.get("product_name")
            );

            result.put(
                    "activationStatus",
                    product.get("activation_status")
            );

            return result;

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to fetch Razorpay Route product configuration",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to parse Razorpay Route product configuration",
                    e
            );
        }
    }

    /**
     * Creates a Razorpay Route transfer from a captured payment
     * to a StayTrack host's Linked Account.
     *
     * StayTrack amount is stored in INR rupees.
     * Razorpay expects paise.
     */
    @Override
    public Map<String, Object> createRouteTransfer(
            String paymentId,
            String linkedAccountId,
            long amount,
            String currency,
            Map<String, Object> notes
    ) {

        validateConfiguration();

        if (paymentId == null
                || paymentId.isBlank()) {

            throw new IllegalArgumentException(
                    "Payment ID is required"
            );
        }

        if (linkedAccountId == null
                || linkedAccountId.isBlank()) {

            throw new IllegalArgumentException(
                    "Razorpay linked account ID is required"
            );
        }

        if (amount <= 0) {

            throw new IllegalArgumentException(
                    "Transfer amount must be greater than zero"
            );
        }

        if (currency == null
                || currency.isBlank()) {

            throw new IllegalArgumentException(
                    "Transfer currency is required"
            );
        }

        if (!"INR".equalsIgnoreCase(currency)) {

            throw new IllegalArgumentException(
                    "Razorpay Route transfers support INR only"
            );
        }

        try {

            long amountInPaise =
                    Math.multiplyExact(
                            amount,
                            100L
                    );

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            /*
             * Razorpay Route transfer request:
             *
             * POST /payments/{paymentId}/transfers
             *
             * The Java SDK exposes this through
             * payments.transfer(...).
             */
            JSONObject transferRequest =
                    new JSONObject();

            List<Object> transfers =
                    new ArrayList<>();

            JSONObject transferParams =
                    new JSONObject();

            transferParams.put(
                    "account",
                    linkedAccountId
            );

            transferParams.put(
                    "amount",
                    amountInPaise
            );

            transferParams.put(
                    "currency",
                    currency.toUpperCase()
            );

            if (notes != null
                    && !notes.isEmpty()) {

                JSONObject notesObject =
                        new JSONObject();

                notes.forEach(
                        notesObject::put
                );

                transferParams.put(
                        "notes",
                        notesObject
                );
            }

            transfers.add(
                    transferParams
            );

            transferRequest.put(
                    "transfers",
                    transfers
            );

            List<Transfer> createdTransfers =
                    razorpay.payments.transfer(
                            paymentId,
                            transferRequest
                    );

            if (createdTransfers == null
                    || createdTransfers.isEmpty()) {

                throw new RuntimeException(
                        "Razorpay did not return a transfer"
                );
            }

            Transfer transfer =
                    createdTransfers.get(0);

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "transferId",
                    transfer.get("id")
            );

            response.put(
                    "source",
                    transfer.get("source")
            );

            response.put(
                    "recipient",
                    transfer.get("recipient")
            );

            response.put(
                    "amount",
                    transfer.get("amount")
            );

            response.put(
                    "currency",
                    transfer.get("currency")
            );

            response.put(
                    "status",
                    transfer.has("status")
                            ? transfer.get("status")
                            : "created"
            );

            response.put(
                    "transferStatus",
                    transfer.has("transfer_status")
                            ? transfer.get("transfer_status")
                            : ""
            );

            response.put(
                    "settlementStatus",
                    transfer.has("settlement_status")
                            ? transfer.get("settlement_status")
                            : ""
            );

            response.put(
                    "rawId",
                    transfer.get("id")
            );

            return response;

        } catch (ArithmeticException e) {

            throw new IllegalArgumentException(
                    "Transfer amount is too large",
                    e
            );

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to create Razorpay Route transfer",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to process Razorpay Route transfer",
                    e
            );
        }
    }

    /**
     * Fetch all Route transfers created from a Razorpay payment.
     *
     * This is used to reconcile a local transfer that is stuck in
     * processing after a possible crash/network timeout.
     */
    @Override
    public List<Map<String, Object>> fetchRouteTransfers(
            String paymentId
    ) {

        validateConfiguration();

        if (paymentId == null || paymentId.isBlank()) {
            throw new IllegalArgumentException(
                    "Payment ID is required"
            );
        }

        try {

            RazorpayClient razorpay =
                    new RazorpayClient(
                            keyId,
                            keySecret
                    );

            List<Transfer> transfers =
                    razorpay.payments.fetchAllTransfers(
                            paymentId
                    );

            List<Map<String, Object>> response =
                    new ArrayList<>();

            if (transfers == null) {
                return response;
            }

            for (Transfer transfer : transfers) {

                Map<String, Object> item =
                        new HashMap<>();

                item.put(
                        "transferId",
                        transfer.get("id")
                );

                item.put(
                        "source",
                        transfer.get("source")
                );

                item.put(
                        "recipient",
                        transfer.get("recipient")
                );

                item.put(
                        "amount",
                        transfer.get("amount")
                );

                item.put(
                        "currency",
                        transfer.get("currency")
                );

                item.put(
                        "status",
                        transfer.has("status")
                                ? transfer.get("status")
                                : ""
                );

                item.put(
                        "transferStatus",
                        transfer.has("transfer_status")
                                ? transfer.get("transfer_status")
                                : ""
                );

                item.put(
                        "settlementStatus",
                        transfer.has("settlement_status")
                                ? transfer.get("settlement_status")
                                : ""
                );

                item.put(
                        "amountReversed",
                        transfer.has("amount_reversed")
                                ? transfer.get("amount_reversed")
                                : 0
                );

                Object rawNotes =
                        transfer.has("notes")
                                ? transfer.get("notes")
                                : null;

                if (rawNotes instanceof JSONObject notesObject) {
                    Map<String, Object> notesMap =
                            new HashMap<>();

                    for (String key : notesObject.keySet()) {
                        notesMap.put(
                                key,
                                notesObject.opt(key)
                        );
                    }

                    item.put(
                            "notes",
                            notesMap
                    );
                } else {
                    item.put(
                            "notes",
                            rawNotes
                    );
                }

                response.add(item);
            }

            return response;

        } catch (RazorpayException e) {

            throw new RuntimeException(
                    "Unable to fetch Razorpay Route transfers",
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to process Razorpay Route transfer reconciliation",
                    e
            );
        }
    }

    @Override
    public String getKeyId() {

        if (keyId == null || keyId.isBlank()) {

            throw new IllegalStateException(
                    "Razorpay key ID is not configured"
            );
        }

        return keyId;
    }

    private void validateConfiguration() {

        if (keyId == null || keyId.isBlank()) {

            throw new IllegalStateException(
                    "Razorpay key ID is not configured"
            );
        }

        if (keySecret == null
                || keySecret.isBlank()) {

            throw new IllegalStateException(
                    "Razorpay key secret is not configured"
            );
        }
    }
}
