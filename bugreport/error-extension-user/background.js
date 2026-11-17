// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "START_CAPTURE") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId },
                files: ["content.js"]
            }, () => {
                chrome.windows.getCurrent((win) => {
                    chrome.tabs.captureVisibleTab(
                        win.id,
                        { format: "png" },
                        (dataUrl) => {
                            if (chrome.runtime.lastError) {
                                console.error(chrome.runtime.lastError);
                                return;
                            }
                            chrome.tabs.sendMessage(tabId, {
                                type: "SHOW_EDITOR",
                                image: dataUrl
                            });
                        }
                    );
                });
            });
        });
    }

    if (message.type === "SEND_TO_SERVER") {
        chrome.storage.local.get("auth", (d) => {
            const token = d?.auth?.token;
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = "Bearer " + token;

            console.log("📡 BG: Gửi report tới /api/reports");
            console.log("🔑 Token:", token ? "✓ Có" : "✗ Không");
            console.log("📦 Payload size:", JSON.stringify(message.data).length);

            fetch("http://localhost:8080/api/reports", {
                method: "POST",
                headers,
                body: JSON.stringify(message.data)
            })
                .then(async (res) => {
                    const text = await res.text();
                    console.log("📊 HTTP Status:", res.status);
                    console.log("📝 Response text:", text?.substring(0, 200));

                    if (!res.ok) {
                        throw new Error(text || `HTTP ${res.status}`);
                    }
                    return text ? JSON.parse(text) : {};
                })
                .then(data => {
                    console.log("✅ BG: Gửi thành công!", data);
                    sendResponse({ success: true, data });
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon.png",
                        title: "BugReport",
                        message: "✅ Báo cáo đã gửi"
                    });
                })
                .catch(err => {
                    console.error("❌ BG: Lỗi gửi:", err);
                    sendResponse({ success: false, error: err.message });
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon.png",
                        title: "BugReport - Lỗi",
                        message: "❌ " + err.message
                    });
                });
        });

        // 🔴 FIX: Trả về true để cho phép async response
        return true;
    }

    if (message.type === "MANUAL_ERROR") {
        chrome.storage.local.get("auth", (d) => {
            const token = d?.auth?.token;
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = "Bearer " + token;

            fetch("http://localhost:8080/api/reports", {
                method: "POST",
                headers,
                body: JSON.stringify(message.data)
            })
                .then(res => console.log("Auto-report sent:", res.status))
                .catch(err => console.error("Auto-report error:", err));
        });
    }
});