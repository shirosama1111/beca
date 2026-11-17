package com.example.bugreport.controller;

import com.example.bugreport.entity.AiPipelineReview;
import com.example.bugreport.security.JwtFilter.AuthPrincipal;
import com.example.bugreport.service.AiAnalysisPipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
public class AdminAiReviewController {
    private final AiAnalysisPipelineService pipeline;
    @PostMapping("/reports/{reportId}/analyze")
    public ResponseEntity<AiPipelineReview> analyze(@PathVariable Long reportId, Authentication auth) {
        if (!isAdmin(auth)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(pipeline.run(reportId));
    }
    @GetMapping("/reviews")
    public ResponseEntity<List<AiPipelineReview>> reviews(@RequestParam(required = false) String status, Authentication auth) {
        if (!isAdmin(auth)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(pipeline.list(status));
    }
    @PatchMapping("/reviews/{id}")
    public ResponseEntity<AiPipelineReview> review(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        if (!isAdmin(auth)) return ResponseEntity.status(403).build();
        String username = auth.getPrincipal() instanceof AuthPrincipal principal ? principal.username() : "admin";
        return ResponseEntity.ok(pipeline.review(id, body.get("status"), body.get("adminNotes"), username));
    }
    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.isAuthenticated() && auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch("ROLE_ADMIN"::equals);
    }
}
