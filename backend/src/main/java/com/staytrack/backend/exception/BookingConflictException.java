package com.staytrack.backend.exception;

public class BookingConflictException extends IllegalStateException {

    public BookingConflictException(String message) {
        super(message);
    }

    public BookingConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
