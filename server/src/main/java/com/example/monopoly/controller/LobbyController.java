package com.example.monopoly.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.monopoly.model.Lobby;
import com.example.monopoly.model.User;
import com.example.monopoly.service.GameService;
import com.example.monopoly.service.LobbyService;
import com.example.monopoly.service.UserService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/lobbies")
public class LobbyController {

    private final LobbyService lobbyService;
    private final UserService userService;
    private final GameService gameService;
    // simple in-memory rate limiter per remote address: [count, windowStartMillis]
    private final ConcurrentMap<String, long[]> rate = new ConcurrentHashMap<>();
    private final int LIMIT = 5; // max creations per window
    private final long WINDOW_MS = 60L * 60L * 1000L; // 1 hour

    public LobbyController(LobbyService lobbyService, UserService userService, GameService gameService) {
        this.lobbyService = lobbyService;
        this.userService = userService;
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<?> createLobby(Principal principal, HttpServletRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        // Dev account bypass - no rate limits for dev email
        boolean isDevAccount = "samarthpd21@gmail.com".equals(principal.getName());
        
        if (!isDevAccount) {
            // Apply rate limiting for regular users
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
        }
        
        // Get username from email
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        try {
            // Create lobby with username for display
            Lobby lobby = lobbyService.createLobby(user.getUsername());
            
            // Reserve the room in GameService and set admin principal to email for proper matching
            String code = lobby.getCode();
            gameService.ensureRoomWithAdminPrincipal(code, principal.getName());
            
            return ResponseEntity.ok(Map.of(
                "code", lobby.getCode(),
                "adminUsername", lobby.getAdminUsername(),
                "players", lobby.getPlayers(),
                "status", lobby.getStatus(),
                "startAmount", lobby.getStartAmount()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "failed_to_create_lobby", "message", e.getMessage()));
        }
    }
    
    @GetMapping("/{code}")
    public ResponseEntity<?> getLobby(@PathVariable String code) {
        return lobbyService.findByCode(code)
                .map(lobby -> ResponseEntity.ok(Map.of(
                    "code", lobby.getCode(),
                    "adminUsername", lobby.getAdminUsername(),
                    "players", lobby.getPlayers(),
                    "status", lobby.getStatus(),
                    "startAmount", lobby.getStartAmount(),
                    "createdAt", lobby.getCreatedAt().toString(),
                    "winner", lobby.getWinner() != null ? lobby.getWinner() : "",
                    "runnerUp", lobby.getRunnerUp() != null ? lobby.getRunnerUp() : "",
                    "durationSeconds", lobby.getDurationSeconds() != null ? lobby.getDurationSeconds() : 0
                )))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "lobby_not_found")));
    }
    
    @PostMapping("/{code}/join")
    public ResponseEntity<?> joinLobby(@PathVariable String code, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        try {
            Lobby lobby = lobbyService.addPlayer(code, user.getUsername());
            return ResponseEntity.ok(Map.of(
                "code", lobby.getCode(),
                "players", lobby.getPlayers(),
                "status", lobby.getStatus()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{code}/leave")
    public ResponseEntity<?> leaveLobby(@PathVariable String code, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        try {
            Lobby lobby = lobbyService.removePlayer(code, user.getUsername());
            if (lobby == null) {
                return ResponseEntity.ok(Map.of("message", "lobby_deleted"));
            }
            return ResponseEntity.ok(Map.of(
                "code", lobby.getCode(),
                "players", lobby.getPlayers(),
                "adminUsername", lobby.getAdminUsername()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        }
    }
    
    @PostMapping("/{code}/kick")
    public ResponseEntity<?> kickPlayer(@PathVariable String code, @RequestBody Map<String, String> body, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User admin = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        String targetUsername = body.get("username");
        if (targetUsername == null) {
            return ResponseEntity.status(400).body(Map.of("error", "username_required"));
        }
        
        try {
            Lobby lobby = lobbyService.findByCode(code)
                    .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
            
            if (!lobby.isAdmin(admin.getUsername())) {
                return ResponseEntity.status(403).body(Map.of("error", "only_admin_can_kick"));
            }
            
            lobby = lobbyService.removePlayer(code, targetUsername);
            return ResponseEntity.ok(Map.of("players", lobby.getPlayers()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        }
    }
    
    @PostMapping("/{code}/start-amount")
    public ResponseEntity<?> setStartAmount(@PathVariable String code, @RequestBody Map<String, Integer> body, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User admin = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Integer startAmount = body.get("startAmount");
        if (startAmount == null || startAmount < 100 || startAmount > 100000) {
            return ResponseEntity.status(400).body(Map.of("error", "invalid_start_amount"));
        }
        
        try {
            Lobby lobby = lobbyService.updateStartAmount(code, startAmount, admin.getUsername());
            return ResponseEntity.ok(Map.of("startAmount", lobby.getStartAmount()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{code}/start")
    public ResponseEntity<?> startGame(@PathVariable String code, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User admin = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        try {
            Lobby lobby = lobbyService.startGame(code, admin.getUsername());
            return ResponseEntity.ok(Map.of(
                "status", lobby.getStatus(),
                "startedAt", lobby.getStartedAt().toString()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{code}/complete")
    public ResponseEntity<?> completeGame(@PathVariable String code, @RequestBody Map<String, Object> body, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        String winner = (String) body.get("winner");
        String runnerUp = (String) body.get("runnerUp");
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> resultsData = (List<Map<String, Object>>) body.get("results");
        
        List<Lobby.PlayerResult> results = resultsData.stream()
                .map(data -> {
                    Lobby.PlayerResult result = new Lobby.PlayerResult();
                    result.setUsername((String) data.get("username"));
                    result.setFinalBalance((Integer) data.get("finalBalance"));
                    result.setPropertiesOwned((Integer) data.get("propertiesOwned"));
                    result.setRank((Integer) data.get("rank"));
                    result.setEliminationReason((String) data.get("eliminationReason"));
                    return result;
                })
                .collect(Collectors.toList());
        
        try {
            Lobby lobby = lobbyService.completeGame(code, winner, runnerUp, results);
            return ResponseEntity.ok(Map.of(
                "status", lobby.getStatus(),
                "winner", lobby.getWinner(),
                "runnerUp", lobby.getRunnerUp(),
                "durationSeconds", lobby.getDurationSeconds()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "lobby_not_found"));
        }
    }
    
    @GetMapping("/my-lobbies")
    public ResponseEntity<?> getMyLobbies(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Lobby> lobbies = lobbyService.getLobbiesForUser(user.getUsername());
        return ResponseEntity.ok(lobbies);
    }
    
    @GetMapping("/history")
    public ResponseEntity<?> getGameHistory(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Lobby> history = lobbyService.getUserGameHistory(user.getUsername());
        return ResponseEntity.ok(history);
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "authentication_required"));
        }
        
        User user = userService.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Lobby> wins = lobbyService.getUserWins(user.getUsername());
        List<Lobby> history = lobbyService.getUserGameHistory(user.getUsername());
        
        long totalGames = history.size();
        long totalWins = wins.size();
        long totalDuration = history.stream()
                .mapToLong(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0L)
                .sum();
        
        return ResponseEntity.ok(Map.of(
            "totalGames", totalGames,
            "totalWins", totalWins,
            "winRate", totalGames > 0 ? (double) totalWins / totalGames : 0.0,
            "totalPlayTimeSeconds", totalDuration
        ));
    }
}
