package com.andrej.chat_app.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PrivateMessageDto {
    private Long id;
    private String content;
    private String senderUsername;
    private String receiverUsername;
    private LocalDateTime sentAt;
    private boolean read;
    private boolean deleted;
}