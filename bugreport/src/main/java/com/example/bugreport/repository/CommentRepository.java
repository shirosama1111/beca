package com.example.bugreport.repository;

import com.example.bugreport.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByErrorReportIdOrderByCreatedAtDesc(Long reportId);
}