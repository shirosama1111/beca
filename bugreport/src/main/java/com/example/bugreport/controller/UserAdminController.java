package com.example.bugreport.controller;

import com.example.bugreport.entity.User;
import com.example.bugreport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/users")
public class UserAdminController {

    private final UserRepository userRepository;

    @GetMapping
    // ensure only ADMIN
    public ResponseEntity<List<User>> listUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<User> changeRole(@PathVariable Long id, @RequestBody Map<String,String> body) {
        var user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(body.get("role"));
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}