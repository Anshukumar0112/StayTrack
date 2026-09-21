package com.staytrack.backend.model;

import com.google.cloud.Timestamp;

import java.util.HashMap;
import java.util.Map;

public class Review {

    private String reviewId;
    private String bookingId;
    private String propertyId;
    private String reviewerId;
    private String reviewerRole;
    private String revieweeId;
    private int rating;
    private String comment;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public Review() {
    }

    public Review(
            String reviewId,
            String bookingId,
            String propertyId,
            String reviewerId,
            String reviewerRole,
            String revieweeId,
            int rating,
            String comment,
            Timestamp createdAt,
            Timestamp updatedAt
    ) {
        this.reviewId = reviewId;
        this.bookingId = bookingId;
        this.propertyId = propertyId;
        this.reviewerId = reviewerId;
        this.reviewerRole = reviewerRole;
        this.revieweeId = revieweeId;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getReviewId() { return reviewId; }
    public String getBookingId() { return bookingId; }
    public String getPropertyId() { return propertyId; }
    public String getReviewerId() { return reviewerId; }
    public String getReviewerRole() { return reviewerRole; }
    public String getRevieweeId() { return revieweeId; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
    public Timestamp getCreatedAt() { return createdAt; }
    public Timestamp getUpdatedAt() { return updatedAt; }

    public Map<String, Object> toMap() {
        Map<String, Object> data = new HashMap<>();
        data.put("reviewId", reviewId);
        data.put("bookingId", bookingId);
        data.put("propertyId", propertyId);
        data.put("reviewerId", reviewerId);
        data.put("reviewerRole", reviewerRole);
        data.put("revieweeId", revieweeId);
        data.put("rating", rating);
        data.put("comment", comment);
        data.put("createdAt", createdAt);
        data.put("updatedAt", updatedAt);
        return data;
    }
}
