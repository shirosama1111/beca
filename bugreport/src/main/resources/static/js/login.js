const API_LOGIN    = "/api/auth/login";
const API_REGISTER = "/api/auth/register";

/* ── Role → destination map ── */
const ROLE_DESTINATIONS = {
  ADMIN:     "/admin-users.html",
  DEVELOPER: "/developer.html",
  USER:      "/index.html",
};

/* ── Redirect if already logged in ── */
(function checkAuth() {
  const token = localStorage.getItem("token");
  if (token && token !== "undefined" && token !== "null") {
    const user = JSON.parse(localStorage.getItem("authUser") || "{}");
    const dest = ROLE_DESTINATIONS[user.role] || "/index.html";
    window.location.href = dest;
  }
})();

/* ── Portal link guard: chỉ cho phép truy cập nếu đã login đúng role ── */
function requireRole(e, requiredRole) {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    e.preventDefault();
    switchTab("login");
    showLoginHint(`Vui lòng đăng nhập với tài khoản ${requiredRole === "DEVELOPER" ? "Developer" : "Admin"}`);
    return false;
  }
  const user = JSON.parse(localStorage.getItem("authUser") || "{}");
  if (user.role !== requiredRole) {
    e.preventDefault();
    showLoginHint(`Trang này chỉ dành cho ${requiredRole === "DEVELOPER" ? "Developer" : "Admin"}`);
    return false;
  }
  return true;
}

function showLoginHint(msg) {
  const el = document.getElementById("login-error-msg");
  const box = document.getElementById("login-error");
  if (el && box) {
    el.textContent = msg;
    box.style.display = "flex";
    setTimeout(() => { box.style.display = "none"; }, 3500);
  }
}

/* ── Tab switcher ── */
function switchTab(tab) {
  const isLogin = tab === "login";

  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);
  document.getElementById("panel-login").classList.toggle("active", isLogin);
  document.getElementById("panel-register").classList.toggle("active", !isLogin);

  document.getElementById("auth-heading").textContent    = isLogin ? "Đăng nhập" : "Tạo tài khoản";
  document.getElementById("auth-subheading").textContent = isLogin
      ? "Báo cáo lỗi hoặc theo dõi hệ thống của bạn"
      : "Chọn loại tài khoản phù hợp với vai trò của bạn";

  document.getElementById("login-error").style.display     = "none";
  document.getElementById("register-error").style.display  = "none";
  document.getElementById("register-success").style.display = "none";
}

/* ── Toggle password visibility ── */
function togglePwd(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  const isHidden = input.type === "password";
  input.type     = isHidden ? "text" : "password";
  icon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
}

/* ── Password strength meter ── */
function checkStrength(val) {
  const bar   = document.getElementById("strength-bar");
  const label = document.getElementById("strength-label");
  let score = 0;
  if (val.length >= 8)           score++;
  if (/[A-Z]/.test(val))         score++;
  if (/[0-9]/.test(val))         score++;
  if (/[^A-Za-z0-9]/.test(val))  score++;

  bar.className = "strength-bar" + (val ? ` str-${score}` : "");

  const levels = ["", "Yếu", "Trung bình", "Khá mạnh", "Mạnh 💪"];
  const colors = ["", "var(--red)", "var(--amber,#f59e0b)", "var(--blue)", "var(--green)"];
  label.textContent = val ? levels[score] : "";
  label.style.color = val ? colors[score] : "";
}

/* ── Login ── */
async function handleLogin(e) {
  e.preventDefault();
  const form     = e.target;
  const username = form.username.value.trim();
  const password = form.password.value;
  const btn      = document.getElementById("loginBtn");
  const errorBox = document.getElementById("login-error");
  const errorMsg = document.getElementById("login-error-msg");

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập…`;
  errorBox.style.display = "none";

  try {
    const res  = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Sai tên đăng nhập hoặc mật khẩu");

    localStorage.setItem("token", data.token || data.accessToken);

    const authUser = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role
    };

    localStorage.setItem("authUser", JSON.stringify(authUser));

    const role = data.role || "USER";

    if (role === "ADMIN") {
      window.location.href = "/admin-users.html";
    } else if (role === "DEVELOPER") {
      window.location.href = "/developer.html";
    } else {
      window.location.href = "/index.html";
    }
  } catch (err) {
    errorMsg.textContent = err.message;
    errorBox.style.display = "flex";
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập`;
  }
}

/* ── Register ── */
async function handleRegister(e) {
  e.preventDefault();
  const form       = e.target;
  const username   = form.username.value.trim();
  const email      = form.email.value.trim();
  const password   = form.password.value;
  const confirm    = form.confirm.value;
  const roleInput  = document.querySelector('input[name="reg-role"]:checked');
  const role       = roleInput ? roleInput.value : "USER";

  const btn        = document.getElementById("registerBtn");
  const errorBox   = document.getElementById("register-error");
  const errorMsg   = document.getElementById("register-error-msg");
  const successBox = document.getElementById("register-success");
  const successMsg = document.getElementById("register-success-msg");

  errorBox.style.display   = "none";
  successBox.style.display = "none";

  if (password !== confirm) {
    errorMsg.textContent = "Mật khẩu xác nhận không khớp";
    errorBox.style.display = "flex";
    return;
  }
  if (password.length < 8) {
    errorMsg.textContent = "Mật khẩu phải có ít nhất 8 ký tự";
    errorBox.style.display = "flex";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo tài khoản…`;

  try {
    const res  = await fetch(API_REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Đăng ký thất bại");

    const roleLabels = { USER: "Customer", DEVELOPER: "Developer", ADMIN: "Admin" };
    successMsg.textContent = `Đăng ký thành công (${roleLabels[role] || role})! Đang chuyển hướng…`;
    successBox.style.display = "flex";
    form.reset();
    checkStrength("");

    if (data.token || data.accessToken) {

      localStorage.setItem("token", data.token || data.accessToken);

      const authUser = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role
      };

      localStorage.setItem("authUser", JSON.stringify(authUser));

      setTimeout(() => {
        const role = data.role || "USER";

        if (role === "ADMIN") {
          window.location.href = "/admin-users.html";
        } else if (role === "DEVELOPER") {
          window.location.href = "/developer.html";
        } else {
          window.location.href = "/index.html";
        }
      }, 1200);
    } else {
      setTimeout(() => switchTab("login"), 1500);
    }
  } catch (err) {
    errorMsg.textContent = err.message;
    errorBox.style.display = "flex";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Tạo tài khoản`;
  }
}