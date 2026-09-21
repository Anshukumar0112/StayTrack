package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.review.ReviewRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.repository.ReviewRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            BookingRepository bookingRepository,
            PropertyRepository propertyRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
    }

    public Map<String, Object> createReview(
            AuthenticatedUser user,
            ReviewRequest request
    ) {
        requireAuthenticated(user);
        validateRequest(request);

        try {
            DocumentSnapshot booking =
                    bookingRepository.findById(request.getBookingId());

            if (!booking.exists()) {
                throw new RuntimeException("Booking not found");
            }

            Map<String, Object> bookingData = booking.getData();

            if (bookingData == null) {
                throw new RuntimeException("Booking data is empty");
            }

            String bookingStatus =
                    stringValue(bookingData.get("bookingStatus"));

            if (!"confirmed".equalsIgnoreCase(bookingStatus)
                    && !"completed".equalsIgnoreCase(bookingStatus)) {
                throw new RuntimeException(
                        "Reviews are allowed only for confirmed or completed bookings"
                );
            }

            String customerId =
                    stringValue(bookingData.get("customerId"));

            String hostId =
                    stringValue(bookingData.get("hostId"));

            String propertyId =
                    stringValue(bookingData.get("propertyId"));

            if (customerId.isBlank()
                    || hostId.isBlank()
                    || propertyId.isBlank()) {
                throw new RuntimeException(
                        "Booking is missing required review information"
                );
            }

            String reviewerRole;
            String revieweeId;

            if ("customer".equalsIgnoreCase(user.getRole())) {
                if (!user.getUid().equals(customerId)) {
                    throw new SecurityException(
                            "You can only review your own booking"
                    );
                }

                reviewerRole = "customer";
                revieweeId = hostId;

            } else if ("host".equalsIgnoreCase(user.getRole())) {
                if (!user.getUid().equals(hostId)) {
                    throw new SecurityException(
                            "You can only review bookings for your property"
                    );
                }

                reviewerRole = "host";
                revieweeId = customerId;

            } else {
                throw new SecurityException(
                        "Only customers and hosts can create reviews"
                );
            }

            DocumentSnapshot existing =
                    reviewRepository.findByReviewerAndBooking(
                            user.getUid(),
                            request.getBookingId()
                    );

            if (existing.exists()) {
                throw new RuntimeException(
                        "You have already reviewed this booking"
                );
            }

            DocumentSnapshot property =
                    propertyRepository.findById(propertyId);

            if (!property.exists()) {
                throw new RuntimeException("Property not found");
            }

            String reviewId =
                    ReviewRepository.buildReviewId(
                            user.getUid(),
                            request.getBookingId()
                    );

            Timestamp now = Timestamp.now();

            Map<String, Object> review = new HashMap<>();
            review.put("reviewId", reviewId);
            review.put("bookingId", request.getBookingId());
            review.put("propertyId", propertyId);
            review.put("reviewerId", user.getUid());
            review.put("reviewerRole", reviewerRole);
            review.put("revieweeId", revieweeId);
            review.put("rating", request.getRating());
            review.put(
                    "comment",
                    request.getComment() == null
                            ? ""
                            : request.getComment().trim()
            );
            review.put("createdAt", now);
            review.put("updatedAt", now);

            try {
                reviewRepository.create(reviewId, review);
            } catch (RuntimeException e) {
                DocumentSnapshot created =
                        reviewRepository.findById(reviewId);

                if (created.exists()) {
                    throw new RuntimeException(
                            "You have already reviewed this booking"
                    );
                }

                throw e;
            }

            /*
             * Only customer reviews contribute to the property's
             * public average rating. Host reviews are reviews of
             * the customer and do not affect property rating.
             */
            if ("customer".equalsIgnoreCase(reviewerRole)) {
                updatePropertyRating(propertyId);
            }

            return withId(reviewId, review);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to create review",
                    e
            );
        }
    }

    public List<Map<String, Object>> getPropertyReviews(
            String propertyId
    ) {
        if (propertyId == null || propertyId.isBlank()) {
            throw new IllegalArgumentException(
                    "Property ID is required"
            );
        }

        try {
            List<QueryDocumentSnapshot> documents =
                    reviewRepository.findByPropertyId(propertyId);

            List<Map<String, Object>> reviews =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> data = document.getData();

                if (data != null
                        && "customer".equalsIgnoreCase(
                        stringValue(data.get("reviewerRole")))) {
                    reviews.add(withId(document.getId(), data));
                }
            }

            return reviews;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get property reviews",
                    e
            );
        }
    }

    public List<Map<String, Object>> getMyReviews(
            AuthenticatedUser user
    ) {
        requireAuthenticated(user);

        try {
            List<QueryDocumentSnapshot> documents =
                    reviewRepository.findByReviewerId(
                            user.getUid()
                    );

            List<Map<String, Object>> reviews =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> data = document.getData();

                if (data != null) {
                    reviews.add(withId(document.getId(), data));
                }
            }

            return reviews;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get your reviews",
                    e
            );
        }
    }

    public Map<String, Object> getReview(
            AuthenticatedUser user,
            String reviewId
    ) {
        requireAuthenticated(user);

        if (reviewId == null || reviewId.isBlank()) {
            throw new IllegalArgumentException(
                    "Review ID is required"
            );
        }

        try {
            DocumentSnapshot document =
                    reviewRepository.findById(reviewId);

            if (!document.exists()) {
                throw new RuntimeException("Review not found");
            }

            Map<String, Object> data = document.getData();

            if (data == null) {
                throw new RuntimeException("Review data is empty");
            }

            String reviewerId =
                    stringValue(data.get("reviewerId"));

            String revieweeId =
                    stringValue(data.get("revieweeId"));

            boolean allowed =
                    user.getUid().equals(reviewerId)
                            || user.getUid().equals(revieweeId)
                            || "admin".equalsIgnoreCase(user.getRole());

            if (!allowed) {
                throw new SecurityException(
                        "You are not allowed to view this review"
                );
            }

            return withId(document.getId(), data);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get review",
                    e
            );
        }
    }

    private void updatePropertyRating(String propertyId) {
        try {
            List<QueryDocumentSnapshot> documents =
                    reviewRepository.findByPropertyId(propertyId);

            int count = 0;
            long total = 0;

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> data = document.getData();

                if (data == null) {
                    continue;
                }

                if (!"customer".equalsIgnoreCase(
                        stringValue(data.get("reviewerRole")))) {
                    continue;
                }

                Object ratingValue = data.get("rating");

                if (ratingValue instanceof Number number) {
                    int rating = number.intValue();

                    if (rating >= 1 && rating <= 5) {
                        total += rating;
                        count++;
                    }
                }
            }

            double average =
                    count == 0
                            ? 0.0
                            : Math.round(
                                    (total * 100.0 / count)
                            ) / 100.0;

            Map<String, Object> updates = new HashMap<>();
            updates.put("averageRating", average);
            updates.put("reviewCount", count);
            updates.put("updatedAt", Timestamp.now());

            propertyRepository.update(propertyId, updates);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to update property rating",
                    e
            );
        }
    }

    private void validateRequest(ReviewRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Review request is required"
            );
        }

        if (request.getBookingId() == null
                || request.getBookingId().isBlank()) {
            throw new IllegalArgumentException(
                    "Booking ID is required"
            );
        }

        if (request.getRating() < 1
                || request.getRating() > 5) {
            throw new IllegalArgumentException(
                    "Rating must be between 1 and 5"
            );
        }

        if (request.getComment() != null
                && request.getComment().trim().length() > 1000) {
            throw new IllegalArgumentException(
                    "Review comment cannot exceed 1000 characters"
            );
        }
    }

    private void requireAuthenticated(
            AuthenticatedUser user
    ) {
        if (user == null
                || user.getUid() == null
                || user.getUid().isBlank()) {
            throw new SecurityException(
                    "Authentication required"
            );
        }
    }

    private String stringValue(Object value) {
        return value == null
                ? ""
                : String.valueOf(value).trim();
    }

    private Map<String, Object> withId(
            String id,
            Map<String, Object> source
    ) {
        Map<String, Object> result =
                new HashMap<>(source);

        result.put("reviewId", id);

        return result;
    }
}
