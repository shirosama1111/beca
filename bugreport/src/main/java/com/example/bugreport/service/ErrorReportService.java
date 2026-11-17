package com.example.bugreport.service;

import com.example.bugreport.dto.CommentRequest;
import com.example.bugreport.dto.CreateReportRequest;
import com.example.bugreport.dto.UpdateReportRequest;
import com.example.bugreport.entity.Comment;
import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.entity.ErrorReportHistory;
import com.example.bugreport.repository.CommentRepository;
import com.example.bugreport.repository.ErrorReportHistoryRepository;
import com.example.bugreport.repository.ErrorReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import com.example.bugreport.security.JwtFilter.AuthPrincipal;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ErrorReportService {

    private final ErrorReportRepository repository;
    private final CommentRepository commentRepository;
    private final NotificationService NotificationService;
    private final AiClassifierService aiClassifierService;
    private final ErrorReportHistoryRepository historyRepository;

    public ErrorReport create(CreateReportRequest request, Long reporterUserId) {
        // ��� Nếu priority null, prioritize default MEDIUM (AI sẽ classify sau)
        String initialPriority = request.getPriority() != null ? request.getPriority() : "MEDIUM";

        ErrorReport report = ErrorReport.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .image(request.getImage())
                .url(request.getUrl())
                .priority(initialPriority)  // 🔵 Set MEDIUM mặc định, AI sẽ update
                .reporterType(request.getReporterType() != null ? request.getReporterType() : "USER")
                .reporterName(request.getReporterName())
                .reporterEmail(request.getReporterEmail())
                .category(request.getCategory() != null ? request.getCategory() : "OTHER")
                .browserInfo(request.getBrowserInfo())
                .consoleErrors(request.getConsoleErrors())
                .steps(request.getSteps())
                .version(request.getVersion())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .status("OPEN")
                .viewCount(0)
                .reporterUserId(reporterUserId)
                .build();

        NotificationService.publishNewReport(report);
        ErrorReport saved = repository.save(report);
        NotificationService.publishNewReport(saved);

        // 🔵 AI async classification (sẽ updated priority nếu HTTP priority là null)
        aiClassifierService.classifyAndAssign(saved.getId(), saved.getTitle(), saved.getDescription(), saved.getConsoleErrors());

        return saved;
    }

    public List<ErrorReportHistory> getHistory(Long reportId) {
        return historyRepository.findByReportIdOrderByCreatedAtDesc(reportId);
    }

    public List<ErrorReport> getAll() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    public List<ErrorReport> getFiltered(String status, String priority,
                                         String assignee, String category,
                                         String reporterType) {
        return repository.findFiltered(status, priority, assignee, category, reporterType);
    }

    public List<ErrorReport> searchByTitle(String keyword) {
        return repository.findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(keyword);
    }

    public List<ErrorReport> getByUserId(Long userId) {
        return repository.findByReporterUserIdOrderByCreatedAtDesc(userId);
    }

    public ErrorReport getById(Long id) {
        ErrorReport report = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found: " + id));
        report.setViewCount(report.getViewCount() + 1);
        return repository.save(report);
    }

    private void recordChange(
            Long reportId,
            String changeType,
            String oldV,
            String newV,
            String currentUser) {

        ErrorReportHistory h = ErrorReportHistory.builder()
                .reportId(reportId)
                .changeType(changeType)
                .oldValue(oldV)
                .newValue(newV)
                .changedBy(currentUser)
                .createdAt(LocalDateTime.now())
                .build();

        historyRepository.save(h);
    }

    public ErrorReport update(Long id, UpdateReportRequest request) {
        ErrorReport report = getById(id);
        if (request.getStatus() != null) {
            recordChange(id, "STATUS", report.getStatus(), request.getStatus(), "SYSTEM");
            report.setStatus(request.getStatus());
        }

        if (request.getPriority()         != null) report.setPriority(request.getPriority());
        if (request.getCategory()         != null) report.setCategory(request.getCategory());
        if (request.getDevelopmentNotes() != null) report.setDevelopmentNotes(request.getDevelopmentNotes());

        if (request.getAssignee() != null) {
            report.setAssignee(request.getAssignee());
            if ("OPEN".equals(report.getStatus())) report.setStatus("IN_PROGRESS");
        }

        report.setUpdatedAt(LocalDateTime.now());

        return repository.save(report);
    }

    public Comment addComment(
            Long reportId,
            CommentRequest request,
            Authentication auth
    ) {

        ErrorReport report = repository.findById(reportId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Report not found: " + reportId
                        )
                );

        String author = "Anonymous";

        if (
                auth != null &&
                        auth.getPrincipal() instanceof AuthPrincipal p
        ) {
            author = p.username();
        }

        Comment comment = Comment.builder()
                .errorReport(report)
                .text(request.getText())
                .author(author)
                .type(
                        request.getType() != null
                                ? request.getType()
                                : "PUBLIC"
                )
                .createdAt(LocalDateTime.now())
                .build();

        return commentRepository.save(comment);
    }

    public List<Comment> getComments(Long reportId) {
        return commentRepository.findByErrorReportIdOrderByCreatedAtDesc(reportId);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public Map<String, Long> getStats() {
        return Map.of(
                "OPEN",        repository.countByStatus("OPEN"),
                "IN_PROGRESS", repository.countByStatus("IN_PROGRESS"),
                "RESOLVED",    repository.countByStatus("RESOLVED"),
                "CLOSED",      repository.countByStatus("CLOSED"),
                "WONT_FIX",    repository.countByStatus("WONT_FIX"),
                "TOTAL",       repository.count()
        );
    }

    public Map<String, Long> getStatsByPriority() {
        return Map.of(
                "LOW",      repository.countByPriority("LOW"),
                "MEDIUM",   repository.countByPriority("MEDIUM"),
                "HIGH",     repository.countByPriority("HIGH"),
                "CRITICAL", repository.countByPriority("CRITICAL")
        );
    }

    public List<ErrorReport> getTopUnassigned(int limit) {
        return repository.findTopUnassigned(PageRequest.of(0, limit));
    }
}