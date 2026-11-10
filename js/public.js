// @ts-check
import { go } from "./router.js";
import { esc } from "./ui.js";
import { state, subscribe } from "./store.js";
import { publicGameView } from "./model.js";
import { t } from "./strings.js";

/** @type {AbortController | null} */
let abort = null;

/** @param {ReturnType<typeof publicGameView>} view @returns {string} */
function phaseText(view) {
  if (view.phase === "night") return `${t("night")} ${view.night}`;
  if (view.phase === "day") return `${t("day")} ${view.day}`;
  if (view.phase === "over") return t("gameOver");
  return t("setup");
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  function render() {
    const view = publicGameView(state);
    root.innerHTML = `<div class="public">
      <header class="public-head">
        <div>
          <p class="label">${esc(t("publicScreen"))}</p>
          <h1>${esc(state.script ? state.script.name : "")}</h1>
          <p class="public-phase">${esc(phaseText(view))}</p>
        </div>
        <button class="btn" type="button" data-act="back">${esc(t("table"))}</button>
      </header>
      <main class="public-main">
        <div class="public-count">
          <b>${view.living}</b>
          <span>${esc(t("alive"))} / ${view.total}</span>
        </div>
        <section class="public-card">
          <span class="label">${esc(t("morning"))}</span>
          <h2>${view.deaths.length ? esc(t("died")) : esc(t("noDeaths"))}</h2>
          ${view.deaths.length ? `<p class="public-names">${view.deaths.map(esc).join(" · ")}</p>` : ""}
          <p class="public-note">${esc(t("publicHint"))}</p>
        </section>
        ${view.winner ? `<section class="public-card is-winner">
          <span class="label">${esc(t("winner"))}</span>
          <h2>${view.winner.team === "good" ? esc(t("winnerGood")) : esc(t("winnerEvil"))}</h2>
          <p class="public-note">${esc(t("publicHint"))}</p>
        </section>` : ""}
      </main>
    </div>`;
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("[data-act='back']")) return;
    if (window.confirm(t("playerWarning"))) go("/table");
  }, { signal });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && window.confirm(t("playerWarning"))) go("/table");
  }, { signal });

  const unsubscribe = subscribe(render);
  signal.addEventListener("abort", unsubscribe, { once: true });
  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
