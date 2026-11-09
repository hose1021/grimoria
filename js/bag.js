import { esc, modalFocus } from "./ui.js";
import { state, save, run } from "./store.js";
import { roleById as catalogRoleById, imageFor, allRoles } from "./roles.js";
import {
  COMPOSITION, RECOMMENDED, TEAMS, bagCounts, compositionFor, isGoodRole,
  randomBag, requiredBluffs, roleLabel, roleTeam, teamLabel
} from "./rules.js";
import { OFFICIAL_SCRIPTS, parseScript, troubleBrewingScript } from "./scripts.js";
import { dealGame, setupErrors } from "./engine.js";
import { setRoster } from "./model.js";
import { go, path } from "./router.js";
import { t, errorMessage, roleCount } from "./strings.js";

const MIN = 5;
const MAX = 15;
let abort = null;
let armed = false;
let bagError = "";

// Local (not persisted) state of the scenario picker.
let pickerOpen = false;
let pickerChoice = "tb";
let pickerSection = "";
let pickerError = "";
let pickerPreview = null;
let pickerUrl = "";
let pickerText = "";

function scriptRoles() {
  return (state.script && Array.isArray(state.script.roles)) ? state.script.roles : [];
}

function roleOf(id) {
  return catalogRoleById(id) || {
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

  pickerOpen = false;
  pickerError = "";
  pickerPreview = null;
  pickerChoice = state.script && state.script.id === "tb" ? "tb" : "custom";

  // The pool is derived from the active script. Cache it per script object:
  // applyScript() replaces state.script, which invalidates the cache without a
  // reload.
  let rolePool = null;
  let rolePoolScript = null;
  function poolRoles() {
    if (rolePool && rolePoolScript === state.script) return rolePool;
    const catalogOrder = new Map(allRoles().map((role, index) => [role.id, index]));
    rolePool = scriptRoles().map((id) => roleOf(id)).filter(Boolean)
      .sort((a, b) => (catalogOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER)
        - (catalogOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    rolePoolScript = state.script;
    return rolePool;
  }
  const byTeam = (team) => poolRoles().filter((role) => role.team === team);
  const roleById = (id) => poolRoles().find((role) => role.id === id) || null;
  const unused = () => poolRoles().filter((role) => !state.setup.roles.includes(role.id));
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
      if (!roleById(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 3);
  }

  function beginSetup() {
    if (state.phase === "setup") return true;
    if (!window.confirm(t("ui.changeBag"))) {
      return false;
    }
    setRoster(state, state.setup.count);
    state.phase = "setup";
    return true;
  }

  function refresh() {
    ensureDrunk();
    ensureBluffs();
    if (!setupErrors(state).length) bagError = "";
    render();
    save();
  }

  function tryRandomBag(count) {
    try {
      const bag = randomBag(count, Math.random, scriptRoles());
      bagError = "";
      return bag;
    } catch (error) {
      bagError = error.message;
      return null;
    }
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
    if (hasGame() && !window.confirm(t("ui.changeCount"))) {
      return;
    }
    setRoster(state, next);
    state.phase = "setup";
    const bag = tryRandomBag(next);
    if (bag) applyBag(bag);
    else refresh();
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
              : `<span class="bag-bluff-empty">${esc(t("ui.empty"))}</span>`}
          </button>`;
        }).join("")}
      </div>
      <div class="bag-bluff-pool" aria-label="${esc(t("ui.availableBluffs"))}">
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
    if (!state.script || state.script.id !== "tb") return "";
    return `
      <div class="bag-recommend">
        ${[7, 10, 12].map((size) => `
          <button class="bag-recommend-btn" type="button" data-recommended="${size}">
            <b>${size} ${esc(t("players"))}</b>
            <span>${esc(RECOMMENDED[size].note)}</span>
          </button>`).join("")}
      </div>`;
  }

  function scriptPreviewMarkup() {
    if (!pickerPreview || pickerChoice !== "custom") return "";
    const script = pickerPreview.script;
    const counts = bagCounts(script.roles);
    const teamText = TEAMS.map((team) => `${teamLabel(team)} ${counts[team]}`).join(" · ");
    return `<div class="script-preview" role="status">
      <b>${esc(script.name)}</b>
      <span>${script.roles.length} ${esc(roleCount(script.roles.length))} · ${esc(teamText)}</span>
      ${script.author ? `<span>${esc(t("scriptAuthor"))}: ${esc(script.author)}</span>` : ""}
      ${pickerPreview.travellers && pickerPreview.travellers.length
        ? `<span class="bag-note">${esc(t("scriptTravellersIgnored"))}</span>` : ""}
    </div>`;
  }

  function pickerMarkup() {
    return `<div class="script-modal" role="dialog" aria-modal="true" aria-labelledby="script-picker-title">
      <div class="script-picker">
        <div class="script-picker-head">
          <div>
            <p class="label">Pocket Grimoire</p>
            <h2 id="script-picker-title">${esc(t("scriptPicker"))}</h2>
          </div>
          <button class="btn script-close" type="button" data-act="close-script" aria-label="${esc(t("close"))}">✕</button>
        </div>

        <section class="script-group">
          <h3>${esc(t("scriptOfficial"))}</h3>
          <div class="script-choices">
            ${OFFICIAL_SCRIPTS.map((entry) => `
              <label class="script-choice${entry.supported ? "" : " is-disabled"}">
                <input type="radio" name="script-pick" value="${esc(entry.id)}"
                  ${pickerChoice === entry.id ? "checked" : ""} ${entry.supported ? "" : "disabled"}>
                <span>${esc(entry.name)}</span>
                <small>${entry.roleCount} ${esc(roleCount(entry.roleCount))}${entry.supported ? "" : " · " + esc(t("scriptSoon"))}</small>
              </label>`).join("")}
          </div>
          <p class="bag-note">${esc(t("scriptSoonHint"))}</p>
        </section>

        <details class="script-group" data-script-section="file" ${pickerSection === "file" ? "open" : ""}>
          <summary>${esc(t("scriptLoadFile"))}</summary>
          <input class="field" type="file" accept=".json,application/json" data-script-file
            aria-label="${esc(t("scriptLoadFile"))}">
          <p class="bag-note">${esc(t("scriptFormatHint"))}</p>
        </details>

        <details class="script-group" data-script-section="url" ${pickerSection === "url" ? "open" : ""}>
          <summary>${esc(t("scriptUrl"))}</summary>
          <div class="script-url-row">
            <input class="field" type="url" inputmode="url" placeholder="https://…"
              value="${esc(pickerUrl)}" data-script-url aria-label="${esc(t("scriptUrl"))}">
            <button class="btn" type="button" data-act="script-url">${esc(t("scriptLoad"))}</button>
          </div>
          <p class="bag-note">${esc(t("scriptUrlHint"))}</p>
        </details>

        <details class="script-group" data-script-section="clipboard" ${pickerSection === "clipboard" ? "open" : ""}>
          <summary>${esc(t("scriptClipboard"))}</summary>
          <div class="script-url-row">
            <button class="btn" type="button" data-act="script-clipboard">${esc(t("scriptPaste"))}</button>
            <button class="btn" type="button" data-act="script-text">${esc(t("scriptParse"))}</button>
          </div>
          <textarea class="field script-text" data-script-text
            aria-label="${esc(t("scriptClipboard"))}" placeholder="${esc(t("scriptFormatHint"))}">${esc(pickerText)}</textarea>
        </details>

        <a class="script-external" href="https://script.bloodontheclocktower.com/"
          target="_blank" rel="noopener">${esc(t("scriptBotc"))} ↗</a>

        ${scriptPreviewMarkup()}
        ${pickerError ? `<p class="script-error" role="alert">${esc(pickerError)}</p>` : ""}

        <div class="script-actions">
          <button class="btn" type="button" data-act="close-script">${esc(t("cancel"))}</button>
          <button class="btn btn--accent" type="button" data-act="apply-script"
            ${pickerChoice === "custom" && !pickerPreview ? "disabled" : ""}>${esc(t("scriptApply"))}</button>
        </div>
      </div>
    </div>`;
  }

  async function loadScriptText(text, source) {
    const result = parseScript(text, allRoles(), source, t("scriptUntitled"));
    if (!result.ok) {
      pickerError = result.error;
      pickerPreview = null;
    } else {
      pickerError = "";
      pickerPreview = result;
      pickerChoice = "custom";
      pickerSection = source === "url" ? "url" : source === "clipboard" || source === "text" ? "clipboard" : "file";
    }
    render();
  }

  async function loadScriptUrl() {
    const url = pickerUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      pickerError = t("scriptUrlInvalid");
      pickerPreview = null;
      render();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json, text/plain" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      await loadScriptText(await response.text(), "url");
    } catch (error) {
      pickerError = error.name === "AbortError" ? t("scriptUrlTimeout") : t("scriptUrlFailed");
      pickerPreview = null;
      render();
    } finally {
      clearTimeout(timer);
    }
  }

  async function pasteClipboard() {
    try {
      pickerText = await navigator.clipboard.readText();
      await loadScriptText(pickerText, "clipboard");
    } catch (error) {
      pickerError = t("scriptClipboardFailed");
      pickerSection = "clipboard";
      render();
    }
  }

  function applyScript(script) {
    if (!script || !Array.isArray(script.roles) || !script.roles.length) return;
    if (state.script && script.id === state.script.id) {
      pickerOpen = false;
      pickerError = "";
      render();
      return;
    }
    if (hasGame() && !window.confirm(t("ui.changeScript"))) return;
    setRoster(state, state.setup.count);
    state.script = { ...script, roles: script.roles.slice() };
    state.scriptId = script.id;
    state.phase = "setup";
    pickerOpen = false;
    pickerError = "";
    pickerPreview = null;
    armed = false;
    const bag = tryRandomBag(state.setup.count);
    if (bag) {
      state.setup.roles = bag.roles.slice();
      state.setup.drunkShownId = bag.drunkShownId || null;
      state.setup.bluffs = (bag.bluffs || []).slice();
    }
    refresh();
  }

  function applyPickerChoice() {
    if (pickerChoice === "tb") {
      applyScript(troubleBrewingScript());
      return;
    }
    if (pickerPreview && pickerPreview.script) {
      applyScript(pickerPreview.script);
      return;
    }
    pickerError = t("scriptNothingSelected");
    render();
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
              <small>${esc(state.script ? state.script.name : "")} · ${count} ${esc(t("players"))}</small>
            </div>
          </div>
          <nav class="setup-nav" aria-label="${esc(t("setup"))}">
            <button class="btn" type="button" data-act="script">${esc(t("script"))}</button>
            <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
            <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
            <a class="btn" href="${path("help")}">${esc(t("help"))}</a>
          </nav>
        </header>

        ${dealt ? `<div class="setup-banner">
          <b>${esc(t("warning"))}:</b> ${esc(t("dealAgain"))} — ${esc(t("newGame"))}. ${esc(t("discussWarning"))}
        </div>` : ""}
        ${bagError ? `<div class="setup-banner is-error">${esc(bagError)}</div>` : ""}
        ${state.storageError ? `<div class="setup-banner is-error">${esc(t("storageError"))}: ${esc(state.storageError)}</div>` : ""}

        <main class="setup-shell">
          <section class="setup-block">
            <div class="setup-block-head">
              <div>
                <span class="label">01</span>
                <h1>${esc(state.script ? state.script.name : "")}: ${esc(t("setupIntro"))}</h1>
              </div>
              <div class="setup-count">
                <button class="setup-step" type="button" data-count="-1" aria-label="${esc(t("ui.fewer"))}">−</button>
                <b>${count}</b>
                <button class="setup-step" type="button" data-count="1" aria-label="${esc(t("ui.more"))}">+</button>
              </div>
            </div>
            <div class="setup-composition">${compositionMarkup()}</div>
            <div class="setup-actions">
              <button class="btn" type="button" data-act="random">${esc(t("randomBag"))}</button>
              <button class="btn" type="button" data-act="clear">${esc(t("clearBag"))}</button>
              <a class="btn" href="${path("help")}">${esc(t("help"))}</a>
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
              <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
            </div>
            <p class="setup-hint">${esc(t("discussWarning"))}</p>
          </section>
        </main>

        ${pickerOpen ? pickerMarkup() : ""}
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
      if (!preset || !state.script || state.script.id !== "tb") return;
      if (hasGame() && !window.confirm(t("ui.newBag"))) return;
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
    const name = act.dataset.act;
    if (name === "script") {
      pickerOpen = true;
      pickerError = "";
      pickerChoice = state.script && state.script.id === "tb" ? "tb" : "custom";
      pickerPreview = pickerChoice === "custom" && state.script
        ? { script: { ...state.script, roles: state.script.roles.slice() }, travellers: [] }
        : null;
      render();
      return;
    }
    if (name === "close-script") {
      pickerOpen = false;
      pickerError = "";
      render();
      return;
    }
    if (name === "apply-script") {
      applyPickerChoice();
      return;
    }
    if (name === "script-url") {
      loadScriptUrl();
      return;
    }
    if (name === "script-clipboard") {
      pasteClipboard();
      return;
    }
    if (name === "script-text") {
      loadScriptText(pickerText, "text");
      return;
    }
    if (name === "random") {
      const bag = tryRandomBag(state.setup.count);
      if (bag) applyBag(bag);
      else refresh();
    } else if (name === "clear") {
      if (!beginSetup()) return;
      state.setup.roles = [];
      state.setup.bluffs = [];
      state.setup.drunkShownId = null;
      armed = false;
      refresh();
    } else if (name === "deal") {
      if (setupErrors(state).length) return;
      if (!armed && hasGame()) {
        armed = true;
        render();
        return;
      }
      const result = run((game) => dealGame(game));
      if (!result || result.ok === false) {
        const errors = (result && result.errors) || [];
        window.alert(errors.map((error) => error.message).join("\n") || (result && errorMessage(result)) || t("illegal"));
        return;
      }
      go("/player");
    }
  }, { signal });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("[data-script-file]")) {
      const file = target.files && target.files[0];
      if (!file) return;
      file.text().then((text) => loadScriptText(text, "file")).catch(() => {
        pickerError = t("scriptFileFailed");
        render();
      });
      return;
    }
    if (target.matches("[name='script-pick']")) {
      pickerChoice = target.value;
      render();
    }
  }, { signal });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("[data-script-url]")) pickerUrl = target.value;
    if (target.matches("[data-script-text]")) pickerText = target.value;
  }, { signal });

  root.addEventListener("toggle", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("details[data-script-section]") && target.open) {
      pickerSection = target.dataset.scriptSection || "";
    }
  }, { signal, capture: true });

  modalFocus(root, signal);

  if (!state.setup.roles.length) {
    const bag = tryRandomBag(state.setup.count);
    if (bag) applyBag(bag);
    else render();
  } else {
    ensureDrunk();
    ensureBluffs();
    render();
  }
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
