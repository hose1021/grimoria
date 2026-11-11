import type { RoleId, Script } from "./types.js";

type RoleTeam = "townsfolk" | "outsider" | "minion" | "demon";

// Pure Trouble Brewing rules data. No DOM, no storage.
// Sources checked 2026-11-03: official setup sheet, wiki Glossary, official
// nightsheet.json from release.botc.app. See docs/rules-sources.md.

export const SCRIPT_NAME = "Trouble Brewing";

export const COMPOSITION: Record<number, readonly [number, number, number, number]> = {
  5: [3, 0, 1, 1],
  6: [3, 1, 1, 1],
  7: [5, 0, 1, 1],
  8: [5, 1, 1, 1],
  9: [5, 2, 1, 1],
  10: [7, 0, 2, 1],
  11: [7, 1, 2, 1],
  12: [7, 2, 2, 1],
  13: [9, 0, 3, 1],
  14: [9, 1, 3, 1],
  15: [9, 2, 3, 1],
};

export const TEAMS: RoleTeam[] = ["townsfolk", "outsider", "minion", "demon"];

export const TB: Record<RoleTeam, RoleId[]> = {
  townsfolk: [
    "washerwoman",
    "librarian",
    "investigator",
    "chef",
    "empath",
    "fortuneteller",
    "undertaker",
    "monk",
    "ravenkeeper",
    "virgin",
    "slayer",
    "soldier",
    "mayor",
  ],
  outsider: ["butler", "drunk", "recluse", "saint"],
  minion: ["poisoner", "spy", "scarletwoman", "baron"],
  demon: ["imp"],
};

export const ALL_ROLES: RoleId[] = TB.townsfolk.concat(TB.outsider, TB.minion, TB.demon);

// Bad Moon Rising. The role data and night order come from the official
// roles.json and nightsheet.json snapshots in docs/official/.
export const BMR: Record<RoleTeam, RoleId[]> = {
  townsfolk: [
    "chambermaid",
    "courtier",
    "exorcist",
    "fool",
    "gambler",
    "gossip",
    "grandmother",
    "innkeeper",
    "minstrel",
    "pacifist",
    "professor",
    "sailor",
    "tealady",
  ],
  outsider: ["goon", "lunatic", "moonchild", "tinker"],
  minion: ["assassin", "devilsadvocate", "godfather", "mastermind"],
  demon: ["po", "pukka", "shabaloth", "zombuul"],
};

export const BMR_ALL: RoleId[] = BMR.townsfolk.concat(BMR.outsider, BMR.minion, BMR.demon);

// Sects & Violets. Fang Gu adds one Outsider; Vigormortis removes one.
export const SNV: Record<RoleTeam, RoleId[]> = {
  townsfolk: [
    "artist",
    "clockmaker",
    "dreamer",
    "flowergirl",
    "juggler",
    "mathematician",
    "oracle",
    "philosopher",
    "sage",
    "savant",
    "seamstress",
    "snakecharmer",
    "towncrier",
  ],
  outsider: ["barber", "klutz", "mutant", "sweetheart"],
  minion: ["cerenovus", "eviltwin", "pithag", "witch"],
  demon: ["fanggu", "nodashii", "vigormortis", "vortox"],
};

export const SNV_ALL: RoleId[] = SNV.townsfolk.concat(SNV.outsider, SNV.minion, SNV.demon);
export const SUPPORTED_ROLES: RoleId[] = ALL_ROLES.concat(BMR_ALL, SNV_ALL);

export const ROLE_TEAM: Record<RoleId, RoleTeam> = (() => {
  const map: Record<RoleId, RoleTeam> = {};
  for (const team of TEAMS) for (const id of TB[team]) map[id] = team;
  for (const team of TEAMS) for (const id of BMR[team]) map[id] = team;
  for (const team of TEAMS) for (const id of SNV[team]) map[id] = team;
  return map;
})();

const TB_ROLE_SET = new Set(ALL_ROLES);
const BMR_ROLE_SET = new Set(BMR_ALL);
const SNV_ROLE_SET = new Set(SNV_ALL);

export const ROLE_NAME_RU: Record<RoleId, string> = {
  washerwoman: "Прачка",
  librarian: "Библиотекарь",
  investigator: "Сыщик",
  chef: "Повар",
  empath: "Эмпат",
  fortuneteller: "Гадалка",
  undertaker: "Гробовщик",
  monk: "Монах",
  ravenkeeper: "Смотритель Воронов",
  virgin: "Девственница",
  slayer: "Истребитель",
  soldier: "Солдат",
  mayor: "Мэр",
  butler: "Дворецкий",
  drunk: "Пьяница",
  recluse: "Затворник",
  saint: "Святой",
  poisoner: "Отравитель",
  spy: "Шпион",
  scarletwoman: "Блудница",
  baron: "Барон",
  imp: "Чёрт",
  chambermaid: "Горничная",
  courtier: "Придворный",
  exorcist: "Экзорцист",
  fool: "Шут",
  gambler: "Азартный Игрок",
  gossip: "Сплетница",
  grandmother: "Бабушка",
  innkeeper: "Трактирщик",
  minstrel: "Менестрель",
  pacifist: "Пацифист",
  professor: "Профессор",
  sailor: "Моряк",
  tealady: "Травница",
  goon: "Наёмник",
  lunatic: "Безумец",
  moonchild: "Дитя Луны",
  tinker: "Механик",
  assassin: "Ассасин",
  devilsadvocate: "Адвокат Дьявола",
  godfather: "Крёстный Отец",
  mastermind: "Кукловод",
  po: "По",
  pukka: "Пукка",
  shabaloth: "Шабалот",
  zombuul: "Зомбул",
  artist: "Художник",
  clockmaker: "Часовщик",
  dreamer: "Сновидец",
  flowergirl: "Цветочница",
  juggler: "Жонглёр",
  mathematician: "Математик",
  oracle: "Оракул",
  philosopher: "Философ",
  sage: "Мудрец",
  savant: "Савант",
  seamstress: "Швея",
  snakecharmer: "Заклинатель Змей",
  towncrier: "Глашатай",
  barber: "Цирюльник",
  klutz: "Растяпа",
  mutant: "Уродец",
  sweetheart: "Душечка",
  cerenovus: "Цереновус",
  eviltwin: "Злой Близнец",
  pithag: "Яга",
  witch: "Ведьма",
  fanggu: "Фань Гу",
  nodashii: "Но Даши",
  vigormortis: "Вигормортис",
  vortox: "Вортокс",
};

export const ROLE_NAME: Record<RoleId, string> = {
  washerwoman: "Washerwoman",
  librarian: "Librarian",
  investigator: "Investigator",
  chef: "Chef",
  empath: "Empath",
  fortuneteller: "Fortune Teller",
  undertaker: "Undertaker",
  monk: "Monk",
  ravenkeeper: "Ravenkeeper",
  virgin: "Virgin",
  slayer: "Slayer",
  soldier: "Soldier",
  mayor: "Mayor",
  butler: "Butler",
  drunk: "Drunk",
  recluse: "Recluse",
  saint: "Saint",
  poisoner: "Poisoner",
  spy: "Spy",
  scarletwoman: "Scarlet Woman",
  baron: "Baron",
  imp: "Imp",
  chambermaid: "Chambermaid",
  courtier: "Courtier",
  exorcist: "Exorcist",
  fool: "Fool",
  gambler: "Gambler",
  gossip: "Gossip",
  grandmother: "Grandmother",
  innkeeper: "Innkeeper",
  minstrel: "Minstrel",
  pacifist: "Pacifist",
  professor: "Professor",
  sailor: "Sailor",
  tealady: "Tea Lady",
  goon: "Goon",
  lunatic: "Lunatic",
  moonchild: "Moonchild",
  tinker: "Tinker",
  assassin: "Assassin",
  devilsadvocate: "Devil's Advocate",
  godfather: "Godfather",
  mastermind: "Mastermind",
  po: "Po",
  pukka: "Pukka",
  shabaloth: "Shabaloth",
  zombuul: "Zombuul",
  artist: "Artist",
  clockmaker: "Clockmaker",
  dreamer: "Dreamer",
  flowergirl: "Flowergirl",
  juggler: "Juggler",
  mathematician: "Mathematician",
  oracle: "Oracle",
  philosopher: "Philosopher",
  sage: "Sage",
  savant: "Savant",
  seamstress: "Seamstress",
  snakecharmer: "Snake Charmer",
  towncrier: "Town Crier",
  barber: "Barber",
  klutz: "Klutz",
  mutant: "Mutant",
  sweetheart: "Sweetheart",
  cerenovus: "Cerenovus",
  eviltwin: "Evil Twin",
  pithag: "Pit-Hag",
  witch: "Witch",
  fanggu: "Fang Gu",
  nodashii: "No Dashii",
  vigormortis: "Vigormortis",
  vortox: "Vortox",
};

// Official app night order. The app orders the Spy last so the Spy sees the
// final grimoire. The Scarlet Woman entry is passive; the engine resolves it
// at the moment the Demon dies, then records the result in the queue.
export const NIGHT_FIRST = [
  "minioninfo",
  "demoninfo",
  "poisoner",
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "fortuneteller",
  "butler",
  "spy",
];

export const NIGHT_OTHER = [
  "poisoner",
  "monk",
  "scarletwoman",
  "imp",
  "ravenkeeper",
  "empath",
  "fortuneteller",
  "undertaker",
  "butler",
  "spy",
];

// The official order puts minion info before the Lunatic and demon info after
// it, so the app emits a combined info pair at that position: the Lunatic must
// be told its false demon identity without seeing the real Minions first.
export const BMR_NIGHT_FIRST = [
  "info",
  "lunatic",
  "sailor",
  "courtier",
  "godfather",
  "devilsadvocate",
  "pukka",
  "grandmother",
  "chambermaid",
];

export const BMR_NIGHT_OTHER = [
  "sailor",
  "courtier",
  "innkeeper",
  "gambler",
  "devilsadvocate",
  "lunatic",
  "exorcist",
  "zombuul",
  "pukka",
  "shabaloth",
  "po",
  "assassin",
  "godfather",
  "gossip",
  "professor",
  "tinker",
  "moonchild",
  "grandmother",
  "chambermaid",
];

export const SV_NIGHT_FIRST = [
  "philosopher",
  "info",
  "snakecharmer",
  "eviltwin",
  "witch",
  "cerenovus",
  "clockmaker",
  "dreamer",
  "seamstress",
  "mathematician",
];

export const SV_NIGHT_OTHER = [
  "philosopher",
  "snakecharmer",
  "witch",
  "cerenovus",
  "pithag",
  "fanggu",
  "nodashii",
  "vortox",
  "vigormortis",
  "barber",
  "sweetheart",
  "sage",
  "dreamer",
  "flowergirl",
  "towncrier",
  "oracle",
  "seamstress",
  "juggler",
  "mathematician",
];

export const SYSTEM_STEPS = {
  minioninfo: "Знакомство Приспешников",
  demoninfo: "Знакомство Демона",
  demonchange: "Смена Демона",
};

export const ROLE_REMINDERS_RU: Record<RoleId, string[]> = {
  washerwoman: ["Горожанин", "Не тот"],
  librarian: ["Изгой", "Не тот"],
  investigator: ["Приспешник", "Не тот"],
  fortuneteller: ["Красная селёдка"],
  undertaker: ["Казнён сегодня"],
  monk: ["Защищён"],
  virgin: ["Без способности"],
  slayer: ["Без способности"],
  poisoner: ["Отравлен"],
  spy: [],
  scarletwoman: ["Стала Демоном"],
  imp: ["Мёртв"],
  butler: ["Хозяин"],
  drunk: [],
  recluse: [],
  saint: [],
  baron: [],
  chef: [],
  empath: [],
  ravenkeeper: [],
  soldier: [],
  mayor: [],
};

export function isTbRole(id: RoleId): boolean {
  return TB_ROLE_SET.has(id);
}

export function isBmrRole(id: RoleId): boolean {
  return BMR_ROLE_SET.has(id);
}

export function isSnvRole(id: RoleId): boolean {
  return SNV_ROLE_SET.has(id);
}

export function isSupportedRole(id: RoleId): boolean {
  return TB_ROLE_SET.has(id) || BMR_ROLE_SET.has(id) || SNV_ROLE_SET.has(id);
}

export function roleEdition(id: RoleId): "tb" | "bmr" | "snv" | null {
  if (TB_ROLE_SET.has(id)) return "tb";
  if (BMR_ROLE_SET.has(id)) return "bmr";
  if (SNV_ROLE_SET.has(id)) return "snv";
  return null;
}

export function editionsIn(roles: RoleId[] = []): Set<"tb" | "bmr" | "snv"> {
  const editions: Set<"tb" | "bmr" | "snv"> = new Set();
  for (const id of roles) {
    const edition = roleEdition(id);
    if (edition) editions.add(edition);
  }
  return editions;
}

// A pool that spans editions has no single scenario engine. The bag screen can
// still author it, but dealing stays blocked until the engine supports it.
export function isMixedEdition(roles: RoleId[] = []): boolean {
  return editionsIn(roles).size > 1;
}

// Mixed-edition games have no single scenario engine. The host resolves
// abilities and victory; the application only tracks seats, deaths, phases and
// the winner.
export function isManualScript(script: Script | null | undefined): boolean {
  return Boolean(script && script.manualOnly === true);
}

export function isSnvScript(script: Script | null | undefined): boolean {
  if (!script) return false;
  if (script.edition === "snv") return true;
  return Array.isArray(script.roles) && script.roles.some((id) => SNV_ROLE_SET.has(id));
}

export function isBmrScript(script: Script | null | undefined): boolean {
  if (!script) return false;
  if (script.edition === "bmr") return true;
  return Array.isArray(script.roles) && script.roles.some((id) => BMR_ROLE_SET.has(id));
}

export function roleTeam(id: RoleId): RoleTeam | null {
  return ROLE_TEAM[id] || null;
}

export function isGoodRole(id: RoleId): boolean {
  const team = roleTeam(id);
  return team === "townsfolk" || team === "outsider";
}

export function isEvilRole(id: RoleId): boolean {
  const team = roleTeam(id);
  return team === "minion" || team === "demon";
}

export function outsiderShift(roles: RoleId[] = [], godfatherOutsider: 1 | -1 = 1): number {
  let shift = roles.includes("baron") ? 2 : 0;
  if (roles.includes("godfather")) shift += godfatherOutsider === -1 ? -1 : 1;
  if (roles.includes("fanggu")) shift += 1;
  if (roles.includes("vigormortis")) shift -= 1;
  return shift;
}

export function compositionFor(
  count: number,
  roles: RoleId[] = [],
  godfatherOutsider: 1 | -1 = 1,
): { townsfolk: number; outsider: number; minion: number; demon: number } | null {
  const base = COMPOSITION[count];
  if (!base) return null;
  const [townsfolk, outsider, minion, demon] = base;
  const shift = outsiderShift(roles, godfatherOutsider);
  return {
    townsfolk: townsfolk - shift,
    outsider: outsider + shift,
    minion,
    demon,
  };
}

export function bagCounts(roles: RoleId[]): Record<RoleTeam, number> {
  const counts: Record<RoleTeam, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of roles) {
    const team = roleTeam(id);
    if (team) counts[team] += 1;
  }
  return counts;
}

export function requiredBluffs(count: number): number {
  return count >= 7 ? 3 : 0;
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function take<T>(pool: T[], count: number, rng: () => number): T[] {
  if (pool.length < count) throw new Error("not enough roles");
  return shuffle(pool, rng).slice(0, count);
}

function teamsIn(pool: RoleId[]): Record<RoleTeam, RoleId[]> {
  const teams: Record<RoleTeam, RoleId[]> = { townsfolk: [], outsider: [], minion: [], demon: [] };
  for (const id of pool) {
    const team = roleTeam(id);
    if (team && teams[team]) teams[team].push(id);
  }
  return teams;
}

export function randomBag(
  count: number,
  rng: () => number = Math.random,
  pool: RoleId[] = ALL_ROLES,
  options: { godfatherOutsider?: 1 | -1 } = {},
): { roles: RoleId[]; bluffs: RoleId[]; drunkShownId: RoleId | null } {
  const base = COMPOSITION[count];
  if (!base) throw new Error("Неподдерживаемое число игроков.");
  const [baseTown, baseOutsider, baseMinion, baseDemon] = base;
  const teams = teamsIn(pool);

  if (teams.minion.length < baseMinion || teams.demon.length < baseDemon) {
    throw new Error("В сценарии не хватает ролей для " + count + " игроков.");
  }
  // Pick the Demon before the Outsider count: Fang Gu and Vigormortis change
  // the composition, just like the Baron and the Godfather. Retry candidate
  // Demons until one produces a legal composition (for example Vigormortis
  // cannot remove an Outsider at seven players).
  const minions = take(teams.minion, baseMinion, rng);
  let demons: RoleId[] | null = null;
  let shift = 0;
  for (const candidate of shuffle(teams.demon, rng)) {
    const candidateShift = outsiderShift([...minions, candidate], options.godfatherOutsider);
    const candidateTown = baseTown - candidateShift;
    const candidateOutsider = baseOutsider + candidateShift;
    if (
      candidateTown >= 0 &&
      candidateOutsider >= 0 &&
      candidateOutsider <= teams.outsider.length &&
      candidateTown <= teams.townsfolk.length
    ) {
      demons = [candidate];
      shift = candidateShift;
      break;
    }
  }
  if (!demons) throw new Error("В сценарии не хватает ролей для " + count + " игроков.");
  const townsfolkCount = baseTown - shift;
  const outsiderCount = baseOutsider + shift;
  const outsiders = take(teams.outsider, outsiderCount, rng);
  const townsfolk = take(teams.townsfolk, townsfolkCount, rng);
  const roles: RoleId[] = townsfolk.concat(outsiders, minions, demons);

  let drunkShownId: RoleId | null = null;
  if (roles.includes("drunk")) {
    const unused = teams.townsfolk.filter((id) => !roles.includes(id));
    drunkShownId = take(unused, 1, rng)[0] || null;
  }

  let bluffs: RoleId[] = [];
  if (requiredBluffs(count) === 3) {
    const goodUnused = teams.townsfolk
      .concat(teams.outsider)
      .filter((id) => !roles.includes(id) && id !== drunkShownId);
    const preferred = goodUnused.filter((id) => roleTeam(id) === "townsfolk");
    const bluffPool = preferred.concat(goodUnused.filter((id) => roleTeam(id) === "outsider"));
    if (bluffPool.length < 3) {
      throw new Error("В сценарии не хватает добрых ролей для блефов Демона.");
    }
    bluffs = take(bluffPool, 3, rng);
  }

  return { roles, bluffs, drunkShownId };
}

// Validation returns stable codes plus Russian messages. The UI never invents
// a reason for an illegal bag.
export function bagErrors({
  count,
  roles = [],
  bluffs = [],
  drunkShownId = null,
  herringId = null,
  pool = ALL_ROLES,
  godfatherOutsider = 1,
}: {
  count: number;
  roles?: RoleId[];
  bluffs?: RoleId[];
  drunkShownId?: RoleId | null;
  herringId?: RoleId | null;
  pool?: RoleId[];
  godfatherOutsider?: 1 | -1;
}): { code: string; message: string }[] {
  const errors: { code: string; message: string }[] = [];
  const add = (code: string, message: string) => errors.push({ code, message });
  const inScript = new Set(pool);

  if (!Number.isInteger(count) || count < 5 || count > 15) {
    add("count", "Число игроков должно быть от 5 до 15.");
    return errors;
  }
  if (!Array.isArray(roles)) {
    add("roles", "Список ролей отсутствует.");
    return errors;
  }
  if (roles.length !== count) {
    add("size", `Выбрано ${roles.length} ролей, нужно ${count}.`);
  }
  if (new Set(roles).size !== roles.length) {
    add("duplicate", "Одна роль выбрана дважды.");
  }
  for (const id of roles) {
    if (!isSupportedRole(id)) add("unknown", `Неизвестная роль: ${id}.`);
    else if (!inScript.has(id))
      add("outside-script", `${roleLabel(id)} не входит в выбранный сценарий.`);
  }

  const required = compositionFor(count, roles, godfatherOutsider);
  const got = bagCounts(roles);
  if (
    required &&
    roles.includes("godfather") &&
    godfatherOutsider === -1 &&
    (COMPOSITION[count] || [0, 0])[1] === 0
  ) {
    add(
      "godfather-minus",
      "Крёстный Отец не может убрать Изгоя: в базовом составе для " + count + " игроков их нет.",
    );
  }
  if (required && roles.includes("vigormortis") && (COMPOSITION[count] || [0, 0])[1] === 0) {
    add(
      "vigormortis-minus",
      "Вигормортис не может убрать Изгоя: в базовом составе для " + count + " игроков их нет.",
    );
  }
  if (required) {
    for (const team of TEAMS) {
      if (got[team] !== required[team]) {
        add("team-" + team, `${teamLabel(team)}: ${got[team]} из ${required[team]}.`);
      }
    }
  }
  if (got.demon !== 1) add("demon", "В игре должен быть ровно один Демон.");

  const drunk = roles.includes("drunk");
  if (!drunk && drunkShownId) {
    add("drunk-unused", "Показанная роль Пьяницы задана, но Пьяницы нет в игре.");
  }
  if (drunk) {
    if (!drunkShownId) {
      add("drunk-shown", "Выберите Горожанина, которого увидит Пьяница.");
    } else if (roleTeam(drunkShownId) !== "townsfolk") {
      add("drunk-team", "Пьянице можно показать только Горожанина.");
    } else if (!inScript.has(drunkShownId)) {
      add("drunk-outside-script", "Показанная Пьянице роль не входит в выбранный сценарий.");
    } else if (roles.includes(drunkShownId)) {
      add("drunk-inplay", "Показанная Пьянице роль не должна быть в игре.");
    }
  }

  const needed = requiredBluffs(count);
  if (bluffs.length !== needed) {
    add(
      "bluffs-count",
      needed === 0
        ? "Для 5–6 игроков блефы Демона не выдаются."
        : `Нужно ровно ${needed} блефа, выбрано ${bluffs.length}.`,
    );
  }
  if (new Set(bluffs).size !== bluffs.length) {
    add("bluffs-duplicate", "Блефы не должны повторяться.");
  }
  for (const id of bluffs) {
    if (!isGoodRole(id)) add("bluffs-team", `${roleLabel(id)} — не добрая роль.`);
    else if (!inScript.has(id))
      add("bluffs-outside-script", `${roleLabel(id)} не входит в выбранный сценарий.`);
    if (roles.includes(id)) add("bluffs-inplay", `${roleLabel(id)} уже в игре.`);
    if (drunk && id === drunkShownId) {
      add(
        "bluffs-drunk",
        `${roleLabel(id)} — маска Пьяницы. Если отдать её Демону как блеф, Демон получит подсказку о Пьянице.`,
      );
    }
  }
  if (herringId) {
    const target = roles.find((id) => id === herringId);
    if (target && !isGoodRole(target)) {
      add("herring-team", "Ложная цель Гадалки должна быть доброй ролью.");
    }
  }
  return errors;
}

export function teamLabel(team: string | null | undefined): string {
  return (
    /** @type {Record<string, string>} */ ({
      townsfolk: "Горожане",
      outsider: "Изгои",
      minion: "Приспешники",
      demon: "Демоны",
    })[team || ""] || (team as string)
  );
}

export function roleLabel(id: RoleId | null | undefined): string {
  return ROLE_NAME_RU[id || ""] || ROLE_NAME[id || ""] || id || "—";
}

export function nightSequence(night: number, edition: string = "tb"): string[] {
  if (edition === "bmr") return night === 1 ? BMR_NIGHT_FIRST : BMR_NIGHT_OTHER;
  if (edition === "snv") return night === 1 ? SV_NIGHT_FIRST : SV_NIGHT_OTHER;
  return night === 1 ? NIGHT_FIRST : NIGHT_OTHER;
}

export function nightIndex(roleId: string, night: number, edition: string = "tb"): number {
  const seq = nightSequence(night, edition);
  const at = seq.indexOf(roleId);
  return at === -1 ? 999 : at;
}
