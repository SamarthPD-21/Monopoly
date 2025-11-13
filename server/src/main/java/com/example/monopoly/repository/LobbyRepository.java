package com.example.monopoly.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.monopoly.model.Lobby;

@Repository
public interface LobbyRepository extends MongoRepository<Lobby, String> {
    Optional<Lobby> findByCode(String code);
    
    boolean existsByCode(String code);
    
    List<Lobby> findByStatus(String status);
    
    List<Lobby> findByAdminUsername(String adminUsername);
    
    List<Lobby> findByPlayersContaining(String username);
    
    List<Lobby> findByWinner(String winner);
}
