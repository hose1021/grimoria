// @ts-check
// Shared UI primitives. Never interpolate unescaped user data into markup.
const ESCAPES = /** @type {Record<string, string>} */ ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
});

/** @param {unknown} value @returns {string} */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** @returns {string} */
export function basePath() {
  const env = import.meta.env;
  return env && env.BASE_URL ? env.BASE_URL : "/";
}

/**
 * @param {string} [name]
 * @returns {string}
 */
export function assetUrl(name) {
  return basePath() + String(name || "").replace(/^\/+/, "");
}

/**
 * @param {HTMLElement} root
 * @param {AbortSignal} signal
 * @returns {void}
 */
// Enhances existing modal markup while retaining the screen's delegated actions.
export function modalFocus(root, signal) {
  /** @type {HTMLElement | null} */
  let previous = null;
  /** @type {HTMLElement | null} */
  let active = null;
  const reset = () => root.querySelectorAll("[inert]").forEach((el) => { /** @type {HTMLElement} */ (el).inert = false; });
  function update() {
    const dialog = /** @type {HTMLElement | null} */ (root.querySelector('[aria-modal="true"]'));
    if (dialog === active) return;
    reset();
    if (!dialog) {
      active = null;
      if (previous?.isConnected) previous.focus();
      return;
    }
    if (!active) previous = /** @type {HTMLElement | null} */ (document.activeElement);
    active = dialog;
    for (let el = /** @type {Element | null} */ (dialog); el && el !== root; el = el.parentElement) {
      const parent = el.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) if (sibling !== el) /** @type {HTMLElement} */ (sibling).inert = true;
    }
    dialog.tabIndex = -1;
    /** @type {HTMLElement} */ (dialog.querySelector('button:not(:disabled), input, select, textarea, a[href], summary, [tabindex="0"]') || dialog).focus();
  }
  root.addEventListener("keydown", (event) => {
    if (!active || event.key !== "Tab") return;
    const items = /** @type {HTMLElement[]} */ ([...active.querySelectorAll('button:not(:disabled), input, select, textarea, a[href], summary, [tabindex="0"]')])
      .filter((el) => el.getClientRects().length);
    if (!items.length) { event.preventDefault(); active.focus(); return; }
    const index = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (event.shiftKey && index <= 0) { event.preventDefault(); /** @type {HTMLElement} */ (items.at(-1)).focus(); }
    else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
  }, { signal });
  const observer = new MutationObserver(update);
  observer.observe(root, { childList: true, subtree: true });
  signal.addEventListener("abort", () => { observer.disconnect(); reset(); active = null; previous = null; }, { once: true });
  update();
}
