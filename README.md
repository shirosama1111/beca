# beca

Ứng dụng báo cáo lỗi Spring Boot.

## AI hỗ trợ phân tích lỗi

Sau khi đăng nhập, người dùng/developer mở `/ai-analysis.html` để chọn report và chạy pipeline. Người dùng chỉ xem report của mình; Developer/Admin được xem mọi report. Admin mở `/admin-ai-review.html` để chạy pipeline lưu trữ và approve/reject/đề nghị chỉnh sửa.

Pipeline gồm 3 module riêng: (1) Rule-based, (2) model ML TF-IDF + Logistic Regression huấn luyện trên train split của dataset ở nhánh `ai-beta`, (3) LLM tạo giải thích và gợi ý fix. LLM chỉ chạy khi người dùng/admin yêu cầu và cần API key server-side. Nếu ML service chưa bật hoặc LLM chưa cấu hình, trạng thái tương ứng được trả riêng, không làm mất kết quả stage khác.

### Chạy model ML

```bash
git fetch origin ai-beta
git show origin/ai-beta:test2/test2-dataset-evaluation-pipeline/test2/data/bug_dataset.jsonl > /tmp/bug_dataset.jsonl
cd ai-ml-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
AI_BETA_DATASET_PATH=/tmp/bug_dataset.jsonl python app.py
```

Spring Boot gọi `ML_MODEL_URL` (mặc định `http://localhost:8091/predict`). Model chỉ fit dữ liệu `metadata.split=train`, không sử dụng validation/test để train. Dataset card ghi 1.000 mẫu đều synthetic và chưa được xác minh; confidence không phải độ chính xác ngoài đời. Hãy đánh giá trên lỗi thật được con người review trước khi dùng cho quyết định production. Chỉ expose model trên private network.

### Cấu hình LLM (tùy chọn)

```bash
AI_API_KEY=your-provider-api-key
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
```

Không commit API key. LLM chỉ nhận tiêu đề/mô tả/log/steps; không gửi ảnh hoặc email. Một số token/secret phổ biến được che trước khi gửi. Xác minh gợi ý AI trước khi áp dụng.
