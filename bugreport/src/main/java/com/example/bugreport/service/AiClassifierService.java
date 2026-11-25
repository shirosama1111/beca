package com.example.bugreport.service;

import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.repository.ErrorReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AiClassifierService {

    private static final Set<String> VALID_PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

    private final ErrorReportRepository repository;
    private final NotificationService notificationService;
    private final MlClassificationService mlClassificationService;

    @Async
    @Transactional
    public void classifyAndAssign(Long reportId, String title, String description, String consoleErrors) {
        try {
            String text = ((title == null ? "" : title) + " " + (description == null ? "" : description) + " " + (consoleErrors == null ? "" : consoleErrors)).toLowerCase(Locale.ROOT);
            String predictedCategory = "OTHER";
            String fallbackPriority = "MEDIUM";
            String suggestedAssignee = null;

            if (text.contains("nullpointer") || text.contains("null pointer") || text.contains("nullpointerexception")) {
                predictedCategory = "BACKEND";
                fallbackPriority = "HIGH";
                suggestedAssignee = "backend-team";
            } else if (text.contains("timeout") || text.contains("failed to fetch")) {
                predictedCategory = "NETWORK";
                fallbackPriority = "HIGH";
                suggestedAssignee = "infra-team";
            } else if (text.contains("css") || text.contains("ui") || text.contains("layout")) {
                predictedCategory = "UI";
                fallbackPriority = "LOW";
                suggestedAssignee = "frontend-team";
            } else if (text.contains("exception") || text.contains("error")) {
                predictedCategory = "ERROR";
            }

            ErrorReport report = repository.findById(reportId).orElse(null);
            if (report == null) return;

            // Severity is assigned by the trained ML model. Retain the existing rule-based
            // estimate only as an explicit fallback when the inference service is unavailable.
            var prediction = mlClassificationService.predict(report);
            String predictedPriority = "COMPLETED".equals(prediction.status())
                    && VALID_PRIORITIES.contains(prediction.severity())
                    ? prediction.severity()
                    : fallbackPriority;

            boolean changed = false;
            if (report.getCategory() == null || report.getCategory().equals("OTHER")) {
                report.setCategory(predictedCategory);
                changed = true;
            }
            // Always replace the submitted/default value: users do not choose severity.
            if (!predictedPriority.equals(report.getPriority())) {
                report.setPriority(predictedPriority);
                changed = true;
            }
            if (suggestedAssignee != null && (report.getAssignee() == null || report.getAssignee().isEmpty())) {
                report.setAssignee(suggestedAssignee);
                changed = true;
            }

            if (changed) {
                repository.save(report);
                notificationService.publishNewReport(report);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
