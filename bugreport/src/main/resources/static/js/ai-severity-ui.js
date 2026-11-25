(() => {
  // The actual severity is assigned asynchronously by the server-side AI classifier.
  // Keep the legacy select in the DOM because the existing submit handler reads it,
  // but make it non-interactive and explain the new behavior to reporters.
  const hideUserSeverityControl = () => {
    const select = document.getElementById("new-priority");
    if (!select || select.dataset.aiSeverityUi === "true") return;
    select.dataset.aiSeverityUi = "true";
    select.value = "MEDIUM";
    const field = select.parentElement;
    if (!field) return;
    field.innerHTML = `
      <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-muted)">Mức độ nghiêm trọng</label>
      <div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-3);color:var(--text-muted)">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--violet);margin-right:6px"></i>
        AI sẽ tự động đánh giá sau khi bạn gửi báo cáo.
      </div>
      <input type="hidden" id="new-priority" value="MEDIUM">
    `;
  };

  const observer = new MutationObserver(hideUserSeverityControl);
  observer.observe(document.body, { childList: true, subtree: true });
  hideUserSeverityControl();
})();
