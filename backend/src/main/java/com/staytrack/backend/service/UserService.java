package com.staytrack.backend.service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.dto.user.UserProfileRequest;
import com.staytrack.backend.security.AuthenticatedUser;

@Service
public class UserService {

    private static final int MAX_NAME_LENGTH = 100;
    private static final int MAX_EMAIL_LENGTH = 254;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile(
                    "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
                            + "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}"
                            + "[A-Za-z0-9])?(?:\\.[A-Za-z0-9]"
                            + "(?:[A-Za-z0-9-]{0,61}"
                            + "[A-Za-z0-9])?)+$"
            );

    public Map<String, Object> getOrCreateUser(
            AuthenticatedUser authenticatedUser) {

        requireAuthenticatedUser(authenticatedUser);

        try {
            Firestore db =
                    FirestoreClient.getFirestore();

            String userId =
                    authenticatedUser.getUid();

            DocumentSnapshot document =
                    db.collection("users")
                            .document(userId)
                            .get()
                            .get();

            if (!document.exists()) {

                Map<String, Object> user =
                        new HashMap<>();

                user.put(
                        "uid",
                        userId
                );

                user.put(
                        "phone",
                        authenticatedUser.getPhone()
                );

                user.put(
                        "name",
                        ""
                );

                user.put(
                        "email",
                        ""
                );

                user.put(
                        "role",
                        "customer"
                );

                user.put(
                        "profileCompleted",
                        false
                );

                user.put(
                        "status",
                        "active"
                );

                /*
                 * Payment account is created only as an empty,
                 * inactive structure.
                 *
                 * No bank account, IFSC, UPI or other sensitive
                 * payment information is stored here.
                 */
                user.put(
                        "paymentAccount",
                        createDefaultPaymentAccount()
                );

                Timestamp now = Timestamp.now();

                user.put(
                        "createdAt",
                        now
                );

                user.put(
                        "updatedAt",
                        now
                );

                db.collection("users")
                        .document(userId)
                        .set(user)
                        .get();

                return user;
            }

            Map<String, Object> user =
                    document.getData();

            if (user == null) {
                throw new RuntimeException(
                        "User profile is empty"
                );
            }

            user.put(
                    "uid",
                    userId
            );

            /*
             * Existing users created before paymentAccount was
             * introduced receive the default structure when their
             * profile is retrieved.
             *
             * This does NOT activate an account or create a
             * Razorpay Linked Account.
             */
            if (!user.containsKey("paymentAccount")
                    || user.get("paymentAccount") == null) {

                user.put(
                        "paymentAccount",
                        createDefaultPaymentAccount()
                );
            }

            return user;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get user profile",
                    e
            );
        }
    }

    public Map<String, Object> updateUser(
            AuthenticatedUser authenticatedUser,
            UserProfileRequest request) {

        requireAuthenticatedUser(authenticatedUser);

        if (request == null) {

            throw new IllegalArgumentException(
                    "Profile data is required"
            );
        }

        String name = normalizeName(request.getName());

        if (name.isBlank()) {

            throw new IllegalArgumentException(
                    "Name is required"
            );
        }

        if (name.length() > MAX_NAME_LENGTH) {

            throw new IllegalArgumentException(
                    "Name is too long"
            );
        }

        String email = normalizeEmail(request.getEmail());

        if (!email.isBlank()
                && email.length() > MAX_EMAIL_LENGTH) {

            throw new IllegalArgumentException(
                    "Email is too long"
            );
        }

        if (!email.isBlank()
                && !EMAIL_PATTERN.matcher(email).matches()) {

            throw new IllegalArgumentException(
                    "Invalid email address"
            );
        }

        try {

            Firestore db =
                    FirestoreClient.getFirestore();

            String userId =
                    authenticatedUser.getUid();

            DocumentSnapshot document =
                    db.collection("users")
                            .document(userId)
                            .get()
                            .get();

            if (!document.exists()) {

                throw new RuntimeException(
                        "User profile not found"
                );
            }

            /*
             * Only profile fields are accepted here.
             *
             * IMPORTANT:
             * The following remain server/admin controlled:
             * - uid
             * - phone
             * - role
             * - status
             * - paymentAccount
             * - linkedAccountId
             */
            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "name",
                    name
            );

            updates.put(
                    "email",
                    email
            );

            updates.put(
                    "profileCompleted",
                    true
            );

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            db.collection("users")
                    .document(userId)
                    .update(updates)
                    .get();

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "message",
                    "Profile updated successfully"
            );

            response.put(
                    "uid",
                    userId
            );

            response.put(
                    "name",
                    name
            );

            response.put(
                    "email",
                    email
            );

            return response;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to update user profile",
                    e
            );
        }
    }

    public Map<String, Object> getUserById(
            String userId) {

        requireNonBlank(
                userId,
                "User ID is required"
        );

        try {

            Firestore db =
                    FirestoreClient.getFirestore();

            DocumentSnapshot document =
                    db.collection("users")
                            .document(userId.trim())
                            .get()
                            .get();

            if (!document.exists()) {

                throw new RuntimeException(
                        "User not found"
                );
            }

            Map<String, Object> user =
                    document.getData();

            if (user == null) {

                throw new RuntimeException(
                        "User profile is empty"
                );
            }

            user.put(
                    "uid",
                    document.getId()
            );

            /*
             * Do not automatically create/write paymentAccount
             * here because this method is also used for reading
             * another user's profile.
             */
            return user;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to get user",
                    e
            );
        }
    }

    /**
     * Creates the initial payment-account state.
     *
     * This is only internal metadata.
     *
     * StayTrack does NOT store:
     * - bank account number
     * - IFSC
     * - UPI ID
     * - card information
     * - payment credentials
     */
    private Map<String, Object> createDefaultPaymentAccount() {

        Map<String, Object> paymentAccount =
                new HashMap<>();

        paymentAccount.put(
                "provider",
                "razorpay"
        );

        paymentAccount.put(
                "linkedAccountId",
                ""
        );

        paymentAccount.put(
                "productId",
                ""
        );

        paymentAccount.put(
                "status",
                "pending"
        );

        paymentAccount.put(
                "verificationError",
                ""
        );

        return paymentAccount;
    }

    private void requireAuthenticatedUser(
            AuthenticatedUser authenticatedUser) {

        if (authenticatedUser == null) {

            throw new IllegalArgumentException(
                    "Authenticated user is required"
            );
        }

        requireNonBlank(
                authenticatedUser.getUid(),
                "Authenticated user ID is required"
        );
    }

    private void requireNonBlank(
            String value,
            String message) {

        if (value == null || value.isBlank()) {

            throw new IllegalArgumentException(
                    message
            );
        }
    }

    private String normalizeName(String value) {

        return value == null
                ? ""
                : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeEmail(String value) {

        return value == null
                ? ""
                : value.trim().toLowerCase();
    }
}
