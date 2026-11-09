// Shared UI primitives. Never interpolate unescaped user data into markup.
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// Enhances existing modal markup while retaining the screen's delegated actions.
export function modalFocus(root, signal) {
  let previous = null;
  let active = null;
  const reset = () => root.querySelectorAll("[inert]").forEach((el) => { el.inert = false; });
  function update() {
    const dialog = root.querySelector('[aria-modal="true"]');
    if (dialog === active) return;
    reset();
    if (!dialog) {
      active = null;
      if (previous?.isConnected) previous.focus();
      return;
    }
    if (!active) previous = document.activeElement;
    active = dialog;
    for (let el = dialog; el && el !== root; el = el.parentElement) {
      for (const sibling of el.parentElement.children) if (sibling !== el) sibling.inert = true;
    }
    dialog.tabIndex = -1;
    (dialog.querySelector('button:not(:disabled), input, select, textarea, a[href], summary, [tabindex="0"]') || dialog).focus();
  }
  root.addEventListener("keydown", (event) => {
    if (!active || event.key !== "Tab") return;
    const items = [...active.querySelectorAll('button:not(:disabled), input, select, textarea, a[href], summary, [tabindex="0"]')]
      .filter((el) => el.getClientRects().length);
    if (!items.length) { event.preventDefault(); active.focus(); return; }
    const index = items.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
  }, { signal });
  const observer = new MutationObserver(update);
  observer.observe(root, { childList: true, subtree: true });
  signal.addEventListener("abort", () => { observer.disconnect(); reset(); active = null; previous = null; }, { once: true });
  update();
}
