// inject-logger.js — injects into pages to capture console and window.onerror and optionally auto-send
(function() {
    if (window.__BUGREPORT_INJECTED) return;
    window.__BUGREPORT_INJECTED = true;

    window.__ERROR_REPORT_LOGS = window.__ERROR_REPORT_LOGS || [];

    try {
        const orig = {};
        ["log","info","warn","error"].forEach(fn => {
            orig[fn] = console[fn].bind(console);
            console[fn] = function(...args) {
                try {
                    const msg = args.map(a => {
                        try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
                        catch(e){ return String(a); }
                    }).join(" ");
                    window.__ERROR_REPORT_LOGS.push({ type: fn, time: Date.now(), message: msg });
                    // keep logs length bounded
                    if (window.__ERROR_REPORT_LOGS.length > 200) window.__ERROR_REPORT_LOGS.shift();
                } catch(e){}
                orig[fn](...args);
            };
        });

        window.addEventListener("error", function(e) {
            try {
                const rec = {
                    type: "uncaught",
                    time: Date.now(),
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    stack: e.error ? (e.error.stack || String(e.error)) : null
                };
                window.__ERROR_REPORT_LOGS.push(rec);
                if (window.__ERROR_REPORT_LOGS.length > 200) window.__ERROR_REPORT_LOGS.shift();

                // Auto-send logic: ask chrome.storage if enabled, then send (rate-limited)
                try {
                    chrome.storage.local.get(["autoSendEnabled","lastAutoSent"], (d) => {
                        if (!d.autoSendEnabled) return;
                        const now = Date.now();
                        const last = d.lastAutoSent || 0;
                        // rate limit: 60s
                        if (now - last < 60_000) return;
                        // prepare minimal payload
                        const payload = {
                            title: `Auto: uncaught error on ${location.hostname}`,
                            description: `Uncaught error: ${rec.message}\n${rec.stack || ""}`,
                            image: null,
                            url: location.href,
                            priority: "HIGH",
                            reporterType: "AUTO",
                            reporterName: "AutoReporter",
                            reporterEmail: "",
                            category: "AUTO",
                            browserInfo: navigator.userAgent,
                            consoleErrors: JSON.stringify(window.__ERROR_REPORT_LOGS.slice(-50)),
                            steps: "",
                            version: ""
                        };
                        // send using runtime message to background
                        chrome.runtime.sendMessage({ type: "SEND_TO_SERVER", data: payload }, () => {
                            chrome.storage.local.set({ lastAutoSent: now });
                        });
                    });
                } catch (err) {
                    // ignore
                }

            } catch (err) {}
        });

        window.getAndClearBugLogs = function() {
            const copy = (window.__ERROR_REPORT_LOGS || []).slice();
            window.__ERROR_REPORT_LOGS = [];
            return copy;
        };
    } catch (e) {
        // swallow
    }
})();