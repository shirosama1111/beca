package com.example.bugreport.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_pipeline_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiPipelineReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long reportId;
    @Lob private String ruleFindings;
    private String mlCategory;
    private String mlSeverity;
    private double mlConfidence;
    private String mlModelVersion;
    private String mlStatus;
    private String llmStatus;
    @Lob private String llmAnalysis;
    private String reviewStatus;
    @Lob private String adminNotes;
    private String reviewedBy;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
}
