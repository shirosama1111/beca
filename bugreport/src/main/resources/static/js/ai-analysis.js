(() => {
  const token = localStorage.getItem("token"); let user = {};
  try { user = JSON.parse(localStorage.getItem("authUser") || "{}"); } catch (_) {}
  if (!token) { location.href = "/login.html"; return; }
  const developer = user.role === "DEVELOPER" || user.role === "ADMIN";
  const headers = { Authorization: `Bearer ${token}` };
  const report = document.getElementById("report"), button = document.getElementById("analyze"), status = document.getElementById("status"), output = document.getElementById("output");
  async function loadReports() {
    try {
      const response = await fetch(developer ? "/api/reports" : "/api/reports/my", { headers });
      if (!response.ok) throw Error();
      const items = await response.json(); report.innerHTML = "<option value=''>Chọn báo cáo…</option>";
      items.forEach(item => { const option = document.createElement("option"); option.value = item.id; option.textContent = `#${item.id} — ${item.title || "Không có tiêu đề"}`; report.append(option); });
      if (!items.length) status.textContent = "Chưa có báo cáo để phân tích.";
    } catch (_) { status.textContent = "Không tải được báo cáo. Kiểm tra đăng nhập và quyền truy cập."; }
  }
  report.addEventListener("change", () => { button.disabled = !report.value; output.hidden = true; status.textContent = ""; });
  button.addEventListener("click", async () => {
    button.disabled = true; status.textContent = "Đang chạy rule-based, ML và LLM…"; output.hidden = true;
    try {
      const audience = developer ? "DEVELOPER" : "USER";
      const response = await fetch(`/api/reports/${encodeURIComponent(report.value)}/ai-analysis?audience=${audience}`, { method: "POST", headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.message || data.detail || `HTTP ${response.status}`);
      const ruleList = document.getElementById("rules"); ruleList.replaceChildren();
      (data.ruleFindings || []).forEach(item => { const li = document.createElement("li"); li.textContent = item; ruleList.append(li); });
      const ml = data.ml || {};
      document.getElementById("ml").textContent = ml.status === "COMPLETED" ? `Loại lỗi: ${ml.category}\nMức độ: ${ml.severity}\nĐộ tin cậy: ${Math.round((ml.confidence || 0) * 100)}%\nModel: ${ml.modelVersion}` : `ML chưa sẵn sàng: ${ml.message || ml.status}`;
      const llm = data.llm || {};
      document.getElementById("llm").textContent = llm.content || "Không có nội dung phân tích.";
      output.hidden = false; status.textContent = `Hoàn tất. LLM: ${llm.status || "—"}`;
    } catch (error) { status.textContent = error.message || "Phân tích thất bại. Vui lòng thử lại."; }
    finally { button.disabled = !report.value; }
  });
  loadReports();
})();
