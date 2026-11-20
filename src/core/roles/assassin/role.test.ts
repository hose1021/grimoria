import test from "node:test";
import assert from "node:assert/strict";
import { nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

test("the Assassin module declares no first-night step (BMR-ASSASSIN-01)", () => {
  assert.equal(nightStepFor(role, 1), undefined, "Each night*: not on the first night");
  assert.ok(nightStepFor(role, 2), "the step exists from the second night");
  assert.deepEqual(
    (role.capabilities ?? []).map((capability) => capability.kind),
    ["night-step"],
  );
});
