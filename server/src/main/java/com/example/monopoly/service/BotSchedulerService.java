package com.example.monopoly.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class BotSchedulerService {
    private final GameService gameService;

    public BotSchedulerService(GameService gameService) {
        this.gameService = gameService;
    }

    // Check every 3 seconds if any bot needs to take a turn
    @Scheduled(fixedDelay = 3000)
    public void processBotTurns() {
        try {
            gameService.processBotTurns();
        } catch (Exception e) {
            System.err.println("Error processing bot turns: " + e.getMessage());
        }
    }
}
