package com.example.bugreport.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class NotificationService {
    private final Set<SseEmitter> clients = new CopyOnWriteArraySet<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        clients.add(emitter);
        emitter.onCompletion(() -> clients.remove(emitter));
        emitter.onTimeout(() -> clients.remove(emitter));
        return emitter;
    }

    public void publishNewReport(Object reportPayload) {
        for (SseEmitter emitter : clients) {
            try {
                emitter.send(SseEmitter.event().name("new-report").data(reportPayload));
            } catch (IOException e) {
                clients.remove(emitter);
            }
        }
    }
}
