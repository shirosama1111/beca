package com.example.bugreport.service;

import com.example.bugreport.entity.ErrorReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Client for the separately hosted scikit-learn model trained from ai-beta's train split. */
@Service
public class MlClassificationService {
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    @Value("${ML_MODEL_URL:http://localhost:8091/predict}") private String modelUrl;

    public MlClassificationService(ObjectMapper mapper) { this.mapper = mapper; }

    public MlPrediction predict(ErrorReport report) {
        Map<String, Object> input = Map.of(
                "bug_description", safe(report.getTitle()) + " " + safe(report.getDescription()),
                "console_logs", List.of(safe(report.getConsoleErrors())),
                "steps_to_reproduce", List.of(safe(report.getSteps())),
                "error_context", Map.of("browser", safe(report.getBrowserInfo())));
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(modelUrl)).timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(input))).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return MlPrediction.unavailable("Model service returned HTTP " + response.statusCode());
            ModelResponse prediction = mapper.readValue(response.body(), ModelResponse.class);
            return new MlPrediction("COMPLETED", prediction.ground_truth_label(), prediction.severity(), prediction.confidence(), prediction.model_version(), "");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return MlPrediction.unavailable("Model request interrupted");
        } catch (IOException | IllegalArgumentException exception) {
            return MlPrediction.unavailable("ML model service is unavailable");
        }
    }
    private String safe(String value) { return value == null ? "" : value; }
    private record ModelResponse(String ground_truth_label, String severity, double confidence, String model_version) {}
    public record MlPrediction(String status, String category, String severity, double confidence, String modelVersion, String message) {
        static MlPrediction unavailable(String message) { return new MlPrediction("UNAVAILABLE", "UNKNOWN", "UNKNOWN", 0, "", message); }
    }
}
