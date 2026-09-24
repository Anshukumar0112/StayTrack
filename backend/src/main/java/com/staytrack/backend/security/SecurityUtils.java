package com.staytrack.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.staytrack.backend.exception.UnauthorizedException;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthenticatedUser getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            throw new UnauthorizedException(
                    "User is not authenticated"
            );
        }

        Object principal = authentication.getPrincipal();

        if (!(principal instanceof AuthenticatedUser user)) {

            throw new UnauthorizedException(
                    "Invalid authenticated user"
            );
        }

        return user;
    }

    public static String getCurrentUserId() {
        return getCurrentUser().getUid();
    }

    public static String getCurrentUserPhone() {
        return getCurrentUser().getPhone();
    }

    public static String getCurrentUserRole() {
        return getCurrentUser().getRole();
    }

    public static boolean isCustomer() {
        return "customer".equalsIgnoreCase(
                getCurrentUserRole()
        );
    }

    public static boolean isHost() {
        return "host".equalsIgnoreCase(
                getCurrentUserRole()
        );
    }

    public static boolean isAdmin() {
        return "admin".equalsIgnoreCase(
                getCurrentUserRole()
        );
    }
}