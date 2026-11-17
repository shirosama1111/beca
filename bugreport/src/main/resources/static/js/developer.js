/* ============================================================
   BugReport — developer.js
   Developer Portal: queue management, status update, dev notes
   ============================================================ */

const API_BASE = "/api/reports";
let currentReportId = null;
let sseSource = null;
let searchDebounce = null;

/* ── Guard: Developer only ── */
(function guardDeveloper() {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") {
        localStorage.clear();
        window.location.href = "/login.html";
        return;
    }
    const user = JSON.parse(localStorage.getItem("authUser") || "{}");
    if (user.role !== "DEVELOPER" && user.role !== "ADMIN") {
        window.location.href = "/login.html";
        return;
    }
    const usernameEl = document.getElementById("dev-username");
    if (usernameEl) usernameEl.textContent = user.username || "";
})();

/* ── Auth headers ── */
function authHeaders() {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") {
        localStorage.clear();
        window.location.href = "/login.html";
        return {};
    }
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

/* ── Toast ── */
function showToast(msg, type = "success") {
    const toast  = document.getElementById("toast");
    const msgEl  = document.getElementById("toast-msg");
    const iconEl = document.getElementById("toast-icon");
    msgEl.textContent = msg;
    toast.className = `show ${type}`;
    iconEl.className = type === "success"
        ? "fa-solid fa-circle-check"
        : "fa-solid fa-triangle-exclamation";
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => { toast.className = ""; }, 2800);
}

/* ── Debounce search ── */
function debounceSearch() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadQueue, 300);
}

/* ── Stats ── */
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats/overview`, { headers: authHeaders() });
        if (!res.ok) return;
        const s = await res.json();
        document.getElementById("ds-open").textContent     = s.OPEN || 0;
        document.getElementById("ds-progress").textContent = s.IN_PROGRESS || 0;
        document.getElementById("ds-resolved").textContent = s.RESOLVED || 0;
    } catch (e) { /* silent */ }
}

/* ── Load Unassigned Reports ── */
async function loadUnassignedQueue() {
    const container = document.getElementById("unassigned-list");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const res = await fetch(`${API_BASE}/unassigned?limit=5`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const reports = await res.json();

        container.innerHTML = "";
        if (reports.length === 0) {
            container.innerHTML = `<div style="padding:12px;text-align:center;color:var(--text-dim);font-size:0.85rem">✓ All assigned</div>`;
            return;
        }

        reports.forEach((r, i) => {
            const item = document.createElement("div");
            item.className = `quick-item fade-in`;
            item.style.animationDelay = `${i * 20}ms`;

            const colors = { CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#facc15", LOW: "#4ade80" };
            item.innerHTML = `
                <div class="item-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.title || "Untitled")}</div>
                <div style="font-size:0.75rem;color:${colors[r.priority] || '#7b93c4'};margin-top:4px">${r.priority}</div>
            `;
            item.style.cursor = "pointer";
            item.onclick = () => {
                openReport(r.id, null);
                document.querySelectorAll(".assigned-item").forEach(el => el.classList.remove("active"));
            };
            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:var(--red);font-size:0.85rem">Error loading</div>`;
    }
}

setInterval(loadUnassignedQueue, 30000);
loadUnassignedQueue();

async function loadQueue() {
    const sidebar = document.getElementById("sidebar-list");
    sidebar.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const status   = document.getElementById("dev-filter-status").value;
        const priority = document.getElementById("dev-filter-priority").value;
        const search   = document.getElementById("dev-search").value.trim();

        const params = new URLSearchParams();
        if (status)   params.append("status", status);
        if (priority) params.append("priority", priority);
        if (search)   params.append("search", search);

        const url = API_BASE + (params.toString() ? "?" + params.toString() : "");
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reports = await res.json();

        const user = JSON.parse(localStorage.getItem("authUser") || "{}");
        const myName = user.username || "";

        // Count mine
        const mineCount = reports.filter(r => r.assignee === myName).length;
        document.getElementById("ds-mine").textContent = mineCount;

        sidebar.innerHTML = "";
        if (reports.length === 0) {
            sidebar.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:0.83rem">Không có report nào</div>`;
            return;
        }

        reports.forEach((r, i) => {
            const item = document.createElement("div");
            item.className = `assigned-item fade-in${currentReportId === r.id ? " active" : ""}`;
            item.style.animationDelay = `${i * 20}ms`;

            const priorityColors = { CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#facc15", LOW: "#4ade80" };
            const pColor = priorityColors[r.priority] || "#7b93c4";
            const isAssignedToMe = r.assignee === myName;

            item.innerHTML = `
        <div class="item-title">${escapeHtml(r.title || "Untitled")}</div>
        <div class="item-meta">
          <span style="color:${pColor}">${r.priority || "MEDIUM"}</span>
          <span>${r.status?.replace("_"," ") || "OPEN"}</span>
          ${isAssignedToMe ? `<span style="color:var(--violet)">● Của tôi</span>` : ""}
        </div>`;
            item.onclick = () => openReport(r.id, item);
            sidebar.appendChild(item);
        });
    } catch (err) {
        sidebar.innerHTML = `<div style="padding:16px;color:var(--red);font-size:0.83rem"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi tải queue</div>`;
    }
}

/* ── Open a report in the main panel ── */
async function openReport(reportId, itemEl) {
    // Mark active in sidebar
    document.querySelectorAll(".assigned-item").forEach(el => el.classList.remove("active"));
    if (itemEl) itemEl.classList.add("active");

    currentReportId = reportId;
    const panel = document.getElementById("detail-panel");
    document.getElementById("detail-empty").style.display = "none";
    const content = document.getElementById("detail-content");
    content.style.display = "block";
    content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem;color:var(--violet);display:block;margin-bottom:10px"></i> Đang tải…</div>`;

    try {
        const [reportRes, commentsRes, historyRes] = await Promise.all([
            fetch(`${API_BASE}/${reportId}`,          { headers: authHeaders() }),
            fetch(`${API_BASE}/${reportId}/comments`, { headers: authHeaders() }),
            fetch(`${API_BASE}/${reportId}/history`,  { headers: authHeaders() }),
        ]);

        if (!reportRes.ok) throw new Error(`HTTP ${reportRes.status}`);
        const report   = await reportRes.json();
        const comments = commentsRes.ok ? await commentsRes.json() : [];
        const history  = historyRes.ok  ? await historyRes.json()  : [];

        const user    = JSON.parse(localStorage.getItem("authUser") || "{}");
        const myName  = user.username || "";
        const isAssigned = report.assignee === myName;

        const statuses = ["OPEN","IN_PROGRESS","RESOLVED","CLOSED","WONT_FIX"];
        const statusChips = statuses.map(s =>
            `<button class="status-chip ${report.status === s ? "chip-active-" + s : ""}" onclick="changeStatus(${report.id},'${s}')">${s.replace("_"," ")}</button>`
        ).join("");

        content.innerHTML = `
      <!-- Action bar -->
      <div class="action-bar">
        <div style="font-size:1rem;font-weight:700;color:var(--text);flex:1">#${report.id} — ${escapeHtml(report.title)}</div>
        ${!isAssigned
            ? `<button class="btn btn-dev" onclick="assignToMe(${report.id})"><i class="fa-solid fa-hand-pointer"></i> Nhận việc này</button>`
            : `<span style="font-size:0.82rem;color:var(--violet);padding:6px 12px;background:var(--violet-dim);border-radius:20px;border:1px solid rgba(167,139,250,0.25)"><i class="fa-solid fa-check"></i> Đã nhận</span>`}
        <button class="btn btn-ghost btn-sm" onclick="openReport(${report.id})"><i class="fa-solid fa-rotate"></i></button>
      </div>

      <!-- Status chips -->
      <div style="margin-bottom:14px">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px">TRẠNG THÁI</div>
        <div class="status-chips">${statusChips}</div>
      </div>

      <!-- Meta -->
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item">
          <div class="di-label">Reporter</div>
          <div class="di-val">${escapeHtml(report.reporterName || "Anonymous")}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">Priority</div>
          <div class="di-val">${escapeHtml(report.priority || "MEDIUM")}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">Category</div>
          <div class="di-val">${escapeHtml(report.category || "OTHER")}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">Assignee</div>
          <div class="di-val" id="assignee-val">${escapeHtml(report.assignee || "Unassigned")}</div>
        </div>
      </div>

      <!-- Description -->
      <div class="section-title"><i class="fa-solid fa-file-lines"></i> Mô tả</div>
      <div class="detail-description" style="margin-bottom:16px">${escapeHtml(report.description || "Không có mô tả.")}</div>

      ${report.url ? `<div class="section-title"><i class="fa-solid fa-link"></i> URL</div>
        <a href="${escapeHtml(report.url)}" target="_blank" class="report-url" style="display:inline-flex;margin-bottom:16px">
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem"></i> ${escapeHtml(report.url)}
        </a>` : ""}

      ${report.image ? `
        <div class="section-title"><i class="fa-solid fa-image"></i> Screenshot</div>
        <img src="${report.image}" alt="screenshot" class="screenshot-thumb" style="margin-bottom:16px" onclick="openLightbox('${report.image}')">
      ` : ""}

      ${report.consoleErrors && report.consoleErrors !== "[]" ? `
        <div class="section-title"><i class="fa-solid fa-terminal"></i> Console Errors</div>
        <div class="console-block" style="margin-bottom:16px">${escapeHtml(report.consoleErrors)}</div>
      ` : ""}

      ${report.browserInfo ? `
        <div class="section-title"><i class="fa-solid fa-globe"></i> Browser Info</div>
        <div class="console-block" style="color:var(--text-muted);margin-bottom:16px">${escapeHtml(report.browserInfo)}</div>
      ` : ""}

      <!-- Dev notes -->
      <div class="section-title"><i class="fa-solid fa-code"></i> Dev Notes (nội bộ)</div>
      <div class="dev-notes-area">
        <textarea id="dev-notes-input" placeholder="Ghi chú kỹ thuật, nguyên nhân, hướng xử lý…">${escapeHtml(report.developmentNotes || "")}</textarea>
        <button class="btn btn-dev" style="margin-top:8px" onclick="saveDevNotes(${report.id})">
          <i class="fa-solid fa-floppy-disk"></i> Lưu ghi chú
        </button>
      </div>

      <!-- Comments -->
      <div class="section-title" style="margin-top:20px"><i class="fa-solid fa-comments"></i> Comments (${comments.length})</div>
      <div id="dev-comments-list" style="margin-bottom:12px">
        ${comments.length === 0
            ? `<div style="padding:14px;color:var(--text-dim);font-size:0.83rem">Chưa có comment nào</div>`
            : comments.map(c => `
              <div class="comment-item fade-in">
                <div class="comment-header">
                  <span class="comment-author">${escapeHtml(c.author || "Developer")}</span>
                  <span class="comment-type">${escapeHtml(c.type || "PUBLIC")}</span>
                </div>
                <div class="comment-content">${escapeHtml(c.text)}</div>
              </div>`).join("")}
      </div>

      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1">
          <select id="comment-type-select" class="input" style="margin-bottom:6px;width:140px">
            <option value="PUBLIC">💬 Public</option>
            <option value="INTERNAL">🔒 Internal</option>
          </select>
          <textarea class="input" id="dev-new-comment" placeholder="Viết comment…" rows="2"></textarea>
        </div>
        <button class="btn btn-dev" style="align-self:flex-end;padding:10px 14px" onclick="submitDevComment(${report.id})">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>

      <!-- History -->
      <div class="section-title" style="margin-top:20px"><i class="fa-solid fa-clock-rotate-left"></i> History (${history.length})</div>
      <div>
        ${history.length === 0
            ? `<div style="padding:12px;color:var(--text-dim);font-size:0.83rem">Chưa có lịch sử</div>`
            : history.map(h => `
              <div class="history-item">
                <div class="history-dot"></div>
                <div style="flex:1">
                  <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:2px">
                    <span class="history-type">${escapeHtml(h.changeType || "UPDATED")}</span>
                    <span class="history-time">${escapeHtml(new Date(h.createdAt).toLocaleString("vi-VN"))}</span>
                  </div>
                  <div class="history-change">
                    <span class="history-old">${escapeHtml(h.oldValue || "—")}</span>
                    <span class="history-arrow">→</span>
                    <span class="history-new">${escapeHtml(h.newValue || "—")}</span>
                  </div>
                </div>
              </div>`).join("")}
      </div>`;

    } catch (err) {
        console.error(err);
        content.innerHTML = `<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i> Không thể tải report</div>`;
    }
}

/* ── Change status ── */
async function changeStatus(reportId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/${reportId}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast(`Trạng thái → ${newStatus.replace("_"," ")}`, "success");
        await openReport(reportId);
        loadQueue();
        loadStats();
    } catch (err) {
        showToast("Cập nhật trạng thái thất bại", "error");
    }
}

/* ── Assign to myself ── */
async function assignToMe(reportId) {
    const user = JSON.parse(localStorage.getItem("authUser") || "{}");
    const myName = user.username || "";
    try {
        const res = await fetch(`${API_BASE}/${reportId}/assign`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ assignee: myName })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast("Đã nhận report này!", "success");
        await openReport(reportId);
        loadQueue();
        loadStats();
    } catch (err) {
        showToast("Không thể nhận report", "error");
    }
}

/* ── Save dev notes ── */
async function saveDevNotes(reportId) {
    const notes = document.getElementById("dev-notes-input")?.value || "";
    try {
        const res = await fetch(`${API_BASE}/${reportId}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ developmentNotes: notes })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast("Đã lưu ghi chú", "success");
    } catch (err) {
        showToast("Lưu ghi chú thất bại", "error");
    }
}

/* ── Submit developer comment ── */
async function submitDevComment(reportId) {
    const textarea = document.getElementById("dev-new-comment");
    const typeEl   = document.getElementById("comment-type-select");
    const content  = textarea?.value.trim();
    const type     = typeEl?.value || "PUBLIC";
    if (!content) return;
    try {
        const res = await fetch(`${API_BASE}/${reportId}/comments`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ text: content, type })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        textarea.value = "";
        showToast("Comment đã gửi", "success");
        await openReport(reportId);
    } catch (err) {
        showToast("Không thể gửi comment", "error");
    }
}

/* ── Load unassigned queue ── */
async function loadUnassigned() {
    try {
        const res = await fetch(`${API_BASE}/unassigned?limit=20`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const reports = await res.json();
        const content = document.getElementById("detail-content");
        document.getElementById("detail-empty").style.display = "none";
        content.style.display = "block";

        if (reports.length === 0) {
            content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)">
        <div style="font-size:2rem;margin-bottom:8px">🎉</div>
        <div>Không có report nào chưa được giao!</div>
      </div>`;
            return;
        }

        content.innerHTML = `
      <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:16px">
        <i class="fa-solid fa-inbox" style="color:var(--violet)"></i> Báo cáo chưa được giao (${reports.length})
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${reports.map(r => {
            const pColors = { CRITICAL:"var(--red)", HIGH:"#fb923c", MEDIUM:"#facc15", LOW:"var(--green)" };
            return `<div class="queue-card" onclick="openReport(${r.id})">
            <div class="qc-priority qc-${r.priority || "MEDIUM"}"></div>
            <div class="qc-info">
              <div class="qc-title">${escapeHtml(r.title || "Untitled")}</div>
              <div class="qc-meta">
                <span style="color:${pColors[r.priority] || "#7b93c4"}">${r.priority || "MEDIUM"}</span>
                <span>${r.category || "OTHER"}</span>
                <span>${r.status || "OPEN"}</span>
                <span style="color:var(--text-dim)">${new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
            <div class="qc-action">
              <button class="btn btn-dev btn-sm" onclick="event.stopPropagation();assignToMe(${r.id})">
                <i class="fa-solid fa-hand-pointer"></i> Nhận
              </button>
            </div>
          </div>`;
        }).join("")}
      </div>`;
    } catch (err) {
        showToast("Không thể tải unassigned queue", "error");
    }
}

/* ── 🔵 SSE real-time notifications (CHỈNH LẠI) ── */
function startSSEListener() {
    // Nếu đã có connection, đóng trước
    if (sseSource) {
        sseSource.close();
        sseSource = null;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") return;

    try {
        sseSource = new EventSource(`/api/notifications/subscribe`);

        sseSource.addEventListener("new-report", (e) => {
            try {
                const report = JSON.parse(e.data);
                console.log("📢 Report mới nhận được:", report);

                // Desktop notification
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("📋 Report Mới", {
                        body: `${report.title}\nPriority: ${report.priority}`,
                        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='60' font-size='60' text-anchor='middle'>📋</text></svg>"
                    });
                }

                // Toast notification
                showToast(`📩 Report mới: ${report.title.substring(0, 30)}...`, "success");

                // Reload queue và stats
                loadQueue();
                loadStats();
            } catch (err) {
                console.error("Parse error:", err);
            }
        });

        sseSource.onerror = () => {
            console.error("SSE error");
            sseSource.close();
            sseSource = null;
            // Retry sau 5 giây
            setTimeout(startSSEListener, 5000);
        };

        console.log("✅ SSE listener started");
        document.getElementById("bell-icon").style.color = "var(--violet)";
    } catch (err) {
        console.error("SSE setup error:", err);
    }
}

/* ── Toggle SSE Button ── */
function toggleSSE() {
    if (sseSource) {
        sseSource.close();
        sseSource = null;
        document.getElementById("bell-icon").style.color = "";
        showToast("Tắt thông báo real-time", "success");
        return;
    }
    startSSEListener();
    showToast("Bật thông báo real-time ✓", "success");
}

/* ── Lightbox ── */
function openLightbox(src) {
    const lb = document.getElementById("img-lightbox");
    document.getElementById("lightbox-img").src = src;
    lb.style.display = "flex";
}
function closeLightbox() {
    document.getElementById("img-lightbox").style.display = "none";
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
});

/* ── Logout ── */
function logout() {
    if (sseSource) sseSource.close();
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}

/* ── Helpers ── */
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Start SSE listener
    startSSEListener();

    // Load data
    loadStats();
    loadQueue();
    setInterval(() => { loadStats(); }, 30000);
});