package com.example.monopoly.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.monopoly.model.User;
import com.example.monopoly.service.UserService;

@RestController
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/api/me")
    public Map<String,String> me(Principal principal) {
        if (principal == null) return Map.of("username", "anonymous");
        
        // Principal.getName() returns email, fetch user to get username
        User user = userService.findByEmail(principal.getName())
                .orElseGet(() -> userService.findByUsername(principal.getName()).orElse(null));
        
        if (user != null) {
            return Map.of("username", user.getUsername(), "email", user.getEmail());
        }
        
        return Map.of("username", principal.getName());
    }
}
