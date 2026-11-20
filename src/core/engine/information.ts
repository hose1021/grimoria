import type { GameState, InfoPair, NightStep, Player, RoleId } from "../model/types.ts";

type Registrations = Record<string, string>;
type InfoOptions = { targetIds?: string[]; registrations?: Registrations };
/** What a night step hands the Storyteller: computed, chosen or missing. */
export type InfoResult = {
  kind: string;
  value?: unknown;
  roleId?: RoleId | null;
  pair?: string[];
  matchIndex?: number;
  impaired?: boolean;
  needsChoice?: boolean;
  options?: unknown[];
  text?: string;
  /** Catalog key for `text`; the stored Russian sentence stays the fallback. */
  textKey?: string;
  textVars?: Record<string, string | number | undefined>;
  /** The Storyteller's own wording of the answer the player hears. */
  answerText?: string;
  /** Runs of false information end with the shared Storyteller suffix. */
  falsifiedSuffix?: boolean;
  /** An impaired actor may receive false or true information; not mandatory. */
  mayBeFalseSuffix?: boolean;
  missing?: boolean;
  /** The host answers because the data source is missing, not because the answer is false. */
  hostAnswer?: boolean;
  zero?: boolean;
  bluffs?: string[];
  demonId?: string | null;
  lunaticId?: string | null;
  playerId?: string | null;
};

// Trouble Brewing domain: information. No DOM or persistence.
import { ALL_ROLES, roleTeam } from "../model/rules.ts";
import { orderedPlayers, playerById } from "../model/state.ts";

import { nightAt } from "./context.ts";
import { isImpaired } from "./effects.ts";
import { characterChoices, informationFacts } from "./information-facts.ts";
export {
  alignmentOf,
  registersAsDemon,
  registersAsTownsfolk,
  registersAsMinion,
  registersAsOutsider,
  characterChoices,
} from "./information-facts.ts";
import { informationOf, nightStepFor } from "../roles/night-step.ts";
import { roleModule } from "../roles/registry.ts";
import type { RoleModule } from "../roles/types.ts";
import type { InformationValue } from "../roles/ability.ts";
import { resolveInformationCapability } from "./ability.ts";
import { bmrInfoForStep } from "./bmr.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { answersZeroForAnyRole } from "./command-versions.ts";
import { svInfoForStep } from "./sv.ts";

/**
 * The number of evil pairs a Chef would be shown under these registrations.
 * The rule is the role module's; this query hands it the engine's facts
 * outside a night step.
 */
export function chefCount(state: GameState, registrations: Registrations = {}): number {
  const module = roleModule("chef");
  const information = informationOf(module);
  if (!module || !information) return 0;
  const decision = resolveInformationCapability(
    module,
    informationFacts(state, {
      actorId: "",
      infoKind: information.infoKind,
      targetIds: [],
      registrations,
      impaired: false,
      at: nightAt(state),
    }),
  );
  return decision?.kind === "answer" && typeof decision.value === "number" ? decision.value : 0;
}

/**
 * Whether a Fortune Teller who chose these players hears yes. The rule is the
 * role module's; this query hands it the engine's facts outside a night step.
 */
export function fortuneTellerYes(
  state: GameState,
  targetIds: string[] | undefined,
  registrations: Registrations = {},
): boolean {
  const module = roleModule("fortuneteller");
  const information = informationOf(module);
  if (!module || !information) return false;
  const decision = resolveInformationCapability(
    module,
    informationFacts(state, {
      actorId: "",
      infoKind: information.infoKind,
      targetIds: targetIds || [],
      registrations,
      impaired: false,
      at: nightAt(state),
    }),
  );
  return decision?.kind === "answer" && decision.value === true;
}

// ---------------------------------------------------------------------------
// Night queue

/**
 * The record of an answer the Storyteller prepared in setup: one of two
 * players is a particular character. The role names the characters such an
 * answer can show, and says with `orZero` whether its ability has a zero
 * answer; `zeroAnswered` is that declaration, or the older behavior a recorded
 * command keeps. What was prepared, whether anything was, and the zero are
 * read here from the record kept under the role's id.
 */
function preparedInfo(
  state: GameState,
  roleId: string,
  actor: Player | null,
  impaired: boolean,
  possible: readonly InformationValue[],
  zeroAnswered: boolean,
): InfoResult {
  const setup = state.setup.info[roleId];
  // The players a false answer points at until the host chooses: the first
  // two seats that are not the acting one.
  const firstOthers = () =>
    orderedPlayers(state)
      .filter((player) => !actor || player.id !== actor.id)
      .map((player) => player.id)
      .slice(0, 2);
  if (!setup) {
    // The night start refuses a Drunk without a prepared false answer, so only
    // a game saved before that check has none: the host is offered a default.
    if (actor && actor.roleId === "drunk") {
      const options = [...possible];
      if (zeroAnswered) options.push("zero");
      return {
        kind: "one-of-two",
        missing: false,
        roleId: (options[0] as RoleId | undefined) || null,
        pair: firstOthers(),
        matchIndex: 0,
        impaired: true,
        needsChoice: true,
        options,
        text: "Пьяница: предложена ложная информация.",
      };
    }
    return { kind: "one-of-two", missing: true, needsChoice: true };
  }
  if ("zero" in setup && setup.zero) {
    // "Or that zero are in play" is the Librarian's answer alone (r1721): the
    // Washerwoman (r2630) and the Investigator (r2983) always learn a
    // character. A zero held for a role that does not declare it is no
    // prepared answer, as the setup check says, so the step asks for setup.
    if (!zeroAnswered) return { kind: "one-of-two", missing: true, needsChoice: true };
    // The record of the zero, with the Outsider options and sentences, is
    // still written here: the role declares the form, not the record.
    if (impaired) {
      const options = ALL_ROLES.filter((id) => roleTeam(id) === "outsider");
      return {
        kind: "one-of-two",
        zero: true,
        roleId: options[0] || null,
        pair: firstOthers(),
        matchIndex: 0,
        impaired,
        needsChoice: true,
        // The true zero answer stays legal: a drunk or poisoned player may
        // still receive true information (Drunk r3165 "may give false").
        options: [...options, "zero"],
        text: "Игрок отравлен или пьян: можно показать ложную пару или верный ответ «нет Изгоев».",
      };
    }
    return { kind: "one-of-two", zero: true, text: "В игре нет Изгоев." };
  }
  const pairInfo = setup as InfoPair;
  if (!pairInfo.roleId || !Array.isArray(pairInfo.pair) || pairInfo.pair.length !== 2) {
    return { kind: "one-of-two", missing: true, needsChoice: true };
  }
  // A prepared pair may rely on a Spy or Recluse registering as the shown
  // character. A registrant that is drunk or poisoned at this moment has no
  // ability (States r1039), so a sober role can no longer truthfully give the
  // prepared answer. Ask the host to correct setup instead of forcing it.
  const pairHasPlayers = pairInfo.pair.every((id) => Boolean(playerById(state, id)));
  const shownRoleStillPossible =
    !impaired &&
    (!pairHasPlayers ||
      pairInfo.pair.some((id) => characterChoices(state, id).includes(pairInfo.roleId as RoleId)));
  if (!impaired && !shownRoleStillPossible) {
    return { kind: "one-of-two", missing: true, needsChoice: true };
  }
  const options = [...possible];
  // The Librarian's zero is one of its own answer forms (r1721). An impaired
  // Librarian may be shown it as false information even when an Outsider is
  // in play (States r1039).
  if (impaired && zeroAnswered) options.push("zero");
  return {
    kind: "one-of-two",
    roleId: pairInfo.roleId,
    pair: pairInfo.pair.slice(),
    // The Storyteller's mark of the real player: a note of setup, not a part
    // of what the ability learns.
    matchIndex: pairInfo.matchIndex || 0,
    impaired,
    needsChoice: impaired,
    options: impaired ? options : [],
  };
}

/**
 * The answer of a role module that owns its information. Null means the module
 * declares none and the engine keeps its own path.
 *
 * The role says what its ability learns and which answers exist. Whether the
 * ability works is the engine's fact: an impaired owner gets the host's answer
 * from the values the role says are possible, and the true one stays among
 * them (Drunk r3165: the information may be false). An answer the Storyteller
 * prepared in setup is not the role's to compute: the role says so, and the
 * record is read from setup.
 */
export function moduleInfoForStep(
  state: GameState,
  module: RoleModule | null | undefined,
  step: NightStep,
  options: InfoOptions = {},
  ports: CommandExecutionContext = systemPorts,
): InfoResult | null {
  const information = informationOf(module);
  if (!module || !information) return null;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const at = nightAt(state);
  const impaired = actor ? isImpaired(state, actor.id, at) : false;
  const decision = resolveInformationCapability(
    module,
    informationFacts(state, {
      actorId: actor ? actor.id : "",
      infoKind: information.infoKind,
      targetIds: options.targetIds || step.targetIds || [],
      registrations: options.registrations || step.registrations || {},
      impaired,
      at,
    }),
  );
  const shape = nightStepFor(module, at.number)?.infoKind ?? "none";
  if (decision?.kind === "note") return { kind: "none", text: decision.text };
  // The Grimoire is shown, not told: the record has no value, offers nothing
  // and is the same for an impaired owner.
  if (decision?.kind === "grimoire") return { kind: "grimoire" };
  if (decision?.kind === "prepared") {
    return preparedInfo(
      state,
      module.id,
      actor,
      impaired,
      decision.possible,
      // A command recorded before the zero became the Librarian's alone keeps
      // its answer, so its journal replays as written.
      decision.orZero === true || answersZeroForAnyRole(ports.rulesetVersion),
    );
  }
  if (decision?.kind !== "answer") {
    // A step that learns a character and has no player to read yet keeps its
    // record: a question with every character. The table shows it only once a
    // player is chosen, and the completion refuses the step before that.
    return shape === "character"
      ? { kind: "character", roleId: null, needsChoice: true, options: ALL_ROLES.slice() }
      : { kind: "none" };
  }
  // A working ability whose answer depends on a registration is the host's
  // choice among the legal values; an impaired one among every possible value.
  const legal = decision.legal ?? [];
  if (shape === "character") {
    // The record of a character names the player and lists what the player
    // may be shown as, also when that is one character.
    const choices = impaired ? [...(decision.possible ?? [])] : [...legal];
    return {
      kind: "character",
      roleId: decision.value as RoleId,
      playerId: decision.subjectId ?? null,
      impaired,
      needsChoice: impaired || choices.length > 1,
      options: choices,
    };
  }
  const registrationChoice = !impaired && legal.length > 1;
  return {
    kind: shape,
    value: decision.value,
    impaired,
    needsChoice: impaired || registrationChoice,
    options: impaired ? [...(decision.possible ?? [])] : registrationChoice ? [...legal] : [],
  };
}

export function infoForStep(
  state: GameState,
  step: NightStep,
  options: InfoOptions = {},
  ports: CommandExecutionContext = systemPorts,
): InfoResult {
  if (step.bmr) return bmrInfoForStep(state, step, options, ports);
  if (step.sv) return svInfoForStep(state, step, options, ports.rulesetVersion);
  const role = step.roleId;

  if (step.kind === "system") {
    if (step.system === "demoninfo") {
      return {
        kind: "demon-info",
        bluffs: step.bluffs || [],
        lunaticId: (step.lunaticId as string | null | undefined) ?? null,
      };
    }
    if (step.system === "minioninfo") {
      return { kind: "minion-info", demonId: step.demonId ?? null };
    }
    return { kind: "note", text: step.note || "" };
  }

  // A role answers from its module; a step of a role that owns no answer has
  // none.
  const owned = moduleInfoForStep(state, role ? roleModule(role) : null, step, options, ports);
  return owned ?? { kind: "none" };
}

// ---------------------------------------------------------------------------
// Death, inheritance and win
