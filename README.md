# Beca — Hệ thống báo cáo lỗi

Ứng dụng báo cáo và phân tích lỗi được xây dựng bằng Spring Boot, Java, HTML/CSS/JavaScript, cùng dịch vụ phân loại lỗi bằng Python ML.

## Yêu cầu

- Java 21
- Git
- Python 3.10 trở lên (nếu chạy dịch vụ ML)
- Trình duyệt web

## 1. Tải dự án

```bash
git clone https://github.com/shirosama1111/beca.git
cd beca
```

## 2. Khởi động ứng dụng Spring Boot

Dự án chính nằm trong thư mục `bugreport`. Cơ sở dữ liệu mặc định là H2 trong bộ nhớ, dữ liệu sẽ được tạo lại khi khởi động lại.

### macOS/Linux

```bash
cd bugreport
./mvnw spring-boot:run
```

### Windows

```bat
cd bugreport
mvnw.cmd spring-boot:run
```

Sau khi chạy thành công, truy cập:

- Trang chủ: http://localhost:8080
- Đăng nhập: http://localhost:8080/login.html
- H2 Console: http://localhost:8080/h2-console

Thông tin H2 trong `application.properties`:

- JDBC URL: `jdbc:h2:mem:bugreport`
- Username: `sa`
- Password: để trống

## 3. Chạy dịch vụ ML (tùy chọn)

Dịch vụ ML mặc định chạy ở cổng `8091`. Mở terminal thứ hai tại thư mục gốc của dự án.

### macOS/Linux

```bash
git fetch origin ai-beta
git show origin/ai-beta:test2/test2-dataset-evaluation-pipeline/test2/data/bug_dataset.jsonl > /tmp/bug_dataset.jsonl

cd ai-ml-service
python3 -m venv .venv
source .venv/bin/bin/activate
pip install -r requirements.txt
AI_BETA_DATASET_PATH=/tmp/bug_dataset.jsonl python app.py
```

### Windows

```bat
cd ai-ml-service
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set AI_BETA_DATASET_PATH=duong-dan-den-bug_dataset.jsonl
python app.py
```

Kiểm tra dịch vụ ML:

```bash
curl http://localhost:8091/health
```

Spring Boot mặc định gọi ML service tại `http://localhost:8091/predict`.

Nếu chạy Spring Boot và ML service cùng máy, không cần cấu hình thêm `ML_MODEL_URL`. Nếu muốn thay đổi địa chỉ:

```bash
export ML_MODEL_URL=http://localhost:8091/predict
```

Trên Windows:

```bat
set ML_MODEL_URL=http://localhost:8091/predict
mvnw.cmd spring-boot:run
```

## 4. Cấu hình LLM (tùy chọn)

Stage LLM có thể dùng OpenAI-compatible API. Không commit API key vào mã nguồn.

### macOS/Linux

```bash
export AI_API_KEY=your-api-key
export AI_API_URL=https://api.openai.com/v1/chat/completions
export AI_MODEL=gpt-4o-mini
cd bugreport
./mvnw spring-boot:run
```

### Windows

```bat
set AI_API_KEY=your-api-key
set AI_API_URL=https://api.openai.com/v1/chat/completions
set AI_MODEL=gpt-4o-mini
cd bugreport
mvnw.cmd spring-boot:run
```

Nếu chưa cấu hình LLM, Rule-based và ML vẫn có thể hoạt động; phần LLM sẽ trả trạng thái `NOT_CONFIGURED`.

## 5. Các trang phân tích

Sau khi đăng nhập:

- Phân tích báo cáo: http://localhost:8080/ai-analysis.html
- Người dùng thường chỉ xem báo cáo của mình.
- Developer/Admin có thể xem nhiều báo cáo hơn.
- Admin review pipeline: http://localhost:8080/admin-ai-review.html

## Build và chạy file JAR

```bash
cd bugreport
./mvnw clean package
java -jar target/bugreport-0.0.1-SNAPSHOT.jar
```

Trên Windows dùng `mvnw.cmd` thay cho `./mvnw`.

## Ghi chú

- CSDL H2 là dữ liệu tạm trong bộ nhớ; cấu hình PostgreSQL không được thiết lập mặc định.
- Dataset ML thuộc nhánh `ai-beta` và chỉ dùng các dòng có `metadata.split=train` để huấn luyện.
- Các nhãn/dataset synthetic không thay thế đánh giá của con người.
- Chạy ML và các API key chỉ trong mạng/private environment khi triển khai thực tế.
