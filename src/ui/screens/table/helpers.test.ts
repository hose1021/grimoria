import assert from "node:assert/strict";
import { test } from "node:test";
import type { Player } from "../../../core/model/types.ts";
import {
  applyGiven,
  defaultCorrectionValue,
  displayName,
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
