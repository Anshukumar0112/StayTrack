package com.staytrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.staytrack.backend.dto.booking.BookingRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.BookingService;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "http://localhost:3000")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(
            BookingService bookingService
    ) {
        this.bookingService = bookingService;
    }

    /*
     * CUSTOMER
     *
     * Create a booking request.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createBooking(
            @RequestBody BookingRequest request
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        bookingService.createBooking(
                                user,
                                request
                        )
                );
    }

    /*
     * CUSTOMER
     *
     * Get all bookings belonging to the
     * authenticated customer.
     */
    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> getMyBookings() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.getMyBookings(
                        user
                )
        );
    }

    /*
     * HOST
     *
     * Get all bookings for properties owned
     * by the authenticated host.
     */
    @GetMapping("/host")
    public ResponseEntity<List<Map<String, Object>>> getHostBookings() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.getHostBookings(
                        user
                )
        );
    }

    /*
     * CUSTOMER / HOST / ADMIN
     *
     * Get one booking.
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<Map<String, Object>> getBooking(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.getBooking(
                        user,
                        bookingId
                )
        );
    }

    /*
     * HOST
     *
     * Accept a booking request.
     */
    @PutMapping("/{bookingId}/accept")
    public ResponseEntity<Map<String, Object>> acceptBooking(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.acceptBooking(
                        user,
                        bookingId
                )
        );
    }

    /*
     * HOST
     *
     * Reject a booking request.
     */
    @PutMapping("/{bookingId}/reject")
    public ResponseEntity<Map<String, Object>> rejectBooking(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.rejectBooking(
                        user,
                        bookingId
                )
        );
    }

    /*
     * CUSTOMER
     *
     * Cancel a booking.
     */
    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelBooking(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.cancelBooking(
                        user,
                        bookingId
                )
        );
    }

    /*
     * CUSTOMER
     *
     * Move an accepted booking into the
     * payment_pending state.
     */
    @PutMapping("/{bookingId}/payment")
    public ResponseEntity<Map<String, Object>> markPaymentPending(
            @PathVariable String bookingId
    ) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                bookingService.markPaymentPending(
                        user,
                        bookingId
                )
        );
    }
}