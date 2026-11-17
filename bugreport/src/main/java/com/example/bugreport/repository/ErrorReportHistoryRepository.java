package com.example.bugreport.repository;

import com.example.bugreport.entity.ErrorReportHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ErrorReportHistoryRepository extends JpaRepository<ErrorReportHistory, Long> {
    List<ErrorReportHistory> findByReportIdOrderByCreatedAtDesc(Long reportId);
}