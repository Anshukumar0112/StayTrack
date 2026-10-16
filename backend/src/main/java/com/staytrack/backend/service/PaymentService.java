package com.staytrack.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.payment.SubscriptionPaymentVerificationRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PaymentRepository;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentProvider paymentProvider;
    private final SubscriptionService subscriptionService;
    private final BookingRepository bookingRepository;
    private final RefundService refundService;
    private final NotificationService notificationService;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentProvider paymentProvider,
            SubscriptionService subscriptionService,
            BookingRepository bookingRepository,
            RefundService refundService,
            @org.springframework.context.annotation.Lazy NotificationService notificationService
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentProvider = paymentProvider;
        this.subscriptionService = subscriptionService;
        this.bookingRepository = bookingRepository;
        this.refundService = refundService;
        this.notificationService = notificationService;
    }

    public List<Map<String, Object>> getMyPayments(
            AuthenticatedUser user
    ) {

        try {

            List<QueryDocumentSnapshot> documents =
                    paymentRepository.findByUserId(
                            user.getUid()
                    );

            List<Map<String, Object>> payments =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document
                    : documents) {

                Map<String, Object> payment =
                        document.getData();

                if (payment == null) {
                    continue;
                }

                payment.put(
                        "paymentId",
                        document.getId()
                );

                /*
                 * Never expose sensitive gateway data.
                 */
                payment.remove("gatewaySignature");

                payments.add(payment);
            }

            return payments;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get payments",
                    e
            );
        }
    }

    /**
     * Creates a StayTrack payment record.
     *
     * This method does NOT mark the payment as successful.
     */
    public Map<String, Object> createPaymentRecord(
            String userId,
            String bookingId,
            String subscriptionId,
            String type,
            long amount,
            String currency,
            String gateway
    ) {

        validatePaymentType(type);

        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException(
                    "User ID is required"
            );
        }

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

        String paymentId =
                UUID.randomUUID().toString();

        Map<String, Object> payment =
                new HashMap<>();

        payment.put(
                "paymentId",
                paymentId
        );

        payment.put(
                "userId",
                userId
        );

        payment.put(
                "bookingId",
                bookingId != null
                        ? bookingId
                        : ""
        );

        payment.put(
                "subscriptionId",
                subscriptionId != null
                        ? subscriptionId
                        : ""
        );

        payment.put(
                "type",
                type
        );

        payment.put(
                "amount",
                amount
        );

        payment.put(
                "currency",
                currency.toUpperCase()
        );

        payment.put(
                "gateway",
                gateway != null
                        ? gateway
                        : ""
        );

        payment.put(
                "gatewayPaymentId",
                ""
        );

        payment.put(
                "gatewayOrderId",
                ""
        );

        payment.put(
                "status",
                "created"
        );

        /* Host settlement lifecycle is tracked separately from payment capture. */
        payment.put("settlementStatus", "not_started");
        payment.put("transferId", "");
        payment.put("gatewayTransferId", "");
        payment.put("settlementError", "");

        payment.put(
                "createdAt",
                System.currentTimeMillis()
        );

        payment.put(
                "updatedAt",
                System.currentTimeMillis()
        );

        try {

            paymentRepository.create(
                    paymentId,
                    payment
            );

            return payment;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to create payment record",
                    e
            );
        }
    }

    /**
     * Creates a Razorpay order for a host subscription.
     *
     * The amount always comes from SubscriptionService,
     * which reads the admin-configured subscription pricing.
     */
    public Map<String, Object> createSubscriptionOrder(
        AuthenticatedUser user
) {

    requireHost(user);

    Map<String, Object> plan =
            subscriptionService.getCurrentPlan();

    long amount =
            ((Number) plan.get("amount"))
                    .longValue();

    String currency =
            String.valueOf(
                    plan.get("currency")
            );

    String planName =
            String.valueOf(
                    plan.get("plan")
            );

    // Create the payment record first.
    // The paymentId generated here is the single source of truth.
    Map<String, Object> payment =
            createPaymentRecord(
                    user.getUid(),
                    "",
                    "",
                    "subscription",
                    amount,
                    currency,
                    "razorpay"
            );

    String paymentId =
            String.valueOf(
                    payment.get("paymentId")
            );

    if (paymentId.isBlank()) {
        throw new RuntimeException(
                "Payment record was created without a payment ID"
        );
    }

    String receipt =
            "ST-" +
            paymentId.substring(
                    0,
                    Math.min(12, paymentId.length())
            );

    Map<String, Object> notes =
            new HashMap<>();

    notes.put(
            "staytrackPaymentId",
            paymentId
    );

    notes.put(
            "hostId",
            user.getUid()
    );

    notes.put(
            "plan",
            planName
    );

    notes.put(
            "billingPeriod",
            plan.getOrDefault("billingPeriod", "MONTHLY")
    );

    Map<String, Object> razorpayOrder =
            paymentProvider.createOrder(
                    amount,
                    currency,
                    receipt,
                    notes
            );

    String razorpayOrderId =
            String.valueOf(
                    razorpayOrder.get(
                            "orderId"
                    )
            );

    if (razorpayOrderId.isBlank()) {
        throw new RuntimeException(
                "Razorpay order was created without an order ID"
        );
    }

    Map<String, Object> updates =
            new HashMap<>();

    updates.put(
            "gatewayOrderId",
            razorpayOrderId
    );

    updates.put(
            "updatedAt",
            System.currentTimeMillis()
    );

    try {

        paymentRepository.update(
                paymentId,
                updates
        );

    } catch (Exception e) {

        throw new RuntimeException(
                "Unable to link Razorpay order to payment",
                e
        );
    }

    Map<String, Object> response =
            new HashMap<>();

    response.put(
            "paymentId",
            paymentId
    );

    response.put(
            "orderId",
            razorpayOrderId
    );

    response.put(
            "amount",
            razorpayOrder.get("amount")
    );

    response.put(
            "currency",
            currency
    );

    response.put(
            "plan",
            planName
    );

    response.put(
            "keyId",
            razorpayOrder.get("keyId")
    );

    return response;
}

    /**
     * Verifies the payment returned by Razorpay Checkout.
     *
     * Signature verification + actual Razorpay payment lookup
     * are both performed before activating the subscription.
     */
    public Map<String, Object> verifySubscriptionPayment(
            AuthenticatedUser user,
            SubscriptionPaymentVerificationRequest request
    ) {

        requireHost(user);

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payment verification request is required"
            );
        }

        String paymentId =
                requireValue(
                        request.getPaymentId(),
                        "Payment ID"
                );

        String orderId =
                requireValue(
                        request.getOrderId(),
                        "Order ID"
                );

        String signature =
                requireValue(
                        request.getSignature(),
                        "Payment signature"
                );

        boolean validSignature =
                paymentProvider.verifyPaymentSignature(
                        orderId,
                        paymentId,
                        signature
                );

        if (!validSignature) {

            throw new SecurityException(
                    "Invalid Razorpay payment signature"
            );
        }

        Map<String, Object> payment =
                findPaymentByIdForUser(
                        user.getUid(),
                        paymentId,
                        orderId
                );

        String storedStatus =
                String.valueOf(
                        payment.get("status")
                );

        String paymentType =
                String.valueOf(
                        payment.get("type")
                );

        if (!"subscription".equalsIgnoreCase(paymentType)) {
            throw new SecurityException(
                    "Payment is not a subscription payment"
            );
        }

        if ("captured".equalsIgnoreCase(
                storedStatus
        )) {

            return subscriptionService
                    .getMySubscription(user);
        }

        Map<String, Object> gatewayPayment =
                paymentProvider.fetchPayment(
                        paymentId
                );

        String gatewayOrderId =
                String.valueOf(
                        gatewayPayment.get(
                                "orderId"
                        )
                );

        if (!orderId.equals(
                gatewayOrderId
        )) {

            throw new SecurityException(
                    "Payment does not belong to the expected order"
            );
        }

        long gatewayAmount =
                ((Number)
                        gatewayPayment.get(
                                "amount"
                        ))
                        .longValue();

        long storedAmount =
                ((Number)
                        payment.get("amount"))
                        .longValue();

        if (gatewayAmount != storedAmount * 100L) {

            throw new SecurityException(
                    "Payment amount mismatch"
            );
        }

        String gatewayCurrency =
                String.valueOf(
                        gatewayPayment.get("currency")
                );

        String storedCurrency =
                String.valueOf(
                        payment.get("currency")
                );

        if (!storedCurrency.equalsIgnoreCase(gatewayCurrency)) {
            throw new SecurityException(
                    "Payment currency mismatch"
            );
        }

        String gatewayStatus =
                String.valueOf(
                        gatewayPayment.get(
                                "status"
                        )
                );

        if (!"captured".equalsIgnoreCase(
                gatewayStatus
        )) {

            throw new IllegalStateException(
                    "Payment has not been captured"
            );
        }

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "gatewayPaymentId",
                paymentId
        );

        updates.put(
                "gatewayOrderId",
                orderId
        );

        updates.put(
                "status",
                "captured"
        );

        updates.put(
                "updatedAt",
                System.currentTimeMillis()
        );

        try {

            paymentRepository.update(
                    String.valueOf(
                            payment.get(
                                    "paymentId"
                            )
                    ),
                    updates
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update payment",
                    e
            );
        }

        /*
         * Subscription activation happens only after:
         *
         * 1. Signature verification
         * 2. Correct user/payment ownership
         * 3. Correct Razorpay order
         * 4. Correct amount
         * 5. Razorpay captured status
         */
        return subscriptionService
                .activateSubscriptionAfterPayment(
                        user.getUid(),
                        payment
                );
    }

    public Map<String, Object> createBookingOrder(
            AuthenticatedUser user,
            String bookingId
    ) {
        requireCustomer(user);
        String requestedBookingId = requireValue(bookingId, "Booking ID");
        Map<String, Object> booking = getBookingForCustomer(user.getUid(), requestedBookingId);

        String bookingStatus = String.valueOf(booking.get("bookingStatus"));
        if (!"accepted".equalsIgnoreCase(bookingStatus)
                && !"payment_pending".equalsIgnoreCase(bookingStatus)) {
            throw new IllegalStateException("Only accepted bookings can be paid");
        }

        long amount = getLongValue(booking.get("amount"), "Booking amount");
        if (amount <= 0) {
            throw new IllegalStateException("Booking has an invalid payment amount");
        }

        String currency = "INR";

        try {
            List<QueryDocumentSnapshot> existingPayments =
                    paymentRepository.findByBookingId(requestedBookingId);

            for (QueryDocumentSnapshot document : existingPayments) {
                Map<String, Object> existing = document.getData();
                if (existing == null) continue;

                String status = String.valueOf(existing.get("status"));
                String existingOrderId = String.valueOf(existing.get("gatewayOrderId"));
                long existingAmount = getLongValue(existing.get("amount"), "Payment amount");

                if (("created".equalsIgnoreCase(status)
                        || "authorized".equalsIgnoreCase(status))
                        && existingOrderId != null
                        && !existingOrderId.isBlank()
                        && !"null".equalsIgnoreCase(existingOrderId)
                        && existingAmount == amount) {

                    Map<String, Object> response = new HashMap<>();
                    response.put("paymentId", document.getId());
                    response.put("orderId", existingOrderId);
                    response.put("amount", amount * 100L);
                    response.put("currency", currency);
                    response.put("bookingId", requestedBookingId);
                    response.put("keyId", paymentProvider.getKeyId());
                    return response;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Unable to check existing booking payments", e);
        }

        Map<String, Object> payment = createPaymentRecord(
                user.getUid(),
                requestedBookingId,
                "",
                "booking",
                amount,
                currency,
                "razorpay"
        );

        String paymentId = String.valueOf(payment.get("paymentId"));
        String receipt = "ST-B-" + paymentId.substring(0, 10);

        Map<String, Object> notes = new HashMap<>();
        notes.put("staytrackPaymentId", paymentId);
        notes.put("bookingId", requestedBookingId);
        notes.put("customerId", user.getUid());
        notes.put("hostId", String.valueOf(booking.get("hostId")));

        Map<String, Object> razorpayOrder = paymentProvider.createOrder(
                amount,
                currency,
                receipt,
                notes
        );

        String razorpayOrderId = String.valueOf(razorpayOrder.get("orderId"));
        if (razorpayOrderId == null
                || razorpayOrderId.isBlank()
                || "null".equalsIgnoreCase(razorpayOrderId)) {
            throw new IllegalStateException("Razorpay booking order was not created");
        }

        Map<String, Object> updates = new HashMap<>();
        updates.put("gatewayOrderId", razorpayOrderId);
        updates.put("updatedAt", System.currentTimeMillis());

        try {
            paymentRepository.update(paymentId, updates);

            Map<String, Object> bookingUpdates = new HashMap<>();
            bookingUpdates.put("paymentStatus", "created");
            bookingUpdates.put("bookingStatus", "payment_pending");
            bookingUpdates.put("updatedAt", System.currentTimeMillis());
            bookingRepository.update(requestedBookingId, bookingUpdates);
        } catch (Exception e) {
            throw new RuntimeException("Unable to link booking payment", e);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("paymentId", paymentId);
        response.put("orderId", razorpayOrderId);
        response.put("amount", razorpayOrder.get("amount"));
        response.put("currency", currency);
        response.put("bookingId", requestedBookingId);
        response.put("keyId", razorpayOrder.get("keyId"));
        return response;
    }

    public Map<String, Object> verifyBookingPayment(
            AuthenticatedUser user,
            SubscriptionPaymentVerificationRequest request
    ) {
        requireCustomer(user);

        if (request == null) {
            throw new IllegalArgumentException("Payment verification request is required");
        }

        String gatewayPaymentId = requireValue(request.getPaymentId(), "Payment ID");
        String orderId = requireValue(request.getOrderId(), "Order ID");
        String signature = requireValue(request.getSignature(), "Payment signature");

        if (!paymentProvider.verifyPaymentSignature(orderId, gatewayPaymentId, signature)) {
            throw new SecurityException("Invalid Razorpay payment signature");
        }

        Map<String, Object> payment = findPaymentByIdForUser(
                user.getUid(), gatewayPaymentId, orderId
        );

        if (!"booking".equalsIgnoreCase(String.valueOf(payment.get("type")))) {
            throw new SecurityException("Payment is not a booking payment");
        }

        String bookingId = String.valueOf(payment.get("bookingId"));
        if (bookingId == null || bookingId.isBlank() || "null".equalsIgnoreCase(bookingId)) {
            throw new IllegalStateException("Booking payment is not linked to a booking");
        }

        Map<String, Object> booking = getBookingForCustomer(user.getUid(), bookingId);
        String bookingStatus = String.valueOf(booking.get("bookingStatus"));

        if ("rejected".equalsIgnoreCase(bookingStatus)
                || "completed".equalsIgnoreCase(bookingStatus)) {
            throw new IllegalStateException("Booking cannot be paid in its current status");
        }

        if ("cancelled".equalsIgnoreCase(bookingStatus)) {
            if ("captured".equalsIgnoreCase(String.valueOf(payment.get("status")))) {
                Map<String, Object> refund =
                        refundService.processBookingCancellation(bookingId);
                Map<String, Object> response =
                        new HashMap<>(refund);
                response.put("status", "cancelled");
                response.put("paymentStatus",
                        refund.getOrDefault("refundStatus", "refund_pending"));
                response.put("bookingStatus", "cancelled");
                return response;
            }
            throw new IllegalStateException("Booking has already been cancelled");
        }

        if ("captured".equalsIgnoreCase(String.valueOf(payment.get("status")))) {
            if (!"confirmed".equalsIgnoreCase(bookingStatus)) {
                confirmBookingAfterPayment(bookingId);
            }
            return bookingPaymentSuccess(payment, bookingId);
        }

        Map<String, Object> gatewayPayment = paymentProvider.fetchPayment(gatewayPaymentId);

        String gatewayOrderId = String.valueOf(gatewayPayment.get("orderId"));
        if (!orderId.equals(gatewayOrderId)) {
            throw new SecurityException("Payment does not belong to the expected order");
        }

        long gatewayAmount = getLongValue(gatewayPayment.get("amount"), "Gateway payment amount");
        long storedAmount = getLongValue(payment.get("amount"), "Stored payment amount");
        if (gatewayAmount != storedAmount * 100L) {
            throw new SecurityException("Payment amount mismatch");
        }

        String gatewayCurrency = String.valueOf(gatewayPayment.get("currency"));
        String storedCurrency = String.valueOf(payment.get("currency"));
        if (!storedCurrency.equalsIgnoreCase(gatewayCurrency)) {
            throw new SecurityException("Payment currency mismatch");
        }

        String gatewayStatus = String.valueOf(gatewayPayment.get("status"));
        if (!"captured".equalsIgnoreCase(gatewayStatus)) {
            throw new IllegalStateException("Payment has not been captured");
        }

        markPaymentCaptured(payment, gatewayPaymentId, orderId);

        /*
         * The customer may have cancelled while the gateway was completing
         * the payment. Never resurrect a cancelled booking. Instead, refund
         * the newly captured payment through the same idempotent refund path.
         */
        DocumentSnapshot latestBooking;
        try {
            latestBooking = bookingRepository.findById(bookingId);
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to load booking after payment capture",
                    e
            );
        }

        if (!latestBooking.exists()) {
            throw new IllegalStateException("Booking not found after payment capture");
        }

        Map<String, Object> latestBookingData = latestBooking.getData();
        String latestStatus = latestBookingData == null
                ? ""
                : String.valueOf(latestBookingData.get("bookingStatus"));

        if ("cancelled".equalsIgnoreCase(latestStatus)) {
            Map<String, Object> refund =
                    refundService.processBookingCancellation(bookingId);
            Map<String, Object> response = new HashMap<>(refund);
            response.put("status", "cancelled");
            response.put("bookingStatus", "cancelled");
            response.put("paymentId", payment.get("paymentId"));
            response.put("bookingId", bookingId);
            return response;
        }

        confirmBookingAfterPayment(bookingId);
        return bookingPaymentSuccess(payment, bookingId);
    }

    private Map<String, Object> bookingPaymentSuccess(
            Map<String, Object> payment,
            String bookingId
    ) {
        try {
            DocumentSnapshot bDoc = bookingRepository.findById(bookingId);
            if (bDoc.exists()) {
                Map<String, Object> bData = bDoc.getData();
                if (bData != null) {
                    String customerId = String.valueOf(bData.get("customerId"));
                    String hostId = String.valueOf(bData.get("hostId"));
                    if (!customerId.isBlank()) {
                        notificationService.createNotification(
                                customerId,
                                "booking_confirmed",
                                "Booking Confirmed 🎉",
                                "Your booking #" + bookingId + " has been confirmed!",
                                bookingId,
                                "booking"
                        );
                    }
                    if (!hostId.isBlank()) {
                        notificationService.createNotification(
                                hostId,
                                "booking_confirmed",
                                "Booking Confirmed & Paid",
                                "Booking #" + bookingId + " payment has been verified and confirmed.",
                                bookingId,
                                "booking"
                        );
                    }
                }
            }
        } catch (Exception ignored) {}

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("paymentStatus", "captured");
        response.put("bookingStatus", "confirmed");
        response.put("paymentId", payment.get("paymentId"));
        response.put("bookingId", bookingId);
        return response;
    }

    private void markPaymentCaptured(
            Map<String, Object> payment,
            String gatewayPaymentId,
            String orderId
    ) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("gatewayPaymentId", gatewayPaymentId);
        updates.put("gatewayOrderId", orderId);
        updates.put("status", "captured");
        updates.put("updatedAt", System.currentTimeMillis());

        try {
            paymentRepository.update(
                    String.valueOf(payment.get("paymentId")),
                    updates
            );
            payment.put("gatewayPaymentId", gatewayPaymentId);
            payment.put("gatewayOrderId", orderId);
            payment.put("status", "captured");
        } catch (Exception e) {
            throw new RuntimeException("Unable to update payment", e);
        }
    }

    private void confirmBookingAfterPayment(String bookingId) {
        try {
            DocumentSnapshot document = bookingRepository.findById(bookingId);
            if (!document.exists()) {
                throw new IllegalStateException("Booking not found");
            }

            Map<String, Object> data = document.getData();
            if (data == null) {
                throw new IllegalStateException("Booking data not found");
            }

            String currentStatus = String.valueOf(data.get("bookingStatus"));
            if ("rejected".equalsIgnoreCase(currentStatus)
                    || "cancelled".equalsIgnoreCase(currentStatus)) {
                throw new IllegalStateException("Booking can no longer be confirmed");
            }

            if ("confirmed".equalsIgnoreCase(currentStatus)) {
                return;
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("bookingStatus", "confirmed");
            updates.put("paymentStatus", "captured");
            updates.put("updatedAt", System.currentTimeMillis());
            bookingRepository.update(bookingId, updates);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Unable to confirm booking after payment", e);
        }
    }

    private Map<String, Object> getBookingForCustomer(
            String userId,
            String bookingId
    ) {
        try {
            DocumentSnapshot document = bookingRepository.findById(bookingId);
            if (!document.exists()) {
                throw new IllegalStateException("Booking not found");
            }

            Map<String, Object> booking = document.getData();
            if (booking == null) {
                throw new IllegalStateException("Booking data not found");
            }

            String customerId = String.valueOf(booking.get("customerId"));
            if (!userId.equals(customerId)) {
                throw new SecurityException("You are not allowed to access this booking");
            }

            booking.put("bookingId", document.getId());
            return booking;
        } catch (SecurityException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Unable to get booking", e);
        }
    }

    private long getLongValue(Object value, String field) {
        if (value == null) {
            throw new IllegalStateException(field + " is missing");
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            throw new IllegalStateException(field + " is invalid");
        }
    }

    private void requireCustomer(AuthenticatedUser user) {
        if (user == null
                || user.getUid() == null
                || user.getRole() == null
                || (!"customer".equalsIgnoreCase(user.getRole())
                    && !"host".equalsIgnoreCase(user.getRole())
                    && !"admin".equalsIgnoreCase(user.getRole()))) {
            throw new SecurityException("Only customers can make booking payments");
        }
    }

    public void updatePaymentStatus(
            String paymentId,
            String status
    ) {

        validatePaymentStatus(status);

        Map<String, Object> updates =
                new HashMap<>();

        updates.put(
                "status",
                status
        );

        updates.put(
                "updatedAt",
                System.currentTimeMillis()
        );

        try {

            paymentRepository.update(
                    paymentId,
                    updates
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update payment status",
                    e
            );
        }
    }

    private Map<String, Object> findPaymentByIdForUser(
            String userId,
            String gatewayPaymentId,
            String orderId
    ) {

        try {

            List<QueryDocumentSnapshot> payments =
                    paymentRepository.findByUserId(
                            userId
                    );

            for (QueryDocumentSnapshot document
                    : payments) {

                Map<String, Object> payment =
                        document.getData();

                if (payment == null) {
                    continue;
                }

                String storedOrderId =
                        String.valueOf(
                                payment.get(
                                        "gatewayOrderId"
                                )
                        );

                String storedPaymentId =
                        String.valueOf(
                                payment.get(
                                        "gatewayPaymentId"
                                )
                        );

                if (orderId.equals(
                        storedOrderId
                )
                        || gatewayPaymentId.equals(
                        storedPaymentId
                )) {

                    payment.put(
                            "paymentId",
                            document.getId()
                    );

                    return payment;
                }
            }

            throw new IllegalStateException(
                    "StayTrack payment record not found"
            );

        } catch (IllegalStateException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to find payment",
                    e
            );
        }
    }

    private void requireHost(
            AuthenticatedUser user
    ) {

        if (user == null
                || !"host".equalsIgnoreCase(
                user.getRole()
        )) {

            throw new SecurityException(
                    "Only approved hosts can purchase a subscription"
            );
        }
    }

    private String requireValue(
            String value,
            String field
    ) {

        if (value == null
                || value.isBlank()) {

            throw new IllegalArgumentException(
                    field + " is required"
            );
        }

        return value.trim();
    }

    private void validatePaymentType(
            String type
    ) {

        if (!"subscription".equalsIgnoreCase(type)
                && !"booking".equalsIgnoreCase(type)) {

            throw new IllegalArgumentException(
                    "Invalid payment type"
            );
        }
    }

    private void validatePaymentStatus(
            String status
    ) {

        if (status == null) {
            throw new IllegalArgumentException(
                    "Payment status is required"
            );
        }

        List<String> validStatuses =
                List.of(
                        "created",
                        "authorized",
                        "captured",
                        "failed",
                        "refunded",
                        "partially_refunded",
                        "cancelled"
                );

        if (!validStatuses.contains(
                status.toLowerCase()
        )) {

            throw new IllegalArgumentException(
                    "Invalid payment status"
            );
        }
    }
}