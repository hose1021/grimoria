import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUPPORTED_ROLE_IDS } from "./role-ids.ts";
import { SUPPORTED_ROLES } from "./rules.ts";

const ROLES_SNAPSHOT = new URL("../../../docs/official/roles.json", import.meta.url);

test("the supported role tuple lists every supported role once in model order", () => {
  assert.deepEqual([...SUPPORTED_ROLE_IDS], SUPPORTED_ROLES);
});

test("the supported role tuple matches the official non-Traveller snapshot entries", () => {
  const snapshot = JSON.parse(readFileSync(ROLES_SNAPSHOT, "utf8")) as {
    id: string;
    edition: string;
    team: string;
  }[];
  const official = snapshot
    .filter(
      (entry) =>
        entry.team !== "traveller" &&
        (entry.edition === "tb" || entry.edition === "bmr" || entry.edition === "snv"),
    )
    .map((entry) => entry.id);
  assert.deepEqual([...SUPPORTED_ROLE_IDS].sort(), official.sort());
});
