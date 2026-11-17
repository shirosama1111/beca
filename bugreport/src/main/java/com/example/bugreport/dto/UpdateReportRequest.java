package com.example.bugreport.dto;

import lombok.Data;

@Data
public class UpdateReportRequest {
    private String status;
    private String priority;
    private String assignee;
    private String category;
    private String developmentNotes;
}