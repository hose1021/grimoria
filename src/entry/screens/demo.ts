// @ts-check
import { path } from "../../infrastructure/routing/history-router.ts";
import { esc } from "../../ui/dom.ts";
import { createGame, orderedPlayers, livingPlayers } from "../../core/model/state.ts";
import { roleLabel, teamLabel } from "../../core/model/rules.ts";
import { roleById } from "../../infrastructure/catalog/role-catalog.ts";
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
} from "../../core/engine/index.ts";
import { t } from "../../ui/i18n/strings.ts";
import type { GameState } from "../../core/model/types.ts";

type Scene = { title: string; text: string; run: () => void };

let abort: AbortController | null = null;
let demo: GameState | null = null;
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

function roleName(id: string | null): string {
  const role = roleById(id || "");
  return role ? role.name : roleLabel(id);
}

function findStep(game: GameState, roleId: string) {
  return game.night.queue.find((step) => step.roleId === roleId && !step.done);
}

function findSystem(game: GameState, system: string) {
  return game.night.queue.find((step) => step.system === system && !step.done);
}

function must(result: unknown): unknown {
  const outcome = result as { ok?: boolean; error?: string };
  if (!result || outcome.ok === false) {
    throw new Error(outcome.error || "Демонстрационный шаг не выполнен.");
  }
  return result;
}

function complete(
  game: GameState,
  roleId: string,
  options: { given?: Record<string, unknown>; targetIds?: string[] } = {},
) {
  const step = findStep(game, roleId);
  if (!step) throw new Error("Нет шага для роли " + roleLabel(roleId));
  return must(completeStep(game, step.key, options));
}

function completeSystem(game: GameState, system: string) {
  const step = findSystem(game, system);
  if (!step) return null;
  return must(completeStep(game, step.key, {}));
}

function createDemo(): GameState {
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

function buildScenes(game: GameState): Scene[] {
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

export function mount(root: HTMLElement): () => void {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  if (!demo) {
    try {
      demo = createDemo();
    } catch (error) {
      demo = createGame(10);
      errorText = (error as Error).message;
    }
  }
  let scenes = buildScenes(demo as GameState);

  function render(): void {
    const game = demo as GameState;
    const living = livingPlayers(game).length;
    const winner = game.winner;
    const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
    root.innerHTML = `<div class="demo mx-auto w-[min(1120px,100%)] px-4 pt-3.5 pb-12">
    <header class="demo-head flex flex-wrap items-start justify-between gap-3 px-0 pt-1 pb-3.5">
      <div>
        <p class="label">${esc(t("demo"))}</p>
        <h1 class="my-0.5 text-[24px]">${esc(t("demoTitle"))}</h1>
        <p class="max-w-[720px] text-[12px] text-muted">${esc(t("demoIntro"))}</p>
      </div>
      <nav class="demo-nav flex flex-wrap gap-1.5">
        <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
        <button class="btn" type="button" data-act="reset">${esc(t("demoReset"))}</button>
      </nav>
    </header>
    ${errorText ? `<div class="my-2 rounded-[9px] border border-[#5a2b2b] bg-[#2a1414] px-[11px] py-[9px] text-[13px] leading-[1.45] text-[#f0b5b5]">${esc(errorText)}</div>` : ""}
    <main class="demo-shell grid grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-start gap-3.5 max-[900px]:grid-cols-1">
      <section class="demo-card min-w-0 rounded-[14px] border border-line bg-panel p-3.5">
        <p class="label">${Math.min(sceneIndex + 1, scenes.length)} / ${scenes.length}</p>
        <h2 class="mt-1 mb-2 text-[17px]">${esc(scene ? scene.title : t("demoDone"))}</h2>
        <p class="text-[12px] leading-[1.5] text-muted">${esc(scene ? scene.text : "")}</p>
        <div class="flex flex-wrap items-center gap-1.5">
          <button class="btn btn--accent" type="button" data-act="next" ${sceneIndex >= scenes.length ? "disabled" : ""}>
            ${esc(t("demoNext"))}
          </button>
          <button class="btn" type="button" data-act="reset">${esc(t("demoReset"))}</button>
        </div>
        ${
          winner
            ? `<div class="mt-2.5 rounded-[10px] border border-[#1f5a4f] bg-[#0f1b18] p-2.5">
            <span class="label">${esc(t("winner"))}</span>
            <b class="my-[3px] block text-[20px]">${winner.team === "good" ? esc(t("winnerGood")) : esc(t("winnerEvil"))}</b>
            <p class="text-[12px] leading-[1.5] text-muted">${esc(winner.detail)}</p>
          </div>`
            : ""
        }
      </section>

      <section class="demo-card min-w-0 rounded-[14px] border border-line bg-panel p-3.5">
        <div class="mb-[7px] flex flex-wrap items-baseline justify-between gap-1.5">
          <h2 class="mt-1 mb-2 text-[17px]">${esc(t("seats"))}</h2>
          <span class="text-[13px] leading-[1.45] text-muted">${living} ${esc(t("alive"))}</span>
        </div>
        <div class="demo-seats grid grid-cols-2 gap-[5px] max-[640px]:grid-cols-1">
          ${orderedPlayers(game)
            .map(
              (player) => `
              <div class="demo-seat grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-line p-1.5 ${player.alive ? "" : "border-dashed opacity-55"}">
                <span class="demo-seat-num text-[10px] text-muted">${player.seat}</span>
                <span>
                  <b class="block text-[11px]">${esc(player.name)}</b>
                  <small class="block text-[9.5px] text-muted">${esc(roleName(player.roleId))} · ${esc(teamLabel(roleById(player.roleId || "")?.team || "townsfolk"))}</small>
                </span>
                ${player.alive ? "" : `<em class="text-[9px] not-italic text-danger">${esc(t("dead"))}</em>`}
              </div>`,
            )
            .join("")}
        </div>
      </section>

      <section class="demo-card min-w-0 rounded-[14px] border border-line bg-panel p-3.5">
        <h2 class="mt-1 mb-2 text-[17px]">${esc(t("log"))}</h2>
        <ol class="grid list-none gap-1 p-0">
          ${(game.log || [])
            .slice(-12)
            .reverse()
            .map(
              (entry) => `
              <li class="border-l-2 border-line-2 pl-[7px]"><b class="block text-[14px] font-[550]">${esc(entry.title)}</b><span class="block text-[13px] leading-[1.4] text-muted">${esc(entry.phase)}${entry.detail ? " · " + esc(entry.detail) : ""}</span></li>`,
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
      const act = target.closest("[data-act]") as HTMLElement | null;
      if (!act) return;
      if (act.dataset.act === "reset") {
        demo = null;
        sceneIndex = 0;
        errorText = "";
        try {
          demo = createDemo();
        } catch (error) {
          demo = createGame(10);
          errorText = (error as Error).message;
        }
        scenes = buildScenes(demo as GameState);
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
          errorText = (error as Error).message;
        }
        render();
      }
    },
    { signal },
  );

  render();
  return unmount;
}

export function unmount(): void {
  if (abort) abort.abort();
  abort = null;
}
