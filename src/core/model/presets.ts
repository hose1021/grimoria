// Curated starting bags and deterministic bag generation. Pure data and
// functions: no DOM, no storage. Every preset and suggestion is validated by
// bagErrors() before the screen offers it.
import {
  COMPOSITION,
  TEAMS,
  ALL_ROLES,
  BMR_ALL,
  SNV_ALL,
  bagCounts,
  bagErrors,
  compositionFor,
  isGoodRole,
  isMixedEdition,
  isSupportedRole,
  outsiderShift,
  requiredBluffs,
  roleTeam,
} from "./rules.ts";
import type { RoleId, Script } from "./types.ts";

export type RoleTeam = "townsfolk" | "outsider" | "minion" | "demon";
export type BagError = { code: string; message: string };
export type CustomProfile = {
  key: string;
  townsfolk: string[];
  outsider: string[];
  minion: string[];
  demon: string[];
};
type BagFailure = { ok: false; code: string };
export type BagSuccess = {
  ok: true;
  roles: RoleId[];
  bluffs: RoleId[];
  drunkShownId: RoleId | null;
  lunaticShownId: RoleId | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: RoleId | null;
  errors: BagError[];
};
export type BagExtras = {
  bluffs: RoleId[];
  drunkShownId: RoleId | null;
  lunaticShownId: RoleId | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: RoleId | null;
};
export type PresetBag = BagExtras & {
  roles: RoleId[];
  errors: BagError[];
  valid: boolean;
};

export const PRESET_POOLS: Record<string, RoleId[]> = { tb: ALL_ROLES, bmr: BMR_ALL, snv: SNV_ALL };

export const PRESET_LABELS: Record<string, string[]> = {
  tb: ["preset.tb.0.label", "preset.tb.1.label", "preset.tb.2.label"],
  bmr: ["preset.bmr.0.label", "preset.bmr.1.label", "preset.bmr.2.label"],
  snv: ["preset.snv.0.label", "preset.snv.1.label", "preset.snv.2.label"],
};

export const PRESET_NOTES: Record<string, string[]> = {
  tb: ["preset.tb.0.note", "preset.tb.1.note", "preset.tb.2.note"],
  bmr: ["preset.bmr.0.note", "preset.bmr.1.note", "preset.bmr.2.note"],
  snv: ["preset.snv.0.note", "preset.snv.1.note", "preset.snv.2.note"],
};

// Player count -> three rosters. Strings keep the table readable; each roster
// is split once at module load.
const ROSTER_TEXT: Record<string, Record<number, string[]>> = {
  tb: {
    5: [
      "chef empath fortuneteller poisoner imp",
      "empath fortuneteller monk scarletwoman imp",
      "chef undertaker virgin spy imp",
    ],
    6: [
      "chef empath fortuneteller butler poisoner imp",
      "empath fortuneteller monk recluse scarletwoman imp",
      "chef undertaker virgin drunk spy imp",
    ],
    7: [
      "chef empath fortuneteller undertaker washerwoman poisoner imp",
      "empath fortuneteller monk soldier ravenkeeper scarletwoman imp",
      "chef undertaker virgin slayer mayor spy imp",
    ],
    8: [
      "chef empath fortuneteller undertaker washerwoman butler poisoner imp",
      "empath fortuneteller monk soldier ravenkeeper recluse scarletwoman imp",
      "chef undertaker virgin slayer mayor drunk spy imp",
    ],
    9: [
      "chef empath fortuneteller undertaker washerwoman butler recluse poisoner imp",
      "empath fortuneteller monk soldier ravenkeeper recluse butler scarletwoman imp",
      "chef undertaker virgin slayer mayor drunk saint spy imp",
    ],
    10: [
      "chef empath fortuneteller undertaker washerwoman monk virgin poisoner scarletwoman imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker scarletwoman poisoner imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath spy poisoner imp",
    ],
    11: [
      "chef empath fortuneteller undertaker washerwoman monk virgin butler poisoner scarletwoman imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker recluse scarletwoman poisoner imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath drunk spy poisoner imp",
    ],
    12: [
      "chef empath fortuneteller undertaker washerwoman monk virgin butler recluse poisoner scarletwoman imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker recluse butler scarletwoman poisoner imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath drunk saint spy poisoner imp",
    ],
    13: [
      "chef empath fortuneteller undertaker washerwoman monk virgin slayer ravenkeeper poisoner scarletwoman spy imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker slayer librarian scarletwoman poisoner spy imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath librarian fortuneteller spy poisoner scarletwoman imp",
    ],
    14: [
      "chef empath fortuneteller undertaker washerwoman monk virgin slayer ravenkeeper butler poisoner scarletwoman spy imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker slayer librarian recluse scarletwoman poisoner spy imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath librarian fortuneteller drunk spy poisoner scarletwoman imp",
    ],
    15: [
      "chef empath fortuneteller undertaker washerwoman monk virgin slayer ravenkeeper butler recluse poisoner scarletwoman spy imp",
      "empath fortuneteller monk soldier ravenkeeper chef undertaker slayer librarian recluse butler scarletwoman poisoner spy imp",
      "chef undertaker virgin slayer mayor ravenkeeper empath librarian fortuneteller drunk saint spy poisoner scarletwoman imp",
    ],
  },
  bmr: {
    5: [
      "chambermaid innkeeper fool devilsadvocate pukka",
      "chambermaid gossip gambler assassin shabaloth",
      "gambler gossip lunatic godfather zombuul",
    ],
    6: [
      "chambermaid innkeeper fool tinker devilsadvocate pukka",
      "chambermaid gossip gambler moonchild assassin shabaloth",
      "gambler gossip lunatic goon godfather zombuul",
    ],
    7: [
      "chambermaid innkeeper fool grandmother sailor devilsadvocate pukka",
      "chambermaid gossip gambler grandmother courtier assassin shabaloth",
      "gambler gossip professor tealady lunatic godfather zombuul",
    ],
    8: [
      "chambermaid innkeeper fool grandmother sailor tinker devilsadvocate pukka",
      "chambermaid gossip gambler grandmother courtier moonchild assassin shabaloth",
      "gambler gossip professor tealady lunatic goon godfather zombuul",
    ],
    9: [
      "chambermaid innkeeper fool grandmother sailor tinker goon devilsadvocate pukka",
      "chambermaid gossip gambler grandmother courtier moonchild tinker assassin shabaloth",
      "gambler gossip professor tealady lunatic goon tinker godfather zombuul",
    ],
    10: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip devilsadvocate assassin pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist assassin mastermind shabaloth",
      "gambler gossip professor tealady sailor minstrel lunatic godfather mastermind zombuul",
    ],
    11: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip tinker devilsadvocate assassin pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist moonchild assassin mastermind shabaloth",
      "gambler gossip professor tealady sailor minstrel lunatic goon godfather mastermind zombuul",
    ],
    12: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip tinker goon devilsadvocate assassin pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist moonchild tinker assassin mastermind shabaloth",
      "gambler gossip professor tealady sailor minstrel lunatic goon tinker godfather mastermind zombuul",
    ],
    13: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip courtier tealady devilsadvocate assassin mastermind pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist minstrel innkeeper assassin mastermind devilsadvocate shabaloth",
      "gambler gossip professor tealady sailor minstrel courtier chambermaid lunatic godfather mastermind assassin zombuul",
    ],
    14: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip courtier tealady tinker devilsadvocate assassin mastermind pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist minstrel innkeeper moonchild assassin mastermind devilsadvocate shabaloth",
      "gambler gossip professor tealady sailor minstrel courtier chambermaid lunatic goon godfather mastermind assassin zombuul",
    ],
    15: [
      "chambermaid innkeeper fool grandmother sailor exorcist gossip courtier tealady tinker goon devilsadvocate assassin mastermind pukka",
      "chambermaid gossip gambler grandmother courtier professor exorcist minstrel innkeeper moonchild tinker assassin mastermind devilsadvocate shabaloth",
      "gambler gossip professor tealady sailor minstrel courtier chambermaid lunatic goon tinker godfather mastermind assassin zombuul",
    ],
  },
  snv: {
    5: [
      "clockmaker dreamer seamstress witch nodashii",
      "dreamer philosopher mutant cerenovus fanggu",
      "mathematician flowergirl towncrier eviltwin vortox",
    ],
    6: [
      "clockmaker dreamer seamstress barber witch nodashii",
      "dreamer philosopher mutant sweetheart cerenovus fanggu",
      "mathematician flowergirl towncrier klutz eviltwin vortox",
    ],
    7: [
      "clockmaker dreamer seamstress oracle artist witch nodashii",
      "dreamer philosopher snakecharmer savant mutant cerenovus fanggu",
      "mathematician flowergirl towncrier juggler sage eviltwin vortox",
    ],
    8: [
      "clockmaker dreamer seamstress oracle artist barber witch nodashii",
      "dreamer philosopher snakecharmer savant mutant sweetheart cerenovus fanggu",
      "mathematician flowergirl towncrier juggler sage klutz eviltwin vortox",
    ],
    9: [
      "clockmaker dreamer seamstress oracle artist barber sweetheart witch nodashii",
      "dreamer philosopher snakecharmer savant mutant sweetheart barber cerenovus fanggu",
      "mathematician flowergirl towncrier juggler sage klutz sweetheart eviltwin vortox",
    ],
    10: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier witch cerenovus nodashii",
      "dreamer philosopher snakecharmer savant artist oracle mutant cerenovus pithag fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant eviltwin witch vortox",
    ],
    11: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier barber witch cerenovus nodashii",
      "dreamer philosopher snakecharmer savant artist oracle mutant sweetheart cerenovus pithag fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant klutz eviltwin witch vortox",
    ],
    12: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier barber sweetheart witch cerenovus nodashii",
      "dreamer philosopher snakecharmer savant artist oracle mutant sweetheart barber cerenovus pithag fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant klutz sweetheart eviltwin witch vortox",
    ],
    13: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier sage mathematician witch cerenovus eviltwin nodashii",
      "dreamer philosopher snakecharmer savant artist oracle clockmaker seamstress mutant cerenovus pithag witch fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant seamstress philosopher eviltwin witch cerenovus vortox",
    ],
    14: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier sage mathematician barber witch cerenovus eviltwin nodashii",
      "dreamer philosopher snakecharmer savant artist oracle clockmaker seamstress mutant sweetheart cerenovus pithag witch fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant seamstress philosopher klutz eviltwin witch cerenovus vortox",
    ],
    15: [
      "clockmaker dreamer seamstress oracle artist flowergirl towncrier sage mathematician barber sweetheart witch cerenovus eviltwin nodashii",
      "dreamer philosopher snakecharmer savant artist oracle clockmaker seamstress mutant sweetheart barber cerenovus pithag witch fanggu",
      "mathematician flowergirl towncrier juggler sage dreamer savant seamstress philosopher klutz sweetheart eviltwin witch cerenovus vortox",
    ],
  },
};

const split = (text: string): RoleId[] => text.split(/\s+/).filter(Boolean);

export const PRESETS = Object.fromEntries(
  Object.entries(ROSTER_TEXT).map(([scriptId, counts]) => [
    scriptId,
    Object.fromEntries(
      Object.entries(counts).map(([count, variants]) => [Number(count), variants.map(split)]),
    ),
  ]),
);

export function presetPool(script: Script | null | undefined): RoleId[] {
  if (!script) return [];
  const pool = PRESET_POOLS[script.id];
  if (pool) return pool.slice();
  return Array.isArray(script.roles) ? script.roles.slice() : [];
}

function unusedGood(pool: RoleId[], used: Set<RoleId>, drunkenMask: RoleId | null): RoleId[] {
  const good = pool.filter((id) => !used.has(id) && id !== drunkenMask && isGoodRole(id));
  return good
    .filter((id) => roleTeam(id) === "townsfolk")
    .concat(good.filter((id) => roleTeam(id) === "outsider"));
}

// Derive the secret setup choices a bag needs: bluffs, Drunk mask, Lunatic
// shown Demon, Evil Twin good twin. Deterministic: the same bag gives the same
// choices.
export function deriveBagExtras(count: number, roles: RoleId[], pool: RoleId[] = []): BagExtras {
  const used = new Set(roles);
  const drunkShownId = used.has("drunk")
    ? pool.find((id) => roleTeam(id) === "townsfolk" && !used.has(id)) || null
    : null;
  const bluffs =
    requiredBluffs(count) === 3 ? unusedGood(pool, used, drunkShownId).slice(0, 3) : [];
  const demon =
    roles.find((id) => roleTeam(id) === "demon") ||
    pool.find((id) => roleTeam(id) === "demon") ||
    null;
  return {
    bluffs,
    drunkShownId,
    lunaticShownId: used.has("lunatic") ? demon : null,
    godfatherOutsider: 1,
    evilTwinGoodId: used.has("eviltwin") ? roles.find((id) => isGoodRole(id)) || null : null,
  };
}

export function presetBag(scriptId: string, count: number, variant = 0): PresetBag | null {
  const table = PRESETS[scriptId];
  const roster = table && table[count] && table[count][variant];
  if (!roster) return null;
  const pool = PRESET_POOLS[scriptId] ?? [];
  const roles = /** @type {RoleId[]} */ (roster.slice());
  const bag = { roles, ...deriveBagExtras(count, roles, pool) };
  const errors = bagErrors({
    count,
    roles: bag.roles,
    bluffs: bag.bluffs,
    drunkShownId: bag.drunkShownId,
    lunaticShownId: bag.lunaticShownId,
    pool,
  });
  return { ...bag, valid: errors.length === 0, errors };
}

export function officialPreset(scriptId: string, count: number, variant = 0): PresetBag | null {
  return presetBag(scriptId, count, variant);
}

export function presetCardKeys(
  scriptId: string,
  variant: number,
): { labelKey: string; noteKey: string } {
  return {
    labelKey: PRESET_LABELS[scriptId]![variant]!,
    noteKey: PRESET_NOTES[scriptId]![variant]!,
  };
}

// ---------------------------------------------------------------------------
// Custom scripts: deterministic suggestions and repairs.

/** @type {Record<string, string[]>} */
export const ROLE_TAGS = {
  info: [
    "washerwoman",
    "librarian",
    "investigator",
    "chef",
    "empath",
    "fortuneteller",
    "undertaker",
    "ravenkeeper",
    "virgin",
    "spy",
    "chambermaid",
    "exorcist",
    "gambler",
    "grandmother",
    "gossip",
    "professor",
    "clockmaker",
    "dreamer",
    "seamstress",
    "oracle",
    "artist",
    "flowergirl",
    "towncrier",
    "savant",
    "mathematician",
    "juggler",
    "sage",
  ],
  protect: [
    "monk",
    "soldier",
    "mayor",
    "innkeeper",
    "fool",
    "tealady",
    "pacifist",
    "sailor",
    "exorcist",
    "snakecharmer",
    "sweetheart",
  ],
  risk: [
    "drunk",
    "recluse",
    "saint",
    "tinker",
    "moonchild",
    "goon",
    "lunatic",
    "gambler",
    "gossip",
    "professor",
    "barber",
    "klutz",
    "mutant",
    "sweetheart",
    "savant",
  ],
  chaos: [
    "spy",
    "poisoner",
    "scarletwoman",
    "baron",
    "assassin",
    "devilsadvocate",
    "godfather",
    "mastermind",
    "pukka",
    "zombuul",
    "shabaloth",
    "po",
    "cerenovus",
    "eviltwin",
    "pithag",
    "witch",
    "fanggu",
    "nodashii",
    "vigormortis",
    "vortox",
  ],
};

const TAG_SETS: Record<string, Set<RoleId>> = Object.fromEntries(
  Object.entries(ROLE_TAGS).map(([tag, ids]) => [tag, new Set(ids)]),
);

const CUSTOM_PROFILES: CustomProfile[] = [
  {
    key: "info",
    townsfolk: ["info", "protect"],
    outsider: ["protect", "info"],
    minion: ["info", "chaos"],
    demon: ["info", "chaos"],
  },
  {
    key: "balanced",
    townsfolk: ["info", "protect", "risk"],
    outsider: ["info", "protect", "risk"],
    minion: ["chaos", "info"],
    demon: ["chaos", "info"],
  },
  {
    key: "chaos",
    townsfolk: ["risk", "chaos", "info"],
    outsider: ["risk", "chaos", "protect"],
    minion: ["chaos", "risk"],
    demon: ["chaos", "risk"],
  },
];

export const CUSTOM_LABELS: Record<string, string> = {
  info: "custom.info.label",
  balanced: "custom.balanced.label",
  chaos: "custom.chaos.label",
};

export const CUSTOM_NOTES: Record<string, string> = {
  info: "custom.info.note",
  balanced: "custom.balanced.note",
  chaos: "custom.chaos.note",
};

function seedOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rand(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list: RoleId[], rng: () => number): RoleId[] {
  const out = list.slice();
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    const temp = out[index]!;
    out[index] = out[other]!;
    out[other] = temp;
  }
  return out;
}

function scoreOf(id: RoleId, prefs: string[] = []): number {
  let score = 0;
  prefs.forEach((tag, index) => {
    if (TAG_SETS[tag] && TAG_SETS[tag].has(id)) score += prefs.length - index;
  });
  return score;
}

function orderedByPreference(list: RoleId[], prefs: string[], rng: () => number): RoleId[] {
  return shuffled(list, rng)
    .map((id, index) => ({ id, index, score: scoreOf(id, prefs) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.id);
}

function teamsIn(pool: RoleId[]): Record<RoleTeam, RoleId[]> {
  const teams: Record<RoleTeam, RoleId[]> = { townsfolk: [], outsider: [], minion: [], demon: [] };
  for (const id of pool) {
    const team = roleTeam(id);
    if (team) teams[team].push(id);
  }
  return teams;
}

function sameSet(left: RoleId[], right: RoleId[]): boolean {
  if (left.length !== right.length) return false;
  const a = left.slice().sort().join(",");
  const b = right.slice().sort().join(",");
  return a === b;
}

function buildCustomBag(
  count: number,
  pool: RoleId[],
  profile: CustomProfile,
  rng: () => number,
): BagFailure | BagSuccess {
  const base = COMPOSITION[count];
  if (!base) return { ok: false, code: "count" };
  const teams = teamsIn(pool);
  if (!teams.demon.length) return { ok: false, code: "no-demon" };
  if (teams.minion.length < base[2]) return { ok: false, code: "no-minions" };

  const minions = orderedByPreference(teams.minion, profile.minion, rng).slice(0, base[2]);
  let demon = null;
  let shift = 0;
  for (const candidate of orderedByPreference(teams.demon, profile.demon, rng)) {
    const candidateShift = outsiderShift([...minions, candidate], 1);
    const townCount = base[0] - candidateShift;
    const outsiderCount = base[1] + candidateShift;
    if (
      townCount >= 0 &&
      outsiderCount >= 0 &&
      outsiderCount <= teams.outsider.length &&
      townCount <= teams.townsfolk.length
    ) {
      demon = candidate;
      shift = candidateShift;
      break;
    }
  }
  if (!demon) {
    if (teams.outsider.length < base[1]) return { ok: false, code: "no-outsiders" };
    if (teams.townsfolk.length < base[0]) return { ok: false, code: "no-townsfolk" };
    return { ok: false, code: "no-demon" };
  }

  let outsiders = orderedByPreference(teams.outsider, profile.outsider, rng).slice(
    0,
    base[1] + shift,
  );
  if (outsiders.length < base[1] + shift) return { ok: false, code: "no-outsiders" };
  const townsfolk = orderedByPreference(teams.townsfolk, profile.townsfolk, rng).slice(
    0,
    base[0] - shift,
  );
  if (townsfolk.length < base[0] - shift) return { ok: false, code: "no-townsfolk" };

  if (outsiders.includes("drunk")) {
    const unusedTownsfolk = teams.townsfolk.filter((id) => !townsfolk.includes(id));
    if (!unusedTownsfolk.length) {
      const replacement = orderedByPreference(
        teams.outsider.filter((id) => !outsiders.includes(id)),
        profile.outsider,
        rng,
      )[0];
      if (!replacement) return { ok: false, code: "no-drunk-mask" };
      outsiders = outsiders.map((id) => (id === "drunk" ? replacement : id));
    }
  }

  /** @type {RoleId[]} */
  const roles = [...townsfolk, ...outsiders, ...minions, demon];
  const bag = { roles, ...deriveBagExtras(count, roles, pool) };
  const errors = bagErrors({
    count,
    roles: bag.roles,
    bluffs: bag.bluffs,
    drunkShownId: bag.drunkShownId,
    lunaticShownId: bag.lunaticShownId,
    pool,
  });
  if (errors.length) return { ok: false, code: "invalid" };
  return { ok: true, ...bag, errors: [] };
}

export type CustomProblem = { key: string; code: string };
export type CustomSuggestion = BagSuccess & {
  key: string;
  labelKey: string;
  noteKey: string;
};

export function customSuggestions(
  count: number,
  pool: RoleId[] = [],
): { suggestions: CustomSuggestion[]; problems: Array<string | CustomProblem> } {
  const cleanPool = [...new Set(pool)].filter(isSupportedRole);
  if (isMixedEdition(cleanPool)) return { suggestions: [], problems: ["mixed-edition"] };
  if (!Number.isInteger(count) || count < 5 || count > 15) {
    return { suggestions: [], problems: ["count"] };
  }
  const seedBase = cleanPool.slice().sort().join(",");
  const suggestions: CustomSuggestion[] = [];
  const problems: Array<string | CustomProblem> = [];
  for (const profile of CUSTOM_PROFILES) {
    let bag = null;
    let lastCode = "invalid";
    for (let attempt = 0; attempt < 12 && !bag; attempt += 1) {
      const rng = rand(seedOf(seedBase + "|" + count + "|" + profile.key + "|" + attempt));
      const candidate = buildCustomBag(count, cleanPool, profile, rng);
      lastCode = candidate.ok ? "duplicate" : candidate.code;
      if (!candidate.ok) continue;
      if (suggestions.some((entry) => sameSet(entry.roles, candidate.roles))) continue;
      bag = candidate;
    }
    if (bag) {
      suggestions.push({
        key: profile.key,
        labelKey: CUSTOM_LABELS[profile.key]!,
        noteKey: CUSTOM_NOTES[profile.key]!,
        ...bag,
      });
    } else {
      problems.push({ key: profile.key, code: lastCode });
    }
  }
  return { suggestions, problems };
}

// ---------------------------------------------------------------------------
// Repair and description helpers.

export type BagOptions = {
  count: number;
  roles?: RoleId[];
  pool?: RoleId[];
  godfatherOutsider?: 1 | -1;
};

export type BagFixHint = {
  code: string;
  team?: RoleTeam;
  missing?: number;
  extra?: number;
};

export function bagFixHints({
  count,
  roles = [],
  pool = [],
  godfatherOutsider = 1,
}: BagOptions): BagFixHint[] {
  const hints: BagFixHint[] = [];
  if (isMixedEdition(pool)) hints.push({ code: "mixed-edition" });
  const required = compositionFor(count, roles, godfatherOutsider);
  if (!required) return hints;
  const got = bagCounts(roles);
  for (const team of TEAMS) {
    if (got[team] < required[team]) {
      hints.push({ code: "need-team", team, missing: required[team] - got[team] });
    } else if (got[team] > required[team]) {
      hints.push({ code: "remove-team", team, extra: got[team] - required[team] });
    }
  }
  if (got.demon === 0) hints.push({ code: "need-demon" });
  return hints;
}

// Keep the current manual choices when the player count changes: drop
// duplicates, a second Demon and excess tokens, never add roles the host did
// not choose.
export function resizeBag({
  count,
  roles = [],
  pool = [],
  godfatherOutsider = 1,
}: BagOptions): RoleId[] {
  const kept: RoleId[] = [];
  for (const id of roles) {
    if (pool.includes(id) && !kept.includes(id)) kept.push(id);
  }
  const demons = kept.filter((id) => roleTeam(id) === "demon");
  for (let index = kept.length - 1; index >= 0; index -= 1) {
    if (roleTeam(kept[index]!) === "demon" && kept[index] !== demons[0]) kept.splice(index, 1);
  }
  const required = compositionFor(count, kept, godfatherOutsider);
  if (!required) return kept.slice(0, count);
  for (const team of ["townsfolk", "outsider", "minion"] as RoleTeam[]) {
    let excess = bagCounts(kept)[team] - required[team];
    for (let index = kept.length - 1; index >= 0 && excess > 0; index -= 1) {
      if (roleTeam(kept[index]!) === team) {
        kept.splice(index, 1);
        excess -= 1;
      }
    }
  }
  for (let index = kept.length - 1; index >= 0 && kept.length > count; index -= 1) {
    if (roleTeam(kept[index]!) !== "demon") kept.splice(index, 1);
  }
  return kept;
}

// Keep as many manual choices as the count and composition allow, drop
// duplicates and excess tokens, then fill the gaps from the pool. Returns null
// when the pool cannot produce a legal bag.
export type RepairedBag = BagExtras & { roles: RoleId[]; errors: BagError[] };

export function repairBag({
  count,
  roles = [],
  pool = [],
  godfatherOutsider = 1,
}: BagOptions): RepairedBag | null {
  const allowed = new Set(pool);
  const kept: RoleId[] = [];
  for (const id of roles) {
    if (allowed.has(id) && !kept.includes(id)) kept.push(id);
  }

  const demons = kept.filter((id) => roleTeam(id) === "demon");
  for (let index = kept.length - 1; index >= 0; index -= 1) {
    if (roleTeam(kept[index]!) === "demon" && kept[index] !== demons[0]) kept.splice(index, 1);
  }
  if (!kept.some((id) => roleTeam(id) === "demon")) {
    const demon = pool.find((id) => roleTeam(id) === "demon");
    if (!demon) return null;
    kept.push(demon);
  }

  let required = compositionFor(count, kept, godfatherOutsider);
  if (!required) return null;

  if (
    kept.includes("drunk") &&
    !pool.some((id) => roleTeam(id) === "townsfolk" && !kept.includes(id))
  ) {
    kept.splice(kept.indexOf("drunk"), 1);
    const replacement = pool.find((id) => roleTeam(id) === "outsider" && !kept.includes(id));
    if (!replacement) return null;
    kept.push(replacement);
    const nextRequired = compositionFor(count, kept, godfatherOutsider);
    if (!nextRequired) return null;
    required = nextRequired;
  }

  for (const team of ["townsfolk", "outsider", "minion"] as RoleTeam[]) {
    let excess = bagCounts(kept)[team] - required[team];
    for (let index = kept.length - 1; index >= 0 && excess > 0; index -= 1) {
      if (roleTeam(kept[index]!) === team) {
        kept.splice(index, 1);
        excess -= 1;
      }
    }
  }

  for (const team of ["townsfolk", "outsider", "minion"] as RoleTeam[]) {
    let missing = required[team] - bagCounts(kept)[team];
    if (missing <= 0) continue;
    const unusedTownsfolk = pool.some((id) => roleTeam(id) === "townsfolk" && !kept.includes(id));
    const candidates = pool.filter(
      (id) => roleTeam(id) === team && !kept.includes(id) && !(id === "drunk" && !unusedTownsfolk),
    );
    for (const id of candidates) {
      if (missing <= 0) break;
      kept.push(id);
      missing -= 1;
    }
    if (missing > 0) return null;
  }

  if (kept.length !== count) return null;
  const extras = deriveBagExtras(count, kept, pool);
  const errors = bagErrors({
    count,
    roles: kept,
    bluffs: extras.bluffs,
    drunkShownId: extras.drunkShownId,
    lunaticShownId: extras.lunaticShownId,
    pool,
    godfatherOutsider,
  });
  if (errors.length) return null;
  return { roles: kept, ...extras, errors: [] };
}

export type BagMechanics = {
  shift: number;
  baron: boolean;
  godfather: boolean;
  fanggu: boolean;
  vigormortis: boolean;
  drunk: boolean;
  lunatic: boolean;
  evilTwin: boolean;
  vortox: boolean;
  poison: boolean;
  protection: RoleId[];
  risk: number;
  information: number;
};

export function bagMechanics(roles: RoleId[] = []): BagMechanics {
  const set = new Set(roles);
  return {
    shift: outsiderShift(roles, 1),
    baron: set.has("baron"),
    godfather: set.has("godfather"),
    fanggu: set.has("fanggu"),
    vigormortis: set.has("vigormortis"),
    drunk: set.has("drunk"),
    lunatic: set.has("lunatic"),
    evilTwin: set.has("eviltwin"),
    vortox: set.has("vortox"),
    poison: ["poisoner", "pukka", "nodashii", "vigormortis"].some((id) => set.has(id)),
    protection: [
      "monk",
      "soldier",
      "innkeeper",
      "fool",
      "tealady",
      "pacifist",
      "sailor",
      "exorcist",
      "snakecharmer",
    ].filter((id) => set.has(id)),
    risk: roles.filter((id) => TAG_SETS.risk && TAG_SETS.risk.has(id)).length,
    information: roles.filter((id) => TAG_SETS.info && TAG_SETS.info.has(id)).length,
  };
}
