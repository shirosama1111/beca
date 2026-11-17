/* ============================================================
   BugReport — admin-users.js
   ============================================================ */

const API = "/api/admin/users";
let allUsers = [];

/* ── Auth ── */
async function authHeaders() {
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

/* ── Load & render users ── */
async function loadUsers() {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = `<tr><td colspan="5">
    <div style="padding:32px;text-align:center;color:var(--text-dim)">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:1.4rem;margin-bottom:8px;display:block"></i>
      Đang tải…
    </div>
  </td></tr>`;

  try {
    const res = await fetch(API, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allUsers = await res.json();
    updateCounters(allUsers);
    renderUsers(allUsers);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="error-state" style="margin:16px">
        <i class="fa-solid fa-triangle-exclamation"></i> Không thể tải danh sách user
      </div>
    </td></tr>`;
  }
}

function updateCounters(users) {
  document.getElementById("count-admin").textContent = users.filter(u => u.role === "ADMIN").length;
  document.getElementById("count-dev").textContent   = users.filter(u => u.role === "DEVELOPER").length;
  document.getElementById("count-user").textContent  = users.filter(u => u.role === "USER").length;
  document.getElementById("count-total").textContent = users.length;
}

function filterUsers() {
  const q = document.getElementById("user-search").value.toLowerCase();
  const filtered = allUsers.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
  );
  renderUsers(filtered);
}

function renderUsers(users) {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = "";

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">👥</div>
        <p>Không tìm thấy user nào</p>
      </div>
    </td></tr>`;
    return;
  }

  users.forEach((u, i) => {
    const initials = (u.username || "?").substring(0, 2).toUpperCase();
    const roleCls  = u.role === "ADMIN" ? "role-badge-admin" : u.role === "DEVELOPER" ? "role-badge-dev" : "role-badge-user";

    const tr = document.createElement("tr");
    tr.className = "fade-in";
    tr.style.animationDelay = `${i * 30}ms`;
    tr.innerHTML = `
      <td>#${escapeHtml(String(u.id))}</td>
      <td>
        <div class="user-cell">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name">${escapeHtml(u.username)}</div>
          </div>
        </div>
      </td>
      <td><span class="mono" style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(u.email)}</span></td>
      <td>
        <select class="input role-select" data-id="${u.id}" data-current="${escapeHtml(u.role)}">
          <option ${u.role === "USER"      ? "selected" : ""}>USER</option>
          <option ${u.role === "DEVELOPER" ? "selected" : ""}>DEVELOPER</option>
          <option ${u.role === "ADMIN"     ? "selected" : ""}>ADMIN</option>
        </select>
      </td>
      <td>
        <button class="btn btn-danger" data-id="${u.id}" data-name="${escapeHtml(u.username)}">
          <i class="fa-solid fa-trash-can"></i> Xóa
        </button>
      </td>`;
    tbody.appendChild(tr);
  });

  /* Role change handlers */
  tbody.querySelectorAll(".role-select").forEach(sel => {
    sel.onchange = async (e) => {
      const id      = e.target.dataset.id;
      const role    = e.target.value;
      const oldRole = e.target.dataset.current;

      try {
        const res = await fetch(`${API}/${id}/role`, {
          method: "PATCH",
          headers: await authHeaders(),
          body: JSON.stringify({ role })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        e.target.dataset.current = role;
        showToast(`Role đã đổi → ${role}`, "success");
        // Update local data
        const user = allUsers.find(u => String(u.id) === id);
        if (user) user.role = role;
        updateCounters(allUsers);
      } catch (err) {
        e.target.value = oldRole;
        showToast("Cập nhật role thất bại", "error");
      }
    };
  });

  /* Delete handlers */
  tbody.querySelectorAll(".btn-danger").forEach(btn => {
    btn.onclick = async () => {
      const id   = btn.dataset.id;
      const name = btn.dataset.name;
      if (!confirm(`Xóa user "${name}"? Hành động này không thể hoàn tác.`)) return;
      try {
        const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: await authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allUsers = allUsers.filter(u => String(u.id) !== id);
        updateCounters(allUsers);
        renderUsers(allUsers);
        showToast(`Đã xóa user "${name}"`, "success");
      } catch (err) {
        showToast("Xóa user thất bại", "error");
      }
    };
  });
}

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

function logout() {
  localStorage.removeItem("authUser");
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

loadUsers();