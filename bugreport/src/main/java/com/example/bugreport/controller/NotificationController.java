package com.example.bugreport.controller;

import com.example.bugreport.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin("*")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/subscribe")
    public SseEmitter subscribe() {
        return notificationService.subscribe();
    }
}