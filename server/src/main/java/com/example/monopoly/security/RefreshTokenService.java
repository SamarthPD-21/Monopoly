package com.example.monopoly.security;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {
    // simple in-memory store: username -> refreshToken
    private final Map<String, String> tokens = new ConcurrentHashMap<>();
    private final SecureRandom rnd = new SecureRandom();

    public String generateAndStore(String username) {
        byte[] b = new byte[32];
        rnd.nextBytes(b);
        String tok = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        tokens.put(username, tok);
        return tok;
    }

    public boolean validate(String username, String token) {
        if (username == null || token == null) return false;
        String t = tokens.get(username);
        return token.equals(t);
    }

    public String rotate(String username) {
        return generateAndStore(username);
    }

    public void revoke(String username) {
        tokens.remove(username);
    }

    public String getUsernameForToken(String token) {
        if (token == null) return null;
        for (Map.Entry<String, String> e : tokens.entrySet()) {
            if (token.equals(e.getValue())) return e.getKey();
        }
        return null;
    }
}
