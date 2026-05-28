package com.andrej.chat_app.dto;

public record ChatTypingEvent(String username, Long roomId, boolean typing) {}