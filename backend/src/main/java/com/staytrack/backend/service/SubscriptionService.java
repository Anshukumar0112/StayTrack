package com.staytrack.backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.repository.SubscriptionRepository;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(
            SubscriptionRepository subscriptionRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
    }

    /**
     * Returns subscription plans using the pricing configured
     * in Firestore settings/subscription.
     */
    public Map<String, Object> getPlans() {

        return getCurrentPlan();
    }

    /**
     * Returns the currently active/configured subscription plan.
     *
     * Pricing comes from:
     * settings/subscription
     */
    public Map<String, Object> getCurrentPlan() {

        try {

            DocumentSnapshot settings =
                    FirestoreClient.getFirestore()
                            .collection("settings")
                            .document("subscription")
                            .get()
                            .get();

            if (!settings.exists()) {
                throw new IllegalStateException(
                        "Subscription pricing settings are not configured"
                );
            }

            Map<String, Object> data =
                    settings.getData();

            if (data == null) {
                throw new IllegalStateException(
                        "Subscription pricing settings are empty"
                );
            }

            boolean introductoryEnabled =
                    Boolean.TRUE.equals(
                            data.get("introductoryEnabled")
                    );

            Number introductoryPrice =
                    (Number) data.get("introductoryPrice");

            Number standardPrice =
                    (Number) data.get("standardPrice");

            String currency =
                    String.valueOf(
                            data.getOrDefault(
                                    "currency",
                                    "INR"
                            )
                    );

            long amount;
            String plan;

            if (introductoryEnabled
                    && introductoryPrice != null) {

                amount = introductoryPrice.longValue();
                plan = "introductory";

            } else if (standardPrice != null) {

                amount = standardPrice.longValue();
                plan = "standard";

            } else {

                throw new IllegalStateException(
                        "No valid subscription price is configured"
                );
            }

            if (amount <= 0) {
                throw new IllegalStateException(
                        "Subscription price must be greater than zero"
                );
            }

            Map<String, Object> result =
                    new HashMap<>();

            result.put("plan", plan);
            result.put("amount", amount);
            result.put("currency", currency.toUpperCase());
            result.put(
                    "introductoryEnabled",
                    introductoryEnabled
            );

            return result;

        } catch (IllegalStateException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to load subscription pricing",
                    e
            );
        }
    }

    public Map<String, Object> getMySubscription(
            AuthenticatedUser user
    ) {

        requireHost(user);

        try {

            List<QueryDocumentSnapshot> activeSubscriptions =
                    subscriptionRepository.findActiveByHostId(
                            user.getUid()
                    );

            if (activeSubscriptions == null
                    || activeSubscriptions.isEmpty()) {

                return Map.of(
                        "hasActiveSubscription",
                        false
                );
            }

            /*
             * The repository returns a list.
             *
             * We select the first active subscription.
             */
            QueryDocumentSnapshot active =
                    activeSubscriptions.get(0);

            Map<String, Object> subscription =
                    active.getData();

            if (subscription == null) {

                return Map.of(
                        "hasActiveSubscription",
                        false
                );
            }

            subscription.put(
                    "subscriptionId",
                    active.getId()
            );

            subscription.put(
                    "hasActiveSubscription",
                    true
            );

            return subscription;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get subscription",
                    e
            );
        }
    }

    public Map<String, Object> getEligibility(
            AuthenticatedUser user
    ) {

        requireHost(user);

        Map<String, Object> subscription =
                getMySubscription(user);

        boolean active =
                Boolean.TRUE.equals(
                        subscription.get(
                                "hasActiveSubscription"
                        )
                );

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "eligible",
                !active
        );

        response.put(
                "hasActiveSubscription",
                active
        );

        if (active) {

            response.put(
                    "subscription",
                    subscription
            );
        }

        response.put(
                "plan",
                getCurrentPlan()
        );

        return response;
    }

    public boolean hasActiveSubscription(
            String hostId
    ) {

        if (hostId == null || hostId.isBlank()) {
            return false;
        }

        try {

            List<QueryDocumentSnapshot> subscriptions =
                    subscriptionRepository.findActiveByHostId(
                            hostId
                    );

            if (subscriptions == null
                    || subscriptions.isEmpty()) {

                return false;
            }

            long now =
                    System.currentTimeMillis();

            for (QueryDocumentSnapshot subscription
                    : subscriptions) {

                String status =
                        subscription.getString(
                                "status"
                        );

                if (!"active".equalsIgnoreCase(
                        status
                )) {
                    continue;
                }

                Timestamp endDate =
                        subscription.getTimestamp(
                                "endDate"
                        );

                if (endDate == null) {
                    continue;
                }

                if (endDate.toDate().getTime() > now) {
                    return true;
                }
            }

            return false;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to check subscription",
                    e
            );
        }
    }

    /**
     * Activates a subscription only after PaymentService
     * has verified the Razorpay payment.
     */
    public Map<String, Object> activateSubscriptionAfterPayment(
            String hostId,
            Map<String, Object> payment
    ) {

        if (hostId == null || hostId.isBlank()) {

            throw new IllegalArgumentException(
                    "Host ID is required"
            );
        }

        if (payment == null) {

            throw new IllegalArgumentException(
                    "Payment is required"
            );
        }

        String paymentType =
                String.valueOf(
                        payment.get("type")
                );

        if (!"subscription".equalsIgnoreCase(
                paymentType
        )) {

            throw new IllegalArgumentException(
                    "Payment is not a subscription payment"
            );
        }

        String paymentUserId =
                String.valueOf(
                        payment.get("userId")
                );

        if (!hostId.equals(paymentUserId)) {

            throw new SecurityException(
                    "Payment does not belong to this host"
            );
        }

        /*
         * Prevent duplicate active subscriptions.
         */
        if (hasActiveSubscription(hostId)) {

            return getSubscriptionForHost(hostId);
        }

        Object amountObject =
                payment.get("amount");

        if (!(amountObject instanceof Number)) {

            throw new IllegalStateException(
                    "Payment amount is missing"
            );
        }

        long amount =
                ((Number) amountObject).longValue();

        String currency =
                String.valueOf(
                        payment.get("currency")
                );

        String paymentId =
                String.valueOf(
                        payment.get("paymentId")
                );

        Map<String, Object> plan =
                getCurrentPlan();

        long configuredAmount =
                ((Number)
                        plan.get("amount"))
                        .longValue();

        /*
         * The payment amount must match the current
         * configured subscription price.
         */
        if (amount != configuredAmount) {

            throw new SecurityException(
                    "Subscription payment amount does not match configured pricing"
            );
        }

        if (!currency.equalsIgnoreCase(
                String.valueOf(
                        plan.get("currency")
                )
        )) {

            throw new SecurityException(
                    "Subscription payment currency mismatch"
            );
        }

        Timestamp now =
                Timestamp.now();

        /*
         * Subscription duration is currently 30 days.
         */
        long endMillis =
                System.currentTimeMillis()
                        + (
                        30L
                                * 24L
                                * 60L
                                * 60L
                                * 1000L
                );

        Timestamp endDate =
                Timestamp.ofTimeSecondsAndNanos(
                        endMillis / 1000L,
                        (int)
                                (
                                        (endMillis % 1000L)
                                                * 1_000_000L
                                )
                );

        String subscriptionId =
                UUID.randomUUID().toString();

        Map<String, Object> subscription =
                new HashMap<>();

        subscription.put(
                "subscriptionId",
                subscriptionId
        );

        subscription.put(
                "hostId",
                hostId
        );

        subscription.put(
                "plan",
                plan.get("plan")
        );

        subscription.put(
                "amount",
                amount
        );

        subscription.put(
                "currency",
                currency.toUpperCase()
        );

        subscription.put(
                "status",
                "active"
        );

        subscription.put(
                "startDate",
                now
        );

        subscription.put(
                "endDate",
                endDate
        );

        subscription.put(
                "paymentId",
                paymentId
        );

        subscription.put(
                "createdAt",
                now
        );

        try {
            subscriptionRepository.create(
                    subscriptionId,
                    subscription
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Subscription activation was interrupted",
                    e
            );
        } catch (java.util.concurrent.ExecutionException e) {
            throw new RuntimeException(
                    "Unable to create subscription",
                    e
            );
        }

        return subscription;
    }

    private Map<String, Object> getSubscriptionForHost(
            String hostId
    ) {

        try {

            List<QueryDocumentSnapshot> subscriptions =
                    subscriptionRepository.findActiveByHostId(
                            hostId
                    );

            if (subscriptions == null
                    || subscriptions.isEmpty()) {

                return Map.of(
                        "hasActiveSubscription",
                        false
                );
            }

            QueryDocumentSnapshot active =
                    subscriptions.get(0);

            Map<String, Object> subscription =
                    active.getData();

            if (subscription == null) {

                return Map.of(
                        "hasActiveSubscription",
                        false
                );
            }

            subscription.put(
                    "subscriptionId",
                    active.getId()
            );

            subscription.put(
                    "hasActiveSubscription",
                    true
            );

            return subscription;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get subscription",
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
                    "Only approved hosts can access subscriptions"
            );
        }
    }
}