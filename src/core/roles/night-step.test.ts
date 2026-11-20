import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_ROLE_IDS } from "../model/role-ids.ts";
import { nightSequence } from "../model/rules.ts";
import type { AbilityContext, AbilityDecision } from "./ability.ts";
import {
  firstNightStepOf,
  informationOf,
  nightResolverFor,
  nightStepFor,
  otherNightStepOf,
} from "./night-step.ts";
import { roleModule } from "./registry.ts";
import type { RoleModule } from "./types.ts";

const FACTS: AbilityContext = {
  actorId: "1",
  targetIds: ["2"],
  chosenRoleId: null,
  drunkId: null,
  impaired: false,
  at: { phase: "night", number: 2 },
  pendings: [],
  actualRoleOf: () => null,
  hasPlayer: () => true,
  nameOf: (id) => "P" + id,
};

const kill = (): AbilityDecision => ({
  kind: "effects",
  effects: [{ kind: "kill", playerId: "2" }],
});
const quiet = (): AbilityDecision => ({ kind: "no-effect" });

test("a legacy module keeps its night step on every night", () => {
  const legacy: RoleModule = { id: "sailor", edition: "bmr", nightStep: { target: "one-any" } };
  assert.deepEqual(nightStepFor(legacy, 1), { target: "one-any" });
  assert.deepEqual(nightStepFor(legacy, 3), { target: "one-any" });
  assert.deepEqual(firstNightStepOf(legacy), { target: "one-any" });
  assert.deepEqual(otherNightStepOf(legacy), { target: "one-any" });
});

test("a legacy first-night step replaces the night step on the first night only", () => {
  const legacy: RoleModule = {
    id: "devilsadvocate",
    edition: "bmr",
    nightStep: { target: "one-any", noteKey: "other" },
    firstNightStep: { target: "one-any", noteKey: "first" },
  };
  assert.equal(nightStepFor(legacy, 1)?.noteKey, "first");
  assert.equal(nightStepFor(legacy, 2)?.noteKey, "other");
  const firstOnly: RoleModule = {
    id: "clockmaker",
    edition: "snv",
    firstNightStep: { target: "none", infoKind: "number" },
  };
  assert.deepEqual(nightStepFor(firstOnly, 1), { target: "none", infoKind: "number" });
  assert.equal(nightStepFor(firstOnly, 2), undefined);
});

test("a night-step arm for any night declares the step for every night", () => {
  const module: RoleModule = {
    id: "poisoner",
    edition: "tb",
    capabilities: [{ kind: "night-step", timing: "any", step: { target: "one-any" } }],
  };
  assert.deepEqual(nightStepFor(module, 1), { target: "one-any" });
  assert.deepEqual(nightStepFor(module, 4), { target: "one-any" });
});

test("first and other arms split a role whose first night differs", () => {
  const module: RoleModule = {
    id: "devilsadvocate",
    edition: "bmr",
    capabilities: [
      { kind: "night-step", timing: "first", step: { target: "none" }, resolve: quiet },
      { kind: "night-step", timing: "other", step: { target: "one-any" }, resolve: kill },
    ],
  };
  assert.deepEqual(nightStepFor(module, 1), { target: "none" });
  assert.deepEqual(nightStepFor(module, 2), { target: "one-any" });
  assert.deepEqual(nightResolverFor(module, 1)?.(FACTS), { kind: "no-effect" });
  assert.equal(nightResolverFor(module, 2)?.(FACTS).kind, "effects");
});

test("an arm for other nights declares nothing on the first night", () => {
  const module: RoleModule = {
    id: "monk",
    edition: "tb",
    capabilities: [
      { kind: "night-step", timing: "other", step: { target: "one-other" }, resolve: kill },
    ],
  };
  assert.equal(nightStepFor(module, 1), undefined);
  assert.equal(nightResolverFor(module, 1), undefined);
  assert.deepEqual(nightStepFor(module, 2), { target: "one-other" });
  assert.ok(nightResolverFor(module, 2));
});

test("a module without a night-step arm owns no resolver", () => {
  const legacy: RoleModule = {
    id: "sailor",
    edition: "bmr",
    nightStep: { target: "one-any" },
    firstNightStep: { target: "one-any" },
  };
  assert.equal(nightResolverFor(legacy, 1), undefined);
  assert.equal(nightResolverFor(legacy, 2), undefined);
  for (const id of SUPPORTED_ROLE_IDS) {
    const module = roleModule(id)!;
    if (nightArms(module).length) continue;
    assert.equal(nightResolverFor(module, 1), undefined, id + " resolves without an arm");
    assert.equal(nightResolverFor(module, 2), undefined, id + " resolves without an arm");
  }
});

test("no module keeps the removed resolver field", () => {
  for (const id of SUPPORTED_ROLE_IDS) {
    assert.equal("ability" in roleModule(id)!, false, id + " declares an ability field");
  }
});

test("an arm without a resolver leaves the completed step to the engine", () => {
  const module: RoleModule = {
    id: "chef",
    edition: "tb",
    capabilities: [{ kind: "night-step", timing: "first", step: { target: "none" } }],
  };
  assert.equal(nightResolverFor(module, 1), undefined);
  assert.equal(nightResolverFor(null, 1), undefined);
  assert.equal(nightStepFor(null, 1), undefined);
  assert.equal(nightStepFor(undefined, 2), undefined);
});

function nightArms(module: RoleModule) {
  return (module.capabilities ?? []).filter((capability) => capability.kind === "night-step");
}

test("a module declares its night step once: a night-step arm or the legacy fields", () => {
  for (const id of SUPPORTED_ROLE_IDS) {
    const module = roleModule(id)!;
    if (!nightArms(module).length) continue;
    assert.equal(module.nightStep, undefined, id + " keeps a legacy nightStep beside its arm");
    assert.equal(module.firstNightStep, undefined, id + " keeps a legacy firstNightStep");
  }
});

test("a night-step arm agrees with the printed night order of its edition", () => {
  for (const id of SUPPORTED_ROLE_IDS) {
    const module = roleModule(id)!;
    const arms = nightArms(module);
    const first = nightSequence(1, module.edition).includes(id);
    const other = nightSequence(2, module.edition).includes(id);
    const timings = arms.map((capability) => capability.timing).sort();
    assert.equal(new Set(timings).size, timings.length, id + " repeats a night-step timing");
    for (const timing of timings) {
      if (timing === "any") {
        // The Tinker never wakes; its first-night death step is appended
        // outside the printed order (Tinker r1782).
        assert.ok(
          id === "tinker" || (first && other),
          id + " is declared for any night but does not wake on both",
        );
        assert.equal(timings.length, 1, id + " mixes an any-night arm with another arm");
      }
      if (timing === "first")
        assert.ok(first, id + " has a first-night arm but no first-night slot");
      if (timing === "other") {
        assert.ok(other, id + " has an other-night arm but no other-night slot");
        if (!timings.includes("first")) {
          assert.equal(first, false, id + " wakes on the first night without a declared step");
        }
      }
    }
  }
});

test("the migrated Trouble Brewing roles resolve from their modules", () => {
  assert.ok(nightResolverFor(roleModule("poisoner"), 1));
  assert.ok(nightResolverFor(roleModule("poisoner"), 2));
  assert.ok(nightResolverFor(roleModule("monk"), 2));
  assert.equal(nightResolverFor(roleModule("monk"), 1), undefined, "the Monk sleeps on night 1");
  assert.ok(nightResolverFor(roleModule("butler"), 1));
  assert.ok(nightResolverFor(roleModule("butler"), 2));
  assert.ok(nightResolverFor(roleModule("imp"), 2));
  assert.equal(nightResolverFor(roleModule("imp"), 1), undefined, "the Imp sleeps on night 1");
});

test("the migrated Bad Moon Rising roles resolve from their modules", () => {
  const gambler = roleModule("gambler");
  assert.ok(nightResolverFor(gambler, 2));
  assert.equal(nightResolverFor(gambler, 1), undefined, "the Gambler sleeps on night 1");
  assert.equal(nightStepFor(gambler, 1), undefined);
  assert.equal(nightStepFor(gambler, 2)?.canKill, false, "the engine resolves the death");
  const pukka = roleModule("pukka");
  assert.ok(nightResolverFor(pukka, 1), "the Pukka acts on the first night");
  assert.ok(nightResolverFor(pukka, 2));
  assert.deepEqual(nightStepFor(pukka, 1), nightStepFor(pukka, 2));
});

test("the lookup finds the information a module's step yields", () => {
  const module: RoleModule = {
    id: "chef",
    edition: "tb",
    capabilities: [
      { kind: "night-step", timing: "first", step: { infoKind: "number" } },
      {
        kind: "information",
        infoKind: "chef",
        resolve: () => ({ kind: "answer", value: 1, possible: [0, 1] }),
      },
    ],
  };
  assert.equal(informationOf(module)?.infoKind, "chef");
  assert.equal(nightStepFor(module, 1)?.infoKind, "number");
  const silent: RoleModule = { id: "poisoner", edition: "tb", nightStep: { target: "one-any" } };
  assert.equal(informationOf(silent), undefined);
  assert.equal(informationOf(null), undefined);
  assert.equal(informationOf(undefined), undefined);
});

test("the migrated Trouble Brewing information roles answer from their modules", () => {
  const empath = roleModule("empath");
  assert.ok(informationOf(empath), "the Empath owns its answer");
  assert.equal(nightStepFor(empath, 1)?.infoKind, "number", "and the shape of its step");
  assert.equal(nightStepFor(empath, 2)?.infoKind, "number");
  assert.equal(nightResolverFor(empath, 1), undefined, "the step applies nothing");

  const fortuneteller = roleModule("fortuneteller");
  assert.ok(informationOf(fortuneteller), "the Fortune Teller owns its answer");
  assert.equal(nightStepFor(fortuneteller, 1)?.target, "two");
  assert.equal(nightStepFor(fortuneteller, 1)?.infoKind, "yes-no");
  assert.equal(nightStepFor(fortuneteller, 2)?.infoKind, "yes-no");
  assert.equal(nightResolverFor(fortuneteller, 2), undefined, "the step applies nothing");

  const chef = roleModule("chef");
  assert.ok(informationOf(chef), "the Chef owns its answer");
  assert.equal(nightStepFor(chef, 1)?.infoKind, "number");
  assert.equal(nightStepFor(chef, 1)?.target, undefined, "the Chef chooses nobody");
  assert.equal(nightStepFor(chef, 2), undefined, "the Chef learns on the first night only");
  assert.equal(nightResolverFor(chef, 1), undefined, "the step applies nothing");
});

test("the Trouble Brewing character roles answer from their modules and keep their wake", () => {
  // The Undertaker and the Ravenkeeper wake on a condition the queue reads
  // from the game, so their step stays in the legacy field; the answer and its
  // shape are the module's.
  for (const id of ["undertaker", "ravenkeeper"] as const) {
    const module = roleModule(id);
    assert.ok(informationOf(module), id + " owns its answer");
    assert.equal(nightStepFor(module, 2)?.infoKind, "character", id);
    assert.equal(typeof nightStepFor(module, 2)?.actor, "function", id + " keeps its wake");
    assert.equal(nightResolverFor(module, 2), undefined, "the step applies nothing");
  }
  assert.equal(nightStepFor(roleModule("undertaker"), 2)?.target, undefined);
  assert.equal(nightStepFor(roleModule("ravenkeeper"), 2)?.target, "one-any");
});
