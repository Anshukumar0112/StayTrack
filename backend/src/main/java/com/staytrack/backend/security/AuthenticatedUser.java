package com.staytrack.backend.security;

public class AuthenticatedUser {

    private final String uid;
    private final String phone;
    private final String role;

    public AuthenticatedUser(
            String uid,
            String phone,
            String role) {

        this.uid = uid;
        this.phone = phone;
        this.role = role;
    }

    public String getUid() {
        return uid;
    }

    public String getPhone() {
        return phone;
    }

    public String getRole() {
        return role;
    }
}