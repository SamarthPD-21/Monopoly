package com.example.monopoly.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.monopoly.model.User;
import com.example.monopoly.security.JwtUtil;
import com.example.monopoly.security.RefreshTokenService;
import com.example.monopoly.service.UserService;

@RestController
public class AuthController {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    
    private final AuthenticationManager authManager;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthenticationManager authManager, UserService userService, RefreshTokenService refreshTokenService) {
        this.authManager = authManager;
        this.userService = userService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/auth/token")
    public ResponseEntity<?> token(@RequestBody Map<String,String> body) {
        String emailOrUsername = body.get("email") != null ? body.get("email") : body.get("username");
        String password = body.get("password");
        
        if (emailOrUsername == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "missing-credentials"));
        }
        
        try {
            Authentication a = authManager.authenticate(new UsernamePasswordAuthenticationToken(emailOrUsername, password));
            if (a.isAuthenticated()) {
                // Fetch user to get username
                User user = userService.findByEmail(a.getName())
                        .orElseGet(() -> userService.findByUsername(a.getName()).orElse(null));
                
                if (user == null) {
                    return ResponseEntity.status(401).body(Map.of("error", "user-not-found"));
                }
                
                String token = JwtUtil.generateAccessToken(a.getName());
                String refresh = refreshTokenService.generateAndStore(a.getName());
                return ResponseEntity.ok(Map.of(
                    "token", token, 
                    "refreshToken", refresh, 
                    "expiresIn", JwtUtil.ACCESS_TOKEN_EXP_MS,
                    "username", user.getUsername(),
                    "email", user.getEmail()
                ));
            }
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid-credentials"));
        }
        return ResponseEntity.status(401).body(Map.of("error", "invalid-credentials"));
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String,String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null) return ResponseEntity.badRequest().body(Map.of("error", "missing-refresh-token"));
        String email = refreshTokenService.getUsernameForToken(refreshToken);
        if (email == null) return ResponseEntity.status(401).body(Map.of("error", "invalid-refresh-token"));
        // rotate refresh token for better hygiene
        String newRefresh = refreshTokenService.rotate(email);
        String newAccess = JwtUtil.generateAccessToken(email);
        return ResponseEntity.ok(Map.of("token", newAccess, "refreshToken", newRefresh, "expiresIn", JwtUtil.ACCESS_TOKEN_EXP_MS));
    }

    @PostMapping("/auth/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String,String> body) {
        String email = body.get("email");
        String username = body.get("username");
        String password = body.get("password");
        
        Map<String, String> errors = new HashMap<>();
        
        // Validation
        if (email == null || email.trim().isEmpty()) {
            errors.put("email", "Email is required");
        } else if (!EMAIL_PATTERN.matcher(email).matches()) {
            errors.put("email", "Invalid email format");
        } else if (userService.existsByEmail(email)) {
            errors.put("email", "Email already exists");
        }
        
        if (username == null || username.trim().isEmpty()) {
            errors.put("username", "Username is required");
        } else if (username.length() < 3) {
            errors.put("username", "Username must be at least 3 characters");
        } else if (userService.existsByUsername(username)) {
            errors.put("username", "Username already exists");
        }
        
        if (password == null || password.isEmpty()) {
            errors.put("password", "Password is required");
        } else if (password.length() < 6) {
            errors.put("password", "Password must be at least 6 characters");
        }
        
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "validation-failed", "errors", errors));
        }
        
        try {
            User user = userService.createUser(email, username, password);
            
            // Auto-login: generate tokens
            String token = JwtUtil.generateAccessToken(user.getEmail());
            String refresh = refreshTokenService.generateAndStore(user.getEmail());
            
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "message", "Account created successfully",
                "token", token,
                "refreshToken", refresh,
                "expiresIn", JwtUtil.ACCESS_TOKEN_EXP_MS,
                "username", user.getUsername(),
                "email", user.getEmail()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "signup-failed"));
        }
    }
}
