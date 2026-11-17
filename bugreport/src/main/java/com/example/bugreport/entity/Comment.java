package com.example.bugreport.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "error_report_id", nullable = false)

    @JsonIgnore
    private ErrorReport errorReport;

    private String text;

    private String author;

    private LocalDateTime createdAt;

    private String type;
}