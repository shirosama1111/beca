package com.example.bugreport.dto;

import lombok.Data;

@Data
public class CreateReportRequest {
    private String title;
    private String description;
    private String image;
    private String url;
    private String priority;  // 🔵 Thay từ Priority thành String (có thể null)
    private String reporterType = "USER";
    private String reporterName;
    private String reporterEmail;
    private String category = "OTHER";
    private String browserInfo;
    private String consoleErrors;
    private String steps;
    private String version;
}