package com.example.monopoly.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
public class UserController {
    @GetMapping("/api/me")
    public Map<String,String> me(Principal principal) {
        if (principal == null) return Map.of("username", "anonymous");
        return Map.of("username", principal.getName());
    }
}
