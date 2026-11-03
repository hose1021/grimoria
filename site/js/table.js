import {
  state, save, run, undo, canUndo, exportGame, importGame, reset
} from "./store.js";
import { roleById, imageFor } from "./roles.js";
import { t } from "./strings.js";
import { go } from "./router.js";
import {
  ALL_ROLES, SYSTEM_STEPS, roleLabel, roleTeam, teamLabel
} from "./rules.js";
import {
  butlerMaster, characterChoices, chooseDemonHeir, completeStep, currentStep,
  demonChangePending, endDay, endNight, executeByDecision, executionThreshold, infoForStep,
  isImpaired, manualCorrection, mayorRedirects, protectionFor, secretsErrors,
  skipStep, startNight, stepProgress, useSlayer
} from "./engine.js";
import { livingPlayers, orderedPlayers, playerById } from "./model.js";

let root = null;
let abort = null;
let overlay = null;
let infoKey = null;
let correction = null;
let selectedSeat = null;
let exportText = "";
let importText = "";
let timerEnd = null;
let timerId = null;
let executeTarget = "";
let slayerTarget = "";
let recluseDemonSlayer = false;
let armedNew = false;

const targets = new Map();
const redirects = new Map();
const registrations = new Map();
const givens = new Map();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function displayName(player) {
  if (!player) return "—";
  return player.name || (player.seat ? "Игрок " + player.seat : "—");
}

function roleOf(player) {
  return player && player.roleId ? roleById(player.roleId) : null;
}

function shownRoleOf(player) {
  return player && player.shownRoleId ? roleById(player.shownRoleId) : null;
}

function roleNameOf(id) {
  const role = roleById(id);
  return role ? role.name : roleLabel(id);
}

function roleTokenMarkup(id, className = "") {
  const role = roleById(id);
  if (!role) return "";
  return `<span class="host-token ${className}">
    <img src="${esc(imageFor(role))}" alt="">
    <b>${esc(role.name)}</b>
  </span>`;
}

function actorName(step) {
  const player = step && step.actorId ? playerById(state, step.actorId) : null;
  return player ? displayName(player) : "";
}

function stepTitle(step) {
  if (!step) return "";
  if (step.roleId) return roleNameOf(step.roleId);
  return SYSTEM_STEPS[step.system] || step.system || "Шаг";
}

function stepTargets(step) {
  return targets.get(step.key) || [];
}

function targetNames(ids) {
  return (ids || []).map((id) => {
    const player = playerById(state, id);
    return player ? displayName(player) : id;
  }).join(", ");
}

function currentPhaseLabel() {
  if (state.phase === "night") return `${t("night")} ${state.night.number}`;
  if (state.phase === "day") return `${t("day")} ${state.day.number}`;
  if (state.phase === "deal") return t("playerHandoff");
  if (state.phase === "over") return t("gameOver");
  return t("setup");
}

function headerCount() {
  if (state.phase === "setup" || state.phase === "deal" || state.phase === "seat") {
    return `${orderedPlayers(state).length} ${t("players")}`;
  }
  return `${aliveCount()} ${t("alive")}`;
}

function causeText(cause) {
  return {
    execution: "казнь",
    demon: "Демон",
    slayer: "Истребитель",
    virgin: "Девственница",
    "imp-self-kill": "самоубийство Чёрта",
    manual: "ручная правка",
    legacy: "перенесено"
  }[cause] || cause;
}

function aliveCount() {
  return livingPlayers(state).length;
}

function roleBadge(player) {
  const role = roleOf(player);
  if (!role) return `<span class="host-muted">нет роли</span>`;
  return `<span class="host-role" data-team="${esc(role.team)}">
    <i class="host-team-dot" aria-hidden="true"></i>${esc(role.name)}
  </span>`;
}

function effectBadges(player) {
  const badges = [];
  if (player.roleId === "drunk") badges.push("Пьяница");
  if (player.roleId !== "drunk" && isImpaired(state, player.id)) badges.push("Отравлен");
  if (protectionFor(state, player.id)) badges.push("Защита");
  const master = butlerMaster(state, player.id);
  if (master) badges.push("Хозяин: " + displayName(playerById(state, master)));
  if (state.setup.herringId === player.id || state.herringId === player.id) badges.push("Селёдка");
  for (const reminder of player.reminders || []) badges.push(reminder);
  const used = Object.keys(player.used || {});
  if (used.length) badges.push("Использовано: " + used.join(", "));
  return badges.map((badge) => `<span class="host-chip">${esc(badge)}</span>`).join("");
}

function seatRail() {
  return `
    <aside class="host-seats" aria-label="${esc(t("seats"))}">
      <div class="host-panel-head"><span class="label">${esc(t("seats"))}</span>
        <span class="host-muted">${state.phase === "setup" || state.phase === "deal" || state.phase === "seat"
          ? `${orderedPlayers(state).length} ${t("players")}`
          : `${aliveCount()} ${t("alive")} / ${orderedPlayers(state).length}`}</span></div>
      <div class="host-seat-list">
        ${orderedPlayers(state).map((player) => `
          <div class="host-seat ${player.alive ? "" : "is-dead"} ${player.id === selectedSeat ? "is-selected" : ""}">
            <button class="host-seat-main" type="button" data-correct="${esc(player.id)}">
              <span class="host-seat-num">${player.seat}</span>
              <span class="host-seat-body">
                <b>${esc(player.name || "—")}</b>
                <span>${roleBadge(player)} ${player.alive ? "" : `<em class="host-deadtag">${esc(t("dead"))}</em>`}</span>
                ${player.shownRoleId && player.shownRoleId !== player.roleId
                  ? `<span class="host-shown">${esc(t("shownRole"))}: ${esc(roleNameOf(player.shownRoleId))}</span>`
                  : ""}
                <span class="host-chips">${effectBadges(player)}</span>
              </span>
            </button>
          </div>`).join("")}
      </div>
      <div class="host-bluffs">
        <span class="label">${esc(t("bluffs"))}</span>
        <span class="host-bluff-list">
          ${(state.bluffs || []).length
            ? state.bluffs.map((id) => roleTokenMarkup(id, "host-token--mini")).join("")
            : `<span class="host-muted">${esc(state.setup.count < 7 ? t("noBluffs") : t("none"))}</span>`}
        </span>
        ${state.setup.herringId || state.herringId
          ? `<p class="host-muted">${esc(t("herring"))}: ${esc(displayName(playerById(state, state.setup.herringId || state.herringId)))}</p>`
          : ""}
      </div>
    </aside>`;
}

function queueMarkup() {
  const progress = stepProgress(state);
  return `
    <section class="host-panel">
      <div class="host-panel-head">
        <span class="label">${esc(t("queue"))}</span>
        <span class="host-muted">${progress.done} / ${progress.total} ${esc(t("finished"))}</span>
      </div>
      ${state.night.queue.length ? `<ol class="host-queue">
        ${state.night.queue.map((step) => {
          const isCurrent = currentStep(state) === step;
          const pending = step.pending;
          return `<li class="host-queue-item ${step.done ? "is-done" : ""} ${step.skipped ? "is-skipped" : ""} ${isCurrent ? "is-current" : ""} ${pending ? "is-pending" : ""}">
            <span class="host-queue-dot" aria-hidden="true"></span>
            <span class="host-queue-body">
              <b>${esc(stepTitle(step))}</b>
              <small>${esc(step.actorName || "")}${step.skipped ? " · пропущен" : step.done ? " · готово" : ""}</small>
            </span>
          </li>`;
        }).join("")}
      </ol>` : `<p class="host-muted">${esc(t("noWake"))}</p>`}
    </section>`;
}

function logMarkup() {
  const entries = (state.log || []).slice(-8).reverse();
  return `
    <section class="host-panel">
      <div class="host-panel-head"><span class="label">${esc(t("log"))}</span></div>
      ${entries.length ? `<ol class="host-log">${entries.map((entry) => `
        <li class="${entry.secret ? "is-secret" : ""}">
          <b>${esc(entry.title)}</b>
          <span>${esc(entry.phase)}${entry.detail ? " · " + esc(entry.detail) : ""}</span>
        </li>`).join("")}</ol>` : `<p class="host-muted">—</p>`}
    </section>`;
}

function notesMarkup() {
  return `
    <section class="host-panel">
      <label class="label" for="host-notes">${esc(t("notes"))}</label>
      <textarea class="field host-notes" id="host-notes" data-notes maxlength="4000">${esc(state.notes || "")}</textarea>
      <p class="host-muted">${esc(t("correctionHint"))}</p>
    </section>`;
}

function sidePanel() {
  return `
    <aside class="host-side">
      ${state.storageError ? `<div class="host-alert is-error">${esc(t("storageError"))}: ${esc(state.storageError)}</div>` : ""}
      ${state.phase === "night" ? queueMarkup() : ""}
      ${state.phase === "day" ? daySidePanel() : ""}
      ${logMarkup()}
      ${notesMarkup()}
      <div class="host-panel">
        <span class="label">Резервная копия</span>
        <div class="host-inline">
          <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
          <button class="btn" type="button" data-act="import">${esc(t("import"))}</button>
        </div>
        <p class="host-muted">${esc(t("exportWarning"))}</p>
      </div>
    </aside>`;
}

function daySidePanel() {
  const executed = state.day.execution
    ? playerById(state, state.day.execution.playerId)
    : null;
  return `
    <section class="host-panel">
      <div class="host-panel-head"><span class="label">Итог дня</span></div>
      ${executed
        ? `<p class="host-tally is-bad">${esc(t("execution"))}: ${esc(displayName(executed))}</p>`
        : `<p class="host-muted">${esc(t("noExecutionShort"))}</p>`}
      <div class="host-timer">
        <span class="label">${esc(t("timer"))}</span>
        <b data-timer-text>${esc(timerText())}</b>
        <div class="host-inline">
          <button class="btn" type="button" data-act="timer-start">${esc(t("startTimer"))}</button>
          <button class="btn" type="button" data-act="timer-stop">${esc(t("resetTimer"))}</button>
        </div>
      </div>
    </section>`;
}
function timerText() {
  if (!timerEnd) return "—";
  const left = Math.max(0, timerEnd - Date.now());
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function setupPrompt() {
  return `
    <section class="host-card host-empty">
      <p class="label">${esc(t("setup"))}</p>
      <h1>${esc(t("noRoles"))}</h1>
      <p>${esc(t("setupIntro"))}</p>
      <div class="host-inline">
        <a class="btn btn--accent" href="#/bag">Начать игру</a>
        <a class="btn" href="#/demo">${esc(t("demo"))}</a>
      </div>
    </section>`;
}

function dealCard() {
  const players = orderedPlayers(state);
  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = claimed === players.length;
  const seated = state.phase === "seat";
  const errors = secretsErrors(state);
  const step = !everyoneNamed ? "names" : !seated ? "seats" : "secrets";
  return `
    <section class="host-card">
      <p class="label">${esc(t("playerHandoff"))}</p>
      <h1>${!everyoneNamed ? "Игроки вводят имена" : !seated ? "Настройте порядок мест" : "Проверьте секреты"}</h1>
      <p>${esc(t("discussWarning"))}</p>
      <div class="host-progress">
        <div class="host-progress-bar"><span style="width:${players.length ? (claimed / players.length) * 100 : 0}%"></span></div>
        <b>${claimed} / ${players.length}</b>
      </div>
      <div class="host-inline">
        <a class="btn btn--accent" href="${step === "names" ? "#/player" : step === "seats" ? "#/seat" : "#/secrets"}">
          ${step === "names" ? "Передать устройство" : step === "seats" ? "К местам" : "К секретам"}
        </a>
        <a class="btn" href="#/seat">${esc(t("seats"))}</a>
        <a class="btn" href="#/secrets">${esc(t("secrets"))}</a>
      </div>
      ${seated && errors.length ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
        <a class="btn" href="#/secrets">${esc(t("secrets"))}</a>
      </div>` : ""}
      ${seated ? `<button class="btn btn--accent host-primary" type="button" data-act="start-night" ${errors.length ? "disabled" : ""}>
        ${esc(t("startFirstNight"))}
      </button>` : ""}
    </section>`;
}

function guideFor(step) {
  const role = step.roleId ? roleById(step.roleId) : null;
  const name = role ? role.name : stepTitle(step);
  const common = {
    publicLine: "Не называйте роль вслух. Общайтесь жестами или покажите карточку.",
    check: "Убедитесь, что игрок понял информацию и снова закрыл глаза."
  };
  if (step.kind === "system") {
    if (step.system === "minioninfo") {
      return {
        host: "Разбудите Приспешников. Покажите им Демона.",
        player: "Приспешники запоминают друг друга и Демона.",
        grimoire: "Ничего не меняйте.",
        ...common,
        check: "Все Приспешники проснулись и увидели Демона."
      };
    }
    if (step.system === "demoninfo") {
      return {
        host: "Разбудите Демона. Покажите Приспешников и три блефа.",
        player: "Демон запоминает Приспешников и блефы.",
        grimoire: "Блефы уже отмечены справа.",
        ...common,
        check: "Демон увидел ровно три блефа и Приспешников."
      };
    }
    return {
      host: step.note || "Сообщите игроку об изменении.",
      player: "Игрок узнаёт новую роль.",
      grimoire: "Проверьте, что жетон роли заменён.",
      ...common,
      check: "Игрок понял новую роль."
    };
  }
  const map = {
    poisoner: {
      host: "Разбудите Отравителя. Он указывает на игрока.",
      player: "Выбирает одного игрока.",
      grimoire: "Поставьте «Отравлен» на цель до следующего заката.",
      publicLine: "Молча. Не называйте роль.",
      check: "Цель отравлена этой ночью и следующим днём."
    },
    washerwoman: {
      host: "Разбудите Прачку. Покажите карточку с двумя игроками.",
      player: "Смотрит карточку и запоминает.",
      grimoire: "Жетоны «Горожанин» и «Не тот» стоят на паре.",
      publicLine: "Покажите карточку, не говоря роль вслух.",
      check: "Один из двух — выбранный Горожанин."
    },
    librarian: {
      host: "Разбудите Библиотекаря. Покажите карточку.",
      player: "Смотрит карточку.",
      grimoire: "Жетоны «Изгой» и «Не тот» стоят на паре.",
      publicLine: "Покажите карточку молча.",
      check: "Если Изгоев нет, показан ноль."
    },
    investigator: {
      host: "Разбудите Сыщика. Покажите карточку.",
      player: "Смотрит карточку.",
      grimoire: "Жетоны «Приспешник» и «Не тот» стоят на паре.",
      publicLine: "Покажите карточку молча.",
      check: "Один из двух — выбранный Приспешник."
    },
    chef: {
      host: "Разбудите Повара. Покажите число пальцами.",
      player: "Смотрит число.",
      grimoire: "Посчитайте пары злых соседей, включая замыкание круга.",
      publicLine: "Покажите число пальцами, без слов.",
      check: "Учтены Шпион и Затворник по вашему решению."
    },
    empath: {
      host: "Разбудите Эмпата. Покажите число пальцами.",
      player: "Смотрит число.",
      grimoire: "Считайте только живых соседей, пропуская мёртвых.",
      publicLine: "Покажите число пальцами.",
      check: "Если соседей меньше двух, считайте доступных."
    },
    fortuneteller: {
      host: "Разбудите Гадалку. Она указывает на двух игроков.",
      player: "Выбирает двух игроков.",
      grimoire: "Проверьте Демона и красную селёдку.",
      publicLine: "Покажите «да» или «нет» кивком.",
      check: "Можно выбирать мёртвых. Ответ учитывает селёдку."
    },
    undertaker: {
      host: "Разбудите Гробовщика. Покажите роль казнённого сегодня.",
      player: "Смотрит роль.",
      grimoire: "Возьмите роль из события казни, не из ночной смерти.",
      publicLine: "Покажите жетон роли молча.",
      check: "Если казни со смертью не было, информации нет."
    },
    monk: {
      host: "Разбудите Монаха. Он указывает на игрока, кроме себя.",
      player: "Выбирает одного игрока.",
      grimoire: "Поставьте «Защищён» на цель.",
      publicLine: "Молча.",
      check: "Цель защищена только этой ночью."
    },
    ravenkeeper: {
      host: "Разбудите Смотрителя Воронов, погибшего этой ночью.",
      player: "Выбирает игрока и узнаёт его роль.",
      grimoire: "Покажите роль выбранного игрока.",
      publicLine: "Покажите карточку роли молча.",
      check: "Если Смотритель был отравлен, можно показать ложь."
    },
    virgin: {
      host: "Ничего не будите. Следите за первой номинацией.",
      player: "Номинация запускает способность.",
      grimoire: "Отметьте «Без способности» после первой номинации.",
      publicLine: "Объявите казнь номинатора, если способность сработала.",
      check: "Номинатор должен регистрироваться как Горожанин."
    },
    slayer: {
      host: "Истребитель действует днём, публично.",
      player: "Выбирает игрока.",
      grimoire: "Отметьте «Без способности».",
      publicLine: "Объявите выбор и результат.",
      check: "Смерть от Истребителя — не казнь."
    },
    soldier: {
      host: "Ничего не будите. Солдат защищён от Демона.",
      player: "Способность пассивная.",
      grimoire: "Проверьте, что Солдат не отравлен.",
      publicLine: "Ничего.",
      check: "Ночная атака Демона не убивает Солдата."
    },
    mayor: {
      host: "Ничего не будите. Мэр может перенаправить ночную смерть.",
      player: "Способность пассивная.",
      grimoire: "При атаке выберите другую цель или оставьте смерть Мэра.",
      publicLine: "Ничего.",
      check: "При трёх живых и отсутствии казни Мэр приносит победу добра."
    },
    butler: {
      host: "Разбудите Дворецкого. Он указывает на другого игрока.",
      player: "Выбирает хозяина.",
      grimoire: "Поставьте «Хозяин».",
      publicLine: "Молча.",
      check: "Завтра Дворецкий голосует только вместе с хозяином."
    },
    drunk: {
      host: "Действуйте как с показанной ролью.",
      player: "Думает, что у него способность.",
      grimoire: "Настоящая роль — Пьяница. Способность не работает.",
      publicLine: "Не выдавайте, что игрок пьян.",
      check: "Можно дать ложную информацию."
    },
    recluse: {
      host: "Ничего не будите. Затворник может регистрироваться как злой.",
      player: "Способность пассивная.",
      grimoire: "При проверках выберите регистрацию.",
      publicLine: "Ничего.",
      check: "Регистрация может изменить информацию других ролей."
    },
    saint: {
      host: "Ничего не будите. Святой проигрывает добру при казни.",
      player: "Способность пассивная.",
      grimoire: "Проверьте, не отравлен ли Святой.",
      publicLine: "Ничего.",
      check: "Казнь действующего Святого — победа зла."
    },
    spy: {
      host: "Разбудите Шпиона. Покажите гримуар.",
      player: "Смотрит гримуар.",
      grimoire: "Если Шпион отравлен, можно показать ложную картину.",
      publicLine: "Молча.",
      check: "Шпион видит актуальное состояние."
    },
    scarletwoman: {
      host: "Пассивно. Следите за смертью Демона.",
      player: "Может стать Демоном.",
      grimoire: "Порог: пять живых до смерти Демона.",
      publicLine: "Не объявляйте смену роли.",
      check: "Новый Демон не действует повторно этой ночью."
    },
    baron: {
      host: "Пассивно. Состав уже изменён.",
      player: "Способность на подготовке.",
      grimoire: "Смерть Барона не меняет состав.",
      publicLine: "Ничего.",
      check: "Изгои и Горожане посчитаны верно."
    },
    imp: {
      host: "Разбудите Чёрта. Он указывает на игрока.",
      player: "Выбирает цель; может выбрать себя или уже мёртвого.",
      grimoire: "Ставьте «Мёртв» только живому. Мёртвая цель не умирает повторно.",
      publicLine: "Утром объявите только смерть, без причины.",
      check: "Цель была жива? Монах, Солдат и Мэр могут изменить результат."
    }
  };
  const entry = map[step.roleId];
  if (entry) return entry;
  return {
    host: "Разбудите игрока и следуйте способности роли.",
    player: "Выполняет действие роли.",
    grimoire: "Отметьте результат и напоминания.",
    ...common,
    check: "Способность применена один раз."
  };
}

function registrationMarkup(step) {
  const relevant = orderedPlayers(state).filter((player) => (
    player.roleId === "spy" || player.roleId === "recluse"
  ));
  if (!relevant.length) return "";
  const regs = registrations.get(step.key) || {};
  if (step.roleId === "chef" || step.roleId === "empath") {
    return `<div class="host-reg">
      <span class="label">${esc(t("registration"))}</span>
      ${relevant.map((player) => {
        const spy = player.roleId === "spy";
        const checked = spy ? regs[player.id] === "good" : regs[player.id] === "evil";
        return `<label class="host-check">
          <input type="checkbox" data-reg="${esc(step.key)}" data-reg-player="${esc(player.id)}"
            data-reg-value="${spy ? "good" : "evil"}" ${checked ? "checked" : ""}>
          <span>${spy ? "Шпион считается добрым" : esc(t("recluseEvil"))} — ${esc(displayName(player))}</span>
        </label>`;
      }).join("")}
    </div>`;
  }
  if (step.roleId === "fortuneteller") {
    return `<div class="host-reg">
      <span class="label">${esc(t("registration"))}</span>
      ${relevant.filter((player) => player.roleId === "recluse").map((player) => `
        <label class="host-check">
          <input type="checkbox" data-reg="${esc(step.key)}" data-reg-player="${esc(player.id)}"
            data-reg-value="demon" ${regs[player.id] === "demon" ? "checked" : ""}>
          <span>${esc(t("recluseDemon"))} — ${esc(displayName(player))}</span>
        </label>`).join("")}
    </div>`;
  }
  return "";
}

function givenSelect(step, info) {
  if (!info || !info.needsChoice) return "";
  const current = givens.get(step.key);
  let options = [];
  let kind = "number";
  if (info.kind === "number") {
    kind = "number";
    options = info.options && info.options.length
      ? info.options
      : Array.from({ length: orderedPlayers(state).length + 1 }, (_, i) => i);
  } else if (info.kind === "yes-no") {
    kind = "bool";
    options = [true, false];
  } else if (info.kind === "character") {
    kind = "role";
    options = info.options && info.options.length
      ? info.options
      : (info.playerId ? characterChoices(state, info.playerId, true) : ALL_ROLES);
  } else if (info.kind === "one-of-two") {
    kind = "role";
    options = info.options && info.options.length ? info.options : ALL_ROLES;
  }
  if (!options.length) return "";
  return `<label class="host-field">
    <span class="label">${esc(t("falseInfo"))}</span>
    <select class="field" data-given="${esc(step.key)}" data-given-kind="${esc(kind)}">
      <option value="">${esc(t("computed"))}: ${esc(infoText(state, step, info))}</option>
      ${options.map((value) => {
        const label = kind === "role"
          ? roleNameOf(value)
          : kind === "bool"
            ? (value ? t("yes") : t("no"))
            : String(value);
        return `<option value="${esc(value)}">${esc(label)}</option>`;
      }).join("")}
    </select>
  </label>`;
}

function infoText(stateArg, step, info) {
  if (!info) return t("none");
  if (info.kind === "one-of-two") {
    if (info.zero) return "В игре нет Изгоев.";
    if (!info.roleId) return info.text || "Информация не настроена.";
    const pair = (info.pair || []).map((id) => {
      const player = playerById(stateArg, id);
      return player ? `${displayName(player)} (${player.seat})` : id;
    });
    return `Один из этих игроков — ${roleNameOf(info.roleId)}: ${pair.join(" или ")}.`;
  }
  if (info.kind === "number") {
    return `Число: ${info.value}.`;
  }
  if (info.kind === "yes-no") {
    return `Ответ: ${info.value ? t("yes") : t("no")}.`;
  }
  if (info.kind === "character") {
    const player = info.playerId ? playerById(stateArg, info.playerId) : null;
    const roleId = info.roleId;
    return `${player ? displayName(player) : "Игрок"} — ${roleId ? roleNameOf(roleId) : "неизвестно"}.`;
  }
  if (info.kind === "grimoire") {
    return "Посмотрите гримуар. Покажите его игроку, не комментируя.";
  }
  if (info.kind === "minion-info") {
    const demon = info.demonId ? playerById(stateArg, info.demonId) : null;
    return `Демон: ${demon ? displayName(demon) : "—"}.`;
  }
  if (info.kind === "demon-info") {
    const minions = livingPlayers(stateArg)
      .filter((player) => roleTeam(player.roleId) === "minion")
      .map((player) => displayName(player))
      .join(", ");
    const bluffs = (info.bluffs || stateArg.bluffs || []).map(roleNameOf).join(", ");
    return `Приспешники: ${minions || "—"}. Блефы: ${bluffs || "—"}.`;
  }
  return info.text || t("none");
}

function applyGiven(info, raw, kind) {
  if (!info) return info;
  if (kind === "number") {
    const value = Number(raw);
    return { ...info, value, needsChoice: false };
  }
  if (kind === "bool") {
    return { ...info, value: raw === "true", needsChoice: false };
  }
  if (kind === "role") {
    return { ...info, roleId: raw, needsChoice: false };
  }
  return info;
}

function nightCard() {
  const step = currentStep(state);
  const progress = stepProgress(state);
  const pending = demonChangePending(state);

  if (pending) {
    return `
      <section class="host-card is-night">
        <p class="label">${esc(t("pendingHeir"))}</p>
        <h1>${esc(t("pendingHeirText"))}</h1>
        <div class="host-targets">
          ${pending.pending.options.map((option) => `
            <button class="host-target" type="button" data-heir="${esc(pending.key)}" data-id="${esc(option.id)}">
              ${esc(option.name)}
              <small>${esc(roleNameOf(option.roleId))}</small>
            </button>`).join("")}
        </div>
      </section>`;
  }

  if (!step) {
    return `
      <section class="host-card is-night">
        <p class="label">${esc(t("night"))} ${state.night.number}</p>
        <h1>${state.night.queue.length ? "Все шаги выполнены" : t("noWake")}</h1>
        <p>${esc(t("check"))}: ${progress.done} / ${progress.total}.</p>
        <button class="btn btn--accent host-primary" type="button" data-act="end-night">
          ${esc(t("finishNight"))}
        </button>
      </section>`;
  }

  const guide = guideFor(step);
  const role = step.roleId ? roleById(step.roleId) : null;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const info = infoForStep(state, step, {
    targetIds: stepTargets(step),
    registrations: registrations.get(step.key) || {}
  });
  const given = givens.get(step.key);
  const needsSetup = info.missing;
  const selected = stepTargets(step);
  const targetCount = step.targetMode === "none" ? 0 : step.targetMode === "two" ? 2 : 1;
  const targetsIncomplete = selected.length !== targetCount;
  const selectedPlayer = selected[0] ? playerById(state, selected[0]) : null;
  const deadImpTarget = step.roleId === "imp" && selectedPlayer && !selectedPlayer.alive;
  const targetIsMayor = selected[0] && mayorRedirects(state, selected[0]);
  const needsRedirect = Boolean(targetIsMayor && !redirects.get(step.key));
  const needsInfo = targetsIncomplete || (info.needsChoice && !given);

  return `
    <section class="host-card is-night">
      <div class="host-step-top">
        <p class="label">${esc(t("night"))} ${state.night.number} · ${esc(t("step"))} ${progress.done + 1} / ${progress.total}</p>
        ${role ? `<span class="host-chip">${esc(teamLabel(role.team))}</span>` : ""}
      </div>
      <h1>${esc(stepTitle(step))}${actor ? ` <small>· ${esc(displayName(actor))}</small>` : ""}</h1>
      ${step.deadTonight ? `<p class="host-alert">Игрок погиб этой ночью. Разбудите его для этого шага.</p>` : ""}
      ${actor && isImpaired(state, actor.id) ? `<p class="host-alert">Способность не работает: игрок отравлен или пьян. Покажите ложную информацию или разыграйте действие.</p>` : ""}

      <div class="host-guide">
        ${guideRow(t("hostAction"), guide.host)}
        ${guideRow(t("playerAction"), guide.player)}
        ${guideRow(t("grimoireNote"), guide.grimoire)}
        ${guideRow(t("publicLine"), guide.publicLine)}
        ${guideRow(t("check"), guide.check)}
      </div>

      ${step.targetMode !== "none" ? `
        <div class="host-section">
          <span class="label">${step.targetMode === "two" ? esc(t("chooseTwo")) : esc(t("chooseTarget"))}</span>
          <div class="host-targets">
            ${orderedPlayers(state).map((player) => {
              const on = selected.includes(player.id);
              const disabled = step.targetMode === "one-other" && player.id === step.actorId;
              return `<button class="host-target ${on ? "is-on" : ""} ${disabled ? "is-disabled" : ""}"
                type="button" data-target="${esc(step.key)}" data-id="${esc(player.id)}" ${disabled ? "disabled" : ""}>
                <span>${player.seat} · ${esc(displayName(player))}</span>
                <small>${player.alive ? esc(roleNameOf(player.roleId)) : esc(t("dead"))}</small>
              </button>`;
            }).join("")}
          </div>
          ${selected.length ? `<p class="host-muted">${esc(t("target"))}: ${esc(targetNames(selected))}</p>` : ""}
          ${deadImpTarget ? `<p class="host-alert">Цель уже мертва. Чёрт может указать на неё, но убийства не будет: смерть не повторяется.</p>` : ""}
        </div>` : ""}

      ${targetIsMayor ? `
        <label class="host-field">
          <span class="label">${esc(t("forced"))}</span>
          <select class="field" data-redirect="${esc(step.key)}">
            <option value="none"${!redirects.get(step.key) || redirects.get(step.key) === "none" ? " selected" : ""}>Мэр умирает</option>
            ${livingPlayers(state).filter((player) => player.id !== selected[0]).map((player) => `
              <option value="${esc(player.id)}"${redirects.get(step.key) === player.id ? " selected" : ""}>
                ${esc(displayName(player))} умирает вместо Мэра
              </option>`).join("")}
          </select>
        </label>` : ""}

      ${registrationMarkup(step)}

      ${step.infoKind !== "none" ? `
        <div class="host-section">
          <span class="label">${esc(t("computed"))}</span>
          <div class="host-info-preview">${esc(
            needsSetup
              ? "Информация не настроена. Откройте «Секреты»."
              : targetsIncomplete
                ? "Сначала выберите цель."
                : infoText(state, step, given || info)
          )}</div>
          ${!targetsIncomplete ? givenSelect(step, info) : ""}
          ${given ? `<p class="host-muted">${esc(t("given"))}: ${esc(infoText(state, step, given))}</p>` : ""}
          ${!needsSetup && !targetsIncomplete ? (
            step.roleId === "spy"
              ? `<button class="btn" type="button" data-act="show-grimoire">Показать гримуар</button>`
              : `<button class="btn" type="button" data-act="show-info" data-key="${esc(step.key)}">${esc(t("showCard"))}</button>`
          ) : ""}
        </div>` : ""}

      ${needsSetup ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <p>${esc(t("secretsIntro"))}</p>
        <a class="btn" href="#/secrets">${esc(t("secrets"))}</a>
      </div>` : ""}

      <div class="host-actions">
        <button class="btn btn--accent host-primary" type="button" data-act="complete"
          data-key="${esc(step.key)}" ${needsInfo || needsSetup || needsRedirect ? "disabled" : ""}>
          ${esc(t("completeStep"))}
        </button>
        <button class="btn" type="button" data-act="skip" data-key="${esc(step.key)}">${esc(t("skipStep"))}</button>
      </div>
    </section>`;
}

function guideRow(label, text) {
  return `<div class="host-guide-row">
    <span class="label">${esc(label)}</span>
    <p>${esc(text || "—")}</p>
  </div>`;
}

function dayCard() {
  const day = state.day;
  const executed = day.execution ? playerById(state, day.execution.playerId) : null;
  const living = livingPlayers(state);
  const threshold = executionThreshold(living.length);
  const slayer = !day.execution && !day.ended ? orderedPlayers(state).find((player) => (
    player.roleId === "slayer" && player.alive && !player.used.slayer
  )) : null;
  const canExecute = Boolean(executeTarget) && !day.execution && !day.ended && !state.winner;

  return `
    <section class="host-card is-day">
      <p class="label">${esc(t("day"))} ${day.number}</p>
      <h1>${esc(t("dawn"))}</h1>
      <div class="host-morning">
        <span class="label">${esc(t("morning"))}</span>
        <p>${day.morning.length
          ? `${esc(t("died"))}: ${day.morning.map((death) => esc(displayName(playerById(state, death.playerId) || {}))).join(", ")}.`
          : esc(t("noDeaths"))}</p>
        <p class="host-muted">Объявляйте только имена. Не называйте причины и роли.</p>
      </div>

      ${!day.execution && !day.ended ? `
        <div class="host-vote-hint">
          <span class="label">Голосование</span>
          <b>Минимум для казни: ${threshold} из ${living.length} живых.</b>
          <p class="host-muted">Нужно строго больше половины живых. Голоса мёртвых входят в счёт, но не увеличивают порог.</p>
        </div>` : ""}

      ${!day.execution && !day.ended ? `
        <div class="host-execute">
          <span class="label">Кого казнили?</span>
          <div class="host-inline">
            <select class="field" data-exec-target>
              <option value="">Казни не было</option>
              ${orderedPlayers(state).map((player) => `
                <option value="${esc(player.id)}"${executeTarget === player.id ? " selected" : ""}>
                  ${esc(displayName(player))}${player.alive ? "" : " · уже мёртв"}
                </option>`).join("")}
            </select>
            <button class="btn btn--accent" type="button" data-act="execute-direct" ${canExecute ? "" : "disabled"}>
              ${esc(t("execute"))}
            </button>
          </div>
          <p class="host-muted">Приложение фиксирует только итог казни. Голоса и номинации ведутся за столом.</p>
        </div>` : ""}

      ${executed ? `<div class="host-execution">
        <span class="label">${esc(t("execution"))}</span>
        <b>${esc(displayName(executed))}</b>
        <p class="host-muted">${day.execution.deathId ? "Казнён и умер." : "Казнь отмечена, но смерти не было."}</p>
      </div>` : ""}

      ${slayer ? slayerPanel(slayer) : ""}

      <div class="host-actions">
        <button class="btn btn--accent" type="button" data-act="end-day">
          ${esc(day.execution || day.ended ? t("endDay") : t("noExecution"))}
        </button>
      </div>
    </section>`;
}
function slayerPanel(slayer) {
  const targets = orderedPlayers(state);
  const selected = targets.find((player) => player.id === slayerTarget);
  return `<div class="host-slayer">
    <span class="label">${esc(t("slayer"))}</span>
    <p class="host-muted">${esc(t("slayerHint"))}</p>
    <div class="host-inline">
      <select class="field" data-slayer-target>
        <option value="">${esc(t("chooseTarget"))}</option>
        ${targets.map((player) => `<option value="${esc(player.id)}"${slayerTarget === player.id ? " selected" : ""}>${esc(displayName(player))}${player.alive ? "" : " · мёртв"}</option>`).join("")}
      </select>
      ${selected && selected.roleId === "recluse" ? `<label class="host-check"><input type="checkbox" data-recluse-slayer ${recluseDemonSlayer ? "checked" : ""}><span>${esc(t("recluseDemon"))}</span></label>` : ""}
      <button class="btn" type="button" data-act="slayer" ${slayerTarget ? "" : "disabled"}>${esc(t("useSlayer"))}</button>
    </div>
  </div>`;
}

function overCard() {
  const winner = state.winner;
  return `
    <section class="host-card is-over">
      <p class="label">${esc(t("gameOver"))}</p>
      <h1>${esc(winner ? winner.title : t("gameOver"))}</h1>
      <p>${esc(winner ? winner.detail : "")}</p>
      <div class="host-inline">
        ${!state.reviewOpen ? `<button class="btn btn--accent" type="button" data-act="review">${esc(t("review"))}</button>` : ""}
        <button class="btn" type="button" data-act="new-game">${esc(t("newGame"))}</button>
        <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
      </div>
      ${!state.reviewOpen ? `<p class="host-muted">${esc(t("reviewHidden"))}</p>` : reviewTable()}
    </section>`;
}

function reviewTable() {
  return `<div class="host-review">
    <table>
      <thead><tr><th>#</th><th>${esc(t("player"))}</th><th>${esc(t("role"))}</th><th>${esc(t("shownRole"))}</th><th>${esc(t("team"))}</th><th>${esc(t("dead"))}</th><th>${esc(t("notes"))}</th></tr></thead>
      <tbody>
        ${orderedPlayers(state).map((player) => {
          const role = roleOf(player);
          const shown = shownRoleOf(player);
          return `<tr>
            <td>${player.seat}</td>
            <td>${esc(displayName(player))}</td>
            <td>${esc(role ? role.name : "—")}</td>
            <td>${esc(shown ? shown.name : "—")}</td>
            <td>${esc(role ? teamLabel(role.team) : "—")}</td>
            <td>${player.alive ? "—" : esc(player.deadAt ? causeText(player.deadAt.cause) : "—")}</td>
            <td>${esc((player.reminders || []).join(", "))}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function headerBar() {
  return `
    <header class="host-head">
      <div class="host-brand">
        <span class="host-mark" aria-hidden="true">PG</span>
        <div>
          <b>Trouble Brewing</b>
          <small>${esc(currentPhaseLabel())} · ${esc(headerCount())}</small>
        </div>
      </div>
      <nav class="host-nav" aria-label="${esc(t("table"))}">
        <a class="btn" href="#/bag">${esc(t("setup"))}</a>
        <a class="btn" href="#/seat">${esc(t("seats"))}</a>
        <a class="btn" href="#/secrets">${esc(t("secrets"))}</a>
        <a class="btn" href="#/player">${esc(t("player"))}</a>
        <a class="btn" href="#/public">${esc(t("publicScreen"))}</a>
        <a class="btn" href="#/help">${esc(t("help"))}</a>
        <a class="btn" href="#/sheet">${esc(t("roleSheet"))}</a>
        <button class="btn" type="button" data-act="undo" ${canUndo() ? "" : "disabled"}>${esc(t("undo"))}</button>
        <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
        <button class="btn" type="button" data-act="import">${esc(t("import"))}</button>
        <button class="btn btn--accent" type="button" data-act="hide">${esc(t("hide"))}</button>
      </nav>
    </header>`;
}

function mainCard() {
  if (state.phase === "over") return overCard();
  if (state.phase === "night") return nightCard();
  if (state.phase === "day") return dayCard();
  if (state.phase === "deal" || state.phase === "seat") return dealCard();
  if (state.phase === "setup" && !state.setup.roles.length) return setupPrompt();
  return dealCard();
}

function overlayMarkup() {
  if (overlay === "hide") {
    return `<div class="host-cover" role="dialog" aria-modal="true" aria-label="${esc(t("hide"))}">
      <div class="host-cover-box">
        <p class="label">${esc(t("hide"))}</p>
        <h2>Экран скрыт</h2>
        <p>${esc(t("playerWarning"))}</p>
        <button class="btn btn--accent" type="button" data-act="reveal">${esc(t("continue"))}</button>
      </div>
    </div>`;
  }
  if (overlay === "grimoire") {
    return grimoireMarkup();
  }
  if (overlay === "info") {
    const step = state.night.queue.find((candidate) => candidate.key === infoKey);
    if (!step) return "";
    const info = givenInfoStep(step);
    return `<div class="host-info-overlay" role="dialog" aria-modal="true" aria-label="${esc(t("showCard"))}">
      <div class="host-info-card">
        <p class="label">${esc(t("night"))} ${state.night.number} · ${esc(stepTitle(step))}</p>
        ${info.kind === "demon-info"
          ? demonInfoMarkup(info)
          : `<p class="host-info-big">${esc(infoText(state, step, info))}</p>`}
        <button class="btn btn--accent" type="button" data-act="hide-info">${esc(t("hideCard"))}</button>
      </div>
    </div>`;
  }
  if (overlay === "correction") return correctionMarkup();
  if (overlay === "export") return exportMarkup();
  if (overlay === "import") return importMarkup();
  return "";
}

function grimoireMarkup() {
  return `<div class="host-grimoire-overlay" role="dialog" aria-modal="true" aria-label="Гримуар">
    <div class="host-grimoire-card">
      <div class="host-panel-head">
        <div>
          <p class="label">Шпион</p>
          <h2>Гримуар</h2>
        </div>
        <button class="btn" type="button" data-act="hide-grimoire">Скрыть гримуар</button>
      </div>
      <p class="host-muted">Покажите только Шпиону. Не комментируйте.</p>
      <div class="host-grimoire-grid">
        ${orderedPlayers(state).map((player) => `
          <article class="host-grimoire-seat ${player.alive ? "" : "is-dead"}">
            <span class="host-seat-num">${player.seat}</span>
            <div>
              <b>${esc(displayName(player))}</b>
              <p>${esc(roleNameOf(player.roleId))} · ${esc(roleTeam(player.roleId) ? teamLabel(roleTeam(player.roleId)) : "—")}</p>
              <p class="host-muted">${player.alive ? "жив" : "мёртв"}</p>
              <p class="host-chips">${effectBadges(player)}</p>
            </div>
          </article>`).join("")}
      </div>
    </div>
  </div>`;
}

function demonInfoMarkup(info) {
  const bluffs = info.bluffs || state.bluffs || [];
  const minions = livingPlayers(state)
    .filter((player) => roleTeam(player.roleId) === "minion")
    .map(displayName);
  return `<div class="host-info-tokens">
    <span class="label">Приспешники</span>
    <p class="host-info-line">${esc(minions.join(", ") || "—")}</p>
    <span class="label">Блефы</span>
    <div class="host-token-row">
      ${bluffs.map((id) => roleTokenMarkup(id)).join("") || `<p class="host-muted">Нет блефов.</p>`}
    </div>
  </div>`;
}

function givenInfoStep(step) {
  const info = infoForStep(state, step, {
    targetIds: stepTargets(step),
    registrations: registrations.get(step.key) || {}
  });
  return givens.get(step.key) || info;
}

function correctionMarkup() {
  const players = orderedPlayers(state);
  const current = correction || {
    playerId: players[0] ? players[0].id : "",
    kind: "alive",
    value: "dead",
    reason: ""
  };
  const player = playerById(state, current.playerId);
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="correction-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="correction-title">${esc(t("correction"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-muted">${esc(t("correctionHint"))}</p>
      <label class="host-field"><span class="label">${esc(t("player"))}</span>
        <select class="field" data-correct="player">
          ${players.map((item) => `<option value="${esc(item.id)}"${item.id === current.playerId ? " selected" : ""}>${item.seat} · ${esc(displayName(item))}</option>`).join("")}
        </select>
      </label>
      <label class="host-field"><span class="label">${esc(t("correction"))}</span>
        <select class="field" data-correct="kind">
          <option value="alive"${current.kind === "alive" ? " selected" : ""}>${esc(t("markDead"))} / ${esc(t("revive"))}</option>
          <option value="role"${current.kind === "role" ? " selected" : ""}>${esc(t("role"))}</option>
          <option value="reminder"${current.kind === "reminder" ? " selected" : ""}>${esc(t("addReminder"))}</option>
          <option value="clear-winner"${current.kind === "clear-winner" ? " selected" : ""}>${esc(t("rollback"))}</option>
        </select>
      </label>
      ${current.kind === "alive" ? `
        <label class="host-field"><span class="label">${esc(t("role"))}</span>
          <select class="field" data-correct="alive-value">
            <option value="dead"${current.value === "dead" ? " selected" : ""}>${esc(t("markDead"))}</option>
            <option value="alive"${current.value === "alive" ? " selected" : ""}>${esc(t("revive"))}</option>
          </select>
        </label>` : ""}
      ${current.kind === "role" ? `
        <label class="host-field"><span class="label">${esc(t("role"))}</span>
          <select class="field" data-correct="role-value">
            ${ALL_ROLES.map((roleId) => `<option value="${esc(roleId)}"${current.value === roleId ? " selected" : ""}>${esc(roleNameOf(roleId))}</option>`).join("")}
          </select>
        </label>` : ""}
      ${current.kind === "reminder" ? `
        <label class="host-field"><span class="label">${esc(t("addReminder"))}</span>
          <input class="field" data-correct="reminder-value" value="${esc(current.value || "")}" maxlength="28">
        </label>` : ""}
      <label class="host-field"><span class="label">${esc(t("correctionReason"))}</span>
        <input class="field" data-correct="reason" value="${esc(current.reason || "")}" maxlength="120" placeholder="${esc(t("correctionReason"))}">
      </label>
      ${current.kind === "clear-winner" ? `<p class="host-warning">${esc(t("reviewHidden"))}</p>` : ""}
      <div class="host-inline">
        <button class="btn btn--accent" type="button" data-act="apply-correction" data-player="${esc(current.playerId)}">${esc(t("apply"))}</button>
        <button class="btn" type="button" data-act="close">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function exportMarkup() {
  if (!exportText) exportText = exportGame();
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="export-title">${esc(t("export"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-warning">${esc(t("exportWarning"))}</p>
      <textarea class="field host-json" readonly>${esc(exportText)}</textarea>
      <div class="host-inline">
        <button class="btn" type="button" data-act="download">${esc(t("save"))}</button>
        <button class="btn" type="button" data-act="copy">Копировать</button>
      </div>
    </div>
  </div>`;
}

function importMarkup() {
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="import-title">${esc(t("import"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-warning">${esc(t("exportWarning"))}</p>
      <textarea class="field host-json" data-import-text placeholder="${esc(t("importLabel"))}">${esc(importText)}</textarea>
      <div class="host-inline">
        <button class="btn btn--accent" type="button" data-act="apply-import">${esc(t("apply"))}</button>
        <button class="btn" type="button" data-act="close">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function render() {
  if (overlay === "hide" || overlay === "info" || overlay === "grimoire") {
    root.innerHTML = overlayMarkup();
    return;
  }
  root.innerHTML = `
    <div class="host">
      ${headerBar()}
      <div class="host-grid">
        ${seatRail()}
        <main class="host-main">${mainCard()}</main>
        ${sidePanel()}
      </div>
      <nav class="host-dock" aria-label="${esc(t("table"))}">
        <a href="#/bag">${esc(t("setup"))}</a>
        <a href="#/seat">${esc(t("seats"))}</a>
        <a href="#/player">${esc(t("player"))}</a>
        <a href="#/public">${esc(t("publicScreen"))}</a>
        <a href="#/help">${esc(t("help"))}</a>
      </nav>
      ${overlayMarkup()}
    </div>`;
}

function doAction(action) {
  return run((game) => action(game));
}

function afterResult(result) {
  if (!result) return;
  if (result.ok === false) {
    if (result.errors) {
      window.alert(result.errors.map((error) => error.message).join("\n"));
    } else if (result.error) {
      window.alert(result.error);
    }
    return;
  }
  save();
  render();
}

function completeNightStep(game, step) {
  return completeStep(game, step.key, {
    targetIds: stepTargets(step),
    redirectId: redirects.get(step.key) || null,
    registrations: registrations.get(step.key) || {},
    given: givens.get(step.key) || null
  });
}

export function mount(rootScreen) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  root = rootScreen;
  overlay = null;
  infoKey = null;
  correction = null;
  executeTarget = "";
  exportText = "";
  importText = "";
  armedNew = false;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const seatButton = target.closest("[data-correct]");
    if (seatButton) {
      selectedSeat = seatButton.dataset.correct;
      correction = {
        playerId: selectedSeat,
        kind: "alive",
        value: playerById(state, selectedSeat) && playerById(state, selectedSeat).alive ? "dead" : "alive",
        reason: ""
      };
      overlay = "correction";
      render();
      return;
    }

    const targetButton = target.closest("[data-target]");
    if (targetButton) {
      const key = targetButton.dataset.target;
      const id = targetButton.dataset.id;
      const step = state.night.queue.find((candidate) => candidate.key === key);
      if (!step) return;
      const list = (targets.get(key) || []).slice();
      const at = list.indexOf(id);
      if (at !== -1) list.splice(at, 1);
      else if (step.targetMode === "two") {
        if (list.length >= 2) list.shift();
        list.push(id);
      } else list.splice(0, list.length, id);
      targets.set(key, list);
      if (step.roleId === "imp" && list[0] && mayorRedirects(state, list[0]) && !redirects.has(key)) {
        redirects.set(key, "none");
      }
      render();
      return;
    }

    const heir = target.closest("[data-heir]");
    if (heir) {
      afterResult(doAction((game) => chooseDemonHeir(game, heir.dataset.heir, heir.dataset.id)));
      return;
    }

    const act = target.closest("[data-act]");
    if (!act) return;
    const name = act.dataset.act;

    if (name === "hide") {
      overlay = "hide";
      render();
    } else if (name === "reveal") {
      overlay = null;
      render();
    } else if (name === "hide-info") {
      overlay = null;
      infoKey = null;
      render();
    } else if (name === "show-grimoire") {
      overlay = "grimoire";
      render();
    } else if (name === "hide-grimoire") {
      overlay = null;
      render();
    } else if (name === "close") {
      overlay = null;
      correction = null;
      render();
    } else if (name === "show-info") {
      infoKey = act.dataset.key;
      overlay = "info";
      render();
    } else if (name === "end-night") {
      afterResult(doAction((game) => endNight(game)));
    } else if (name === "execute-direct") {
      if (!executeTarget) return;
      const result = doAction((game) => executeByDecision(game, executeTarget));
      if (result && result.ok) executeTarget = "";
      afterResult(result);
    } else if (name === "end-day") {
      executeTarget = "";
      afterResult(doAction((game) => endDay(game)));
    } else if (name === "slayer") {
      afterResult(doAction((game) => useSlayer(game, state.order.find((id) => {
        const player = playerById(state, id);
        return player && player.roleId === "slayer" && player.alive && !player.used.slayer;
      }), slayerTarget, { recluseRegistersDemon: recluseDemonSlayer })));
    } else if (name === "start-night") {
      afterResult(doAction((game) => startNight(game)));
    } else if (name === "complete") {
      const step = state.night.queue.find((candidate) => candidate.key === act.dataset.key);
      if (!step) return;
      const result = doAction((game) => completeNightStep(game, step));
      afterResult(result);
    } else if (name === "skip") {
      const reason = window.prompt("Причина пропуска шага");
      if (!reason) return;
      afterResult(doAction((game) => skipStep(game, act.dataset.key, reason)));
    } else if (name === "undo") {
      if (undo()) {
        overlay = null;
        render();
      }
    } else if (name === "new-game" || name === "new") {
      if (!armedNew) {
        armedNew = true;
        window.alert("Нажмите ещё раз, чтобы начать новую партию.");
        return;
      }
      reset(8);
      go("/bag");
    } else if (name === "export") {
      exportText = exportGame();
      overlay = "export";
      render();
    } else if (name === "import") {
      overlay = "import";
      render();
    } else if (name === "apply-import") {
      if (!window.confirm("Импорт заменит текущую партию. Продолжить?")) return;
      const result = importGame(importText);
      if (!result.ok) {
        window.alert(t("importError") + ": " + result.error);
        return;
      }
      overlay = null;
      render();
    } else if (name === "download") {
      const blob = new Blob([exportText], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pocket-grimoire-tb.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (name === "copy") {
      navigator.clipboard.writeText(exportText).catch(() => {});
    } else if (name === "timer-start") {
      timerEnd = Date.now() + 5 * 60 * 1000;
      render();
    } else if (name === "timer-stop") {
      timerEnd = null;
      render();
    } else if (name === "review") {
      state.reviewOpen = true;
      save();
      render();
    } else if (name === "apply-correction") {
      if (!correction || !correction.reason.trim()) {
        window.alert(t("correctionReason"));
        return;
      }
      const base = { playerId: correction.playerId, reason: correction.reason };
      let payload = null;
      if (correction.kind === "alive") {
        payload = { ...base, kind: "alive", value: correction.value === "alive" };
      } else if (correction.kind === "role") {
        payload = { ...base, kind: "role", value: correction.value };
      } else if (correction.kind === "reminder") {
        payload = { ...base, kind: "reminder", value: correction.value };
      } else if (correction.kind === "clear-winner") {
        payload = { kind: "clear-winner", reason: correction.reason };
      }
      const result = doAction((game) => manualCorrection(game, payload));
      afterResult(result);
      overlay = null;
      correction = null;
    }
  }, { signal });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;

    if (target.matches("[data-reg]")) {
      const key = target.dataset.reg;
      const playerId = target.dataset.regPlayer;
      const value = target.dataset.regValue;
      const regs = { ...(registrations.get(key) || {}) };
      if (target.checked) regs[playerId] = value;
      else delete regs[playerId];
      registrations.set(key, regs);
      render();
      return;
    }

    if (target.matches("[data-given]")) {
      const key = target.dataset.given;
      const step = state.night.queue.find((candidate) => candidate.key === key);
      if (!step) return;
      const info = infoForStep(state, step, {
        targetIds: stepTargets(step),
        registrations: registrations.get(key) || {}
      });
      if (target.value) {
        givens.set(key, applyGiven(info, target.value, target.dataset.givenKind));
      } else {
        givens.delete(key);
      }
      render();
      return;
    }

    if (target.matches("[data-redirect]")) {
      redirects.set(target.dataset.redirect, target.value || "none");
      render();
      return;
    }

    if (target.matches("[data-exec-target]")) {
      executeTarget = target.value;
      render();
      return;
    }

    if (target.matches("[data-slayer-target]")) {
      slayerTarget = target.value;
      render();
      return;
    }

    if (target.matches("[data-recluse-slayer]")) {
      recluseDemonSlayer = target.checked;
      return;
    }

    if (target.matches("[data-correct]")) {
      if (!correction) correction = { playerId: "", kind: "alive", value: "dead", reason: "" };
      const field = target.dataset.correct;
      if (field === "player") correction.playerId = target.value;
      else if (field === "kind") correction.kind = target.value;
      else if (field === "alive-value") correction.value = target.value;
      else if (field === "role-value") correction.value = target.value;
      else if (field === "reminder-value") correction.value = target.value;
      else if (field === "reason") correction.reason = target.value;
      render();
      return;
    }

    if (target.matches("[data-import-text]")) {
      importText = target.value;
    }
  }, { signal });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return;
    if (target.matches("[data-notes]")) {
      state.notes = target.value;
      save();
    } else if (target.matches("[data-import-text]")) {
      importText = target.value;
    } else if (target.matches("[data-correct='reason']")) {
      if (!correction) correction = { playerId: "", kind: "alive", value: "dead", reason: "" };
      correction.reason = target.value;
    }
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (overlay) {
      overlay = null;
      correction = null;
      infoKey = null;
      render();
    }
  }, { signal });

  timerId = setInterval(() => {
    const node = root.querySelector("[data-timer-text]");
    if (node) node.textContent = timerText();
  }, 1000);
  signal.addEventListener("abort", () => clearInterval(timerId));

  render();
}
