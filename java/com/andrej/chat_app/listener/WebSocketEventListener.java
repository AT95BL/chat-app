package com.andrej.chat_app.listener;

import com.andrej.chat_app.service.OnlinePresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final OnlinePresenceService onlinePresenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null
                ? accessor.getUser().getName() : null;
        if (username != null) {
            onlinePresenceService.userConnected(username);
            // broadcast updated online users list
            messagingTemplate.convertAndSend("/topic/presence",
                    onlinePresenceService.getAllOnlineUsers());
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null
                ? accessor.getUser().getName() : null;
        if (username != null) {
            onlinePresenceService.userDisconnected(username);
            messagingTemplate.convertAndSend("/topic/presence",
                    onlinePresenceService.getAllOnlineUsers());
        }
    }
}