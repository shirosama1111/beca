package com.example.bugreport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ErrorReportHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long reportId;
    private String changedBy; // username or system
    private String changeType; // STATUS/ASSIGNEE/PRIORITY/UPDATE
    @Column(columnDefinition = "TEXT")
    private String oldValue;
    @Column(columnDefinition = "TEXT")
    private String newValue;
    private LocalDateTime createdAt;
}