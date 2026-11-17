package com.example.bugreport.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Explainable signal checks; intentionally separate from trained ML and LLM reasoning. */
@Service
public class RuleBasedAnalysisService {
    public List<String> analyze(String title, String description, String consoleErrors) {
        String text = (safe(title) + " " + safe(description) + " " + safe(consoleErrors)).toLowerCase(Locale.ROOT);
        List<String> findings = new ArrayList<>();
        if (has(text, "nullpointerexception", "null pointer", "undefined is not", "cannot read properties")) findings.add("Có dấu hiệu null/undefined; kiểm tra dữ liệu đầu vào và vị trí stack trace.");
        if (has(text, "failed to fetch", "timeout", "connection refused", "cors")) findings.add("Có dấu hiệu lỗi mạng; kiểm tra kết nối, endpoint, CORS và timeout.");
        if (has(text, "outofmemory", "memory leak", "high cpu", "slow", "latency")) findings.add("Có dấu hiệu hiệu năng/tài nguyên; xem metrics và log tại thời điểm xảy ra.");
        if (has(text, "unauthorized", "forbidden", "permission denied", "token expired")) findings.add("Có dấu hiệu xác thực/phân quyền; kiểm tra quyền truy cập và thời hạn phiên.");
        if (has(text, "sql", "database", "deadlock", "constraint violation")) findings.add("Có dấu hiệu liên quan cơ sở dữ liệu; kiểm tra truy vấn, constraint và transaction.");
        if (findings.isEmpty()) findings.add("Chưa khớp quy tắc phổ biến; cần thêm log và các bước tái hiện.");
        return findings;
    }
    private boolean has(String text, String... terms) { for (String term : terms) if (text.contains(term)) return true; return false; }
    private String safe(String value) { return value == null ? "" : value; }
}
