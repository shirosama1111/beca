package com.example.bugreport.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ErrorReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String image;

    private String url;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String status;
    private String priority;
    private String reporterType;

    private String reporterName;
    private String reporterEmail;
    private String assignee;
    private String category;

    @Column(columnDefinition = "TEXT")
    private String browserInfo;

    @Column(columnDefinition = "TEXT")
    private String consoleErrors;

    @Column(columnDefinition = "TEXT")
    private String steps;

    private String version;
    private int viewCount;

    @Column(columnDefinition = "TEXT")
    private String developmentNotes;

    /** Linked to the authenticated user who created this report (nullable for legacy/anonymous) */
    private Long reporterUserId;

    @OneToMany(mappedBy = "errorReport", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Comment> comments;
}