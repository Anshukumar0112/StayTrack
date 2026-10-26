package com.staytrack.backend.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.staytrack.backend.service.RazorpayWebhookService;

@RestController
@RequestMapping("/api/payments/webhook")
@CrossOrigin
public class RazorpayWebhookController {

    private final RazorpayWebhookService webhookService;

    public RazorpayWebhookController(
            RazorpayWebhookService webhookService
    ) {
        this.webhookService = webhookService;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<Map<String, String>> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(
                    value = "X-Razorpay-Signature",
                    required = false
            ) String signature,
            @RequestHeader(
                    value = "X-Razorpay-Event-Id",
                    required = false
            ) String eventId
    ) {

        try {

            boolean processed =
                    webhookService.processWebhook(
                            payload,
                            signature,
                            eventId
                    );

            /*
             * HTTP 200:
             * Event successfully processed or already processed.
             */
            if (processed) {

                return ResponseEntity.ok(
                        Map.of(
                                "status",
                                "received"
                        )
                );
            }

            /*
             * HTTP 500:
             * Local payment record was not available or the
             * event could not yet be processed.
             *
             * Razorpay can retry the webhook.
             */
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "status",
                                    "retry"
                            )
                    );

        } catch (SecurityException e) {

            /*
             * Invalid signature / security mismatch.
             */
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            Map.of(
                                    "status",
                                    "rejected"
                            )
                    );

        } catch (IllegalArgumentException e) {

            /*
             * Invalid webhook payload.
             */
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            Map.of(
                                    "status",
                                    "invalid"
                            )
                    );

        } catch (Exception e) {

            /*
             * Unexpected server-side failure.
             *
             * Return 500 so the webhook provider can retry.
             */
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "status",
                                    "retry"
                            )
                    );
        }
    }
}