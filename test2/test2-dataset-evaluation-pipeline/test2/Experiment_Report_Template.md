# Báo cáo đánh giá dataset và thực nghiệm phân loại bug

> **Trạng thái:** Điền các trường trong ngoặc vuông từ kết quả chạy thực tế. Không điền hoặc suy diễn số liệu khi chưa chạy pipeline.

## Tóm tắt

Chúng tôi đánh giá dataset báo cáo lỗi phần mềm và so sánh ba phương pháp: bộ phân loại dựa trên luật, mô hình TF-IDF + Logistic Regression, và một LLM đánh giá độc lập (second opinion). Dataset gồm **[N]** mẫu; theo dataset card, dữ liệu được tổng hợp từ template và nhãn hiện chưa được con người xác minh. Vì vậy, các metric phản ánh mức độ khớp với annotation hiện có, không phải độ chính xác đã xác nhận trên lỗi thực tế.

Trên test split gồm **[N_test]** mẫu, hệ thống có **[tên hệ thống tốt nhất theo metric đã chọn]** đạt macro-F1 **[giá trị]** cho loại bug và **[giá trị]** cho severity. Các bất đồng giữa LLM và nhãn hiện có được xem là trường hợp cần rà soát, không tự động kết luận nhãn nào đúng.

## 1. Dataset

- Nguồn: `test/data/bug_dataset.jsonl`
- SHA-256 dataset: `[giá trị trong summary.json]`
- Tổng số mẫu: `[N]`
- Train / validation / test: `[N_train] / [N_val] / [N_test]`
- Nhãn loại bug: UI `[n]`, API `[n]`, LOGIC `[n]`
- Nhãn severity: LOW `[n]`, MEDIUM `[n]`, HIGH `[n]`, CRITICAL `[n]`
- Annotation status: `[phân bố annotation_status]`
- Mẫu có text trùng: `[n]`
- ID trùng: `[n]`
- Nhãn thiếu hoặc không hợp lệ: `[n]`

### Giới hạn dữ liệu

Dataset card mô tả dữ liệu là synthetic, chưa được con người xác minh và có các kịch bản/template lặp lại. Split ngẫu nhiên có thể để các mẫu gần giống nhau xuất hiện ở cả train và test, làm kết quả lạc quan hơn khả năng tổng quát hóa trên lỗi mới. Dataset cũng chỉ có tiếng Anh và screenshot là ảnh mô phỏng.

## 2. Câu hỏi thực nghiệm

1. Rule-based và TF-IDF + Logistic Regression khớp với annotation hiện có ở mức nào?
2. Kết quả có khác nhau giữa các lớp bug và các mức severity không?
3. Một LLM đánh giá độc lập có đồng ý với annotation hiện có không, và các bất đồng tập trung ở đâu?
4. Kết quả có ổn định qua `[số lần chạy]` lần chạy với cấu hình và test set cố định không?

## 3. Thiết kế thực nghiệm

| Hệ thống | Cấu hình | Dữ liệu dùng |
|---|---|---|
| A — Rule-based | Bộ luật/keyword hiện có | Dự đoán trên test |
| B — ML | TF-IDF + Logistic Regression | Fit trên train, đánh giá trên test |
| C — Second-opinion LLM | Model: `[tên và phiên bản model]`, temperature 0 | Chỉ nhận văn bản report; không nhận nhãn gold, root cause hay resolution |

- Test split: `[mô tả split]`
- Seed gốc: `[seed]`
- Số lần chạy: `[repeats]`
- Giới hạn mẫu LLM (nếu có): `[llm-limit hoặc toàn bộ test]`
- Phiên bản thư viện / môi trường: `[ghi phiên bản Python, scikit-learn, SDK và ngày chạy]`
- Output: `summary.json`, `metrics.csv`, `model_comparison.csv`, `prediction_audit.csv` và tùy chọn `experiment_report.xlsx`

Nếu có lựa chọn model hoặc tinh chỉnh tham số, thực hiện trên validation split; giữ test split cho đánh giá cuối.

## 4. Metric

Báo cáo riêng cho loại bug và severity:

- Accuracy và balanced accuracy
- Macro precision, macro recall, macro-F1
- Weighted-F1
- Confusion matrix và metric theo từng lớp
- Severity ordinal MAE theo thứ tự LOW < MEDIUM < HIGH < CRITICAL
- Mean và standard deviation qua các lần chạy, nếu chạy lặp

**Metric chính dùng để so sánh:** `[ví dụ macro-F1]`, vì `[lý do lựa chọn]`.

## 5. Kết quả

Điền số liệu từ `model_comparison.csv`; không so sánh các model nếu chúng được đánh giá trên các tập mẫu khác nhau.

| Hệ thống | Bug type accuracy | Bug type macro-F1 | Severity accuracy | Severity macro-F1 | Severity ordinal MAE |
|---|---:|---:|---:|---:|---:|
| A — Rule-based | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] |
| B — ML | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] |
| C — Second-opinion LLM | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] | [mean ± std] |

### Nhận xét

- Hệ thống tốt nhất theo metric chính: `[tên]`, macro-F1 `[giá trị]`.
- Lớp có recall thấp nhất: `[lớp và giá trị]`.
- Các cặp lớp thường bị nhầm theo confusion matrix: `[mô tả]`.
- Mức đồng thuận giữa LLM và annotation: `[giá trị]` trên `[N]` mẫu được đánh giá.
- Số trường hợp bất đồng cần xem xét thủ công: `[N]`.

## 6. Phân tích bất đồng và chất lượng nhãn

Dùng `prediction_audit.csv` để lấy mẫu kiểm tra. Phân nhóm bất đồng theo:

- loại bug: annotation vs LLM
- severity: annotation vs LLM
- trường hợp thiếu thông tin hoặc mô tả mơ hồ
- template/kịch bản gốc, nếu metadata có trường tương ứng

| Nhóm bất đồng | Số mẫu | Kết quả rà soát thủ công |
|---|---:|---|
| Loại bug khác nhau | [n] | [nhận xét] |
| Severity khác nhau | [n] | [nhận xét] |
| Cả hai khác nhau | [n] | [nhận xét] |
| Annotation được xác nhận cần sửa | [n] | [ghi quyết định và lý do] |

LLM là người đánh giá độc lập hỗ trợ phát hiện trường hợp cần rà soát; bất đồng không tự chứng minh annotation sai hoặc LLM đúng. Quyết định thay nhãn cần có người gán nhãn/adjudicator và lý do được ghi nhận.

## 7. Hạn chế và khả năng tái lập

- Nhãn chưa được xác minh bởi con người; kết quả không thể khẳng định hiệu năng trên lỗi sản xuất thực tế.
- Mẫu template gần trùng lặp có thể gây leakage giữa train và test.
- LLM có thể thay đổi theo phiên bản model/API; lưu model ID, thời điểm gọi và cấu hình.
- API LLM có thể phát sinh chi phí và gửi dữ liệu tới nhà cung cấp; chỉ dùng dữ liệu được phép chia sẻ.
- Ghi lại dataset hash, commit code, seed, dependencies và command chạy để tái lập.

## 8. Kết luận

Trên dataset và split được đánh giá, `[hệ thống]` đạt `[kết quả chính]`. Kết quả nên được diễn giải là mức độ khớp với annotation synthetic hiện có. Bước tiếp theo là rà soát thủ công các bất đồng, đánh giá trên test split theo kịch bản/template chưa thấy trong train, và lặp lại thí nghiệm sau khi cập nhật annotation.

## Nội dung rút gọn cho slide

### Slide 1 — Mục tiêu
- Thống kê và kiểm tra chất lượng dataset bug report.
- So sánh baseline luật, ML và LLM đánh giá độc lập.
- Phát hiện nhãn cần con người rà soát.

### Slide 2 — Dataset
- Tổng mẫu: `[N]`; train/val/test: `[x/y/z]`.
- Loại bug: `[phân bố UI/API/LOGIC]`.
- Severity: `[phân bố LOW/MEDIUM/HIGH/CRITICAL]`.
- Giới hạn: synthetic, chưa xác minh thủ công, có template lặp.

### Slide 3 — Thiết kế
- A: Rule-based.
- B: TF-IDF + Logistic Regression (train → test).
- C: Second-opinion LLM chỉ đọc report text, không thấy nhãn gold.
- Seed: `[seed]`; số lần chạy: `[repeats]`; model LLM: `[model/version]`.

### Slide 4 — Metric và kết quả
- Metric chính: `[macro-F1 hoặc metric đã chọn]`.
- A: `[kết quả]`; B: `[kết quả]`; C: `[kết quả]`.
- Confusion đáng chú ý: `[nhận xét từ confusion matrix]`.
- Second-opinion bất đồng `[n/N]` mẫu với annotation.

### Slide 5 — Kết luận và bước tiếp theo
- `[kết luận dựa trên số liệu thực tế]`.
- Rà soát thủ công các trường hợp bất đồng; không tự động xem LLM là nhãn đúng.
- Đánh giá theo nhóm kịch bản/template để kiểm tra tổng quát hóa.
- Bổ sung dữ liệu thực và annotation đã được con người xác minh.