package com.andrej.chat_app.controller;

import com.andrej.chat_app.dto.MessageDto;
import com.andrej.chat_app.dto.PrivateMessageDto;
import com.andrej.chat_app.dto.SendMessageRequest;
import com.andrej.chat_app.dto.SendPrivateMessageRequest;
import com.andrej.chat_app.model.Message;
import com.andrej.chat_app.model.PrivateMessage;
import com.andrej.chat_app.repository.MessageRepository;
import com.andrej.chat_app.repository.PrivateMessageRepository;
import com.andrej.chat_app.service.MessageCacheService;
import com.andrej.chat_app.service.OnlinePresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final MessageCacheService messageCacheService;
    private final OnlinePresenceService onlinePresenceService;

    // handles messages sent to /app/chat.send
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request,
                            Principal principal) {
        Message message = new Message();
        message.setContent(request.getContent());
        message.setSenderUsername(principal.getName());
        message.setRoomId(request.getRoomId());
        message.setSentAt(LocalDateTime.now());
        message.setType(Message.MessageType.CHAT);

        Message saved = messageRepository.save(message);
        MessageDto dto = toDto(saved);
        onlinePresenceService.userJoinedRoom(request.getRoomId(), principal.getName());

        // cache in Redis
        messageCacheService.addMessage(dto);

        // broadcast via WebSocket
        messagingTemplate.convertAndSend("/topic/room." + request.getRoomId(), dto);
        log.info("Message from {} in room {}", principal.getName(), request.getRoomId());
    }


    // handles messages sent to /app/chat.private
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload SendPrivateMessageRequest request,
                                   Principal principal) {
        PrivateMessage message = new PrivateMessage();
        message.setContent(request.getContent());
        message.setSenderUsername(principal.getName());
        message.setReceiverUsername(request.getReceiverUsername());
        message.setSentAt(LocalDateTime.now());

        PrivateMessage saved = privateMessageRepository.save(message);

        PrivateMessageDto dto = toDto(saved);

        // send to receiver's private queue
        messagingTemplate.convertAndSendToUser(
                request.getReceiverUsername(), "/queue/private", dto);

        // send back to sender too so they see their own message
        messagingTemplate.convertAndSendToUser(
                principal.getName(), "/queue/private", dto);

        log.info("Private message from {} to {}",
                principal.getName(), request.getReceiverUsername());
    }

    // handles join room notification
    @MessageMapping("/chat.join")
    public void joinRoom(@Payload SendMessageRequest request,
                         Principal principal,
                         SimpMessageHeaderAccessor headerAccessor) {
        Message message = new Message();
        message.setContent(principal.getName() + " joined the room");
        message.setSenderUsername("System");
        message.setRoomId(request.getRoomId());
        message.setSentAt(LocalDateTime.now());
        message.setType(Message.MessageType.JOIN);

        Message saved = messageRepository.save(message);
        onlinePresenceService.userJoinedRoom(request.getRoomId(), principal.getName());

        messagingTemplate.convertAndSend(
                "/topic/room." + request.getRoomId(), toDto(saved));
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