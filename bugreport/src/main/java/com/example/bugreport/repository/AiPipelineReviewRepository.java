package com.example.bugreport.repository;

import com.example.bugreport.entity.AiPipelineReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiPipelineReviewRepository extends JpaRepository<AiPipelineReview, Long> {
    List<AiPipelineReview> findAllByOrderByCreatedAtDesc();
    List<AiPipelineReview> findByReviewStatusOrderByCreatedAtDesc(String reviewStatus);
}
