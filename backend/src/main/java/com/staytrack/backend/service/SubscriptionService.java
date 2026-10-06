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

    public String getSubscriptionMode() {
        try {
            DocumentSnapshot settings = FirestoreClient.getFirestore()
                    .collection("settings")
                    .document("subscription")
                    .get().get();
            if (settings.exists()) {
                String mode = settings.getString("subscriptionMode");
                if ("free".equalsIgnoreCase(mode)) {
                    return "free";
                }
            }
        } catch (Exception ignored) {}
        return "paid";
    }

    /**
     * Returns the currently active/configured subscription plan.
     */
    public Map<String, Object> getCurrentPlan() {
        try {
            DocumentSnapshot settings =
                    FirestoreClient.getFirestore()
                            .collection("settings")
                            .document("subscription")
                            .get()
                            .get();

            Map<String, Object> data = settings.exists() && settings.getData() != null
                    ? settings.getData()
                    : new HashMap<>();

            String subscriptionMode = String.valueOf(data.getOrDefault("subscriptionMode", "paid"));
            boolean introductoryEnabled = Boolean.TRUE.equals(data.get("introductoryEnabled"));
            Number introductoryPrice = (Number) data.get("introductoryPrice");
            Number standardPrice = (Number) data.get("standardPrice");
            String currency = String.valueOf(data.getOrDefault("currency", "INR")).toUpperCase();
            Number limitNum = (Number) data.get("listingPropertyLimit");
            long listingPropertyLimit = limitNum != null ? limitNum.longValue() : 10L;
            String billingPeriod = String.valueOf(data.getOrDefault("billingPeriod", "MONTHLY")).toUpperCase();
            Number intervalNum = (Number) data.get("billingInterval");
            long billingInterval = intervalNum != null ? intervalNum.longValue() : 1L;

            long amount = 20L;
            String plan = "Host Pro";

            if ("free".equalsIgnoreCase(subscriptionMode)) {
                amount = 0L;
                plan = "free";
            } else if (introductoryEnabled && introductoryPrice != null) {
                amount = introductoryPrice.longValue();
                plan = "Host Pro Introductory";
            } else if (standardPrice != null && standardPrice.longValue() > 0) {
                amount = standardPrice.longValue();
                plan = "Host Pro";
            }

            Map<String, Object> result = new HashMap<>();
            result.put("plan", plan);
            result.put("amount", amount);
            result.put("price", amount);
            result.put("currency", currency);
            result.put("billingPeriod", billingPeriod);
            result.put("billingInterval", billingInterval);
            result.put("subscriptionMode", subscriptionMode);
            result.put("introductoryEnabled", introductoryEnabled);
            result.put("introductoryPrice", introductoryPrice != null ? introductoryPrice.longValue() : 20L);
            result.put("standardPrice", standardPrice != null ? standardPrice.longValue() : 20L);
            result.put("listingPropertyLimit", listingPropertyLimit);

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Unable to load subscription pricing", e);
        }
    }

    public Map<String, Object> getMySubscription(AuthenticatedUser user) {
        requireHost(user);
        return getSubscriptionStatusForHost(user.getUid());
    }

    public Map<String, Object> getEligibility(AuthenticatedUser user) {
        requireHost(user);
        Map<String, Object> subStatus = getSubscriptionStatusForHost(user.getUid());
        boolean active = Boolean.TRUE.equals(subStatus.get("hasActiveSubscription"));

        Map<String, Object> response = new HashMap<>();
        response.put("eligible", active);
        response.put("hasActiveSubscription", active);
        response.put("status", subStatus.get("status"));
        response.put("subscriptionMode", subStatus.get("subscriptionMode"));
        if (active && subStatus.get("subscription") != null) {
            response.put("subscription", subStatus.get("subscription"));
        }
        response.put("plan", getCurrentPlan());
        return response;
    }

    public boolean isSubscriptionActiveInPaidMode(String hostId) {
        if (hostId == null || hostId.isBlank()) {
            return false;
        }
        try {
            List<QueryDocumentSnapshot> subscriptions = subscriptionRepository.findActiveByHostId(hostId);
            if (subscriptions == null || subscriptions.isEmpty()) {
                return false;
            }
            long now = System.currentTimeMillis();
            for (QueryDocumentSnapshot subscription : subscriptions) {
                String status = subscription.getString("status");
                if (!"active".equalsIgnoreCase(status)) {
                    continue;
                }
                Timestamp endDate = subscription.getTimestamp("endDate");
                if (endDate != null && endDate.toDate().getTime() > now) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean hasActiveSubscription(String hostId) {
        if ("free".equalsIgnoreCase(getSubscriptionMode())) {
            return true;
        }
        return isSubscriptionActiveInPaidMode(hostId);
    }

    public Map<String, Object> getSubscriptionStatusForHost(String hostId) {
        String mode = getSubscriptionMode();
        Map<String, Object> plan = getCurrentPlan();
        Map<String, Object> result = new HashMap<>();
        result.put("hostId", hostId);
        result.put("subscriptionMode", mode);
        result.put("listingPropertyLimit", plan.get("listingPropertyLimit"));

        if ("free".equalsIgnoreCase(mode)) {
            result.put("hasActiveSubscription", true);
            result.put("status", "FREE");
            return result;
        }

        if (hostId == null || hostId.isBlank()) {
            result.put("hasActiveSubscription", false);
            result.put("status", "NONE");
            return result;
        }

        try {
            List<QueryDocumentSnapshot> subscriptions = subscriptionRepository.findByHostId(hostId);
            if (subscriptions == null || subscriptions.isEmpty()) {
                result.put("hasActiveSubscription", false);
                result.put("status", "NONE");
                return result;
            }

            long now = System.currentTimeMillis();
            QueryDocumentSnapshot matchedActive = null;
            QueryDocumentSnapshot matchedPaused = null;
            QueryDocumentSnapshot matchedExpired = null;

            for (QueryDocumentSnapshot sub : subscriptions) {
                String status = sub.getString("status");
                Timestamp endDate = sub.getTimestamp("endDate");
                long endMs = endDate != null ? endDate.toDate().getTime() : 0L;

                if ("active".equalsIgnoreCase(status) && endMs > now) {
                    matchedActive = sub;
                    break;
                } else if ("paused".equalsIgnoreCase(status)) {
                    if (matchedPaused == null) matchedPaused = sub;
                } else if (endMs <= now) {
                    if (matchedExpired == null) matchedExpired = sub;
                }
            }

            if (matchedActive != null) {
                result.put("hasActiveSubscription", true);
                result.put("status", "ACTIVE");
                Map<String, Object> subData = new HashMap<>(matchedActive.getData());
                subData.put("subscriptionId", matchedActive.getId());
                result.put("subscription", subData);
            } else if (matchedPaused != null) {
                result.put("hasActiveSubscription", false);
                result.put("status", "PAUSED");
                Map<String, Object> subData = new HashMap<>(matchedPaused.getData());
                subData.put("subscriptionId", matchedPaused.getId());
                result.put("subscription", subData);
            } else if (matchedExpired != null) {
                result.put("hasActiveSubscription", false);
                result.put("status", "EXPIRED");
                Map<String, Object> subData = new HashMap<>(matchedExpired.getData());
                subData.put("subscriptionId", matchedExpired.getId());
                result.put("subscription", subData);
            } else {
                result.put("hasActiveSubscription", false);
                result.put("status", "NONE");
            }

            return result;
        } catch (Exception e) {
            result.put("hasActiveSubscription", false);
            result.put("status", "NONE");
            return result;
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
         * Monthly subscription duration (1 calendar month).
         */
        java.time.ZonedDateTime nowZdt = java.time.ZonedDateTime.now(java.time.ZoneId.of("UTC"));
        java.time.ZonedDateTime endZdt = nowZdt.plusMonths(1);
        long endMillis = endZdt.toInstant().toEpochMilli();

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
                plan.get("plan") != null ? plan.get("plan") : "Host Pro"
        );

        subscription.put(
                "price",
                amount
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
                "billingPeriod",
                plan.getOrDefault("billingPeriod", "MONTHLY")
        );

        subscription.put(
                "billingInterval",
                plan.getOrDefault("billingInterval", 1L)
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
                "nextBillingDate",
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