package com.staytrack.backend.controller;

import com.staytrack.backend.dto.user.UserProfileRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.UserService;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return userService.getOrCreateUser(user);
    }

    @PutMapping("/me")
    public Map<String, Object> updateCurrentUser(
            @RequestBody UserProfileRequest request) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return userService.updateUser(
                user,
                request
        );
    }
}