package com.andrej.chat_app.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class UnreadCountService {

    // username -> roomId -> unread count
    private final ConcurrentHashMap<String, ConcurrentHashMap<Long, Integer>>
        counts = new ConcurrentHashMap<>();

    public void increment(Long roomId, String senderUsername,
                          java.util.Set<String> roomMembers) {
        for (String member : roomMembers) {
            if (!member.equals(senderUsername)) {
                counts.computeIfAbsent(member, k -> new ConcurrentHashMap<>())
                      .merge(roomId, 1, Integer::sum);
            }
        }
    }

    public void clear(String username, Long roomId) {
        ConcurrentHashMap<Long, Integer> userCounts = counts.get(username);
        if (userCounts != null) userCounts.remove(roomId);
    }

    public Map<Long, Integer> getUnreadCounts(String username) {
        return counts.getOrDefault(username, new ConcurrentHashMap<>());
    }
}