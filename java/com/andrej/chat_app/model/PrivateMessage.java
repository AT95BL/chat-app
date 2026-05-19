package com.andrej.chat_app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "private_messages")
public class PrivateMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String content;

    private String senderUsername;

    private String receiverUsername;

    private LocalDateTime sentAt;

    private boolean read = false;

    private boolean deleted = false;
}