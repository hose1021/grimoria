// @ts-check
import { modalFocus } from "./ui.js";
import { esc } from "./ui.js";
import { state, dispatch } from "./store.js";
import { roleById, imageFor } from "./roles.js";
import { go, path } from "./router.js";
import { t, teamText } from "./strings.js";

/** @typedef {import("./types.d.ts").Player} Player */
/** @typedef {{ name: string, team: import("./types.d.ts").Team, teamLabel: string, ability: string, image: string }} RoleView */
/** @typedef {{ id: string, seat: number, name: string, claimed: boolean, hasRole: boolean, role: null }} PublicPlayer */
/** @typedef {{ players: PublicPlayer[], claimed: number, total: number }} PublicView */

const HIDE_SECONDS = 45;
const TICK_MS = 100;

// Styling is Tailwind only; `css/player.css` is gone. `!` marks the properties
// that an unlayered legacy global (`button { font: inherit; color: inherit }`)
// would otherwise win against while `css/app.css` still exists.
const BAR = "player-bar mx-auto flex w-[min(430px,100%)] items-center gap-2.5 px-[18px] pt-3 max-[560px]:flex-wrap max-[560px]:px-3.5";
const TAG = "player-tag rounded-[999px] border border-line px-2.5 py-[5px] text-[9.5px] font-[650] uppercase tracking-[0.14em] text-muted";
const LINK = "player-link ml-auto inline-flex min-h-11 items-center whitespace-nowrap border-0 bg-transparent px-0.5 py-0 text-[12px]! text-muted! no-underline hover:text-text! hover:underline hover:underline-offset-2";
const VIEW = "player-view mx-auto flex min-h-[calc(100dvh-56px)] w-[min(430px,100%)] flex-col justify-center gap-4 px-[18px] pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] max-[560px]:px-3.5 short:gap-3";
const VIEW_NUMBERS = `${VIEW} player-view--numbers justify-start pt-[18px]`;
const KICKER = "player-kicker m-0 text-[14px] font-[650] uppercase tracking-[0.13em] text-accent";
const TITLE = "player-title m-0 text-[clamp(26px,7vw,34px)] font-[650] leading-[1.1] tracking-[-0.03em]";
const SUB = "player-sub m-0 -mt-1.5 text-[13.5px] text-muted";
const NUMBERS = "player-numbers mt-0.5 grid grid-cols-4 gap-2";
const NUM = "player-num relative grid aspect-square min-h-11 place-items-center rounded-[14px] border border-line bg-panel text-[24px]! font-semibold! tabular-nums hover:not-disabled:border-line-2 hover:not-disabled:bg-panel-2 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:opacity-40";
const NUM_SMALL = "absolute inset-x-1 bottom-1.5 truncate text-[8.5px] font-medium text-muted";
const HINT = "player-hint m-0 text-center text-[11px] text-muted";
const NOTE = "player-note mb-0 mt-3 text-[10.5px] text-muted short:mt-[9px]";
const CARD_SEAT = "player-card-seat m-0 text-[9.5px] font-[650] uppercase tracking-[0.14em] text-muted";
const ART = "player-art mt-0.5 grid place-items-center";
const ART_IMG = "h-[176px] w-[176px] object-contain short:h-[140px] short:w-[140px]";
const ROLE_NAME = "player-role-name mb-0 mt-0.5 font-role text-[clamp(30px,10vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-player-role-text short:text-[30px]";
const TEAM = "player-team mb-0 mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-player-team-text";
const DOT = "player-dot inline-block h-1.5 w-1.5 rounded-[50%]";
const DOT_TEAM = /** @type {Record<string, string>} */ ({
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon"
});
const ABILITY = "player-ability mb-0 mt-3 text-[14px] leading-[1.55] text-player-ability-text short:mt-[9px] short:text-[13px]";
const CLOCK = "player-clock grid gap-1.5";
const TIMER = "player-timer h-[3px] overflow-hidden rounded-[3px] bg-timer-track";
const TIMER_BAR = "block h-full w-full origin-left bg-accent";
const TIMER_TEXT = "player-timer-text m-0 text-right text-[10.5px] text-muted tabular-nums";
const CARD = "player-card rounded-[18px] border border-player-card-border bg-[radial-gradient(80%_50%_at_50%_0%,var(--color-player-card-glow),transparent_65%),linear-gradient(180deg,var(--color-panel-2),var(--color-panel))] px-5 pt-4 pb-[18px] text-center animate-[player-reveal_.22s_ease-out_both] motion-reduce:animate-none";
const FORM = "player-nameform grid gap-[7px]";
const LABEL = "text-[14px] font-[650] uppercase tracking-[0.13em] text-muted";
const FIELD = "field min-h-11! px-3! py-2.5! text-[14px]!";
const BTN_BASE = "inline-flex items-center justify-center rounded-lg border no-underline";
const BTN = `${BTN_BASE} min-h-11 px-3 py-2 border-line-2 bg-panel-2 hover:bg-btn-hover`;
const BTN_ACCENT = `${BTN_BASE} min-h-11 px-3 py-2 border-btn-accent-border bg-accent-dim text-btn-accent-text! hover:bg-btn-accent-hover`;
const BTN_QUIET = `${BTN_BASE} min-h-11 px-3 py-2 border-transparent bg-transparent text-muted! hover:text-text!`;
const SETUP_LINK = `player-setup-link ${BTN_BASE} min-h-11 self-start border-btn-accent-border bg-accent-dim px-[18px] py-0 text-btn-accent-text! hover:bg-btn-accent-hover`;
const SAVE = `player-save ${BTN_BASE} min-h-12 border-btn-accent-border bg-accent-dim px-3 py-2 text-btn-accent-text! hover:bg-btn-accent-hover`;

/** @type {AbortController | null} */
let abort = null;

/** @param {Player} player @returns {RoleView | null} */
function roleView(player) {
  const role = roleById(player.shownRoleId || "");
  if (!role) return null;
  return {
    name: role.name,
    team: role.team,
    teamLabel: teamText(role.team),
    ability: role.ability || "",
    image: imageFor(role)
  };
}

// Public projection: no real role, no reminders, no effects, no bluffs.
/** @returns {PublicView} */
function publicView() {
  const gameState = /** @type {import("./types.d.ts").GameState} */ (state);
  const players = gameState.order.map((id, index) => {
    const player = gameState.players[id];
    return {
      id,
      seat: index + 1,
      name: player.name,
      claimed: Boolean(player.claimed),
      hasRole: Boolean(player.shownRoleId),
      role: null
    };
  });
  return {
    players,
    claimed: players.filter((player) => player.claimed).length,
    total: players.length
  };
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;
  modalFocus(root, signal);

  let view = "numbers";
  let seat = -1;
  let remaining = HIDE_SECONDS;
  /** @type {number | null} */
  let deadline = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let tick = null;
  let warning = false;

  function stopTimer() {
    if (tick !== null) {
      clearInterval(tick);
      tick = null;
    }
  }

  function hide() {
    stopTimer();
    view = "numbers";
    seat = -1;
    deadline = null;
    render();
  }

  function startTimer() {
    stopTimer();
    deadline ??= Date.now() + HIDE_SECONDS * 1000;
    const end = /** @type {number} */ (deadline);
    remaining = Math.max(0, (end - Date.now()) / 1000);
    tick = setInterval(() => {
      remaining = Math.max(0, (end - Date.now()) / 1000);
      const bar = /** @type {HTMLElement | null} */ (root.querySelector(".player-timer span"));
      const text = root.querySelector(".player-timer-text");
      if (bar) bar.style.transform = "scaleX(" + remaining / HIDE_SECONDS + ")";
      if (text) text.textContent = t("autoHide", { seconds: Math.ceil(remaining) });
      if (remaining <= 0) hide();
    }, TICK_MS);
  }

  signal.addEventListener("abort", stopTimer);

  function header() {
    return `<header class="${BAR}">
      <span class="${TAG}">${esc(t("hostHandoff"))}</span>
      <button class="${LINK}" type="button" data-act="back">${esc(t("playerBack"))}</button>
    </header>`;
  }

  function renderSetup() {
    root.innerHTML = header() + `<section class="${VIEW_NUMBERS}">
      <p class="${KICKER}">${esc(t("player"))}</p>
      <h1 class="${TITLE}">${esc(t("noRoles"))}</h1>
      <p class="${SUB}">${esc(t("setupIntro"))}</p>
      <a class="${SETUP_LINK}" href="${path("bag")}">${esc(t("setup"))}</a>
    </section>`;
  }

  /** @param {PublicView} publicData */
  function renderNumbers(publicData) {
    const open = publicData.players.filter((player) => !player.claimed && player.hasRole).length;
    const cells = publicData.players.map((player) => {
      if (player.claimed) {
        return `<button class="${NUM}" type="button" disabled aria-label="${esc(t("seatNumber", { seat: player.seat }))}, ${esc(player.name)}">
          ${player.seat}<small class="${NUM_SMALL}">${esc(player.name)}</small></button>`;
      }
      if (!player.hasRole) {
        return `<button class="${NUM}" type="button" disabled aria-label="${esc(t("seatNumber", { seat: player.seat }))}, ${esc(t("noRoles"))}">
          ${player.seat}<small class="${NUM_SMALL}">${esc(t("noRoles"))}</small></button>`;
      }
      return `<button class="${NUM}" type="button" data-seat="${player.seat - 1}"
        aria-label="${esc(t("seatNumber", { seat: player.seat }))}, ${esc(t("playerReveal"))}">${player.seat}</button>`;
    }).join("");

    root.innerHTML = header() + `<section class="${VIEW_NUMBERS}">
      <p class="${KICKER}">${esc(t("playerHandoff"))}</p>
      <h1 class="${TITLE}">${esc(t("playerPick"))}</h1>
      <p class="${SUB}">${esc(t("discussWarning"))} ${esc(t("openCovered"))}</p>
      <div class="${NUMBERS}">${cells}</div>
      <p class="${HINT}">${esc(open ? t("availableNumbers", { count: open, total: publicData.total }) : t("allClaimed"))}</p>
      ${open === 0 ? `<button class="${BTN_ACCENT}" type="button" data-act="to-seat">${esc(t("goSeats"))}</button>` : ""}
      <p class="${NOTE}">${esc(t("playerWarning"))}</p><p class="${NOTE}">${esc(t("abandonedClaim"))}</p>
    </section>`;
  }

  /** @param {PublicView} publicData */
  function renderRole(publicData) {
    const player = publicData.players[seat];
    const role = roleView(state.players[player.id]);
    if (!role) {
      view = "numbers";
      render();
      return;
    }
    root.innerHTML = header() + `<section class="${VIEW} player-view--role">
      <div class="${CLOCK}">
        <div class="${TIMER}" aria-hidden="true"><span class="${TIMER_BAR}"></span></div>
        <p class="${TIMER_TEXT}">${esc(t("autoHide", { seconds: Math.ceil(remaining) }))}</p>
      </div>
      <article class="${CARD}">
        <p class="${CARD_SEAT}">${esc(t("seatNumber", { seat: player.seat }))}</p>
        ${role.image ? `<div class="${ART}"><img class="${ART_IMG}" src="${esc(role.image)}" alt=""></div>` : ""}
        <h1 class="${ROLE_NAME}">${esc(role.name)}</h1>
        <p class="${TEAM}"><i class="${DOT} player-dot--${esc(role.team)} ${DOT_TEAM[role.team] || ""}"></i>${esc(role.teamLabel)}</p>
        <p class="${ABILITY}">${esc(role.ability)}</p>
        <p class="${NOTE}">${esc(t("playerWarning"))}</p>
      </article>
      <form class="${FORM}">
        <label class="${LABEL}" for="player-name">${esc(t("playerName"))}</label>
        <input class="${FIELD}" id="player-name" name="name" maxlength="24" autocomplete="off"
          placeholder="${esc(t("playerName"))}" value="${esc(player.name)}">
        <button class="${SAVE}" type="submit">${esc(t("playerSave"))}</button>
        <button class="${BTN_QUIET}" type="button" data-act="cancel">${esc(t("cancel"))}</button>
      </form>
    </section>`;
    startTimer();
  }

  function renderWarning() {
    const publicData = publicView();
    // Render the underlying screen first, then the warning as a modal.
    if (view === "role") renderRole(publicData);
    else renderNumbers(publicData);
    const modal = document.createElement("div");
    modal.className = "player-warning-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", t("backToTable"));
    modal.innerHTML = `<div class="player-warning-box">
      <p class="label">${esc(t("warning"))}</p>
      <h2>${esc(t("backToTable"))}</h2>
      <p>${esc(t("playerWarning"))}</p>
      <div class="player-warning-actions">
        <button class="${BTN_ACCENT}" type="button" data-act="back-confirm">${esc(t("playerBack"))}</button>
        <button class="${BTN}" type="button" data-act="back-cancel">${esc(t("cancel"))}</button>
      </div>
    </div>`;
    root.append(modal);
  }

  function render() {
    const publicData = publicView();
    if (!publicData.players.some((player) => player.hasRole)) {
      stopTimer();
      renderSetup();
      return;
    }
    if (view === "role") {
      renderRole(publicData);
      return;
    }
    stopTimer();
    renderNumbers(publicData);
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.matches("[data-act='back-confirm']")) {
      stopTimer();
      go("/table");
      return;
    }
    if (target.matches("[data-act='back-cancel']")) {
      warning = false;
      render();
      return;
    }

    const seatButton = /** @type {HTMLElement | null} */ (target.closest("[data-seat]"));
    if (seatButton) {
      const index = Number(seatButton.dataset.seat);
      const publicData = publicView();
      const player = publicData.players[index];
      if (!player || player.claimed || !player.hasRole) return;
      seat = index;
      deadline = Date.now() + HIDE_SECONDS * 1000;
      view = "role";
      render();
      return;
    }

    const act = /** @type {HTMLElement | null} */ (target.closest("[data-act]"));
    if (!act) return;
    if (act.dataset.act === "cancel") {
      hide();
    } else if (act.dataset.act === "to-seat") {
      stopTimer();
      go("/seat");
    } else if (act.dataset.act === "back") {
      warning = true;
      renderWarning();
    }
  }, { signal });

  root.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains("player-nameform")) return;
    event.preventDefault();
    const publicData = publicView();
    const player = publicData.players[seat];
    if (!player) {
      hide();
      return;
    }
    const input = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="name"]'));
    const typed = input ? input.value.trim() : "";
    if (!typed) {
      window.alert(t("enterName"));
      if (input) input.focus();
      return;
    }
    // dispatch assigns the command id itself when none is supplied.
    const result = dispatch(/** @type {import("./types.d.ts").Command} */ (/** @type {unknown} */ ({
      type: "claimSeat",
      payload: { playerId: player.id, name: typed }
    })));
    if (result.status !== "allowed") {
      window.alert(result.reason || t("notAvailable"));
      return;
    }
    hide();
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (warning) {
      warning = false;
      render();
      return;
    }
    if (view === "role") hide();
  }, { signal });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && view === "role") hide();
  }, { signal });

  window.addEventListener("pagehide", hide, { signal });
  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
