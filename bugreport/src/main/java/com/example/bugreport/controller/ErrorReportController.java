package com.example.bugreport.controller;

import com.example.bugreport.dto.CommentRequest;
import com.example.bugreport.dto.CreateReportRequest;
import com.example.bugreport.dto.UpdateReportRequest;
import com.example.bugreport.entity.Comment;
import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.entity.ErrorReportHistory;
import com.example.bugreport.security.JwtFilter.AuthPrincipal;
import com.example.bugreport.service.ErrorReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ErrorReportController {

    private final ErrorReportService service;

    @PostMapping
    public ResponseEntity<ErrorReport> create(
            @RequestBody CreateReportRequest request,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        return ResponseEntity.ok(service.create(request, userId));
    }

    @GetMapping
    public ResponseEntity<List<ErrorReport>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String reporterType,
            @RequestParam(required = false) String search
    ) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(service.searchByTitle(search));
        }

        boolean hasFilter = status != null || priority != null
                || assignee != null || category != null || reporterType != null;

        return ResponseEntity.ok(hasFilter
                ? service.getFiltered(status, priority, assignee, category, reporterType)
                : service.getAll());
    }

    @GetMapping("/my")
    public ResponseEntity<List<ErrorReport>> getMyReports(Authentication auth) {
        Long userId = extractUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(service.getByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ErrorReport> getById(
            @PathVariable Long id,
            Authentication auth
    ) {
        ErrorReport report = service.getById(id);

        if (hasRole(auth, "ROLE_USER")) {
            Long userId = extractUserId(auth);
            if (!report.getReporterUserId().equals(userId)) {
                return ResponseEntity.status(403).build();
            }
        }

        return ResponseEntity.ok(report);
    }

    @GetMapping("/stats/overview")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(service.getStats());
    }

    @GetMapping("/stats/priority")
    public ResponseEntity<Map<String, Long>> getStatsByPriority() {
        return ResponseEntity.ok(service.getStatsByPriority());
    }

    @GetMapping("/unassigned")
    public ResponseEntity<List<ErrorReport>> getUnassigned(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(service.getTopUnassigned(limit));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(service.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long id,
            @RequestBody CommentRequest request,
            Authentication auth
    ) {
        if (hasRole(auth, "ROLE_USER")) {
            ErrorReport report = service.getById(id);
            Long userId = extractUserId(auth);
            if (report.getReporterUserId() == null || !report.getReporterUserId().equals(userId)) {
                return ResponseEntity.status(403).build();
            }
            request.setType("PUBLIC");
        }
        return ResponseEntity.ok(
                service.addComment(id, request, auth)
        );    }

    @PatchMapping("/{id}")
    public ResponseEntity<ErrorReport> update(
            @PathVariable Long id,
            @RequestBody UpdateReportRequest request
    ) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<ErrorReport> changeStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        UpdateReportRequest req = new UpdateReportRequest();
        req.setStatus(body.get("status"));
        return ResponseEntity.ok(service.update(id, req));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<ErrorReport> assign(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        UpdateReportRequest req = new UpdateReportRequest();
        req.setAssignee(body.get("assignee"));
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ErrorReportHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.getHistory(id));
    }
    
    private Long extractUserId(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal p)) return null;
        return p.userId();
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role::equals);
    }
}