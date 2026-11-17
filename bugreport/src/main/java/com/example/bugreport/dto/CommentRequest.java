package com.example.bugreport.dto;

import lombok.Data;

@Data
public class CommentRequest {
    private String text;
    private String author;
    private String type;
}