package com.staytrack.backend.controller;

import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.SubscriptionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = "http://localhost:3000")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(
            SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    /**
     * Public subscription pricing.
     *
     * Prices come from settings/subscription in Firestore.
     */
    @GetMapping("/plans")
    public ResponseEntity<Map<String, Object>> getPlans() {

        return ResponseEntity.ok(
                subscriptionService.getPlans()
        );
    }

    /**
     * Current host's subscription.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>>
    getMySubscription() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                subscriptionService.getMySubscription(user)
        );
    }

    /**
     * Checks whether current host can list properties.
     */
    @GetMapping("/eligibility")
    public ResponseEntity<Map<String, Object>>
    getEligibility() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                subscriptionService.getEligibility(user)
        );
    }
}