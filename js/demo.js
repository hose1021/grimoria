// @ts-check
import { path } from "./router.js";
import { esc } from "./ui.js";
import { createGame, orderedPlayers, livingPlayers } from "./model.js";
import { roleLabel, teamLabel } from "./rules.js";
import { roleById } from "./roles.js";
import {
  autoSecrets,
  completeStep,
  dealGame,
  endDay,
  endNight,
  execute as executeGame,
  nominate,
  openNominations,
  recordVotes,
  startNight,
} from "./engine.js";
import { t } from "./strings.js";

/** @typedef {import("./types.d.ts").GameState} GameState */
/** @typedef {{ title: string, text: string, run: () => void }} Scene */

/** @type {AbortController | null} */
let abort = null;
/** @type {GameState | null} */
let demo = null;
let sceneIndex = 0;
let errorText = "";

const NAMES = ["Аня", "Борис", "Вера", "Гриша", "Даша", "Егор", "Женя", "Зоя", "Илья", "Кира"];

const ASSIGNMENT = {
  1: "washerwoman",
  2: "chef",
  3: "empath",
  4: "fortuneteller",
  5: "undertaker",
  6: "monk",
  7: "slayer",
  8: "poisoner",
  9: "spy",
  10: "imp",
};

const DEMO_BAG = {
  roles: [
    "washerwoman",
    "chef",
    "empath",
    "fortuneteller",
    "undertaker",
    "monk",
    "slayer",
    "poisoner",
    "spy",
    "imp",
  ],
  bluffs: ["soldier", "virgin", "ravenkeeper"],
  drunkShownId: null,
};

/** @param {string | null} id @returns {string} */
function roleName(id) {
  const role = roleById(id || "");
  return role ? role.name : roleLabel(id);
}

/** @param {GameState} game @param {string} roleId */
function findStep(game, roleId) {
  return game.night.queue.find((step) => step.roleId === roleId && !step.done);
}

/** @param {GameState} game @param {string} system */
function findSystem(game, system) {
  return game.night.queue.find((step) => step.system === system && !step.done);
}

/** @param {unknown} result @returns {unknown} */
function must(result) {
  const outcome = /** @type {{ ok?: boolean, error?: string }} */ (result);
  if (!result || outcome.ok === false) {
    throw new Error(outcome.error || "Демонстрационный шаг не выполнен.");
  }
  return result;
}

/** @param {GameState} game @param {string} roleId @param {Record<string, unknown>} [options] */
function complete(game, roleId, options = {}) {
  const step = findStep(game, roleId);
  if (!step) throw new Error("Нет шага для роли " + roleLabel(roleId));
  return must(completeStep(game, step.key, options));
}

/** @param {GameState} game @param {string} system */
function completeSystem(game, system) {
  const step = findSystem(game, system);
  if (!step) return null;
  return must(completeStep(game, step.key, {}));
}

/** @returns {GameState} */
function createDemo() {
  const game = createGame(10);
  Object.entries(ASSIGNMENT).forEach(([id]) => {
    game.players[id].name = NAMES[Number(id) - 1];
  });
  game.setup.count = 10;
  game.setup.roles = DEMO_BAG.roles.slice();
  game.setup.bluffs = DEMO_BAG.bluffs.slice();
  game.setup.drunkShownId = DEMO_BAG.drunkShownId;
  must(dealGame(game, { assignment: ASSIGNMENT }));
  autoSecrets(game);
  // Sheet 1: Washerwoman learns Chef, with the Washerwoman herself as the decoy.
  game.setup.info.washerwoman = {
    roleId: "chef",
    pair: ["2", "1"],
    matchIndex: 0,
  };
  must(startNight(game));
  return game;
}

/** @param {GameState} game @returns {Scene[]} */
function buildScenes(game) {
  return [
    {
      title: "Первая ночь: знакомство зла",
      text: "Ведущий будит Приспешников и Демона отдельными системными шагами. В 10-игровой партии Демон получает Приспешников и три блефа.",
      run: () => {
        completeSystem(game, "minioninfo");
        completeSystem(game, "demoninfo");
      },
    },
    {
      title: "Первая ночь: Отравитель",
      text: "Отравитель (место 8) выбирает Эмпата (место 3). Эмпат отравлен этой ночью и следующим днём.",
      run: () => complete(game, "poisoner", { targetIds: ["3"] }),
    },
    {
      title: "Первая ночь: Прачка",
      text: "Прачка узнаёт, что один из двух игроков — Повар: место 2 или место 1.",
      run: () => complete(game, "washerwoman"),
    },
    {
      title: "Первая ночь: Повар",
      text: "Повар получает число пар злых соседей. В этом составе есть две пары: 8–9 и 9–10.",
      run: () => complete(game, "chef"),
    },
    {
      title: "Первая ночь: Эмпат и дезинформация",
      text: "Эмпат отравлен, поэтому способность не работает. Ведущий показывает ложное число 1 вместо вычисленного 0. Это пример разрешённой ложной информации.",
      run: () =>
        complete(game, "empath", {
          given: { kind: "number", value: 1 },
        }),
    },
    {
      title: "Первая ночь: Гадалка",
      text: "Гадалка выбирает красную селёдку (место 1) и Демона (место 10). Ответ — «да».",
      run: () => complete(game, "fortuneteller", { targetIds: ["1", "10"] }),
    },
    {
      title: "Первая ночь: Шпион",
      text: "Шпион просыпается последним и видит гримуар. Ведущий показывает актуальное состояние.",
      run: () => complete(game, "spy"),
    },
    {
      title: "Утро дня 1",
      text: "Ночных смертей нет. Ведущий объявляет только этот факт, без ролей и причин.",
      run: () => must(endNight(game)),
    },
    {
      title: "День 1: казнь Шпиона",
      text: "Открываются номинации. Аня (место 1) номинирует Илью (место 9, Шпион). Шесть голосов при пороге пять — казнь. День завершается.",
      run: () => {
        must(openNominations(game));
        must(nominate(game, "1", "9"));
        must(recordVotes(game, game.day.nominations[0].id, ["1", "2", "3", "4", "5", "6"]));
        must(executeGame(game, game.day.nominations[0].id));
        must(endDay(game));
      },
    },
    {
      title: "Ночь 2: Отравитель",
      text: "Отравитель снова выбирает Эмпата (место 3).",
      run: () => complete(game, "poisoner", { targetIds: ["3"] }),
    },
    {
      title: "Ночь 2: Монах",
      text: "Монах (место 6) защищает Гадалку (место 4).",
      run: () => complete(game, "monk", { targetIds: ["4"] }),
    },
    {
      title: "Ночь 2: Чёрт убивает Повара",
      text: "Чёрт (место 10) выбирает Повара (место 2). Борис погибает ночью. Утром ведущий объявит только имя.",
      run: () => complete(game, "imp", { targetIds: ["2"] }),
    },
    {
      title: "Ночь 2: Эмпат снова отравлен",
      text: "Эмпат опять отравлен. Ведущий показывает ложное 1 вместо вычисленного 0. Ложная информация остаётся решением ведущего.",
      run: () =>
        complete(game, "empath", {
          given: { kind: "number", value: 1 },
        }),
    },
    {
      title: "Ночь 2: Гадалка",
      text: "Гадалка снова выбирает красную селёдку (место 1) и Демона (место 10). Ответ — «да».",
      run: () => complete(game, "fortuneteller", { targetIds: ["1", "10"] }),
    },
    {
      title: "Ночь 2: Гробовщик",
      text: "Гробовщик (место 5) узнаёт роль казнённого днём: Шпион. Это событие казни, а не ночной смерти.",
      run: () =>
        complete(game, "undertaker", {
          given: { kind: "character", roleId: "spy", playerId: "9" },
        }),
    },
    {
      title: "Утро дня 2",
      text: "Ночью погиб Борис (Повар). Ведущий объявляет имя и не называет роль.",
      run: () => must(endNight(game)),
    },
    {
      title: "День 2: казнь Чёрта",
      text: "Аня номинирует Киру (место 10, Чёрт). Шесть голосов при пороге четыре — казнь. Алой женщины в наборе нет, поэтому добро побеждает.",
      run: () => {
        must(openNominations(game));
        must(nominate(game, "1", "10"));
        must(recordVotes(game, game.day.nominations[0].id, ["1", "3", "4", "5", "6", "7"]));
        must(executeGame(game, game.day.nominations[0].id));
      },
    },
    {
      title: "Итог",
      text: "Добро победило, потому что Чёрт казнён и никто не унаследовал роль. Откройте разбор ролей в обычном столе после окончания реальной партии.",
      run: () => {},
    },
  ];
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  if (!demo) {
    try {
      demo = createDemo();
    } catch (error) {
      demo = createGame(10);
      errorText = /** @type {Error} */ (error).message;
    }
  }
  let scenes = buildScenes(demo);

  function render() {
    const game = /** @type {GameState} */ (demo);
    const living = livingPlayers(game).length;
    const winner = game.winner;
    const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
    root.innerHTML = `<div class="demo">
      <header class="demo-head">
        <div>
          <p class="label">${esc(t("demo"))}</p>
          <h1>${esc(t("demoTitle"))}</h1>
          <p>${esc(t("demoIntro"))}</p>
        </div>
        <nav class="demo-nav">
          <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
          <button class="btn" type="button" data-act="reset">${esc(t("demoReset"))}</button>
        </nav>
      </header>
      ${errorText ? `<div class="host-alert is-error">${esc(errorText)}</div>` : ""}
      <main class="demo-shell">
        <section class="demo-card">
          <p class="label">${Math.min(sceneIndex + 1, scenes.length)} / ${scenes.length}</p>
          <h2>${esc(scene ? scene.title : t("demoDone"))}</h2>
          <p>${esc(scene ? scene.text : "")}</p>
          <div class="host-inline">
            <button class="btn btn--accent" type="button" data-act="next" ${sceneIndex >= scenes.length ? "disabled" : ""}>
              ${esc(t("demoNext"))}
            </button>
            <button class="btn" type="button" data-act="reset">${esc(t("demoReset"))}</button>
          </div>
          ${
            winner
              ? `<div class="demo-winner">
            <span class="label">${esc(t("winner"))}</span>
            <b>${winner.team === "good" ? esc(t("winnerGood")) : esc(t("winnerEvil"))}</b>
            <p>${esc(winner.detail)}</p>
          </div>`
              : ""
          }
        </section>

        <section class="demo-card">
          <div class="host-panel-head">
            <h2>${esc(t("seats"))}</h2>
            <span class="host-muted">${living} ${esc(t("alive"))}</span>
          </div>
          <div class="demo-seats">
            ${orderedPlayers(game)
              .map(
                (player) => `
              <div class="demo-seat ${player.alive ? "" : "is-dead"}">
                <span class="demo-seat-num">${player.seat}</span>
                <span>
                  <b>${esc(player.name)}</b>
                  <small>${esc(roleName(player.roleId))} · ${esc(teamLabel(roleById(player.roleId || "")?.team || "townsfolk"))}</small>
                </span>
                ${player.alive ? "" : `<em>${esc(t("dead"))}</em>`}
              </div>`,
              )
              .join("")}
          </div>
        </section>

        <section class="demo-card">
          <h2>${esc(t("log"))}</h2>
          <ol class="host-log">
            ${(game.log || [])
              .slice(-12)
              .reverse()
              .map(
                (entry) => `
              <li><b>${esc(entry.title)}</b><span>${esc(entry.phase)}${entry.detail ? " · " + esc(entry.detail) : ""}</span></li>`,
              )
              .join("")}
          </ol>
        </section>
      </main>
    </div>`;
  }

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const act = /** @type {HTMLElement | null} */ (target.closest("[data-act]"));
      if (!act) return;
      if (act.dataset.act === "reset") {
        demo = null;
        sceneIndex = 0;
        errorText = "";
        try {
          demo = createDemo();
        } catch (error) {
          demo = createGame(10);
          errorText = /** @type {Error} */ (error).message;
        }
        scenes = buildScenes(demo);
        render();
        return;
      }
      if (act.dataset.act === "next") {
        const scene = scenes[sceneIndex];
        if (!scene) return;
        try {
          scene.run();
          sceneIndex += 1;
          errorText = "";
        } catch (error) {
          errorText = /** @type {Error} */ (error).message;
        }
        render();
      }
    },
    { signal },
  );

  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
