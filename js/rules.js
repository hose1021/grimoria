// Pure Trouble Brewing rules data. No DOM, no storage.
// Sources checked 2026-11-03: official setup sheet, wiki Glossary, official
// nightsheet.json from release.botc.app. See docs/rules-sources.md.

export const SCRIPT_NAME = "Trouble Brewing";

export const COMPOSITION = {
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
  15: [9, 2, 3, 1]
};

export const TEAMS = ["townsfolk", "outsider", "minion", "demon"];

export const TB = {
  townsfolk: [
    "washerwoman", "librarian", "investigator", "chef", "empath",
    "fortuneteller", "undertaker", "monk", "ravenkeeper", "virgin",
    "slayer", "soldier", "mayor"
  ],
  outsider: ["butler", "drunk", "recluse", "saint"],
  minion: ["poisoner", "spy", "scarletwoman", "baron"],
  demon: ["imp"]
};

export const ALL_ROLES = [].concat(TB.townsfolk, TB.outsider, TB.minion, TB.demon);

export const ROLE_TEAM = (() => {
  const map = {};
  for (const team of TEAMS) for (const id of TB[team]) map[id] = team;
  return map;
})();


export const ROLE_NAME_RU = {
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
  imp: "Чёрт"
};

export const ROLE_NAME = {
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
  imp: "Imp"
};

// Official app night order. The app orders the Spy last so the Spy sees the
// final grimoire. The Scarlet Woman entry is passive; the engine resolves it
// at the moment the Demon dies, then records the result in the queue.
export const NIGHT_FIRST = [
  "minioninfo", "demoninfo", "poisoner", "washerwoman", "librarian",
  "investigator", "chef", "empath", "fortuneteller", "butler", "spy"
];

export const NIGHT_OTHER = [
  "poisoner", "monk", "scarletwoman", "imp", "ravenkeeper", "empath",
  "fortuneteller", "undertaker", "butler", "spy"
];

export const SYSTEM_STEPS = {
  minioninfo: "Знакомство Приспешников",
  demoninfo: "Знакомство Демона",
  demonchange: "Смена Демона"
};

export const ROLE_REMINDERS_RU = {
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
  mayor: []
};

export const RECOMMENDED = {
  7: {
    roles: ["chef", "empath", "fortuneteller", "undertaker", "virgin", "poisoner", "imp"],
    bluffs: ["washerwoman", "librarian", "monk"],
    drunkShownId: null,
    note: "Пять источников информации и одна рискованная Девственница. Отравитель даёт злу правдоподобную ложь, но набор не перегружен."
  },
  10: {
    roles: [
      "washerwoman", "chef", "empath", "fortuneteller", "undertaker",
      "monk", "slayer", "poisoner", "spy", "imp"
    ],
    bluffs: ["soldier", "virgin", "ravenkeeper"],
    drunkShownId: null,
    note: "Много информации, защита Монаха и одноразовый Истребитель. Шпион и Отравитель создают управляемую дезинформацию."
  },
  12: {
    roles: [
      "chef", "empath", "fortuneteller", "undertaker", "monk",
      "slayer", "mayor", "drunk", "saint", "poisoner", "scarletwoman", "imp"
    ],
    bluffs: ["soldier", "virgin", "ravenkeeper"],
    drunkShownId: "washerwoman",
    note: "Пьяница и Святой повышают цену ошибки, а Алая женщина страхует Демона. Пьянице показана Прачка, которой нет в игре."
  }
};

export function isTbRole(id) {
  return Object.prototype.hasOwnProperty.call(ROLE_TEAM, id);
}

export function roleTeam(id) {
  return ROLE_TEAM[id] || null;
}

export function isGoodRole(id) {
  const team = roleTeam(id);
  return team === "townsfolk" || team === "outsider";
}

export function isEvilRole(id) {
  const team = roleTeam(id);
  return team === "minion" || team === "demon";
}

export function compositionFor(count, roles = []) {
  const base = COMPOSITION[count];
  if (!base) return null;
  const [townsfolk, outsider, minion, demon] = base;
  const baron = roles.includes("baron");
  return {
    townsfolk: townsfolk - (baron ? 2 : 0),
    outsider: outsider + (baron ? 2 : 0),
    minion,
    demon
  };
}

export function bagCounts(roles) {
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of roles) {
    const team = roleTeam(id);
    if (team) counts[team] += 1;
  }
  return counts;
}

export function requiredBluffs(count) {
  return count >= 7 ? 3 : 0;
}

function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function take(pool, count, rng) {
  if (pool.length < count) throw new Error("not enough roles");
  return shuffle(pool, rng).slice(0, count);
}

function teamsIn(pool) {
  const teams = { townsfolk: [], outsider: [], minion: [], demon: [] };
  for (const id of pool) {
    const team = roleTeam(id);
    if (teams[team]) teams[team].push(id);
  }
  return teams;
}

export function randomBag(count, rng = Math.random, pool = ALL_ROLES) {
  const base = COMPOSITION[count];
  if (!base) throw new Error("Неподдерживаемое число игроков.");
  const [baseTown, baseOutsider, baseMinion, baseDemon] = base;
  const teams = teamsIn(pool);

  if (teams.minion.length < baseMinion || teams.demon.length < baseDemon) {
    throw new Error("В сценарии не хватает ролей для " + count + " игроков.");
  }
  const minions = take(teams.minion, baseMinion, rng);
  const baron = minions.includes("baron");
  const townsfolkCount = baseTown - (baron ? 2 : 0);
  const outsiderCount = baseOutsider + (baron ? 2 : 0);
  if (townsfolkCount < 0 || outsiderCount > teams.outsider.length || townsfolkCount > teams.townsfolk.length) {
    throw new Error("В сценарии не хватает ролей для " + count + " игроков.");
  }

  const outsiders = take(teams.outsider, outsiderCount, rng);
  const townsfolk = take(teams.townsfolk, townsfolkCount, rng);
  const demons = take(teams.demon, baseDemon, rng);
  const roles = [].concat(townsfolk, outsiders, minions, demons);

  let drunkShownId = null;
  if (roles.includes("drunk")) {
    const unused = teams.townsfolk.filter((id) => !roles.includes(id));
    drunkShownId = take(unused, 1, rng)[0] || null;
  }

  let bluffs = [];
  if (requiredBluffs(count) === 3) {
    const goodUnused = [].concat(teams.townsfolk, teams.outsider)
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
  count, roles = [], bluffs = [], drunkShownId = null, herringId = null,
  pool = ALL_ROLES
}) {
  const errors = [];
  const add = (code, message) => errors.push({ code, message });
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
    if (!isTbRole(id)) add("unknown", `Неизвестная роль: ${id}.`);
    else if (!inScript.has(id)) add("outside-script", `${roleLabel(id)} не входит в выбранный сценарий.`);
  }

  const required = compositionFor(count, roles);
  const got = bagCounts(roles);
  if (required) {
    for (const team of TEAMS) {
      if (got[team] !== required[team]) {
        add(
          "team-" + team,
          `${teamLabel(team)}: ${got[team]} из ${required[team]}.`
        );
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
    add("bluffs-count", needed === 0
      ? "Для 5–6 игроков блефы Демона не выдаются."
      : `Нужно ровно ${needed} блефа, выбрано ${bluffs.length}.`);
  }
  if (new Set(bluffs).size !== bluffs.length) {
    add("bluffs-duplicate", "Блефы не должны повторяться.");
  }
  for (const id of bluffs) {
    if (!isGoodRole(id)) add("bluffs-team", `${roleLabel(id)} — не добрая роль.`);
    else if (!inScript.has(id)) add("bluffs-outside-script", `${roleLabel(id)} не входит в выбранный сценарий.`);
    if (roles.includes(id)) add("bluffs-inplay", `${roleLabel(id)} уже в игре.`);
    if (drunk && id === drunkShownId) {
      add(
        "bluffs-drunk",
        `${roleLabel(id)} — маска Пьяницы. Если отдать её Демону как блеф, Демон получит подсказку о Пьянице.`
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

export function teamLabel(team) {
  return {
    townsfolk: "Горожане",
    outsider: "Изгои",
    minion: "Приспешники",
    demon: "Демоны"
  }[team] || team;
}

export function roleLabel(id) {
  return ROLE_NAME_RU[id] || ROLE_NAME[id] || id || "—";
}

export function nightSequence(night) {
  return night === 1 ? NIGHT_FIRST : NIGHT_OTHER;
}

export function nightIndex(roleId, night) {
  const seq = nightSequence(night);
  const at = seq.indexOf(roleId);
  return at === -1 ? 999 : at;
}
