package com.example.monopoly.service;

import java.util.List;
import java.util.Optional;
import java.util.Random;

import org.springframework.stereotype.Service;

import com.example.monopoly.model.Lobby;
import com.example.monopoly.repository.LobbyRepository;

@Service
public class LobbyService {
    private final LobbyRepository lobbyRepository;
    private final Random random = new Random();

    public LobbyService(LobbyRepository lobbyRepository) {
        this.lobbyRepository = lobbyRepository;
    }

    /**
     * Generate a unique 6-digit lobby code
     */
    public String generateUniqueCode() {
        String code;
        int attempts = 0;
        do {
            code = String.format("%06d", random.nextInt(1000000));
            attempts++;
            if (attempts > 100) {
                throw new RuntimeException("Failed to generate unique lobby code after 100 attempts");
            }
        } while (lobbyRepository.existsByCode(code));
        return code;
    }

    /**
     * Create a new lobby
     */
    public Lobby createLobby(String adminUsername) {
        String code = generateUniqueCode();
        Lobby lobby = new Lobby(code, adminUsername);
        return lobbyRepository.save(lobby);
    }

    /**
     * Find lobby by code
     */
    public Optional<Lobby> findByCode(String code) {
        return lobbyRepository.findByCode(code);
    }

    /**
     * Add player to lobby
     */
    public Lobby addPlayer(String code, String username) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        if (!"WAITING".equals(lobby.getStatus())) {
            throw new IllegalStateException("Cannot join lobby - game already started or completed");
        }
        
        if (lobby.getPlayers().size() >= 8) {
            throw new IllegalStateException("Lobby is full (max 8 players)");
        }
        
        lobby.addPlayer(username);
        return lobbyRepository.save(lobby);
    }

    /**
     * Remove player from lobby
     */
    public Lobby removePlayer(String code, String username) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        lobby.removePlayer(username);
        
        // If admin leaves, assign new admin or delete lobby
        if (lobby.isAdmin(username)) {
            if (lobby.getPlayers().isEmpty()) {
                lobbyRepository.delete(lobby);
                return null;
            } else {
                lobby.setAdminUsername(lobby.getPlayers().get(0));
            }
        }
        
        // Delete lobby if empty
        if (lobby.getPlayers().isEmpty()) {
            lobbyRepository.delete(lobby);
            return null;
        }
        
        return lobbyRepository.save(lobby);
    }

    /**
     * Update start amount
     */
    public Lobby updateStartAmount(String code, Integer startAmount, String requesterUsername) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        if (!lobby.isAdmin(requesterUsername)) {
            throw new IllegalStateException("Only admin can change start amount");
        }
        
        if (!"WAITING".equals(lobby.getStatus())) {
            throw new IllegalStateException("Cannot change start amount after game started");
        }
        
        lobby.setStartAmount(startAmount);
        return lobbyRepository.save(lobby);
    }

    /**
     * Start game
     */
    public Lobby startGame(String code, String requesterUsername) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        if (!lobby.isAdmin(requesterUsername)) {
            throw new IllegalStateException("Only admin can start the game");
        }
        
        if (lobby.getPlayers().size() < 2) {
            throw new IllegalStateException("Need at least 2 players to start");
        }
        
        lobby.startGame();
        return lobbyRepository.save(lobby);
    }

    /**
     * Complete game with results
     */
    public Lobby completeGame(String code, String winner, String runnerUp, List<Lobby.PlayerResult> results) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        lobby.setWinner(winner);
        lobby.setRunnerUp(runnerUp);
        lobby.setPlayerResults(results);
        lobby.completeGame();
        
        return lobbyRepository.save(lobby);
    }

    /**
     * Cancel game
     */
    public Lobby cancelGame(String code, String requesterUsername) {
        Lobby lobby = lobbyRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Lobby not found"));
        
        if (!lobby.isAdmin(requesterUsername)) {
            throw new IllegalStateException("Only admin can cancel the game");
        }
        
        lobby.cancelGame();
        return lobbyRepository.save(lobby);
    }

    /**
     * Get all lobbies by status
     */
    public List<Lobby> getLobbysByStatus(String status) {
        return lobbyRepository.findByStatus(status);
    }

    /**
     * Get lobbies for a user
     */
    public List<Lobby> getLobbiesForUser(String username) {
        return lobbyRepository.findByPlayersContaining(username);
    }

    /**
     * Get user's game history
     */
    public List<Lobby> getUserGameHistory(String username) {
        List<Lobby> lobbies = lobbyRepository.findByPlayersContaining(username);
        // Filter only completed games
        return lobbies.stream()
                .filter(l -> "COMPLETED".equals(l.getStatus()))
                .toList();
    }

    /**
     * Get user's wins
     */
    public List<Lobby> getUserWins(String username) {
        return lobbyRepository.findByWinner(username);
    }
}
