package com.staytrack.backend.security;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        boolean isAdminRoute = uri != null && uri.startsWith("/api/admin") && !uri.startsWith("/api/admin/auth");

        // 1. Check for Admin Security Gateway Session Token (X-Admin-Session header or staytrack_admin_session cookie)
        String adminSessionToken = request.getHeader("X-Admin-Session");
        if (adminSessionToken == null || adminSessionToken.isBlank()) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("staytrack_admin_session".equals(cookie.getName())) {
                        adminSessionToken = cookie.getValue();
                        break;
                    }
                }
            }
        }

        if (adminSessionToken != null && !adminSessionToken.isBlank()) {
            if (validateAdminSessionToken(adminSessionToken)) {
                String adminId = extractAdminId(adminSessionToken);
                AuthenticatedUser adminUser = new AuthenticatedUser(
                        adminId,
                        "",
                        "admin"
                );
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                adminUser,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                        );
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
                return;
            }
        }

        // For /api/admin/** endpoints, if admin session token is invalid or missing, do NOT fallback to normal Firebase user tokens
        if (isAdminRoute) {
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Check for Firebase User Bearer Token (for public/customer/host API endpoints)
        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
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

    private String getEnvOrDotEnv(String key) {
        String val = System.getenv(key);
        if (val != null && !val.isBlank()) return val.trim();
        val = System.getProperty(key);
        if (val != null && !val.isBlank()) return val.trim();

        java.io.File[] files = new java.io.File[]{
            new java.io.File(".env.local"),
            new java.io.File("../.env.local"),
            new java.io.File(".env"),
            new java.io.File("../.env")
        };
        for (java.io.File f : files) {
            if (f.exists() && f.isFile()) {
                try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(f))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.startsWith("#") || !line.contains("=")) continue;
                        String[] parts = line.split("=", 2);
                        if (parts[0].trim().equals(key)) {
                            return parts[1].trim();
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    private boolean validateAdminSessionToken(String token) {
        if (token == null || token.isBlank()) return false;
        String[] parts = token.split(":");
        if (parts.length != 3) return false;

        String adminId = parts[0];
        String timestampStr = parts[1];
        String hmac = parts[2];

        try {
            long timestamp = Long.parseLong(timestampStr);
            // 24 hours expiration
            if (System.currentTimeMillis() - timestamp > 24 * 60 * 60 * 1000L) {
                return false;
            }

            String expectedAdminId = getEnvOrDotEnv("ADMIN_ID");
            if (expectedAdminId == null || expectedAdminId.isBlank()) {
                return false;
            }

            if (!adminId.equalsIgnoreCase(expectedAdminId.trim())) {
                return false;
            }

            String secret = getEnvOrDotEnv("ADMIN_SECRET");
            if (secret == null || secret.isBlank()) {
                secret = getEnvOrDotEnv("ADMIN_PASSWORD_HASH");
            }
            if (secret == null || secret.isBlank()) {
                String pass = getEnvOrDotEnv("ADMIN_PASSWORD");
                if (pass != null && !pass.isBlank()) {
                    secret = sha256Hex(pass);
                }
            }

            if (secret == null || secret.isBlank()) {
                return false;
            }

            String expectedHmac = hmacSha256Hex(secret.trim(), expectedAdminId.trim() + ":" + timestampStr);
            return hmac.equalsIgnoreCase(expectedHmac);
        } catch (Exception e) {
            return false;
        }
    }

    private String extractAdminId(String token) {
        if (token == null) return "admin";
        String[] parts = token.split(":");
        return parts.length > 0 ? parts[0] : "admin";
    }

    private String sha256Hex(String data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    private String hmacSha256Hex(String secret, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKey);
        byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hmac) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
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