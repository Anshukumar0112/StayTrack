package com.staytrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.staytrack.backend.dto.payment.SubscriptionPaymentVerificationRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(
            PaymentService paymentService
    ) {
        this.paymentService = paymentService;
    }

    // ============================================================
    // MY PAYMENTS
    // ============================================================

    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> getMyPayments() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentService.getMyPayments(user)
        );
    }

    // ============================================================
    // SUBSCRIPTION PAYMENT
    // ============================================================

    @PostMapping("/subscription/order")
    public ResponseEntity<Map<String, Object>> createSubscriptionOrder() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentService.createSubscriptionOrder(
                        user
                )
        );
    }

    @PostMapping("/subscription/verify")
    public ResponseEntity<Map<String, Object>> verifySubscriptionPayment(
            @RequestBody
            SubscriptionPaymentVerificationRequest request
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentService.verifySubscriptionPayment(
                        user,
                        request
                )
        );
    }

    // ============================================================
    // BOOKING PAYMENT
    // ============================================================

    /**
     * Creates a Razorpay order for an accepted booking.
     *
     * The booking amount is calculated/stored by the backend.
     * The client does not provide the payment amount.
     */
    @PostMapping("/booking/{bookingId}/order")
    public ResponseEntity<Map<String, Object>> createBookingOrder(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentService.createBookingOrder(
                        user,
                        bookingId
                )
        );
    }

    /**
     * Verifies a Razorpay booking payment.
     *
     * Booking is confirmed only after successful verification
     * and Razorpay reports the payment as captured.
     */
    @PostMapping("/booking/verify")
    public ResponseEntity<Map<String, Object>> verifyBookingPayment(
            @RequestBody
            SubscriptionPaymentVerificationRequest request
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentService.verifyBookingPayment(
                        user,
                        request
                )
        );
    }
}