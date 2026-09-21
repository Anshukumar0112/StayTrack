package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.security.AuthenticatedUser;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentAccountVerificationService {

    private final PaymentProvider paymentProvider;

    public PaymentAccountVerificationService(
            PaymentProvider paymentProvider
    ) {
        this.paymentProvider = paymentProvider;
    }

    /**
     * Verifies a host's Razorpay Route account configuration.
     *
     * The client cannot choose the resulting status.
     * StayTrack derives the status from Razorpay.
     */
    public Map<String, Object> verifyHostPaymentAccount(
            AuthenticatedUser admin,
            String hostId
    ) {

        requireAdmin(admin);

        hostId = requireValue(
                hostId,
                "Host ID"
        );

        if (admin.getUid().equals(hostId)) {
            throw new SecurityException(
                    "An admin cannot verify their own payment account"
            );
        }

        Firestore db =
                FirestoreClient.getFirestore();

        try {

            DocumentSnapshot host =
                    db.collection("users")
                            .document(hostId)
                            .get()
                            .get();

            if (!host.exists()) {
                throw new IllegalArgumentException(
                        "Host user not found"
                );
            }

            String role =
                    host.getString("role");

            if (!"host".equalsIgnoreCase(role)) {
                throw new IllegalArgumentException(
                        "Payment account verification is available only for hosts"
                );
            }

            Map<String, Object> hostData =
                    host.getData();

            if (hostData == null) {
                throw new IllegalStateException(
                        "Host data is unavailable"
                );
            }

            Object paymentAccountObject =
                    hostData.get("paymentAccount");

            if (!(paymentAccountObject instanceof Map<?, ?>)) {
                throw new IllegalStateException(
                        "Host does not have a payment account"
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> paymentAccount =
                    (Map<String, Object>) paymentAccountObject;

            String linkedAccountId =
                    getRequiredAccountField(
                            paymentAccount,
                            "linkedAccountId"
                    );

            String productId =
                    getRequiredAccountField(
                            paymentAccount,
                            "productId"
                    );

            /*
             * Ask Razorpay for the actual Route product configuration.
             */
            Map<String, Object> razorpayConfiguration =
                    paymentProvider
                            .fetchRouteProductConfiguration(
                                    linkedAccountId,
                                    productId
                            );

            /*
             * Verify that Razorpay returned the configuration
             * for the identifiers we actually requested.
             */
            String returnedAccountId =
                    String.valueOf(
                            razorpayConfiguration.get(
                                    "accountId"
                            )
                    );

            String returnedProductId =
                    String.valueOf(
                            razorpayConfiguration.get(
                                    "id"
                            )
                    );

            if (!linkedAccountId.equals(
                    returnedAccountId
            )) {
                throw new SecurityException(
                        "Razorpay account ID mismatch"
                );
            }

            if (!productId.equals(
                    returnedProductId
            )) {
                throw new SecurityException(
                        "Razorpay product ID mismatch"
                );
            }

            String activationStatus =
                    String.valueOf(
                            razorpayConfiguration.get(
                                    "activationStatus"
                            )
                    );

            String stayTrackStatus =
                    mapActivationStatus(
                            activationStatus
                    );

            Timestamp now =
                    Timestamp.now();

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "status",
                    stayTrackStatus
            );

            updates.put(
                    "verificationError",
                    ""
            );

            updates.put(
                    "providerActivationStatus",
                    activationStatus
            );

            updates.put(
                    "lastVerifiedAt",
                    now
            );

            updates.put(
                    "lastVerifiedBy",
                    "system"
            );

            updates.put(
                    "updatedAt",
                    now
            );

            /*
             * Re-read the host before writing.
             *
             * This prevents an old verification request from
             * overwriting a newer payment-account replacement.
             */
            DocumentSnapshot currentHost =
                    db.collection("users")
                            .document(hostId)
                            .get()
                            .get();

            if (!currentHost.exists()) {
                throw new IllegalStateException(
                        "Host no longer exists"
                );
            }

            Map<String, Object> currentHostData =
                    currentHost.getData();

            if (currentHostData == null) {
                throw new IllegalStateException(
                        "Current host data is unavailable"
                );
            }

            Object currentPaymentAccountObject =
                    currentHostData.get(
                            "paymentAccount"
                    );

            if (!(currentPaymentAccountObject
                    instanceof Map<?, ?>)) {

                throw new IllegalStateException(
                        "Host payment account changed during verification"
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> currentPaymentAccount =
                    (Map<String, Object>)
                            currentPaymentAccountObject;

            String currentLinkedAccountId =
                    String.valueOf(
                            currentPaymentAccount.get(
                                    "linkedAccountId"
                            )
                    );

            String currentProductId =
                    String.valueOf(
                            currentPaymentAccount.get(
                                    "productId"
                            )
                    );

            if (!linkedAccountId.equals(
                    currentLinkedAccountId
            )
                    || !productId.equals(
                    currentProductId
            )) {

                throw new IllegalStateException(
                        "Payment account changed during verification. Please verify again."
                );
            }

            Map<String, Object> updatedPaymentAccount =
                    new HashMap<>(
                            currentPaymentAccount
                    );

            updatedPaymentAccount.putAll(
                    updates
            );

            db.collection("users")
                    .document(hostId)
                    .update(
                            "paymentAccount",
                            updatedPaymentAccount
                    )
                    .get();

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "hostId",
                    hostId
            );

            result.put(
                    "linkedAccountId",
                    linkedAccountId
            );

            result.put(
                    "productId",
                    productId
            );

            result.put(
                    "status",
                    stayTrackStatus
            );

            result.put(
                    "providerActivationStatus",
                    activationStatus
            );

            result.put(
                    "verifiedAt",
                    now
            );

            return result;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Payment account verification was interrupted",
                    e
            );

        } catch (SecurityException e) {

            throw e;

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to verify host payment account",
                    e
            );
        }
    }

    private String mapActivationStatus(
            String activationStatus
    ) {

        if (activationStatus == null) {
            return "pending";
        }

        switch (
                activationStatus
                        .trim()
                        .toLowerCase()
        ) {

            case "activated":
                return "active";

            case "suspended":
                return "suspended";

            default:
                return "pending";
        }
    }

    private String getRequiredAccountField(
            Map<String, Object> paymentAccount,
            String field
    ) {

        Object value =
                paymentAccount.get(field);

        if (value == null ||
                String.valueOf(value)
                        .isBlank()) {

            throw new IllegalStateException(
                    "Payment account is missing "
                            + field
            );
        }

        return String.valueOf(value)
                .trim();
    }

    private String requireValue(
            String value,
            String field
    ) {

        if (value == null ||
                value.isBlank()) {

            throw new IllegalArgumentException(
                    field + " is required"
            );
        }

        return value.trim();
    }

    private void requireAdmin(
            AuthenticatedUser admin
    ) {

        if (admin == null ||
                !"admin".equalsIgnoreCase(
                        admin.getRole()
                )) {

            throw new SecurityException(
                    "Only administrators can verify payment accounts"
            );
        }
    }
}