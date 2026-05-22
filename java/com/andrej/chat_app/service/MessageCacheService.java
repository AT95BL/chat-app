package com.andrej.chat_app.service;

import com.andrej.chat_app.dto.MessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageCacheService {

    private final RedisTemplate<String, MessageDto> messageRedisTemplate;

    private static final int MAX_MESSAGES = 50;
    private static final long TTL_HOURS = 24;

    private String key(Long roomId) {
        return "room:messages:" + roomId;
    }

    public void addMessage(MessageDto message) {
        String key = key(message.getRoomId());
        try {
            messageRedisTemplate.opsForList().rightPush(key, message);
            // keep only last 50 messages
            messageRedisTemplate.opsForList().trim(key, -MAX_MESSAGES, -1);
            // reset TTL on every new message
            messageRedisTemplate.expire(key, TTL_HOURS, TimeUnit.HOURS);
            log.debug("Cached message in room {}", message.getRoomId());
        } catch (Exception e) {
            log.warn("Redis cache write failed: {}", e.getMessage());
        }
    }

    public List<MessageDto> getMessages(Long roomId) {
        String key = key(roomId);
        try {
            List<MessageDto> cached = messageRedisTemplate.opsForList().range(key, 0, -1);
            if (cached != null && !cached.isEmpty()) {
                log.debug("Cache HIT for room {}", roomId);
                return cached;
            }
        } catch (Exception e) {
            log.warn("Redis cache read failed: {}", e.getMessage());
        }
        log.debug("Cache MISS for room {}", roomId);
        return new ArrayList<>();
    }

    public void clearRoom(Long roomId) {
        messageRedisTemplate.delete(key(roomId));
    }
}