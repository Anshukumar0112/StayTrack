package com.staytrack.backend.controller;

import com.staytrack.backend.dto.review.ReviewRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReview(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody ReviewRequest request
    ) {
        return ResponseEntity.ok(
                reviewService.createReview(user, request)
        );
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<Map<String, Object>>> getPropertyReviews(
            @PathVariable String propertyId
    ) {
        return ResponseEntity.ok(
                reviewService.getPropertyReviews(propertyId)
        );
    }

    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> getMyReviews(
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ResponseEntity.ok(
                reviewService.getMyReviews(user)
        );
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<Map<String, Object>> getReview(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String reviewId
    ) {
        return ResponseEntity.ok(
                reviewService.getReview(user, reviewId)
        );
    }
}
