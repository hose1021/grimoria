import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { NIGHT_FIRST_ORDER, NIGHT_OTHER_ORDER, nightOrderRank } from "./night-order.ts";
import {
  ALL_ROLES,
  BMR_ALL,
  BMR_NIGHT_FIRST,
  BMR_NIGHT_OTHER,
  NIGHT_FIRST,
  NIGHT_OTHER,
  SNV_ALL,
  SV_NIGHT_FIRST,
  SV_NIGHT_OTHER,
  SUPPORTED_ROLES,
} from "./rules.ts";
import { SUPPORTED_ROLE_IDS } from "./role-ids.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SNAPSHOT = JSON.parse(readFileSync(join(ROOT, "docs/official/nightsheet.json"), "utf8")) as {
  firstNight: string[];
  otherNight: string[];
};

const SYSTEM = new Set(["minioninfo", "demoninfo"]);
const supported = new Set<string>(SUPPORTED_ROLE_IDS);

function projection(list: readonly string[]): string[] {
  return list.filter((id) => supported.has(id) || SYSTEM.has(id));
}

function rolesOnly(list: readonly string[]): string[] {
  return list.filter((id) => !SYSTEM.has(id) && id !== "info");
}

test("the night order is the supported projection of the official snapshot", () => {
  assert.deepEqual([...NIGHT_FIRST_ORDER], projection(SNAPSHOT.firstNight));
  assert.deepEqual([...NIGHT_OTHER_ORDER], projection(SNAPSHOT.otherNight));
});

test("each supported edition keeps its published night order", () => {
  const editions = [
    {
      name: "Trouble Brewing",
      pool: ALL_ROLES,
      first: rolesOnly(NIGHT_FIRST),
      other: rolesOnly(NIGHT_OTHER),
    },
    {
      name: "Bad Moon Rising",
      pool: BMR_ALL,
      first: rolesOnly(BMR_NIGHT_FIRST),
      other: rolesOnly(BMR_NIGHT_OTHER),
    },
    {
      name: "Sects and Violets",
      pool: SNV_ALL,
      first: rolesOnly(SV_NIGHT_FIRST),
      other: rolesOnly(SV_NIGHT_OTHER),
    },
  ];
  for (const edition of editions) {
    const pool = new Set(edition.pool);
    assert.deepEqual(
      NIGHT_FIRST_ORDER.filter((id) => pool.has(id)),
      edition.first,
      edition.name + " first-night projection differs",
    );
    assert.deepEqual(
      NIGHT_OTHER_ORDER.filter((id) => pool.has(id)),
      edition.other,
      edition.name + " other-night projection differs",
    );
  }
});

test("every ordered character is a supported character and the system steps lead the first night", () => {
  for (const id of [...NIGHT_FIRST_ORDER, ...NIGHT_OTHER_ORDER]) {
    assert.ok(id === "minioninfo" || id === "demoninfo" || supported.has(id), id);
  }
  assert.ok(NIGHT_FIRST_ORDER.indexOf("minioninfo") < NIGHT_FIRST_ORDER.indexOf("demoninfo"));
  assert.equal(nightOrderRank("imp", 1), -1);
  assert.ok(nightOrderRank("imp", 2) > nightOrderRank("poisoner", 2));
  assert.ok(nightOrderRank("philosopher", 2) < nightOrderRank("sailor", 2));
  const waking = new Set([...NIGHT_FIRST_ORDER, ...NIGHT_OTHER_ORDER]);
  assert.deepEqual(
    [...waking].sort(),
    [...new Set([...projection(SNAPSHOT.firstNight), ...projection(SNAPSHOT.otherNight)])].sort(),
  );
  assert.ok(waking.size >= 50 && waking.size < SUPPORTED_ROLES.length);
});
