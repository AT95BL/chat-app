package com.andrej.chat_app.controller;

import com.andrej.chat_app.dto.ChatTypingEvent;
import com.andrej.chat_app.dto.MessageDto;
import com.andrej.chat_app.dto.PrivateMessageDto;
import com.andrej.chat_app.dto.SendMessageRequest;
import com.andrej.chat_app.dto.SendPrivateMessageRequest;
import com.andrej.chat_app.model.Message;
import com.andrej.chat_app.model.PrivateMessage;
import com.andrej.chat_app.model.RoomMember;
import com.andrej.chat_app.repository.MessageRepository;
import com.andrej.chat_app.repository.PrivateMessageRepository;
import com.andrej.chat_app.repository.RoomMemberRepository;
import com.andrej.chat_app.service.MessageCacheService;
import com.andrej.chat_app.service.OnlinePresenceService;
import com.andrej.chat_app.service.UnreadCountService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
// import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
// import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.Set;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final MessageCacheService messageCacheService;
    private final OnlinePresenceService onlinePresenceService;
    private final UnreadCountService unreadCountService;
    private final RoomMemberRepository roomMemberRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request, Principal principal) {
        if (principal == null) {
            log.error("Unauthorized WebSocket message execution attempt rejected.");
            return;
        }

        Message message = new Message();
        message.setContent(request.getContent());
        message.setSenderUsername(principal.getName());
        message.setRoomId(request.getRoomId());
        message.setSentAt(LocalDateTime.now());
        message.setType(Message.MessageType.CHAT);

        Message saved = messageRepository.save(message);
        MessageDto dto = toDto(saved);

        // Cache in Redis
        messageCacheService.addMessage(dto);

        // Broadcast via WebSocket
        messagingTemplate.convertAndSend("/topic/room." + request.getRoomId(), dto);
        log.info("Message from {} in room {}", principal.getName(), request.getRoomId());
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload SendPrivateMessageRequest request, Principal principal) {
        if (principal == null) return;

        PrivateMessage message = new PrivateMessage();
        message.setContent(request.getContent());
        message.setSenderUsername(principal.getName());
        message.setReceiverUsername(request.getReceiverUsername());
        message.setSentAt(LocalDateTime.now());

        PrivateMessage saved = privateMessageRepository.save(message);
        PrivateMessageDto dto = toDto(saved);

        // Send to receiver's queue. Frontend must subscribe to: /user/queue/private
        messagingTemplate.convertAndSendToUser(
                request.getReceiverUsername(), "/queue/private", dto);

        // Send back to sender's private queue clone
        messagingTemplate.convertAndSendToUser(
                principal.getName(), "/queue/private", dto);

        log.info("Private message from {} to {}", principal.getName(), request.getReceiverUsername());
    }

    @MessageMapping("/chat.join")
    public void joinRoom(@Payload SendMessageRequest request, Principal principal) {
        if (principal == null) return;

        Message message = new Message();
        message.setContent(principal.getName() + " joined the room");
        message.setSenderUsername("System");
        message.setRoomId(request.getRoomId());
        message.setSentAt(LocalDateTime.now());
        message.setType(Message.MessageType.JOIN);

        Message saved = messageRepository.save(message);

        Set<String> members = roomMemberRepository.findByRoomId(request.getRoomId())
        .stream().map(RoomMember::getUsername).collect(Collectors.toSet());
        unreadCountService.increment(request.getRoomId(), principal.getName(), members);

        // Notify each member of their unread count
        members.forEach(member -> {
            messagingTemplate.convertAndSendToUser(
                member, "/queue/unread",
                Map.of("roomId", request.getRoomId(),
                    "count", unreadCountService.getUnreadCounts(member)
                                .getOrDefault(request.getRoomId(), 0))
        );
});

        // This execution securely stays exclusively within the boundaries of a join action
        onlinePresenceService.userJoinedRoom(request.getRoomId(), principal.getName());

        messagingTemplate.convertAndSend(
                "/topic/room." + request.getRoomId(), toDto(saved));
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload SendMessageRequest request, Principal principal) {
        if (principal == null) return;

        ChatTypingEvent typingEvent = new ChatTypingEvent(
            principal.getName(), 
            request.getRoomId(), 
            true
        );

        messagingTemplate.convertAndSend(
                "/topic/room." + request.getRoomId() + ".typing", typingEvent);
    }

    @MessageMapping("/chat.delete")
    public void deleteMessage(@Payload Map<String, Object> payload,
                            Principal principal) { // 1. Ispravljeno ime sa princioal na principal
        if (principal == null) return;
        
        // Da izbjegnemo potencijalni NullPointerException ako frontend ne pošalje ključeve
        if (!payload.containsKey("messageId") || payload.get("messageId") == null ||
            !payload.containsKey("roomId") || payload.get("roomId") == null) {
            log.warn("Delete request dynamic payload is missing required fields.");
            return;
        }

        Long messageId = Long.valueOf(payload.get("messageId").toString());
        Long roomId = Long.valueOf(payload.get("roomId").toString());

        messageRepository.findById(messageId).ifPresent(msg -> {
            if (msg.getSenderUsername().equals(principal.getName())) {
                msg.setDeleted(true);
                messageRepository.save(msg);

                // Koristimo Map.of() što eksplicitno vraća nepromjenjivu Mapu 
                // i rješava "ambiguous method" problem u SimpMessagingTemplate-u
                Object deleteEvent = Map.of(
                    "messageId", messageId,
                    "deleted", true
                );

                messagingTemplate.convertAndSend(
                    "/topic/room." + roomId + ".delete", deleteEvent);
                
                log.info("Message {} successfully deleted by {} in room {}", messageId, principal.getName(), roomId);
            }
        });
    }

    private MessageDto toDto(Message m) {
        MessageDto dto = new MessageDto();
        dto.setId(m.getId());
        dto.setContent(m.getContent());
        dto.setSenderUsername(m.getSenderUsername());
        dto.setRoomId(m.getRoomId());
        dto.setSentAt(m.getSentAt());
        dto.setDeleted(m.isDeleted());
        dto.setType(m.getType());
        return dto;
    }

    private PrivateMessageDto toDto(PrivateMessage m) {
        PrivateMessageDto dto = new PrivateMessageDto();
        dto.setId(m.getId());
        dto.setContent(m.getContent());
        dto.setSenderUsername(m.getSenderUsername());
        dto.setReceiverUsername(m.getReceiverUsername());
        dto.setSentAt(m.getSentAt());
        dto.setRead(m.isRead());
        dto.setDeleted(m.isDeleted());
        return dto;
    }
}