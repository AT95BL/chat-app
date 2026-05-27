package com.andrej.chat_app.controller;

import com.andrej.chat_app.dto.PrivateMessageDto;
import com.andrej.chat_app.repository.PrivateMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PrivateMessageController {

    private final PrivateMessageRepository privateMessageRepository;

    @GetMapping("/private/{otherUsername}")
    public ResponseEntity<List<PrivateMessageDto>> getConversation(
            @PathVariable String otherUsername,
            Principal principal) {
        return ResponseEntity.ok(
                privateMessageRepository
                        .findConversation(principal.getName(), otherUsername)
                        .stream()
                        .map(m -> {
                            PrivateMessageDto dto = new PrivateMessageDto();
                            dto.setId(m.getId());
                            dto.setContent(m.getContent());
                            dto.setSenderUsername(m.getSenderUsername());
                            dto.setReceiverUsername(m.getReceiverUsername());
                            dto.setSentAt(m.getSentAt());
                            dto.setRead(m.isRead());
                            dto.setDeleted(m.isDeleted());
                            return dto;
                        }).toList()
        );
    }

    @GetMapping("/users")
    public ResponseEntity<List<String>> getOnlineUsers(Principal principal) {
        return ResponseEntity.ok(
                privateMessageRepository.findAll().stream()
                        .map(m -> m.getSenderUsername().equals(principal.getName())
                                ? m.getReceiverUsername() : m.getSenderUsername())
                        .distinct()
                        .filter(u -> !u.equals(principal.getName()))
                        .toList()
        );
    }
}