import assert from "node:assert/strict";
import test from "node:test";
import { role as barber } from "./barber/role.ts";
import { role as sage } from "./sage/role.ts";
import { role as sweetheart } from "./sweetheart/role.ts";
import { deathStepOf, nightResolverFor, nightStepFor } from "./night-step.ts";
import type { RoleModule } from "./types.ts";

function assertBothSteps(role: RoleModule, roleId: string, target: string) {
  assert.equal(nightResolverFor(role, 2), undefined, roleId + " keeps the engine path");
  const night = nightStepFor(role, 2);
  const death = deathStepOf(role);
  assert.ok(night, roleId + " declares a night step");
  assert.ok(death, roleId + " declares a death step");
  assert.deepEqual(
    { target: night.target, infoKind: night.infoKind },
    { target, infoKind: "note" },
    roleId + " night step",
  );
  assert.deepEqual(
    { target: death.target, infoKind: death.infoKind },
    { target, infoKind: "note" },
    roleId + " death step",
  );
  assert.equal(typeof night.actor, "function");
  assert.equal(typeof death.actor, "function");
}

test("the Barber declares both wakes on capabilities (SNV-BARBER-01)", () => {
  assertBothSteps(barber, "Barber", "two");
});

test("the Sage declares both wakes on capabilities (SNV-SAGE-01)", () => {
  assertBothSteps(sage, "Sage", "none");
});

test("the Sweetheart declares both wakes on capabilities (SNV-SWEETHEART-01)", () => {
  assertBothSteps(sweetheart, "Sweetheart", "one-any");
});
