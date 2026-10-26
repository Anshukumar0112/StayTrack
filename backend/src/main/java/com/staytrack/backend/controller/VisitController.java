package com.staytrack.backend.controller;

import com.staytrack.backend.dto.visit.VisitRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.VisitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/visits")
@CrossOrigin
public class VisitController {

    private final VisitService visitService;

    public VisitController(VisitService visitService) {
        this.visitService = visitService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createVisit(
            @RequestBody VisitRequest request
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(visitService.createVisit(user, request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> getMyVisits() {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(visitService.getMyVisits(user));
    }

    @GetMapping("/host")
    public ResponseEntity<List<Map<String, Object>>> getHostVisits() {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(visitService.getHostVisits(user));
    }

    @GetMapping("/{visitId}")
    public ResponseEntity<Map<String, Object>> getVisit(
            @PathVariable String visitId
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(visitService.getVisit(user, visitId));
    }

    @PutMapping("/{visitId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelVisit(
            @PathVariable String visitId
    ) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(visitService.cancelVisit(user, visitId));
    }
}
