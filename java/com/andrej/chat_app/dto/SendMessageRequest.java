package com.andrej.chat_app.dto;

import lombok.Data;

@Data
public class SendMessageRequest {
    private String content;
    private Long roomId;
}