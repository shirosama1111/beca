package com.example.bugreport.dto;

import lombok.Data;

@Data
public class CreateReportRequest {
    private String title;
    private String description;
    private String image;
    private String url;
    // Kept for backward compatibility with older clients; server-side AI determines priority.
    private String priority;
    private String reporterType = "USER";
    private String reporterName;
    private String reporterEmail;
    private String category = "OTHER";
    private String browserInfo;
    private String consoleErrors;
    private String steps;
    private String version;
}
