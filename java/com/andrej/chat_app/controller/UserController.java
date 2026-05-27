package com.andrej.chat_app.controller;

import com.andrej.chat_app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<String>> getAllUsers(Principal principal) {
        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .map(u -> u.getUsername())
                        .filter(u -> !u.equals(principal.getName()))
                        .toList()
        );
    }
}