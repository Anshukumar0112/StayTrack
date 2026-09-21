package com.staytrack.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public String health() {
        return "StayTrack Backend is running";
    }
}
