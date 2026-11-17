package com.example.bugreport.controller;

import com.example.bugreport.entity.ErrorReport;
import com.example.bugreport.security.JwtFilter.AuthPrincipal;
import com.example.bugreport.service.ErrorReportService;
import com.example.bugreport.service.LlmAnalysisService;
import com.example.bugreport.service.MlClassificationService;
import com.example.bugreport.service.RuleBasedAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class AiAnalysisController {
    private final ErrorReportService reports;
    private final RuleBasedAnalysisService rules;
    private final MlClassificationService ml;
    private final LlmAnalysisService llm;

    @PostMapping("/{id}/ai-analysis")
    public ResponseEntity<Map<String, Object>> analyze(@PathVariable Long id,
            @RequestParam(defaultValue = "USER") String audience, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(401).build();
        boolean developer = hasRole(auth, "ROLE_DEVELOPER") || hasRole(auth, "ROLE_ADMIN");
        Long userId = auth.getPrincipal() instanceof AuthPrincipal principal ? principal.userId() : null;
        if (!developer && (!hasRole(auth, "ROLE_USER") || userId == null)) return ResponseEntity.status(403).build();
        ErrorReport report = reports.getById(id);
        if (!developer && (report.getReporterUserId() == null || !report.getReporterUserId().equals(userId))) return ResponseEntity.status(403).build();
        String view = developer && "DEVELOPER".equalsIgnoreCase(audience) ? "DEVELOPER" : "USER";
        var prediction = ml.predict(report);
        var llmResult = llm.analyze(report, view);
        return ResponseEntity.ok(Map.of(
                "audience", view,
                "ruleFindings", rules.analyze(report.getTitle(), report.getDescription(), report.getConsoleErrors()),
                "ml", prediction,
                "llm", llmResult));
    }
    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }
}
