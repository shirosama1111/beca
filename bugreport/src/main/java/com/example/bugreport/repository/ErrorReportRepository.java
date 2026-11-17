package com.example.bugreport.repository;

import com.example.bugreport.entity.ErrorReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ErrorReportRepository extends JpaRepository<ErrorReport, Long> {

    List<ErrorReport> findByStatusOrderByCreatedAtDesc(String status);
    List<ErrorReport> findByAssigneeOrderByCreatedAtDesc(String assignee);
    List<ErrorReport> findByPriorityOrderByCreatedAtDesc(String priority);
    List<ErrorReport> findAllByOrderByCreatedAtDesc();
    List<ErrorReport> findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(String title);

    /** Reports submitted by a specific authenticated user */
    List<ErrorReport> findByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId);

    @Query("SELECT r FROM ErrorReport r WHERE " +
            "(:status IS NULL OR r.status = :status) AND " +
            "(:priority IS NULL OR r.priority = :priority) AND " +
            "(:assignee IS NULL OR r.assignee = :assignee) AND " +
            "(:category IS NULL OR r.category = :category) AND " +
            "(:reporterType IS NULL OR r.reporterType = :reporterType) " +
            "ORDER BY r.createdAt DESC")
    List<ErrorReport> findFiltered(
            @Param("status")       String status,
            @Param("priority")     String priority,
            @Param("assignee")     String assignee,
            @Param("category")     String category,
            @Param("reporterType") String reporterType
    );

    @Query("SELECT COUNT(r) FROM ErrorReport r WHERE r.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT COUNT(r) FROM ErrorReport r WHERE r.priority = :priority")
    long countByPriority(@Param("priority") String priority);

    @Query("SELECT r FROM ErrorReport r WHERE r.assignee IS NULL ORDER BY r.priority DESC, r.createdAt ASC LIMIT :limit")
    List<ErrorReport> findByAssigneeIsNullOrderByPriorityAscCreatedAtDesc(@Param("limit") int limit);

    @Query("SELECT r FROM ErrorReport r WHERE r.assignee IS NULL ORDER BY r.priority DESC, r.createdAt ASC")
    List<ErrorReport> findTopUnassigned(org.springframework.data.domain.Pageable pageable);
}