import { state, save, run } from "./store.js";
import { TB, roleById, imageFor } from "./roles.js";
import {
  COMPOSITION, RECOMMENDED, TEAMS, bagCounts, compositionFor, isGoodRole,
  randomBag, requiredBluffs, roleLabel, roleTeam, teamLabel
} from "./rules.js";
import { dealGame, setupErrors } from "./engine.js";
import { setRoster } from "./model.js";
import { go } from "./router.js";
import { t } from "./strings.js";

const MIN = 5;
const MAX = 15;
let abort = null;
let armed = false;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function roleOf(id) {
  return roleById(id) || {
    id,
    name: roleLabel(id),
    team: roleTeam(id),
    ability: "",
    image: null
  };
}

function hasGame() {
  return state.phase !== "setup" && Object.values(state.players).some((p) => p.roleId);
}

export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  const roles = TB.filter((role) => TEAMS.includes(role.team));
  const byTeam = (team) => roles.filter((role) => role.team === team);
  const roleById = (id) => roles.find((role) => role.id === id) || null;
  const unused = () => roles.filter((role) => !state.setup.roles.includes(role.id));
  const unusedGood = () => unused().filter((role) => role.team === "townsfolk" || role.team === "outsider");
  const unusedTownsfolk = () => unused().filter((role) => role.team === "townsfolk");

  function ensureDrunk() {
    if (!state.setup.roles.includes("drunk")) {
      state.setup.drunkShownId = null;
      return;
    }
    const current = state.setup.drunkShownId ? roleById(state.setup.drunkShownId) : null;
    if (!current || current.team !== "townsfolk" || state.setup.roles.includes(current.id)) {
      const options = unusedTownsfolk();
      state.setup.drunkShownId = options.length ? options[0].id : null;
    }
  }

  function ensureBluffs() {
    const needed = requiredBluffs(state.setup.count);
    if (!needed) {
      state.setup.bluffs = [];
      return;
    }
    const seen = new Set();
    const source = Array.isArray(state.setup.bluffs) ? state.setup.bluffs : [];
    state.setup.bluffs = source.filter((id) => {
      if (!id || seen.has(id) || state.setup.roles.includes(id) || id === state.setup.drunkShownId) return false;
      seen.add(id);
      return true;
    }).slice(0, 3);
  }
  function beginSetup() {
    if (state.phase === "setup") return true;
    if (!window.confirm("Изменение мешка начнёт новую раздачу. Текущая партия будет сброшена.")) {
      return false;
    }
    setRoster(state, state.setup.count);
    state.phase = "setup";
    return true;
  }

  function refresh() {
    ensureDrunk();
    ensureBluffs();
    render();
    save();
  }

  function applyBag(bag) {
    if (!beginSetup()) return;
    state.setup.roles = bag.roles.slice();
    state.setup.drunkShownId = bag.drunkShownId || null;
    state.setup.bluffs = (bag.bluffs || []).slice();
    ensureDrunk();
    ensureBluffs();
    armed = false;
    refresh();
  }

  function setCount(next) {
    if (next < MIN || next > MAX) return;
    if (hasGame() && !window.confirm("Изменить число игроков? Текущая раздача и секреты сбросятся.")) {
      return;
    }
    setRoster(state, next);
    state.phase = "setup";
    applyBag(randomBag(next));
    save();
  }

  function toggleRole(id) {
    if (!beginSetup()) return;
    const at = state.setup.roles.indexOf(id);
    if (at === -1) state.setup.roles.push(id);
    else state.setup.roles.splice(at, 1);
    armed = false;
    refresh();
  }

  function roleCard(role) {
    const selected = state.setup.roles.includes(role.id);
    return `
      <button class="bag-role ${selected ? "is-on" : "is-off"}" type="button"
        data-role="${esc(role.id)}" data-team="${esc(role.team)}"
        aria-pressed="${selected}">
        <img src="${esc(imageFor(role))}" alt="">
        <span class="bag-role-text">
          <b>${esc(role.name)}</b>
          <span>${esc(role.ability || "")}</span>
        </span>
      </button>`;
  }

  function compositionMarkup() {
    const req = compositionFor(state.setup.count, state.setup.roles) || {
      townsfolk: 0, outsider: 0, minion: 0, demon: 0
    };
    const got = bagCounts(state.setup.roles);
    return TEAMS.map((team) => {
      const ok = got[team] === req[team];
      return `<span class="bag-count-chip ${ok ? "is-ok" : "is-bad"}">
        <i class="bag-dot bag-dot--${team}" aria-hidden="true"></i>
        ${esc(teamLabel(team))}
        <b>${got[team]}/${req[team]}</b>
      </span>`;
    }).join("");
  }

  function statusMarkup() {
    const errors = setupErrors(state);
    if (!errors.length) {
      return `<p class="bag-status is-ok" role="status">${esc(t("legal"))} ${esc(t("legalRandom"))}</p>`;
    }
    return `<div class="bag-status is-bad" role="status">
      <b>${esc(t("illegal"))}</b>
      <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
    </div>`;
  }

  function bluffsMarkup() {
    if (!requiredBluffs(state.setup.count)) {
      return `<p class="bag-note">${esc(t("noBluffs"))}</p>`;
    }
    const options = unusedGood().filter((role) => (
      role.id !== state.setup.drunkShownId && !state.setup.bluffs.includes(role.id)
    ));
    return `
      <div class="bag-bluff-slots" aria-label="${esc(t("bluffs"))}">
        ${[0, 1, 2].map((index) => {
          const role = roleById(state.setup.bluffs[index]);
          return `<button class="bag-bluff-slot${role ? " is-on" : ""}" type="button"
            data-bluff-slot="${index}" aria-label="${esc(t("bluffs"))} ${index + 1}">
            ${role
              ? `<img src="${esc(imageFor(role))}" alt=""><b>${esc(role.name)}</b>`
              : `<span class="bag-bluff-empty">Пусто</span>`}
          </button>`;
        }).join("")}
      </div>
      <div class="bag-bluff-pool" aria-label="Доступные блефы">
        ${options.map((role) => `
          <button class="bag-bluff-token" type="button" data-bluff-role="${esc(role.id)}"
            aria-label="${esc(role.name)}" ${state.setup.bluffs.length >= 3 ? "disabled" : ""}>
            <img src="${esc(imageFor(role))}" alt="">
            <span>${esc(role.name)}</span>
          </button>`).join("") || `<p class="bag-note">${esc(t("none"))}</p>`}
      </div>
      <p class="bag-note">${esc(t("chooseBluffs"))} ${esc(t("drunkWarning"))}</p>`;
  }

  function drunkMarkup() {
    if (!state.setup.roles.includes("drunk")) return "";
    const options = unusedTownsfolk();
    return `
      <div class="bag-secret-row">
        <span class="label">${esc(t("drunkShown"))}</span>
        <div class="bag-drunk-pool">
          ${options.map((role) => `
            <button class="bag-bluff-token ${state.setup.drunkShownId === role.id ? "is-on" : ""}"
              type="button" data-drunk-role="${esc(role.id)}" aria-pressed="${state.setup.drunkShownId === role.id}">
              <img src="${esc(imageFor(role))}" alt="">
              <span>${esc(role.name)}</span>
            </button>`).join("")}
        </div>
      </div>`;
  }

  function recommendedMarkup() {
    return `
      <div class="bag-recommend">
        ${[7, 10, 12].map((size) => `
          <button class="bag-recommend-btn" type="button" data-recommended="${size}">
            <b>${size} ${esc(t("players"))}</b>
            <span>${esc(RECOMMENDED[size].note)}</span>
          </button>`).join("")}
      </div>`;
  }

  function render() {
    const count = state.setup.count;
    const dealt = hasGame();
    const legal = setupErrors(state).length === 0;
    root.innerHTML = `
      <div class="setup">
        <header class="setup-head">
          <div class="setup-brand">
            <span class="setup-mark" aria-hidden="true">PG</span>
            <div>
              <b>${esc(t("setupTitle"))}</b>
              <small>Trouble Brewing · ${count} ${esc(t("players"))}</small>
            </div>
          </div>
          <nav class="setup-nav" aria-label="${esc(t("setup"))}">
            <a class="btn" href="#/table">${esc(t("table"))}</a>
            <a class="btn" href="#/seat">${esc(t("seats"))}</a>
            <a class="btn" href="#/help">${esc(t("help"))}</a>
          </nav>
        </header>

        ${dealt ? `<div class="setup-banner">
          <b>${esc(t("warning"))}:</b> ${esc(t("dealAgain"))} — ${esc(t("newGame"))}. ${esc(t("discussWarning"))}
        </div>` : ""}
        ${state.storageError ? `<div class="setup-banner is-error">${esc(t("storageError"))}: ${esc(state.storageError)}</div>` : ""}

        <main class="setup-shell">
          <section class="setup-block">
            <div class="setup-block-head">
              <div>
                <span class="label">01</span>
                <h1>${esc(t("setupIntro"))}</h1>
              </div>
              <div class="setup-count">
                <button class="setup-step" type="button" data-count="-1" aria-label="Меньше игроков">−</button>
                <b>${count}</b>
                <button class="setup-step" type="button" data-count="1" aria-label="Больше игроков">+</button>
              </div>
            </div>
            <div class="setup-composition">${compositionMarkup()}</div>
            <div class="setup-actions">
              <button class="btn" type="button" data-act="random">${esc(t("randomBag"))}</button>
              <button class="btn" type="button" data-act="clear">${esc(t("clearBag"))}</button>
              <a class="btn" href="#/help">${esc(t("help"))}</a>
            </div>
            <div class="setup-table" aria-label="${esc(t("composition"))}">
              ${[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((size) => {
                const base = COMPOSITION[size];
                return `<span class="${size === count ? "is-current" : ""}">
                  <b>${size}</b><span>${base.join(" / ")}</span>
                </span>`;
              }).join("")}
            </div>
            <p class="setup-hint">${esc(t("legalRandom"))}</p>
            ${recommendedMarkup()}
          </section>

          <section class="setup-block">
            <div class="setup-block-head">
              <div><span class="label">02</span><h2>${esc(t("composition"))}</h2></div>
              ${statusMarkup()}
            </div>
            <div class="setup-groups">
              ${TEAMS.map((team) => `
                <section class="setup-group">
                  <div class="setup-group-head">
                    <h3><i class="bag-dot bag-dot--${team}" aria-hidden="true"></i>${esc(teamLabel(team))}</h3>
                    <span class="bag-team-count">${bagCounts(state.setup.roles)[team]} / ${compositionFor(count, state.setup.roles)[team]}</span>
                  </div>
                  <div class="bag-cards">${byTeam(team).map(roleCard).join("")}</div>
                </section>`).join("")}
            </div>
          </section>

          <section class="setup-block">
            <div class="setup-block-head">
              <div><span class="label">03</span><h2>${esc(t("bluffs"))}${state.setup.roles.includes("drunk") ? " · " + esc(t("drunkShown")) : ""}</h2></div>
            </div>
            <div class="setup-secrets">
              ${drunkMarkup()}
              ${bluffsMarkup()}
            </div>
          </section>

          <section class="setup-block setup-final">
            <div class="setup-block-head">
              <div><span class="label">04</span><h2>${esc(t("ready"))}</h2></div>
            </div>
            ${statusMarkup()}
            <div class="setup-final-actions">
              <button class="btn btn--accent setup-deal" type="button" data-act="deal" ${legal ? "" : "disabled"}>
                ${esc(armed ? t("confirm") : (dealt ? t("dealAgain") : t("deal")))}
              </button>
              <a class="btn" href="#/table">${esc(t("table"))}</a>
            </div>
            <p class="setup-hint">${esc(t("discussWarning"))}</p>
          </section>
        </main>
      </div>`;
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const roleButton = target.closest("[data-role]");
    if (roleButton) {
      toggleRole(roleButton.dataset.role);
      return;
    }

    const countButton = target.closest("[data-count]");
    if (countButton) {
      setCount(state.setup.count + Number(countButton.dataset.count));
      return;
    }

    const bluffRole = target.closest("[data-bluff-role]");
    if (bluffRole) {
      if (!beginSetup()) return;
      const id = bluffRole.dataset.bluffRole;
      const at = state.setup.bluffs.indexOf(id);
      if (at !== -1) state.setup.bluffs.splice(at, 1);
      else {
        if (state.setup.bluffs.length >= 3) return;
        state.setup.bluffs.push(id);
      }
      ensureBluffs();
      refresh();
      return;
    }

    const bluffSlot = target.closest("[data-bluff-slot]");
    if (bluffSlot) {
      if (!beginSetup()) return;
      state.setup.bluffs.splice(Number(bluffSlot.dataset.bluffSlot), 1);
      ensureBluffs();
      refresh();
      return;
    }

    const drunkRole = target.closest("[data-drunk-role]");
    if (drunkRole) {
      if (!beginSetup()) return;
      state.setup.drunkShownId = drunkRole.dataset.drunkRole;
      ensureBluffs();
      refresh();
      return;
    }

    const recommend = target.closest("[data-recommended]");
    if (recommend) {
      const size = Number(recommend.dataset.recommended);
      const preset = RECOMMENDED[size];
      if (!preset) return;
      if (hasGame() && !window.confirm("Взять новый набор? Текущая раздача сбросится.")) return;
      setRoster(state, size);
      state.phase = "setup";
      state.setup.roles = preset.roles.slice();
      state.setup.bluffs = preset.bluffs.slice();
      state.setup.drunkShownId = preset.drunkShownId || null;
      armed = false;
      refresh();
      return;
    }

    const act = target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "random") {
      applyBag(randomBag(state.setup.count));
    } else if (act.dataset.act === "clear") {
      if (!beginSetup()) return;
      state.setup.roles = [];
      state.setup.bluffs = [];
      state.setup.drunkShownId = null;
      armed = false;
      refresh();
    } else if (act.dataset.act === "deal") {
      if (setupErrors(state).length) return;
      if (!armed && hasGame()) {
        armed = true;
        render();
        return;
      }
      const result = run((game) => dealGame(game));
      if (!result || result.ok === false) {
        const errors = (result && result.errors) || [];
        window.alert(errors.map((error) => error.message).join("\n") || (result && result.error) || t("illegal"));
        return;
      }
      go("/player");
    }
  }, { signal });

  if (!state.setup.roles.length) {
    applyBag(randomBag(state.setup.count));
  } else {
    ensureDrunk();
    ensureBluffs();
    render();
  }
}
