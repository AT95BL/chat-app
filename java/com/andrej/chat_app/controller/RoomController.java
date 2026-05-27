package com.andrej.chat_app.controller;

import com.andrej.chat_app.dto.CreateRoomRequest;
import com.andrej.chat_app.dto.MessageDto;
import com.andrej.chat_app.dto.RoomDto;
import com.andrej.chat_app.exception.ResourceNotFoundException;
import com.andrej.chat_app.exception.UserAlreadyExistsException;
import com.andrej.chat_app.model.Message;
import com.andrej.chat_app.model.Room;
import com.andrej.chat_app.model.RoomMember;
import com.andrej.chat_app.repository.MessageRepository;
import com.andrej.chat_app.repository.RoomMemberRepository;
import com.andrej.chat_app.repository.RoomRepository;
import com.andrej.chat_app.service.MessageCacheService;
import com.andrej.chat_app.service.OnlinePresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RoomController {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final MessageCacheService messageCacheService;
    private final OnlinePresenceService onlinePresenceService;

    @GetMapping
    public ResponseEntity<List<RoomDto>> getAllRooms() {
        List<RoomDto> rooms = roomRepository.findAllPublicRooms().stream()
                .map(r -> new RoomDto(
                        r.getId(), r.getName(), r.getDescription(),
                        r.getCreatedBy(), r.getCreatedAt(),
                        roomMemberRepository.findByRoomId(r.getId()).size()
                )).toList();
        return ResponseEntity.ok(rooms);
    }

    @PostMapping
    public ResponseEntity<RoomDto> createRoom(@RequestBody CreateRoomRequest request,
                                              Principal principal) {
        if (roomRepository.existsByName(request.getName())) {
            throw new UserAlreadyExistsException("Room '" + request.getName() + "' already exists");
        }

        Room room = new Room();
        room.setName(request.getName());
        room.setDescription(request.getDescription());
        room.setCreatedBy(principal.getName());
        room.setCreatedAt(LocalDateTime.now());
        Room saved = roomRepository.save(room);

        // creator auto-joins
        joinRoomInternal(saved.getId(), principal.getName());

        return ResponseEntity.ok(new RoomDto(
                saved.getId(), saved.getName(), saved.getDescription(),
                saved.getCreatedBy(), saved.getCreatedAt(), 1));
    }

    @GetMapping("/{id}/online")
    public ResponseEntity<Set<String>> getOnlineUsers(
            @PathVariable Long id) {
        return ResponseEntity.ok(onlinePresenceService.getOnlineUsersInRoom(id));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<Void> joinRoom(@PathVariable Long id, Principal principal) {
        roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        if (!roomMemberRepository.existsByRoomIdAndUsername(id, principal.getName())) {
            joinRoomInternal(id, principal.getName());
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveRoom(@PathVariable Long id, Principal principal) {
        roomMemberRepository.deleteByRoomIdAndUsername(id, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long id) {
        // try Redis cache first
        List<MessageDto> cached = messageCacheService.getMessages(id);
        if (!cached.isEmpty()) {
            return ResponseEntity.ok(cached);
        }

        // fall back to PostgreSQL and populate cache
        List<MessageDto> messages = messageRepository
                .findTop50ByRoomIdOrderBySentAtAsc(id)
                .stream()
                .map(this::toDto)
                .toList();

        // populate cache for next time
        messages.forEach(messageCacheService::addMessage);

        return ResponseEntity.ok(messages);
    }

    private void joinRoomInternal(Long roomId, String username) {
        RoomMember member = new RoomMember();
        member.setRoomId(roomId);
        member.setUsername(username);
        member.setJoinedAt(LocalDateTime.now());
        roomMemberRepository.save(member);
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
}