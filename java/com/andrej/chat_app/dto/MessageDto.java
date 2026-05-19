package com.andrej.chat_app.dto;

import com.andrej.chat_app.model.Message.MessageType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageDto {
    private Long id;
    private String content;
    private String senderUsername;
    private Long roomId;
    private LocalDateTime sentAt;
    private boolean deleted;
    private MessageType type;
}