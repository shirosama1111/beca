package com.example.bugreport.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    private static final String SECRET = "bugreport-secret-key-change-in-production-2024";
    private static final long EXPIRATION_MS = 86_400_000L; // 24 h

    private Key key() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    public String generateToken(String username, String role, Long userId) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(key())
                .compact();
    }

    public String extractUsername(String token) {
        return claims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) claims(token).get("role");
    }

    public Long extractUserId(String token) {
        Object id = claims(token).get("userId");
        if (id instanceof Integer) return ((Integer) id).longValue();
        if (id instanceof Long)    return (Long) id;
        return null;
    }

    public boolean validateToken(String token) {
        try {
            claims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims claims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}