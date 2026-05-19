package com.andrej.chat_app.dto;

import lombok.Data;

@Data
public class SendPrivateMessageRequest {
    private String content;
    private String receiverUsername;
}