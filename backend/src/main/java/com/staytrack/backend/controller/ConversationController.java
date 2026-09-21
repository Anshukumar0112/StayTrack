package com.staytrack.backend.controller;

import com.staytrack.backend.dto.conversation.ConversationRequest;
import com.staytrack.backend.dto.conversation.MessageRequest;
import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = "http://localhost:3000")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(
            ConversationService conversationService
    ) {
        this.conversationService = conversationService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createConversation(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody ConversationRequest request
    ) {
        return ResponseEntity.ok(
                conversationService.createConversation(
                        user,
                        request
                )
        );
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyConversations(
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ResponseEntity.ok(
                conversationService.getMyConversations(user)
        );
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<Map<String, Object>> getConversation(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String conversationId
    ) {
        return ResponseEntity.ok(
                conversationService.getConversation(
                        user,
                        conversationId
                )
        );
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String conversationId,
            @RequestBody MessageRequest request
    ) {
        return ResponseEntity.ok(
                conversationService.sendMessage(
                        user,
                        conversationId,
                        request
                )
        );
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String conversationId
    ) {
        return ResponseEntity.ok(
                conversationService.getMessages(
                        user,
                        conversationId
                )
        );
    }

    @PutMapping("/{conversationId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String conversationId
    ) {
        return ResponseEntity.ok(
                conversationService.markAsRead(
                        user,
                        conversationId
                )
        );
    }
}
