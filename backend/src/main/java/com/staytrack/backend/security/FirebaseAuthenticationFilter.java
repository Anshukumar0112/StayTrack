package com.staytrack.backend.security;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader("Authorization");

        if (authorizationHeader == null ||
                !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        String idToken = authorizationHeader.substring(7).trim();

        if (idToken.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            FirebaseToken decodedToken =
                    FirebaseAuth.getInstance().verifyIdToken(idToken);

            String uid = decodedToken.getUid();

            String role = "customer";
            String status = "active";

            try {
                Firestore db = FirestoreClient.getFirestore();

                DocumentSnapshot userDocument =
                        db.collection("users")
                                .document(uid)
                                .get()
                                .get();

                if (userDocument.exists()) {
                    role = getStringField(userDocument, "role", "customer");
                    status = getStringField(userDocument, "status", "active");
                }
            } catch (Exception docEx) {
                // Default fallback to customer role & active status if Firestore profile fetch fails
            }

            if (!"active".equalsIgnoreCase(status)) {
                filterChain.doFilter(request, response);
                return;
            }

            String phone = getPhoneNumber(decodedToken);

            AuthenticatedUser authenticatedUser =
                    new AuthenticatedUser(
                            uid,
                            phone,
                            role.toLowerCase()
                    );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            authenticatedUser,
                            null,
                            List.of(
                                    new SimpleGrantedAuthority(
                                            "ROLE_" + role.toUpperCase()
                                    )
                            )
                    );

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private String getStringField(
            DocumentSnapshot document,
            String field,
            String defaultValue) {

        Object value = document.get(field);

        if (value == null || value.toString().isBlank()) {
            return defaultValue;
        }

        return value.toString();
    }

    private String getPhoneNumber(FirebaseToken token) {

        Object phoneClaim =
                token.getClaims().get("phone_number");

        if (phoneClaim == null) {
            return "";
        }

        return phoneClaim.toString();
    }
}