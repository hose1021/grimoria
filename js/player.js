import { state, run } from "./store.js";
import { roleById, imageFor } from "./roles.js";
import { claimSeat } from "./engine.js";
import { go } from "./router.js";
import { t, teamText } from "./strings.js";

const HIDE_SECONDS = 45;
const TICK_MS = 100;

let abort = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function roleView(player) {
  const role = roleById(player.shownRoleId);
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
function publicView() {
  const players = state.order.map((id, index) => {
    const player = state.players[id];
    return {
      id,
      seat: index + 1,
      name: player.name,
      claimed: Boolean(player.claimed),
      hasRole: Boolean(player.shownRoleId),
      role: roleView(player)
    };
  });
  return {
    players,
    claimed: players.filter((player) => player.claimed).length,
    total: players.length
  };
}

export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  let view = "numbers";
  let seat = -1;
  let remaining = HIDE_SECONDS;
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
    render();
  }

  function startTimer() {
    stopTimer();
    remaining = HIDE_SECONDS;
    tick = setInterval(() => {
      remaining = Math.max(0, remaining - TICK_MS / 1000);
      const bar = root.querySelector(".player-timer span");
      const text = root.querySelector(".player-timer-text");
      if (bar) bar.style.transform = "scaleX(" + remaining / HIDE_SECONDS + ")";
      if (text) text.textContent = "Скроется через " + Math.ceil(remaining) + " с";
      if (remaining <= 0) hide();
    }, TICK_MS);
  }

  signal.addEventListener("abort", stopTimer);

  function header() {
    return `<header class="player-bar">
      <span class="player-tag">Ведущий · передача устройства</span>
      <button class="player-link" type="button" data-act="back">${esc(t("playerBack"))}</button>
    </header>`;
  }

  function renderSetup() {
    root.innerHTML = header() + `<section class="player-view player-view--numbers">
      <p class="label player-kicker">${esc(t("player"))}</p>
      <h1 class="player-title">${esc(t("noRoles"))}</h1>
      <p class="player-sub">${esc(t("setupIntro"))}</p>
      <a class="btn btn--accent player-setup-link" href="#/bag">${esc(t("setup"))}</a>
    </section>`;
  }

  function renderNumbers(publicData) {
    const open = publicData.players.filter((player) => !player.claimed && player.hasRole).length;
    const cells = publicData.players.map((player) => {
      if (player.claimed) {
        return `<button class="player-num" type="button" disabled aria-label="Номер ${player.seat}, ${esc(player.name)}">
          ${player.seat}<small>${esc(player.name)}</small></button>`;
      }
      if (!player.hasRole) {
        return `<button class="player-num" type="button" disabled aria-label="Номер ${player.seat}, нет роли">
          ${player.seat}<small>${esc(t("noRoles"))}</small></button>`;
      }
      return `<button class="player-num" type="button" data-seat="${player.seat - 1}"
        aria-label="Номер ${player.seat}, открыть">${player.seat}</button>`;
    }).join("");

    root.innerHTML = header() + `<section class="player-view player-view--numbers">
      <p class="label player-kicker">${esc(t("playerHandoff"))}</p>
      <h1 class="player-title">${esc(t("playerPick"))}</h1>
      <p class="player-sub">${esc(t("discussWarning"))} Нажмите номер только когда экран закрыт.</p>
      <div class="player-numbers">${cells}</div>
      <p class="player-hint">${open ? `${open} из ${publicData.total} номеров свободно.` : "Все номера заняты."}</p>
      ${open === 0 ? `<button class="btn btn--accent" type="button" data-act="to-seat">К настройке стола</button>` : ""}
      <p class="player-note">${esc(t("playerWarning"))}</p>
    </section>`;
  }

  function renderCover(publicData) {
    const player = publicData.players[seat];
    root.innerHTML = header() + `<section class="player-view player-view--numbers player-view--cover">
      <p class="label player-kicker">${esc(t("playerHandoff"))}</p>
      <h1 class="player-title">${esc(t("playerCover"))}</h1>
      <p class="player-sub">${esc(player.name)} · ${esc(t("playerPick"))}: ${player.seat}</p>
      <button class="btn btn--accent player-cover" type="button" data-act="reveal">${esc(t("playerReveal"))}</button>
      <button class="btn btn--quiet" type="button" data-act="cancel">${esc(t("cancel"))}</button>
    </section>`;
  }

  function renderRole(publicData) {
    const player = publicData.players[seat];
    const role = player.role;
    if (!role) {
      view = "numbers";
      render();
      return;
    }
    root.innerHTML = header() + `<section class="player-view player-view--role">
      <div class="player-clock">
        <div class="player-timer" aria-hidden="true"><span></span></div>
        <p class="player-timer-text">Скроется через ${Math.ceil(remaining)} с</p>
      </div>
      <article class="player-card">
        <p class="player-card-seat">Номер ${player.seat}</p>
        ${role.image ? `<div class="player-art"><img src="${esc(role.image)}" alt=""></div>` : ""}
        <h1 class="player-role-name">${esc(role.name)}</h1>
        <p class="player-team"><i class="player-dot player-dot--${esc(role.team)}"></i>${esc(role.teamLabel)}</p>
        <p class="player-ability">${esc(role.ability)}</p>
        <p class="player-note">${esc(t("playerWarning"))}</p>
      </article>
      <form class="player-nameform">
        <label class="label" for="player-name">${esc(t("playerName"))}</label>
        <input class="field" id="player-name" name="name" maxlength="24" autocomplete="off"
          placeholder="${esc(t("playerName"))}" value="${esc(player.name)}">
        <button class="btn btn--accent player-save" type="submit">${esc(t("playerSave"))}</button>
        <button class="btn btn--quiet" type="button" data-act="cancel">${esc(t("cancel"))}</button>
      </form>
    </section>`;
    startTimer();
  }

  function renderDone(publicData) {
    root.innerHTML = header() + `<section class="player-view player-view--numbers">
      <p class="label player-kicker">Скрыто</p>
      <h1 class="player-title">Передайте устройство дальше</h1>
      <p class="player-sub">Роль сохранена. Экран больше не показывает карточку.</p>
      ${publicData.claimed === publicData.total
        ? `<button class="btn btn--accent" type="button" data-act="to-seat">К настройке стола</button>`
        : `<button class="btn btn--accent" type="button" data-act="next">${esc(t("playerHandoff"))}</button>`}
      <button class="btn" type="button" data-act="back">${esc(t("playerBack"))}</button>
    </section>`;
  }

  function renderWarning() {
    const publicData = publicView();
    // Render the underlying screen first, then the warning as a modal.
    if (view === "numbers") renderNumbers(publicData);
    else if (view === "cover") renderCover(publicData);
    else if (view === "role") renderRole(publicData);
    else renderDone(publicData);
    const modal = document.createElement("div");
    modal.className = "player-warning-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `<div class="player-warning-box">
      <p class="label">${esc(t("warning"))}</p>
      <h2>${esc(t("backToTable"))}</h2>
      <p>${esc(t("playerWarning"))}</p>
      <div class="player-warning-actions">
        <button class="btn btn--accent" type="button" data-act="back-confirm">${esc(t("playerBack"))}</button>
        <button class="btn" type="button" data-act="back-cancel">${esc(t("cancel"))}</button>
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
    if (view === "cover") {
      renderCover(publicData);
      return;
    }
    if (view === "done") {
      renderDone(publicData);
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

    const seatButton = target.closest("[data-seat]");
    if (seatButton) {
      const index = Number(seatButton.dataset.seat);
      const publicData = publicView();
      const player = publicData.players[index];
      if (!player || player.claimed || !player.hasRole) return;
      seat = index;
      view = "cover";
      render();
      return;
    }

    const act = target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "reveal") {
      view = "role";
      render();
    } else if (act.dataset.act === "cancel") {
      hide();
    } else if (act.dataset.act === "next") {
      view = "numbers";
      seat = -1;
      render();
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
    const input = form.querySelector('input[name="name"]');
    const typed = input ? input.value.trim() : "";
    if (!typed) {
      window.alert("Введите имя.");
      if (input) input.focus();
      return;
    }
    const result = run((game) => claimSeat(game, player.id, typed));
    if (!result || result.ok === false) {
      window.alert((result && result.error) || t("notAvailable"));
      return;
    }
    stopTimer();
    view = "done";
    render();
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (warning) {
      warning = false;
      render();
      return;
    }
    if (view === "role" || view === "cover") hide();
  }, { signal });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (view === "role" || view === "cover")) hide();
  }, { signal });

  render();
}
