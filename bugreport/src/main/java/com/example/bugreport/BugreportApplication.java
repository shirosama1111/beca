package com.example.bugreport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BugreportApplication {
    public static void main(String[] args) {
        SpringApplication.run(BugreportApplication.class, args);
    }
}