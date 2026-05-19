package com.andrej.chat_app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String content;

    private String senderUsername;

    private Long roomId;

    private LocalDateTime sentAt;

    private boolean deleted = false;

    @Enumerated(EnumType.STRING)
    private MessageType type = MessageType.CHAT;

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }
}