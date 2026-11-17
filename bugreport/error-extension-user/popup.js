// popup.js — Customer-only extension
const API_BASE = "http://localhost:8080";

/* ── Image editor state ── */
let canvas, ctx, isErasing = false;
let history = [];
let currentImage = null;


const ALLOWED_ROLES = ["USER"]; // only customers

function isCustomer(role) {
    return ALLOWED_ROLES.includes(role?.toUpperCase());
}

async function apiFetch(path, opts = {}) {
    const store = await chrome.storage.local.get("auth");
    const token = store?.auth?.token;
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + path, Object.assign({ headers }, opts));
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    return text ? JSON.parse(text) : {};
}

/* ── UI: show/hide sections based on auth state ── */
async function refreshUI() {
    const d = await chrome.storage.local.get("auth");
    const auth = d?.auth;

    const loginForm   = document.getElementById("auth-login-form");
    const loggedIn    = document.getElementById("auth-logged-in");
    const reportSec   = document.getElementById("report-section");
    const divider     = document.getElementById("report-divider");
    const blocked     = document.getElementById("role-blocked");
    const errorBox    = document.getElementById("login-error");

    // Reset
    blocked.style.display   = "none";
    loginForm.style.display  = "block";
    loggedIn.style.display   = "none";
    reportSec.style.display  = "none";
    divider.style.display    = "none";
    if (errorBox) errorBox.style.display = "none";

    if (!auth?.token) return; // not logged in → show login form

    const role = auth.role || auth.user?.role || "USER";

    if (!isCustomer(role)) {
        // ── BLOCKED: Developer or Admin ──
        blocked.style.display  = "flex";
        loginForm.style.display = "none";
        loggedIn.style.display  = "none";
        reportSec.style.display = "none";
        divider.style.display   = "none";

        const roleLabel = role === "DEVELOPER" ? "Developer" : role === "ADMIN" ? "Admin" : role;
        const blockedName = document.getElementById("blocked-role-name");
        if (blockedName) blockedName.textContent = roleLabel;
        return;
    }

    // ── CUSTOMER: show report UI ──
    loginForm.style.display = "none";
    loggedIn.style.display  = "block";
    reportSec.style.display = "block";
    divider.style.display   = "block";

    const username = auth.username || auth.user?.username || "User";
    const initials = username.substring(0, 2).toUpperCase();
    const nameEl = document.getElementById("auth-display-name");
    const avatarEl = document.getElementById("auth-avatar");
    if (nameEl)   nameEl.textContent   = username;
    if (avatarEl) avatarEl.textContent = initials;
}

/* ── Image editor init ── */
function initImageEditor(imageSrc) {
    canvas = document.getElementById("imageCanvas");
    ctx = canvas.getContext("2d");
    const container = document.getElementById("imageEditorContainer");
    const img = new Image();
    img.onload = () => {
        canvas.width  = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        saveHistory();
        currentImage = imageSrc;
        container.style.display = "block";
        document.getElementById("imagePreview").style.display = "none";
    };
    img.src = imageSrc;
}

function saveHistory() {
    history.push(canvas.toDataURL());
    if (history.length > 20) history.shift();
}

function setupCanvasDrawing() {
    const drawBtn    = document.getElementById("drawBtn");
    const eraserBtn  = document.getElementById("eraserBtn");
    const undoBtn    = document.getElementById("undoBtn");
    const clearBtn   = document.getElementById("clearBtn");
    const colorPicker = document.getElementById("drawColor");
    const brushSize  = document.getElementById("brushSize");

    drawBtn.onclick = () => {
        isErasing = false;
        drawBtn.classList.add("active");
        eraserBtn.classList.remove("active");
    };
    eraserBtn.onclick = () => {
        isErasing = true;
        eraserBtn.classList.add("active");
        drawBtn.classList.remove("active");
    };
    undoBtn.onclick = () => {
        if (history.length > 1) {
            history.pop();
            const img = new Image();
            img.src = history[history.length - 1];
            img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
        }
    };
    clearBtn.onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history = [];
        const img = new Image();
        img.src = currentImage;
        img.onload = () => { ctx.drawImage(img, 0, 0); saveHistory(); };
    };

    let painting = false;
    canvas.onmousedown = (e) => {
        painting = true;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (rect.width / canvas.width);
        const y = (e.clientY - rect.top) / (rect.height / canvas.height);
        ctx.beginPath(); ctx.moveTo(x, y);
    };
    canvas.onmousemove = (e) => {
        if (!painting) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (rect.width / canvas.width);
        const y = (e.clientY - rect.top) / (rect.height / canvas.height);
        ctx.lineWidth = brushSize.value;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        if (isErasing) { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "rgba(0,0,0,1)"; }
        else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = colorPicker.value; }
        ctx.lineTo(x, y); ctx.stroke();
    };
    canvas.onmouseup = () => { painting = false; saveHistory(); };
    canvas.onmouseleave = () => { painting = false; };
}

/* ── DOMContentLoaded ── */
document.addEventListener("DOMContentLoaded", () => {
    refreshUI();

    /* ─ Login ─ */
    document.getElementById("loginBtn").onclick = async () => {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const btn      = document.getElementById("loginBtn");
        const errBox   = document.getElementById("login-error");
        const errMsg   = document.getElementById("login-error-msg");

        if (!username || !password) {
            errMsg.textContent = "Vui lòng nhập đầy đủ thông tin";
            errBox.style.display = "flex";
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập…`;
        errBox.style.display = "none";

        try {
            const res = await fetch(API_BASE + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const text = await res.text();
            if (!res.ok) throw new Error(text || res.statusText);
            const data = text ? JSON.parse(text) : {};

            // ── Check role BEFORE saving ──
            const role = data.role || data.user?.role || "USER";
            if (!isCustomer(role)) {
                const roleLabel = role === "DEVELOPER" ? "Developer" : role === "ADMIN" ? "Admin" : role;
                // Save temporarily just to show blocked screen
                await chrome.storage.local.set({ auth: { ...data, role } });
                await refreshUI();
                return;
            }

            // Customer — save and show report UI
            await chrome.storage.local.set({ auth: { ...data, role } });
            document.getElementById("username").value = "";
            document.getElementById("password").value = "";
            await refreshUI();
        } catch (err) {
            errMsg.textContent = err.message || "Sai tên đăng nhập hoặc mật khẩu";
            errBox.style.display = "flex";
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-sign-in-alt"></i> Đăng nhập`;
        }
    };

    /* ─ Logout ─ */
    document.getElementById("logoutBtn").onclick = async () => {
        await chrome.storage.local.remove("auth");
        await refreshUI();
    };
    document.getElementById("blocked-logout-btn").onclick = async () => {
        await chrome.storage.local.remove("auth");
        await refreshUI();
    };

    /* ─ Auto-send toggle ─ */
    const autoSendToggle = document.getElementById("autoSendToggle");
    chrome.storage.local.get("autoSendEnabled", (d) => {
        autoSendToggle.checked = !!d.autoSendEnabled;
    });
    autoSendToggle.onchange = async () => {
        await chrome.storage.local.set({ autoSendEnabled: autoSendToggle.checked });
    };

    /* ─ Capture screenshot ─ */
    document.getElementById("captureBtn").onclick = async () => {
        try {
            const win = await chrome.windows.getCurrent();
            chrome.tabs.captureVisibleTab(win.id, { format: "png" }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    alert("Không thể chụp: " + chrome.runtime.lastError.message);
                    return;
                }
                document.getElementById("imagePreview").src = dataUrl;
                document.getElementById("imagePreview").style.display = "block";
                initImageEditor(dataUrl);
                setupCanvasDrawing();
            });
        } catch (e) {
            alert("Lỗi: " + e.message);
        }
    };

    /* ─ Send report ─ */
    document.getElementById("sendBtn").onclick = async () => {
        const btn = document.getElementById("sendBtn");

        // Re-check auth
        const d = await chrome.storage.local.get("auth");
        if (!d?.auth?.token) {
            await chrome.storage.local.remove("auth");
            await refreshUI();
            return;
        }

        const role = d.auth.role || d.auth.user?.role || "USER";
        if (!isCustomer(role)) {
            await refreshUI(); // show blocked
            return;
        }

        const titleEl   = document.getElementById("title");
        const descEl    = document.getElementById("description");

        if (!titleEl.value.trim()) {
            titleEl.focus();
            titleEl.style.borderColor = "var(--red)";
            setTimeout(() => { titleEl.style.borderColor = ""; }, 2000);
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi…`;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const pageUrl = tab?.url || "";

            let consoleErrors = "[]";
            if (document.getElementById("includeConsole").checked) {
                try {
                    const execRes = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            try { return window.getAndClearBugLogs ? JSON.stringify(window.getAndClearBugLogs()) : "[]"; }
                            catch (e) { return "[]"; }
                        }
                    });
                    consoleErrors = execRes?.[0]?.result || "[]";
                } catch (e) { consoleErrors = "[]"; }
            }

            let image = null;
            if (canvas && canvas.width > 0) {
                image = canvas.toDataURL("image/png");
            } else if (document.getElementById("imagePreview").style.display !== "none") {
                image = document.getElementById("imagePreview").src;
            }

            const payload = {
                title:        titleEl.value.trim(),
                description:  descEl.value.trim(),
                image:        image || null,
                url:          pageUrl,
                priority:     null,
                reporterType: "USER",
                reporterName: d.auth.username || d.auth.user?.username || "",
                reporterEmail: d.auth.email || d.auth.user?.email || "",
                category:     "OTHER",
                browserInfo:  navigator.userAgent,
                consoleErrors,
                steps:        descEl.value.trim(),
                version:      ""
            };

            chrome.runtime.sendMessage({ type: "SEND_TO_SERVER", data: payload }, (resp) => {
                console.log("Response from background:", resp);
            });

            document.getElementById("send-success").style.display = "flex";
            setTimeout(() => {
                document.getElementById("send-success").style.display = "none";
                titleEl.value = "";
                descEl.value  = "";
                document.getElementById("imagePreview").style.display = "none";
                document.getElementById("imageEditorContainer").style.display = "none";
                canvas = null; history = [];
                window.close();
            }, 1500);

        } catch (e) {
            console.error("Send error:", e);
            alert("Lỗi: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Gửi báo cáo`;
        }
    };

    /* ─ Enter key on login ─ */
    ["username","password"].forEach(id => {
        document.getElementById(id).addEventListener("keydown", (e) => {
            if (e.key === "Enter") document.getElementById("loginBtn").click();
        });
    });
});