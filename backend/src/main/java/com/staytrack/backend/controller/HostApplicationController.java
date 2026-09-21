package com.staytrack.backend.controller;

import com.staytrack.backend.dto.host.HostApplicationRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.HostApplicationService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/host-applications")
@CrossOrigin(origins = "http://localhost:3000")
public class HostApplicationController {

    private final HostApplicationService hostApplicationService;

    public HostApplicationController(
            HostApplicationService hostApplicationService) {

        this.hostApplicationService =
                hostApplicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submitApplication(
            @RequestBody HostApplicationRequest request) {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return hostApplicationService.submitApplication(
                user,
                request
        );
    }

    @GetMapping("/me")
    public Map<String, Object> getMyApplication() {

        AuthenticatedUser user =
                SecurityUtils.getCurrentUser();

        return hostApplicationService.getMyApplication(
                user
        );
    }
}