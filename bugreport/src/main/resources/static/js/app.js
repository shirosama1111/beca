/* ============================================================
   BugReport — app.js  (Dashboard + Report Details + My Reports)
   ============================================================ */

const API_BASE = "/api/reports";
let currentView = "all"; // all | my | create
let sseSource = null;

/* ── DOM refs ── */
const reportsContainer = document.getElementById("reports-container");
const searchInput      = document.getElementById("search-input");
const filterStatus    = document.getElementById("filter-status");
const filterPriority  = document.getElementById("filter-priority");
const filterCategory  = document.getElementById("filter-category");
const clearFiltersBtn = document.getElementById("btn-clear-filters");
const reportModal     = document.getElementById("report-modal");
const modalBody       = document.getElementById("modal-body");
const newReportBtn   = document.getElementById("newReportBtn");

/* ── Auth ── */
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

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    localStorage.clear();
    window.location.href = "/login.html";
    return;
  }

  loadStats();
  loadReports();
  setupEventListeners();
  startSSEListener();

  // Ripple effect
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const ripple = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

function setupEventListeners() {
  searchInput.addEventListener("input", debounce(loadReports, 300));
  filterStatus.addEventListener("change", loadReports);
  filterPriority.addEventListener("change", loadReports);
  filterCategory.addEventListener("change", loadReports);
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterStatus.value = "";
    filterPriority.value = "";
    filterCategory.value = "";
    loadReports();
  });

  // New Report button
  if (newReportBtn) {
    newReportBtn.addEventListener("click", showCreateReportForm);
  }
}

function debounce(func, delay) {
  let tid;
  return function (...args) {
    clearTimeout(tid);
    tid = setTimeout(() => func(...args), delay);
  };
}

/* ── Stats ── */
async function loadStats() {
  try {
    const [overviewRes, priorityRes] = await Promise.all([
      fetch(`${API_BASE}/stats/overview`, { headers: authHeaders() }),
      fetch(`${API_BASE}/stats/priority`, { headers: authHeaders() })
    ]);

    if (!overviewRes.ok || !priorityRes.ok) throw new Error("Stats error");

    const stats = await overviewRes.json();
    const priorityStats = await priorityRes.json();

    animateNumber("stat-open",     stats.OPEN || 0);
    animateNumber("stat-progress", stats.IN_PROGRESS || 0);
    animateNumber("stat-resolved", stats.RESOLVED || 0);
    animateNumber("stat-total",    stats.TOTAL || 0);

    // Render priority stats (nếu có container)
    renderPriorityStats(priorityStats);
  } catch (err) {
    console.error("Error loading stats:", err);
    ["stat-open","stat-progress","stat-resolved","stat-total"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
  }
}

function renderPriorityStats(stats) {
  // Nếu có container #priority-chart trong HTML
  const container = document.getElementById("priority-chart");
  if (!container) return;

  const html = Object.entries(stats).map(([priority, count]) => {
    const colors = { CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#facc15", LOW: "#4ade80" };
    const color = colors[priority] || "#7b93c4";
    const pct = Math.max(10, (count / Object.values(stats).reduce((a,b)=>a+b,1)) * 100);
    return `
      <div class="priority-stat-item">
        <div class="pstat-label">${priority}</div>
        <div class="pstat-bar" style="background:${color};width:${pct}%"></div>
        <div class="pstat-count">${count}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const duration = 800;
  const start = Date.now();
  const initial = parseInt(el.textContent) || 0;

  function update() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(initial + (target - initial) * progress);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }
  update();
}

/* ── Load reports ── */
async function loadReports() {
  currentView = "all";
  const container = reportsContainer;
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem"></i></div>`;

  try {
    const search   = searchInput.value.trim();
    const status   = filterStatus.value;
    const priority = filterPriority.value;
    const category = filterCategory.value;

    const params = new URLSearchParams();
    if (search)   params.append("search", search);
    if (status)   params.append("status", status);
    if (priority) params.append("priority", priority);
    if (category) params.append("category", category);

    const url = `${API_BASE}${params.toString() ? "?" + params.toString() : ""}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reports = await res.json();

    container.innerHTML = "";
    if (reports.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px">✨</div>
        <p>No reports found</p>
      </div>`;
      return;
    }

    reports.forEach((report, i) => {
      const card = createReportCard(report);
      card.style.animationDelay = `${i * 30}ms`;
      container.appendChild(card);
      card.addEventListener("click", () => openReportModal(report.id));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--red)">
      <i class="fa-solid fa-triangle-exclamation"></i> Error loading reports
    </div>`;
  }
}

/* ── Load my reports ── */
async function loadMyReports() {
  currentView = "my";
  const container = reportsContainer;
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem"></i></div>`;

  try {
    const res = await fetch(`${API_BASE}/my`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reports = await res.json();

    container.innerHTML = "";
    if (reports.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px">🎯</div>
        <p>You haven't submitted any reports yet</p>
      </div>`;
      return;
    }

    reports.forEach((report, i) => {
      const card = createReportCard(report);
      card.style.animationDelay = `${i * 30}ms`;
      container.appendChild(card);
      card.addEventListener("click", () => openReportModal(report.id));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--red)">Error loading your reports</div>`;
  }
}

function createReportCard(report) {
  const card = document.createElement("div");
  card.className = "card report-card fade-in";

  const priorityColor = { CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#facc15", LOW: "#4ade80" }[report.priority] || "#7b93c4";
  const statusBadge = {
    OPEN: "🔴 Open",
    IN_PROGRESS: "🟡 In Progress",
    RESOLVED: "🟢 Resolved",
    CLOSED: "⚫ Closed",
    WONT_FIX: "⏭️ Won't Fix"
  }[report.status] || report.status;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
      <h4 style="flex:1;margin:0;color:var(--text);word-break:break-word">${escapeHtml(report.title)}</h4>
      <span style="color:${priorityColor};font-weight:600;white-space:nowrap;margin-left:12px">${report.priority}</span>
    </div>
    <p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 12px 0;line-height:1.4">${escapeHtml((report.description || "").substring(0, 100))}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:0.85rem;color:var(--text-dim)">
      <span>${statusBadge}</span>
      <span>•</span>
      <span>By ${escapeHtml(report.reporterName || "Anonymous")}</span>
      <span>•</span>
      <span>${new Date(report.createdAt).toLocaleDateString("vi-VN")}</span>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ── Open report modal ── */
async function openReportModal(reportId) {
  const modal = reportModal;
  modalBody.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.4rem;display:block;margin-bottom:10px"></i> Loading…</div>`;
  modal.style.display = "flex";

  // Fetch comments first (we want to show them even if report GET fails for ROLE_USER)
  let comments = [];
  try {
    const commentsRes = await fetch(`${API_BASE}/${reportId}/comments`, { headers: authHeaders() });
    if (commentsRes.ok) {
      comments = await commentsRes.json();
    } else {
      // if comments endpoint returns non-OK, keep comments = []
      console.warn(`GET comments returned ${commentsRes.status}`);
    }
  } catch (e) {
    console.error("Error fetching comments:", e);
  }

  // Then try to fetch the report details (may return 403 for ROLE_USER)
  let report = null;
  let reportFetchOk = false;
  try {
    const res = await fetch(`${API_BASE}/${reportId}`, { headers: authHeaders() });
    if (res.ok) {
      report = await res.json();
      reportFetchOk = true;
    } else {
      console.warn(`GET report returned ${res.status}`);
    }
  } catch (e) {
    console.error("Error fetching report:", e);
  }

  // Build modal content: if report available show details, otherwise show limited header/message
  const reportTitle = report ? escapeHtml(report.title) : `Report #${reportId}`;
  const priorityColor = report ? ({ CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#facc15", LOW: "#4ade80" }[report.priority] || "#7b93c4") : "#7b93c4";
  const reportHeaderHtml = report ? `
      <div style="margin-bottom:12px">
        <h2 style="margin:0 0 8px 0">${escapeHtml(report.title)}</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:0.9rem">
          <span style="color:${priorityColor};font-weight:600">${report.priority}</span>
          <span style="padding:4px 8px;background:var(--bg-3);border-radius:6px;color:var(--text-muted)">${report.status}</span>
          <span style="color:var(--text-dim)">By ${escapeHtml(report.reporterName || "Anonymous")}</span>
        </div>
      </div>

      <div style="background:var(--bg-3);padding:16px;border-radius:8px;margin-bottom:12px">
        <p style="margin:0;color:var(--text-muted);line-height:1.6">${escapeHtml(report.description || "No description")}</p>
      </div>

      ${report.image ? `<img src="${report.image}" style="max-width:100%;max-height:300px;border-radius:8px;margin-bottom:12px;border:1px solid var(--border)">` : ""}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem;margin-bottom:12px">
        <div style="background:var(--bg-3);padding:12px;border-radius:6px">
          <span style="color:var(--text-dim)">Category</span><br>
          <strong>${report.category || "Other"}</strong>
        </div>
        <div style="background:var(--bg-3);padding:12px;border-radius:6px">
          <span style="color:var(--text-dim)">Assigned to</span><br>
          <strong>${report.assignee || "Unassigned"}</strong>
        </div>
      </div>
    ` : `
      <div style="margin-bottom:12px">
        <h2 style="margin:0 0 8px 0">${escapeHtml(reportTitle)}</h2>
        <div style="color:var(--text-dim);margin-bottom:8px">You don't have permission to view full details of this report.</div>
      </div>
    `;

  modalBody.innerHTML = `
    ${reportHeaderHtml}

    <div id="report-comments-section" style="margin-top:8px"></div>

    <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-ghost" onclick="closeReportModal()">Close</button>
    </div>
  `;

  // Render comments (using comment data fetched earlier)
  renderComments(comments, reportId);
}

/* ── Render comments và form gửi comment cho user ── */
function renderComments(comments, reportId) {
  const section = document.getElementById("report-comments-section");
  if (!section) return;

  const count = (comments && comments.length) ? comments.length : 0;

  section.innerHTML = `
    <div class="section-title" style="margin-top:8px"><i class="fa-solid fa-comments"></i> Comments (${count})</div>
    <div id="user-comments-list" style="margin-bottom:12px">
      ${count === 0 ? `<div style="padding:12px;color:var(--text-dim);font-size:0.9rem">No comments yet</div>`
      : comments.map(c => `
            <div class="comment-item" style="padding:10px;border-radius:8px;background:var(--bg-3);margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-weight:600;color:var(--text)">${escapeHtml(c.author || c.authorName || "User")}</div>
                <div style="font-size:0.85rem;color:var(--text-dim)">${new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div style="color:var(--text-muted);white-space:pre-wrap">${escapeHtml(c.text || c.message || "")}</div>
            </div>
          `).join("")
  }
    </div>

    <div style="margin-top:8px">
      <div style="font-weight:600;color:var(--text-muted);margin-bottom:6px">Add a comment</div>
      <textarea id="user-new-comment" class="input" placeholder="Write a public comment…" rows="3" style="resize:vertical"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost" id="btn-cancel-comment">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-comment"><i class="fa-solid fa-paper-plane"></i> Comment</button>
      </div>
    </div>
  `;

  // Attach handlers
  document.getElementById("btn-cancel-comment").addEventListener("click", () => {
    document.getElementById("user-new-comment").value = "";
  });

  document.getElementById("btn-submit-comment").addEventListener("click", async () => {
    const text = document.getElementById("user-new-comment").value.trim();
    if (!text) {
      alert("Comment cannot be empty");
      return;
    }
    // Disable while sending
    const btn = document.getElementById("btn-submit-comment");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending…`;

    try {
      const payload = { text, type: "PUBLIC" }; // backend expects something like CommentRequest
      const res = await fetch(`${API_BASE}/${reportId}/comments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      // Refresh comments after success
      const newComments = await fetch(`${API_BASE}/${reportId}/comments`, { headers: authHeaders() })
          .then(r => r.ok ? r.json() : []);
      renderComments(newComments, reportId);
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Error submitting comment: " + (err.message || ""));
    } finally {
      // Re-enable (in case renderComments didn't replace DOM)
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Comment`;
    }
  });
}

function closeReportModal() {
  reportModal.style.display = "none";
}

// Close modal khi click outside
if (reportModal) {
  reportModal.addEventListener("click", (e) => {
    if (e.target === reportModal) closeReportModal();
  });
}

/* ── Create report form (frontend) ── */
function showCreateReportForm() {
  const modal = reportModal;
  modalBody.innerHTML = `
    <h2 style="margin-top:0">Submit a Bug Report</h2>

    <form id="create-report-form" style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Title *</label>
        <input class="input" type="text" id="new-title" placeholder="Brief description of the bug" required>
      </div>

      <div>
        <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Description</label>
        <textarea class="input" id="new-desc" placeholder="Steps to reproduce, expected vs actual behavior..." style="min-height:100px;resize:vertical"></textarea>
      </div>

      <div>
        <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Priority</label>
        <select class="input" id="new-priority">
          <option value="LOW">🟢 Low</option>
          <option value="MEDIUM" selected>🟡 Medium</option>
          <option value="HIGH">🔴 High</option>
          <option value="CRITICAL">⚠️ Critical</option>
        </select>
      </div>

      <div>
        <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Category</label>
        <select class="input" id="new-category">
          <option value="BUG">Bug</option>
          <option value="FEATURE">Feature Request</option>
          <option value="UI">UI/UX</option>
          <option value="PERFORMANCE">Performance</option>
          <option value="SECURITY">Security</option>
          <option value="OTHER" selected>Other</option>
        </select>
      </div>

      <div>
        <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Screenshot (optional)</label>
        <input class="input" type="file" id="new-image" accept="image/*">
        <small style="color:var(--text-dim)">Max 5MB</small>
      </div>

      <div style="display:flex;gap:12px;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeReportModal()" style="flex:1">Cancel</button>
        <button type="submit" class="btn btn-primary" style="flex:1">
          <i class="fa-solid fa-paper-plane"></i> Submit Report
        </button>
      </div>
    </form>
  `;

  modal.style.display = "flex";

  document.getElementById("create-report-form").addEventListener("submit", submitNewReport);
}

async function submitNewReport(e) {
  e.preventDefault();

  const title = document.getElementById("new-title").value.trim();
  const description = document.getElementById("new-desc").value.trim();
  const priority = document.getElementById("new-priority").value;
  const category = document.getElementById("new-category").value;
  const imageFile = document.getElementById("new-image").files[0];

  if (!title) {
    alert("Title is required");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting…`;

  try {
    let image = null;
    if (imageFile) {
      image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }

    const payload = {
      title,
      description,
      priority,
      category,
      image,
      url: window.location.href,
      reporterType: "USER",
      reporterName: (JSON.parse(localStorage.getItem("authUser")) || {}).username || "",
      reporterEmail: (JSON.parse(localStorage.getItem("authUser")) || {}).email || "",
      browserInfo: navigator.userAgent,
      consoleErrors: "[]",
      steps: description,
      version: ""
    };

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());

    alert("Report submitted successfully!");
    closeReportModal();
    loadReports();
  } catch (err) {
    console.error(err);
    alert("Error submitting report: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Report`;
  }
}

/* ── SSE Listener ── */
function startSSEListener() {
  try {
    sseSource = new EventSource("/api/notifications/stream", {
      headers: authHeaders()
    });

    sseSource.addEventListener("open", () => {
      console.log("✓ SSE connected");
    });

    sseSource.addEventListener("new-report", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 New report notification:", data);

        // Reload reports every 30s nếu có notification mới
        setTimeout(loadReports, 1000);
      } catch (e) { console.error(e); }
    });

    sseSource.addEventListener("error", () => {
      console.warn("⚠ SSE disconnected");
      // Retry connection mỗi 10s
      setTimeout(() => {
        if (sseSource) sseSource.close();
        startSSEListener();
      }, 10000);
    });
  } catch (e) {
    console.warn("SSE not supported:", e);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "/login.html";
}