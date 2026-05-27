package com.andrej.chat_app.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class OnlinePresenceService {

    // roomId -> set of online usernames
    private final ConcurrentHashMap<Long, Set<String>> roomOnlineUsers
            = new ConcurrentHashMap<>();

    // all online users globally
    private final Set<String> onlineUsers
            = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public void userConnected(String username) {
        onlineUsers.add(username);
        log.info("User connected: {}", username);
    }

    public void userDisconnected(String username) {
        onlineUsers.remove(username);
        roomOnlineUsers.values().forEach(set -> set.remove(username));
        log.info("User disconnected: {}", username);
    }

    public void userJoinedRoom(Long roomId, String username) {
        roomOnlineUsers.computeIfAbsent(roomId,
                        k -> Collections.newSetFromMap(new ConcurrentHashMap<>()))
                .add(username);
    }

    public void userLeftRoom(Long roomId, String username) {
        Set<String> users = roomOnlineUsers.get(roomId);
        if (users != null) users.remove(username);
    }

    public Set<String> getOnlineUsersInRoom(Long roomId) {
        return roomOnlineUsers.getOrDefault(roomId, Collections.emptySet());
    }

    public Set<String> getAllOnlineUsers() {
        return Collections.unmodifiableSet(onlineUsers);
    }

    public boolean isOnline(String username) {
        return onlineUsers.contains(username);
    }
}