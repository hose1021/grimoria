// One disclosure controller for both app bars. The React bar and the
// string-composed bar share the data attributes, so this file owns the open
// state, the close paths and the focus return.
const TOGGLE = "[data-app-bar-toggle]";
const PANEL = "[data-app-bar-menu]";

export function initAppBarMenu(root: HTMLElement, signal: AbortSignal): () => void {
  const close = (restoreFocus = false): void => {
    const host = root.querySelector<HTMLElement>(PANEL);
    if (!host) return;
    host.removeAttribute("data-open");
    const trigger = root.querySelector<HTMLElement>(TOGGLE);
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger?.focus();
  };

  root
    .querySelector<HTMLElement>(TOGGLE)
    ?.setAttribute(
      "aria-expanded",
      root.querySelector<HTMLElement>(PANEL)?.hasAttribute("data-open") ? "true" : "false",
    );

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest(TOGGLE);
      if (trigger) {
        const host = root.querySelector<HTMLElement>(PANEL);
        if (!host) return;
        trigger.setAttribute("aria-expanded", String(host.toggleAttribute("data-open")));
        return;
      }
      if (target.closest("a") && target.closest(PANEL)) close();
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const host = root.querySelector<HTMLElement>(PANEL);
      if (event.key !== "Escape" || !host?.hasAttribute("data-open")) return;
      event.preventDefault();
      close(true);
    },
    { signal },
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      const host = root.querySelector<HTMLElement>(PANEL);
      if (!host?.hasAttribute("data-open")) return;
      const target = event.target;
      if (
        !(target instanceof Node) ||
        host.contains(target) ||
        root.querySelector<HTMLElement>(TOGGLE)?.contains(target)
      )
        return;
      close();
    },
    { signal },
  );

  return () => close();
}
