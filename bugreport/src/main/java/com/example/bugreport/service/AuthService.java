package com.example.bugreport.service;

import com.example.bugreport.dto.AuthResponse;
import com.example.bugreport.dto.LoginRequest;
import com.example.bugreport.dto.RegisterRequest;
import com.example.bugreport.entity.User;
import com.example.bugreport.repository.UserRepository;
import com.example.bugreport.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new RuntimeException("Username already taken: " + req.getUsername());
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already registered: " + req.getEmail());
        }

        String role = (req.getRole() != null
                && List.of("ADMIN","DEVELOPER","USER").contains(req.getRole().toUpperCase()))
                ? req.getRole().toUpperCase()
                : "USER";

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(role)
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole(), saved.getId());

        return new AuthResponse(token, saved.getUsername(), saved.getEmail(),
                saved.getRole(), saved.getId());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId());
        return new AuthResponse(token, user.getUsername(), user.getEmail(),
                user.getRole(), user.getId());
    }

    private static final java.util.List<String> VALID_ROLES =
            java.util.List.of("ADMIN", "DEVELOPER", "USER");
}