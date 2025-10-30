package com.example.monopoly.controller;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.monopoly.service.GameService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/lobbies")
public class LobbyController {

    private final GameService gameService;
    // simple in-memory rate limiter per remote address: [count, windowStartMillis]
    private final ConcurrentMap<String, long[]> rate = new ConcurrentHashMap<>();
    private final int LIMIT = 5; // max creations per window
    private final long WINDOW_MS = 60L * 60L * 1000L; // 1 hour

    public LobbyController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<?> createLobby(Principal principal, HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        long now = System.currentTimeMillis();
        rate.putIfAbsent(remote, new long[] {0L, now});
        long[] arr = rate.get(remote);
        synchronized (arr) {
            long count = arr[0];
            long start = arr[1];
            if (now - start > WINDOW_MS) { // reset window
                arr[0] = 1L;
                arr[1] = now;
            } else {
                if (count >= LIMIT) {
                    return ResponseEntity.status(429).body(Map.of("error", "rate_limited"));
                }
                arr[0] = count + 1;
            }
        }
        String principalName = principal != null ? principal.getName() : null;
        String code = gameService.createLobby(principalName);
        if (code == null) return ResponseEntity.status(500).body(Map.of("error", "no-code-available"));
        return ResponseEntity.ok(Map.of("code", code));
    }
}
