package com.example.monopoly.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "lobbies")
public class Lobby {
    @Id
    private String id;

    @Indexed(unique = true)
    private String code; // 6-digit unique code

    private String adminUsername; // Creator/admin of the lobby
    
    private List<String> players; // List of usernames in the lobby
    
    private String status; // WAITING, IN_PROGRESS, COMPLETED, CANCELLED
    
    private Integer startAmount; // Starting money for players
    
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    private Long durationSeconds; // Total game duration in seconds
    
    private String winner; // Username of the winner
    private String runnerUp; // Username of the runner-up
    
    private List<PlayerResult> playerResults; // Detailed results for all players

    // Constructors
    public Lobby() {
        this.players = new ArrayList<>();
        this.playerResults = new ArrayList<>();
        this.createdAt = LocalDateTime.now();
        this.status = "WAITING";
        this.startAmount = 1500; // Default Monopoly starting amount
    }

    public Lobby(String code, String adminUsername) {
        this();
        this.code = code;
        this.adminUsername = adminUsername;
        this.players.add(adminUsername);
    }

    // Inner class for player results
    public static class PlayerResult {
        private String username;
        private Integer finalBalance;
        private Integer propertiesOwned;
        private Integer rank; // 1 = winner, 2 = runner-up, etc.
        private String eliminationReason; // BANKRUPT, LEFT, null if completed

        public PlayerResult() {}

        public PlayerResult(String username, Integer finalBalance, Integer propertiesOwned, Integer rank) {
            this.username = username;
            this.finalBalance = finalBalance;
            this.propertiesOwned = propertiesOwned;
            this.rank = rank;
        }

        // Getters and Setters
        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public Integer getFinalBalance() {
            return finalBalance;
        }

        public void setFinalBalance(Integer finalBalance) {
            this.finalBalance = finalBalance;
        }

        public Integer getPropertiesOwned() {
            return propertiesOwned;
        }

        public void setPropertiesOwned(Integer propertiesOwned) {
            this.propertiesOwned = propertiesOwned;
        }

        public Integer getRank() {
            return rank;
        }

        public void setRank(Integer rank) {
            this.rank = rank;
        }

        public String getEliminationReason() {
            return eliminationReason;
        }

        public void setEliminationReason(String eliminationReason) {
            this.eliminationReason = eliminationReason;
        }
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getAdminUsername() {
        return adminUsername;
    }

    public void setAdminUsername(String adminUsername) {
        this.adminUsername = adminUsername;
    }

    public List<String> getPlayers() {
        return players;
    }

    public void setPlayers(List<String> players) {
        this.players = players;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getStartAmount() {
        return startAmount;
    }

    public void setStartAmount(Integer startAmount) {
        this.startAmount = startAmount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
    }

    public String getRunnerUp() {
        return runnerUp;
    }

    public void setRunnerUp(String runnerUp) {
        this.runnerUp = runnerUp;
    }

    public List<PlayerResult> getPlayerResults() {
        return playerResults;
    }

    public void setPlayerResults(List<PlayerResult> playerResults) {
        this.playerResults = playerResults;
    }

    // Helper methods
    public void addPlayer(String username) {
        if (!this.players.contains(username)) {
            this.players.add(username);
        }
    }

    public void removePlayer(String username) {
        this.players.remove(username);
    }

    public boolean isAdmin(String username) {
        return this.adminUsername != null && this.adminUsername.equals(username);
    }

    public void startGame() {
        this.status = "IN_PROGRESS";
        this.startedAt = LocalDateTime.now();
    }

    public void completeGame() {
        this.status = "COMPLETED";
        this.completedAt = LocalDateTime.now();
        if (this.startedAt != null && this.completedAt != null) {
            this.durationSeconds = java.time.Duration.between(this.startedAt, this.completedAt).getSeconds();
        }
    }

    public void cancelGame() {
        this.status = "CANCELLED";
        this.completedAt = LocalDateTime.now();
    }
}
