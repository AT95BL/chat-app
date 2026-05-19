package com.andrej.chat_app.dto;

import lombok.Data;

@Data
public class CreateRoomRequest {
    private String name;
    private String description;
}