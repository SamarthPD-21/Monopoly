package com.example.monopoly.security;

import java.util.Date;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

public class JwtUtil {
    // Read secret from environment for better security; fallback to a demo secret
    private static final String ENV_SECRET = System.getenv("JWT_SECRET");
    private static final byte[] SECRET_BYTES = (ENV_SECRET != null && !ENV_SECRET.isBlank())
            ? ENV_SECRET.getBytes()
            : "monopoly-demo-secret-key-change-me-please-0123456789".getBytes();
    private static final SecretKey key = Keys.hmacShaKeyFor(SECRET_BYTES);

    // lifetimes
    public static final long ACCESS_TOKEN_EXP_MS = 15 * 60 * 1000L; // 15 minutes
    public static final long REFRESH_TOKEN_EXP_MS = 7 * 24 * 60 * 60 * 1000L; // 7 days

    public static String generateAccessToken(String username) {
        return generateToken(username, ACCESS_TOKEN_EXP_MS);
    }

    public static String generateToken(String username, long expMs) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public static Claims validateToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    public static String getUsername(String token) {
        Claims c = validateToken(token);
        return c.getSubject();
    }
}
