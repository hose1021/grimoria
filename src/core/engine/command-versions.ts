/** New commands use the current version; recorded commands keep their behavior. */
export const LEGACY_RULESET_VERSION = "tb-bmr-snv-2026-11-10";
/**
 * The last version that answered a zero prepared for any role as the
 * Librarian's. From the next one the zero is the answer of the role that
 * declares it (Librarian r1721).
 */
export const ANY_ROLE_ZERO_RULESET_VERSION = "tb-bmr-snv-2026-11-16";
/**
 * The last version that woke a new Demon a second time on the night after a
 * night succession, and queued the wake of a heir the host named only when a
 * later step of that night ended. From the next one the new Demon is woken
 * once, the night of the change (Imp r3116, Scarlet Woman r3117).
 */
export const REPEATED_DEMON_WAKE_RULESET_VERSION = "tb-bmr-snv-2026-11-17";
/**
 * The last version whose Tinker step took any death the host marked, also
 * while the Tinker was drunk or poisoned. From the next one only the Tinker
 * dies there, and only while the ability works (Tinker r1782, States r1039).
 */
export const OPEN_TINKER_STEP_RULESET_VERSION = "tb-bmr-snv-2026-11-17.1";
/**
 * The last version whose Bad Moon Rising night steps took any resurrection
 * the host marked. From the next one only a step whose ability resurrects
 * brings a player back (Professor r1775, Shabaloth r1790).
 */
export const ANY_STEP_RESURRECTS_RULESET_VERSION = "tb-bmr-snv-2026-11-17.2";
/**
 * The last version whose Pit-Hag step offered arbitrary deaths before a Demon
 * was created. From the next one the step gains that control only when the
 * chosen character is a Demon (Pit-Hag r2998).
 */
export const OPEN_PITHAG_STEP_RULESET_VERSION = "tb-bmr-snv-2026-11-17.3";
/**
 * The first version whose Dreamer and Sage steps require a checked pair
 * (Dreamer r2904, Sage r3009). A command recorded before it keeps the old
 * free-text note answer, so its journal still replays.
 */
export const INFO_PAIR_RULESET_VERSION = "tb-bmr-snv-2026-11-18";
/**
 * The first version that refuses a skip of a living actor's mandatory night
 * step. A command recorded before it keeps the old skip, so its journal still
 * replays (Imp r3116, Po r3104).
 */
export const MANDATORY_STEP_SKIP_RULESET_VERSION = "tb-bmr-snv-2026-11-19";
/**
 * The first version that keeps the seat order fixed after setup. A command
 * recorded before it may reorder the seats mid-game, so its journal still
 * replays and undoes as written (SYS-LIFECYCLE-02, issue #328).
 */
export const SEAT_ORDER_SETUP_RULESET_VERSION = "tb-bmr-snv-2026-11-20";
/**
 * The first version whose one-of-two answer must name both players and, while
 * the ability works, the prepared character and pair. A command recorded
 * before it keeps the role-only check, so its journal still replays
 * (Washerwoman r2630; Librarian r1721; Investigator r2983).
 */
export const FULL_ONE_OF_TWO_RULESET_VERSION = "tb-bmr-snv-2026-11-20.1";
/**
 * The first version whose Tinker step exists on the first night (Tinker r1782:
 * "You might die at any time"). A journal recorded before it keeps the old
 * first-night queue, so its later step keys still replay.
 */
export const FIRST_NIGHT_TINKER_RULESET_VERSION = "tb-bmr-snv-2026-11-21";
/**
 * The first version whose Evil Twin note records the typed introduction: the
 * two players and the character each other learns. A command recorded before
 * it keeps the text-only note, so its journal and undo finish as written.
 */
export const EVIL_TWIN_SHOWN_RULESET_VERSION = "tb-bmr-snv-2026-11-21.1";
/**
 * The first version that records the Demon attribution on a typed attack
 * death. Older journals kept the attacker but no `demon` flag, so replay must
 * not add one; from this version the Sage and Banshee see a real Demon attack.
 */
export const DEMON_ATTACK_SOURCE_RULESET_VERSION = "tb-bmr-snv-2026-11-23";
export const RULESET_VERSION = DEMON_ATTACK_SOURCE_RULESET_VERSION;
export const SUPPORTED_RULESET_VERSIONS = new Set([
  LEGACY_RULESET_VERSION,
  ANY_ROLE_ZERO_RULESET_VERSION,
  REPEATED_DEMON_WAKE_RULESET_VERSION,
  OPEN_TINKER_STEP_RULESET_VERSION,
  ANY_STEP_RESURRECTS_RULESET_VERSION,
  OPEN_PITHAG_STEP_RULESET_VERSION,
  // The released 0.4.1 version: its journals keep the free-text Dreamer and
  // Sage answers, so it must stay importable and replayable.
  "tb-bmr-snv-2026-11-17.4",
  INFO_PAIR_RULESET_VERSION,
  MANDATORY_STEP_SKIP_RULESET_VERSION,
  SEAT_ORDER_SETUP_RULESET_VERSION,
  FULL_ONE_OF_TWO_RULESET_VERSION,
  FIRST_NIGHT_TINKER_RULESET_VERSION,
  EVIL_TWIN_SHOWN_RULESET_VERSION,
  DEMON_ATTACK_SOURCE_RULESET_VERSION,
]);

/** Whether a command recorded under this version answers a zero held for any role. */
export function answersZeroForAnyRole(version: string | undefined): boolean {
  return version === LEGACY_RULESET_VERSION || version === ANY_ROLE_ZERO_RULESET_VERSION;
}

/**
 * Whether a command recorded under this version requires the checked Dreamer
 * and Sage pair. A direct call without a version uses current behavior; every
 * recorded version before `INFO_PAIR_RULESET_VERSION` keeps the free-text note.
 */
export function requiresInfoPair(version: string | undefined): boolean {
  return (
    version == null ||
    version === INFO_PAIR_RULESET_VERSION ||
    version === MANDATORY_STEP_SKIP_RULESET_VERSION ||
    version === SEAT_ORDER_SETUP_RULESET_VERSION ||
    version === FULL_ONE_OF_TWO_RULESET_VERSION ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/**
 * Whether a death recorded under this version names the attacker. Older
 * journals have no such field, so replay must not add one and break equality.
 */
export function recordsAttackSource(version: string | undefined): boolean {
  return (
    version == null ||
    version === INFO_PAIR_RULESET_VERSION ||
    version === MANDATORY_STEP_SKIP_RULESET_VERSION ||
    version === SEAT_ORDER_SETUP_RULESET_VERSION ||
    version === FULL_ONE_OF_TWO_RULESET_VERSION ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/**
 * Whether a death recorded under this version records the Demon attribution
 * on a typed attack. Older journals have the attacker without `demon`, so
 * replay must not add it and break equality.
 */
export function recordsDemonAttackSource(version: string | undefined): boolean {
  return version == null || version === DEMON_ATTACK_SOURCE_RULESET_VERSION;
}

/**
 * Whether a command recorded under this version wakes a new Demon the way it
 * did before the fix: again on the night after a night change, and, after a
 * named heir, only when a later step of the night ends.
 */
export function repeatsDemonWake(version: string | undefined): boolean {
  return (
    version === LEGACY_RULESET_VERSION ||
    version === ANY_ROLE_ZERO_RULESET_VERSION ||
    version === REPEATED_DEMON_WAKE_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version lets the host mark any death
 * on the Tinker's step, also while the Tinker is drunk or poisoned.
 */
export function marksAnyDeathOnTinkerStep(version: string | undefined): boolean {
  return (
    version === LEGACY_RULESET_VERSION ||
    version === ANY_ROLE_ZERO_RULESET_VERSION ||
    version === REPEATED_DEMON_WAKE_RULESET_VERSION ||
    version === OPEN_TINKER_STEP_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version lets the host mark deaths on
 * a Pit-Hag step before the chosen character creates a Demon.
 */
export function marksPithagDeathsOnAnyStep(version: string | undefined): boolean {
  return (
    version === LEGACY_RULESET_VERSION ||
    version === ANY_ROLE_ZERO_RULESET_VERSION ||
    version === REPEATED_DEMON_WAKE_RULESET_VERSION ||
    version === OPEN_TINKER_STEP_RULESET_VERSION ||
    version === ANY_STEP_RESURRECTS_RULESET_VERSION ||
    version === OPEN_PITHAG_STEP_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version lets the host bring a player
 * back on a Bad Moon Rising night step whose ability does not resurrect.
 */
export function resurrectsOnAnyStep(version: string | undefined): boolean {
  return (
    version === LEGACY_RULESET_VERSION ||
    version === ANY_ROLE_ZERO_RULESET_VERSION ||
    version === REPEATED_DEMON_WAKE_RULESET_VERSION ||
    version === OPEN_TINKER_STEP_RULESET_VERSION ||
    version === ANY_STEP_RESURRECTS_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version refuses a skip of a living
 * actor's mandatory step. A direct call without a version uses the new rule;
 * every recorded version before it keeps the old skip so its journal replays.
 */
export function rejectsMandatorySkip(version: string | undefined): boolean {
  return (
    version == null ||
    version === MANDATORY_STEP_SKIP_RULESET_VERSION ||
    version === SEAT_ORDER_SETUP_RULESET_VERSION ||
    version === FULL_ONE_OF_TWO_RULESET_VERSION ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version keeps the seat order fixed
 * after setup. A direct call without a version uses the new rule; every
 * recorded version before it keeps the mid-game reorder so its journal replays.
 */
export function restrictsSeatOrder(version: string | undefined): boolean {
  return (
    version == null ||
    version === SEAT_ORDER_SETUP_RULESET_VERSION ||
    version === FULL_ONE_OF_TWO_RULESET_VERSION ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/**
 * Whether the first-night queue includes the Tinker's death step. A direct
 * call without a version uses current behavior; every recorded version before
 * `FIRST_NIGHT_TINKER_RULESET_VERSION` keeps its old queue so its journal
 * replays as written.
 */
export function buildsFirstNightTinker(version: string | undefined): boolean {
  return (
    version == null ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/** Whether a command recorded under this version must name both players of a
 * one-of-two answer and, while the ability works, the prepared character and
 * pair. A direct call without a version uses the new rule; every recorded
 * version before `FULL_ONE_OF_TWO_RULESET_VERSION` keeps the role-only check.
 */
export function validatesOneOfTwoAnswer(version: string | undefined): boolean {
  return (
    version == null ||
    version === FULL_ONE_OF_TWO_RULESET_VERSION ||
    version === FIRST_NIGHT_TINKER_RULESET_VERSION ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}

/**
 * Whether a command recorded under this version records the typed Evil Twin
 * introduction. A direct call without a version uses current behavior; every
 * recorded version before `EVIL_TWIN_SHOWN_RULESET_VERSION` keeps the
 * text-only note so its journal replays as written.
 */
export function recordsEvilTwinShown(version: string | undefined): boolean {
  return (
    version == null ||
    version === EVIL_TWIN_SHOWN_RULESET_VERSION ||
    version === DEMON_ATTACK_SOURCE_RULESET_VERSION
  );
}
