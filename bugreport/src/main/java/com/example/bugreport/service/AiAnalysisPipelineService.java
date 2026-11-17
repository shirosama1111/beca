package com.example.bugreport.service;

import com.example.bugreport.entity.AiPipelineReview;
import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.repository.AiPipelineReviewRepository;
import com.example.bugreport.repository.ErrorReportRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiAnalysisPipelineService {
    private final ErrorReportRepository reports;
    private final AiPipelineReviewRepository reviews;
    private final RuleBasedAnalysisService rules;
    private final MlClassificationService ml;
    private final LlmAnalysisService llm;
    private final ObjectMapper mapper;

    @Transactional
    public AiPipelineReview run(Long reportId) {
        ErrorReport report = reports.findById(reportId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        var findings = rules.analyze(report.getTitle(), report.getDescription(), report.getConsoleErrors());
        var prediction = ml.predict(report);
        var llmResult = llm.analyze(report, "DEVELOPER");
        try {
            return reviews.save(AiPipelineReview.builder().reportId(reportId).ruleFindings(mapper.writeValueAsString(findings))
                    .mlCategory(prediction.category()).mlSeverity(prediction.severity()).mlConfidence(prediction.confidence())
                    .mlModelVersion(prediction.modelVersion()).mlStatus(prediction.status()).llmStatus(llmResult.status())
                    .llmAnalysis(llmResult.content()).reviewStatus("PENDING").createdAt(LocalDateTime.now()).build());
        } catch (JsonProcessingException exception) { throw new IllegalStateException("Could not save pipeline findings", exception); }
    }
    @Transactional(readOnly = true)
    public List<AiPipelineReview> list(String status) {
        return status == null || status.isBlank() ? reviews.findAllByOrderByCreatedAtDesc() : reviews.findByReviewStatusOrderByCreatedAtDesc(status.toUpperCase());
    }
    @Transactional
    public AiPipelineReview review(Long id, String status, String notes, String admin) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("APPROVED", "REJECTED", "NEEDS_CHANGES").contains(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid review status");
        AiPipelineReview item = reviews.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        item.setReviewStatus(normalized); item.setAdminNotes(notes == null ? "" : notes.substring(0, Math.min(notes.length(), 4000)));
        item.setReviewedBy(admin); item.setReviewedAt(LocalDateTime.now()); return reviews.save(item);
    }
}
