// @ts-check
import { esc } from "./ui.js";
import { save, playerById } from "./store.js";

/** @typedef {{ player?: string | null, phase?: string, title: string, detail?: string, done?: boolean }} LogRow */

/** @param {LogRow} entry @returns {string} */
function entryName(entry) {
  if (!entry.player) return "";
  const p = playerById(entry.player);
  return p ? p.name : "";
}

/**
 * @param {LogRow} entry
 * @param {number} index
 * @returns {string}
 */
function entryMarkup(entry, index) {
  const who = entryName(entry);
  const meta = [entry.phase, who].filter(Boolean).join(" · ");
  return (
    '<li class="tbl-log__item' + (entry.done ? " is-done" : "") + '">' +
    '<button class="tbl-log__toggle" type="button" data-log-done="' + index + '"' +
    ' aria-pressed="' + Boolean(entry.done) + '"' +
    ' aria-label="Mark &quot;' + esc(entry.title) + '&quot; ' + (entry.done ? "not done" : "done") + '">' +
    '<i aria-hidden="true"></i></button>' +
    '<div class="tbl-log__body">' +
    '<p class="tbl-log__title">' + esc(entry.title) + "</p>" +
    (meta ? '<p class="tbl-log__meta">' + esc(meta) + "</p>" : "") +
    (entry.detail ? '<p class="tbl-log__detail">' + esc(entry.detail) + "</p>" : "") +
    "</div></li>"
  );
}

/**
 * @param {HTMLElement} root
 * @param {{ log: LogRow[] }} state
 * @returns {void}
 */
export function renderLog(root, state) {
  const entries = Array.isArray(state.log) ? state.log : [];

  root.innerHTML = entries.length
    ? '<ul class="tbl-log">' +
      entries.map((entry, index) => entryMarkup(entry, index)).join("") +
      "</ul>"
    : '<p class="tbl-muted">Nothing logged yet.</p>';

  if (root.dataset.logBound) return;
  root.dataset.logBound = "1";

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-log-done]");
    if (!(button instanceof HTMLElement)) return;
    const entry = state.log[Number(button.dataset.logDone)];
    if (!entry) return;
    entry.done = !entry.done;
    save();
    renderLog(root, state);
  });
}
