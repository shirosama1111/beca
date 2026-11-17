package com.example.bugreport.service;

import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.repository.ErrorReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AiClassifierService {

    private final ErrorReportRepository repository;
    private final NotificationService notificationService;

    @Async
    @Transactional  // 🔵 Đảm bảo Hibernate session mở
    public void classifyAndAssign(Long reportId, String title, String description, String consoleErrors) {
        try {
            String text = ((title == null ? "" : title) + " " + (description == null ? "" : description) + " " + (consoleErrors == null ? "" : consoleErrors)).toLowerCase(Locale.ROOT);
            String predictedCategory = "OTHER";
            String predictedPriority = "MEDIUM";
            String suggestedAssignee = null;

            if (text.contains("nullpointer") || text.contains("null pointer") || text.contains("nullpointerexception")) {
                predictedCategory = "BACKEND";
                predictedPriority = "HIGH";
                suggestedAssignee = "backend-team";
            } else if (text.contains("timeout") || text.contains("failed to fetch")) {
                predictedCategory = "NETWORK";
                predictedPriority = "HIGH";
                suggestedAssignee = "infra-team";
            } else if (text.contains("css") || text.contains("ui") || text.contains("layout")) {
                predictedCategory = "UI";
                predictedPriority = "LOW";
                suggestedAssignee = "frontend-team";
            } else if (text.contains("exception") || text.contains("error")) {
                predictedCategory = "ERROR";
                predictedPriority = "MEDIUM";
            }

            ErrorReport r = repository.findById(reportId).orElse(null);
            if (r == null) return;

            boolean changed = false;
            if (r.getCategory() == null || r.getCategory().equals("OTHER")) {
                r.setCategory(predictedCategory);
                changed = true;
            }
            if (r.getPriority() == null || r.getPriority().equals("MEDIUM")) {
                r.setPriority(predictedPriority);
                changed = true;
            }
            if (suggestedAssignee != null && (r.getAssignee() == null || r.getAssignee().isEmpty())) {
                r.setAssignee(suggestedAssignee);
                changed = true;
            }

            if (changed) {
                repository.save(r);
                notificationService.publishNewReport(r);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}