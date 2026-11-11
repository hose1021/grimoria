// @ts-check
import { esc } from "./ui.js";
import { state as storeState, dispatch } from "./store.js";
import { roleById, imageFor } from "./roles.js";
import {
  ALL_ROLES,
  ROLE_REMINDERS_RU,
  isBmrScript,
  isSnvScript,
  roleLabel,
  roleTeam,
} from "./rules.js";
import { secretsErrors } from "./engine.js";
import { go, path } from "./router.js";
import { t, teamText } from "./strings.js";

/** @typedef {import("./types.js").Command} Command */
/** @typedef {import("./types.js").Player} Player */
/** @typedef {import("./types.js").RoleId} RoleId */
/** @typedef {{ id: RoleId, name: string, team: import("./types.js").Team | null, ability?: string }} SecretRole */

/** @type {import("./types.js").GameState} */
const state = storeState;

// The store fills in a command id when the caller omits it.
/** @type {(command: Omit<Command, "id">) => any} */
const send = /** @type {any} */ (dispatch);

/** @type {AbortController | null} */
let abort = null;

function startNightCommand() {
  const result = send({ type: "startNight" });
  if (result.status !== "allowed") {
    const message = result.errors
      ? result.errors.map((/** @type {any} */ error) => error.message || error).join("\n")
      : result.reason || t("setupErrors");
    window.alert(message);
    return false;
  }
  go("/table");
  return true;
}

/** @param {Player | null | undefined} player @returns {string} */
function displayName(player) {
  if (!player) return "—";
  return player.name || t("ui.player") + " " + player.seat;
}

/** @param {RoleId | null | undefined} id @returns {SecretRole} */
function roleOf(id) {
  return (
    roleById(id ?? "") || /** @type {SecretRole} */ ({
      id,
      name: roleLabel(id ?? ""),
      team: roleTeam(id ?? ""),
      ability: "",
    })
  );
}

/** @type {Array<[RoleId, import("./types.js").Team]>} */
const INFO_ROLES = [
  ["washerwoman", "townsfolk"],
  ["librarian", "outsider"],
  ["investigator", "minion"],
];

/** @param {HTMLElement} root */
function renderSnvSecrets(root) {
  const errors = secretsErrors(state);
  /** @param {RoleId} roleId @returns {boolean} */
  const has = (roleId) => (state.setup.roles || []).includes(roleId);
  const twin = state.setup.evilTwinGoodId ? roleLabel(state.setup.evilTwinGoodId) : null;
  root.innerHTML = `
    <section class="host-card">
      <p class="label">${esc(t("secrets"))}</p>
      <h1>${esc(t("svSecretsTitle"))}</h1>
      <p class="host-muted">${esc(t("svSecretsHint"))}</p>
      <div class="host-alert bmr-warning">
        <b>${esc(t("bmrHostWarningTitle"))}</b>
        <p>${esc(t("svHostWarning"))}</p>
      </div>
      <div class="host-section">
        <span class="label">${esc(t("evilTwinGood"))}</span>
        <p>${has("eviltwin") ? esc(twin || "—") : esc(t("none"))}</p>
      </div>
      ${
        errors.length
          ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
      </div>`
          : `<p class="host-muted">${esc(t("svSecretsReady"))}</p>`
      }
      <div class="host-actions">
        <a class="btn" href="${path("bag")}">${esc(t("setup"))}</a>
        <button class="btn btn--accent" type="button" data-act="sv-start" ${errors.length ? "disabled" : ""}>
          ${esc(t("startFirstNight"))}
        </button>
      </div>
    </section>`;
  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("[data-act='sv-start']");
      if (!button) return;
      startNightCommand();
    },
    { signal: abort?.signal },
  );
}

/** @param {HTMLElement} root */
function renderBmrSecrets(root) {
  const errors = secretsErrors(state);
  /** @param {RoleId} roleId @returns {boolean} */
  const has = (roleId) => (state.setup.roles || []).includes(roleId);
  const lunatic = state.setup.lunaticShownId ? roleLabel(state.setup.lunaticShownId) : null;
  root.innerHTML = `
    <section class="host-card">
      <p class="label">${esc(t("secrets"))}</p>
      <h1>${esc(t("bmrSecretsTitle"))}</h1>
      <p class="host-muted">${esc(t("bmrSecretsHint"))}</p>
      <div class="host-alert bmr-warning">
        <b>${esc(t("bmrHostWarningTitle"))}</b>
        <p>${esc(t("bmrHostWarning"))}</p>
      </div>
      <div class="host-section">
        <span class="label">${esc(t("bmrGodfather"))}</span>
        <p>${
          has("godfather")
            ? state.setup.godfatherOutsider === -1
              ? esc(t("godfatherMinus"))
              : esc(t("godfatherPlus"))
            : esc(t("none"))
        }</p>
      </div>
      <div class="host-section">
        <span class="label">${esc(t("lunaticShown"))}</span>
        <p>${has("lunatic") ? esc(lunatic || roleLabel("po")) : esc(t("none"))}</p>
      </div>
      ${
        errors.length
          ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
      </div>`
          : `<p class="host-muted">${esc(t("bmrSecretsReady"))}</p>`
      }
      <div class="host-actions">
        <a class="btn" href="${path("bag")}">${esc(t("setup"))}</a>
        <button class="btn btn--accent" type="button" data-act="bmr-start" ${errors.length ? "disabled" : ""}>
          ${esc(t("startFirstNight"))}
        </button>
      </div>
    </section>`;
  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("[data-act='bmr-start']");
      if (!button) return;
      startNightCommand();
    },
    { signal: abort?.signal },
  );
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  const players = state.order
    .map((id) => state.players[id])
    .filter((player) => player && player.roleId);

  if (isBmrScript(state.script)) {
    renderBmrSecrets(root);
    return;
  }

  if (isSnvScript(state.script)) {
    renderSnvSecrets(root);
    return;
  }

  if (!players.length) {
    root.innerHTML = `
      <div class="secrets-empty">
        <p class="label">${esc(t("secrets"))}</p>
        <h1>${esc(t("noRoles"))}</h1>
        <a class="btn btn--accent" href="${path("bag")}">${esc(t("setup"))}</a>
      </div>`;
    return;
  }

  /** @param {RoleId} roleId @returns {boolean} */
  const realHas = (roleId) => players.some((player) => player.roleId === roleId);

  /** @param {string} name @param {string | undefined} value @param {string} label @returns {string} */
  function playerSelect(name, value, label) {
    return `
      <label class="secrets-field">
        <span class="label">${esc(label)}</span>
        <select class="field" data-player="${esc(name)}">
          <option value="">${esc(t("ui.choosePlayer"))}</option>
          ${players
            .map(
              (player) => `
            <option value="${esc(player.id)}"${value === player.id ? " selected" : ""}>
              ${esc(displayName(player))} (${player.seat}) · ${esc(roleOf(player.roleId).name)}
            </option>`,
            )
            .join("")}
        </select>
      </label>`;
  }

  /** @param {RoleId} roleId @param {import("./types.js").Team | null} team @param {string} label @param {boolean} [forDrunk] @returns {string} */
  function infoEditor(roleId, team, label, forDrunk = false) {
    if (!forDrunk && !realHas(roleId)) return "";
    const info = /** @type {any} */ (
      state.setup.info[roleId] || { roleId: "", pair: ["", ""], forDrunk }
    );
    const roleOptions = (
      forDrunk
        ? ALL_ROLES.filter((id) => roleTeam(id) === team)
        : players
            .filter((player) => roleTeam(player.roleId || "") === team)
            .map((player) => player.roleId)
    )
      .map((roleIdValue) => {
        const role = roleOf(roleIdValue);
        return `<option value="${esc(roleIdValue)}"${info.roleId === roleIdValue ? " selected" : ""}>
        ${esc(role.name)}
      </option>`;
      })
      .join("");
    const zero =
      !forDrunk &&
      roleId === "librarian" &&
      !players.some((player) => roleTeam(player.roleId || "") === "outsider");
    return `
      <div class="secrets-info">
        <div class="secrets-info-head">
          <h3>${esc(label)}</h3>
          <span class="secrets-tag">${forDrunk ? t("ui.drunk") : esc(t("infoPair"))}</span>
        </div>
        ${
          zero
            ? `
          <p class="secrets-note">${esc(t("zeroOutsiders"))}.</p>`
            : `
          <div class="secrets-grid">
            <label class="secrets-field">
              <span class="label">${esc(t("roleInPlay"))}</span>
              <select class="field" data-info-role="${esc(roleId)}">
                <option value="">${esc(t("ui.chooseRole"))}</option>
                ${roleOptions}
              </select>
            </label>
            ${playerSelect("pair-a-" + roleId, info.pair && info.pair[0], t("ui.player1"))}
            ${playerSelect("pair-b-" + roleId, info.pair && info.pair[1], t("ui.player2"))}
          </div>`
        }
      </div>`;
  }

  function drunkInfoEditor() {
    const drunk = players.find((player) => player.roleId === "drunk");
    const mask = drunk ? drunk.shownRoleId : null;
    if (!mask || !INFO_ROLES.some(([id]) => id === mask)) return "";
    const team =
      mask === "washerwoman" ? "townsfolk" : mask === "librarian" ? "outsider" : "minion";
    return infoEditor(mask, team, `${t("ui.drunk")}: ${roleOf(mask).name}`, true);
  }

  function herringEditor() {
    if (!realHas("fortuneteller")) return "";
    // The red herring may be any good player, including the Fortune Teller.
    const good = players.filter(
      (player) =>
        roleTeam(player.roleId || "") !== "minion" && roleTeam(player.roleId || "") !== "demon",
    );
    return `
      <div class="secrets-info">
        <div class="secrets-info-head">
          <h3>${esc(t("herring"))}</h3>
          <span class="secrets-tag">${esc(t("forced"))}</span>
        </div>
        <div class="secrets-grid">
          <label class="secrets-field">
            <span class="label">${esc(t("herring"))}</span>
            <select class="field" data-herring>
              <option value="">${esc(t("ui.choosePlayer"))}</option>
              ${good
                .map(
                  (
                    player,
                  ) => `<option value="${esc(player.id)}"${state.setup.herringId === player.id ? " selected" : ""}>
                ${esc(displayName(player))} · ${esc(roleOf(player.roleId).name)}
              </option>`,
                )
                .join("")}
            </select>
          </label>
        </div>
        <p class="secrets-note">${esc(t("ui.permanentHerring"))}</p>
      </div>`;
  }

  function rosterMarkup() {
    return players
      .map((player) => {
        const role = roleOf(player.roleId);
        const shown =
          player.shownRoleId && player.shownRoleId !== player.roleId
            ? roleOf(player.shownRoleId)
            : null;
        return `
        <div class="secrets-player">
          <span class="secrets-seat">${player.seat}</span>
          ${imageFor(/** @type {import("./types.js").Role} */ (role)) ? `<img src="${esc(imageFor(/** @type {import("./types.js").Role} */ (role)))}" alt="">` : ""}
          <span class="secrets-player-body">
            <b>${esc(displayName(player))}</b>
            <span>${esc(role.name)} · ${esc(teamText(role.team || ""))}</span>
            ${shown ? `<span class="secrets-shown">${esc(t("shownRole"))}: ${esc(shown.name)}</span>` : ""}
          </span>
        </div>`;
      })
      .join("");
  }

  function reminderMarkup() {
    const seen = new Set();
    return state.setup.roles
      .map((roleId) => {
        if (seen.has(roleId)) return "";
        seen.add(roleId);
        const role = roleOf(roleId);
        const tokens = ROLE_REMINDERS_RU[roleId] || [];
        if (!tokens.length) return "";
        return `<li><b>${esc(role.name)}</b><span>${tokens.map(esc).join(" · ")}</span></li>`;
      })
      .join("");
  }

  function errorMarkup() {
    const errors = secretsErrors(state);
    if (!errors.length) {
      return `<p class="secrets-status is-ok">${esc(t("legal"))}</p>`;
    }
    return `<div class="secrets-status is-bad"><b>${esc(t("setupErrors"))}</b>
      <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul></div>`;
  }

  function render() {
    const errors = secretsErrors(state);
    const claimed = players.filter((player) => player.claimed).length;
    const everyoneNamed = claimed === players.length;
    const seated = state.phase === "seat";
    root.innerHTML = `
      <div class="secrets">
        <header class="secrets-head">
          <div>
            <p class="label">${esc(t("secrets"))}</p>
            <h1>${esc(t("secretsTitle"))}</h1>
            <p class="secrets-intro">${esc(t("secretsIntro"))}</p>
          </div>
          <nav class="secrets-nav">
            <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
            <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
          </nav>
        </header>

        ${errorMarkup()}

        <main class="secrets-shell">
          <section class="secrets-block">
            <div class="secrets-block-head">
              <h2>${esc(t("infoRoles"))}</h2>
              <span class="label">${esc(t("ui.manualPairs"))}</span>
            </div>
            ${INFO_ROLES.map(([roleId, team]) => infoEditor(roleId, team, roleOf(roleId).name)).join("")}
            ${drunkInfoEditor()}
            ${herringEditor()}
          </section>

          <section class="secrets-block">
            <h2>${esc(t("remindersToPlace"))}</h2>
            <ul class="secrets-reminders">${reminderMarkup()}</ul>
          </section>

          <section class="secrets-block">
            <h2>${esc(t("rolesReview"))}</h2>
            <p class="secrets-note">${esc(t("warning"))}: ${esc(t("discussWarning"))}</p>
            <div class="secrets-roster">${rosterMarkup()}</div>
          </section>
        </main>

        <div class="secrets-dock">
          <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
          ${
            !everyoneNamed
              ? `<a class="btn btn--accent" href="${path("player")}">${esc(t("ui.namesFirst"))}</a>`
              : !seated
                ? `<a class="btn btn--accent" href="${path("seat")}">${esc(t("ui.seats"))}</a>`
                : `<button class="btn btn--accent" type="button" data-act="start" ${errors.length ? "disabled" : ""}>
                  ${esc(t("startFirstNight"))}
                </button>`
          }
        </div>
      </div>`;
  }

  /** @param {RoleId} roleId @param {Record<string, any>} patch */
  function updateInfo(roleId, patch) {
    const drunk = players.find((player) => player.roleId === "drunk");
    const drunkMask = drunk ? drunk.shownRoleId : null;
    send({
      type: "setSetupInfo",
      payload: {
        roleId,
        info: { ...patch, ...(roleId === drunkMask ? { forDrunk: true } : {}) },
      },
    });
    render();
  }

  root.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;

      if (target.matches("[data-herring]")) {
        send({ type: "setHerring", payload: { playerId: target.value || null } });
        render();
        return;
      }

      if (target.matches("[data-info-role]")) {
        const roleId = target.dataset.infoRole;
        if (!roleId) return;
        const info = /** @type {any} */ (state.setup.info[roleId] || {});
        updateInfo(roleId, { roleId: target.value, pair: info.pair || ["", ""] });
        return;
      }

      if (target.matches("[data-player]")) {
        const name = target.dataset.player;
        if (!name) return;
        const parts = name.split("-");
        if (parts[0] !== "pair") return;
        const roleId = parts.slice(2).join("-");
        const index = parts[1] === "a" ? 0 : 1;
        const info = /** @type {any} */ (state.setup.info[roleId] || { pair: [null, null] });
        const pair = (info.pair || [null, null]).slice();
        pair[index] = target.value;
        updateInfo(roleId, { pair });
      }
    },
    { signal },
  );

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = /** @type {HTMLElement | null} */ (target.closest("[data-act]"));
      if (!button) return;
      if (button.dataset.act === "start") {
        const everyoneNamed = players.every((player) => player.claimed);
        if (state.phase !== "seat" || !everyoneNamed) return;
        if (secretsErrors(state).length) return;
        startNightCommand();
      }
    },
    { signal },
  );

  const current = Object.values(state.players || {});
  if (
    current.some((player) => player.roleId === "librarian") &&
    !current.some((player) => roleTeam(player.roleId || "") === "outsider") &&
    !(state.setup.info.librarian && /** @type {any} */ (state.setup.info.librarian).zero)
  ) {
    send({ type: "normalizeSecrets" });
  }
  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
