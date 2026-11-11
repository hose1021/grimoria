import assert from "node:assert/strict";
import { test } from "node:test";
import type { PreviewOutcome } from "../../ports.ts";
import type { Player } from "../../../core/model/types.ts";
import {
  applyGiven,
  consequencesOf,
  dayTransitionBlockers,
  defaultCorrectionValue,
  displayName,
  nightTransitionBlockers,
  rejectionOf,
  stepBlockers,
  stepTitle,
  timerText,
} from "./helpers.ts";

const t = (key: string, vars?: Record<string, string | number>): string =>
  vars ? `${key}:${Object.values(vars).join(",")}` : key;

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    seat: 1,
    name: "",
    roleId: "chef",
    shownRoleId: "",
    alive: true,
    claimed: false,
    reminders: [],
    used: {},
    ...overrides,
  } as Player;
}

test("applyGiven records a number answer without the choice flag", () => {
  const info = { kind: "number", value: 0, needsChoice: true };
  assert.deepEqual(applyGiven(info, "3", "number"), {
    kind: "number",
    value: 3,
    needsChoice: false,
  });
});

test("applyGiven records a yes or no answer as a boolean", () => {
  assert.deepEqual(applyGiven({ kind: "yes-no", needsChoice: true }, "true", "bool"), {
    kind: "yes-no",
    value: true,
    needsChoice: false,
  });
  assert.deepEqual(applyGiven({ kind: "yes-no", needsChoice: true }, "false", "bool"), {
    kind: "yes-no",
    value: false,
    needsChoice: false,
  });
});

test("applyGiven records a role answer as the role id", () => {
  assert.deepEqual(applyGiven({ kind: "character", playerId: "p1" }, "empath", "role"), {
    kind: "character",
    playerId: "p1",
    roleId: "empath",
    needsChoice: false,
  });
});

test("applyGiven keeps an unknown choice kind unchanged", () => {
  const info = { kind: "one-of-two", needsChoice: true };
  assert.equal(applyGiven(info, "x", "text"), info);
  assert.equal(applyGiven(null, "x", "number"), null);
});

test("timerText formats the remaining time and clamps at zero", () => {
  assert.equal(timerText(null, 0), "—");
  assert.equal(timerText(300_000, 0), "05:00");
  assert.equal(timerText(300_000, 300_000 - 65_000), "01:05");
  assert.equal(timerText(300_000, 400_000), "00:00");
});

test("defaultCorrectionValue toggles life, keeps the role and clears a reminder", () => {
  assert.equal(defaultCorrectionValue("alive", player({ alive: true })), "dead");
  assert.equal(defaultCorrectionValue("alive", player({ alive: false })), "alive");
  assert.equal(defaultCorrectionValue("role", player({ roleId: "empath" })), "empath");
  assert.equal(defaultCorrectionValue("reminder", player()), "");
});

test("displayName prefers the saved name and falls back to the seat", () => {
  assert.equal(displayName(player({ name: "Аня" }), t), "Аня");
  assert.equal(displayName(player({ name: "", seat: 4 }), t), "ui.player 4");
  assert.equal(displayName(null, t), "—");
});

test("stepTitle names the role, the system step or the generic step", () => {
  const roles = (id: string) => (id === "chef" ? ({ id: "chef", name: "Chef" } as never) : null);
  assert.equal(stepTitle({ key: "k", roleId: "chef" } as never, roles, t), "Chef");
  assert.equal(stepTitle({ key: "k", system: "dawn" } as never, roles, t), "system.dawn");
  assert.equal(stepTitle({ key: "k" } as never, roles, t), "step");
});

test("stepBlockers lists every unanswered mandatory decision in priority order", () => {
  assert.deepEqual(
    stepBlockers({
      needsSetup: false,
      targetsIncomplete: true,
      needsGiven: false,
      needsRedirect: false,
    }),
    ["targets"],
  );
  assert.deepEqual(
    stepBlockers({
      needsSetup: true,
      targetsIncomplete: true,
      needsGiven: true,
      needsRedirect: true,
    }),
    ["secrets", "targets", "given", "redirect"],
  );
  assert.deepEqual(
    stepBlockers({
      needsSetup: false,
      targetsIncomplete: false,
      needsGiven: false,
      needsRedirect: false,
    }),
    [],
  );
});

test("nightTransitionBlockers keeps the night open on an heir or unfinished steps", () => {
  assert.deepEqual(nightTransitionBlockers({ pendingHeir: true, unfinished: 0 }), ["heir"]);
  assert.deepEqual(nightTransitionBlockers({ pendingHeir: false, unfinished: 2 }), ["steps"]);
  assert.deepEqual(nightTransitionBlockers({ pendingHeir: false, unfinished: 0 }), []);
});

test("dayTransitionBlockers keeps the day open while a nomination is unresolved", () => {
  assert.deepEqual(dayTransitionBlockers({ activeNomination: true }), ["nomination"]);
  assert.deepEqual(dayTransitionBlockers({ activeNomination: false }), []);
});

test("rejectionOf reports the engine reason for a rejected or Storyteller-choice command", () => {
  const rejected: PreviewOutcome = {
    status: "rejected",
    reason: "fallback",
    errorCode: "error.36",
    errors: ["Шаг не найден."],
  };
  assert.deepEqual(rejectionOf(rejected), { text: "Шаг не найден.", code: "error.36" });
  const choice: PreviewOutcome = {
    status: "requires-storyteller-choice",
    reason: "Выберите информацию.",
    errorCode: null,
  };
  assert.deepEqual(rejectionOf(choice), { text: "Выберите информацию.", code: null });
  assert.equal(rejectionOf({ status: "allowed" }), null);
  assert.equal(rejectionOf(null), null);
});

test("consequencesOf separates targets, applied state, deaths and revivals", () => {
  const outcome: PreviewOutcome = {
    status: "allowed",
    events: [
      { type: "effect.added", payload: { effect: { id: "e1", kind: "protected" } } },
      { type: "death.recorded", payload: { death: { playerId: "p2" } } },
      { type: "player.alive_changed", payload: { playerId: "p3", alive: true } },
      {
        type: "player.registered_dead_changed",
        payload: { playerId: "p4", registeredDead: true },
      },
    ],
    future: { delayedEffects: [{ targetId: "p5" }] },
  };
  const lines = consequencesOf(outcome, ["p1"]);
  assert.deepEqual(
    lines.map((line) => line.kind),
    ["target", "applied", "death", "revived", "prevented", "scheduled"],
  );
  assert.deepEqual(lines.find((line) => line.kind === "target")?.playerIds, ["p1"]);
  assert.deepEqual(lines.find((line) => line.kind === "death")?.playerIds, ["p2"]);
  assert.deepEqual(consequencesOf(null, ["p1"]), []);
});
