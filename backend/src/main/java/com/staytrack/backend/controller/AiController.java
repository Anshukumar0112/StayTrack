package com.staytrack.backend.controller;

import com.staytrack.backend.dto.ai.AiSearchRequest;
import com.staytrack.backend.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestBody AiSearchRequest request
    ) {
        return ResponseEntity.ok(
                aiService.naturalLanguageSearch(request)
        );
    }
}
