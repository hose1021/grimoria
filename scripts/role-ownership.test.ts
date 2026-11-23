import test from "node:test";
import assert from "node:assert/strict";
import {
  capabilityKinds,
  engineLocations,
  ownerOf,
  roleModules,
  ruleRows,
} from "./role-ownership.ts";

test("the ledger covers all 72 supported roles once", () => {
  const modules = roleModules();
  assert.equal(modules.length, 72);
  assert.equal(new Set(modules.map((module) => module.id)).size, 72);
});

test("every role dossier names at least one rule identifier", () => {
  for (const module of roleModules()) {
    const rows = ruleRows(module.id);
    assert.ok(rows.length > 0, module.id + " has no rule row");
    assert.ok(
      rows.every((row) => row.revision.startsWith("r")),
      module.id + " has a rule row without a pinned revision",
    );
  }
});

test("the owner classifier separates a capability from an engine branch", () => {
  const facts = roleModules();
  const imp = facts.find((module) => module.id === "imp");
  assert.ok(imp);
  assert.equal(ownerOf(imp, engineLocations("imp")), "capability + engine reference");
  const branch = facts.find((module) => module.id === "soldier");
  assert.ok(branch);
  assert.equal(ownerOf(branch, engineLocations("soldier")), "engine branch");
  assert.equal(ownerOf(undefined, []), "missing module");
});

test("a migrated night step is owned by its module with no engine reference", () => {
  const facts = roleModules();
  for (const id of ["poisoner", "monk"]) {
    const module = facts.find((candidate) => candidate.id === id);
    assert.ok(module, id);
    assert.deepEqual(module.declares, ["capability:night-step"], id);
    assert.deepEqual(engineLocations(id), [], id + " is still named by a coordinator");
    assert.equal(ownerOf(module, engineLocations(id)), "capability");
  }
});

test("a migrated night step keeps the references of the shared mechanic that reads its effect", () => {
  const butler = roleModules().find((candidate) => candidate.id === "butler");
  assert.ok(butler);
  assert.deepEqual(butler.declares, ["capability:night-step"]);
  // The vote check and the effect lookup still name the role; the night
  // completion does not.
  assert.deepEqual(engineLocations("butler"), ["effects.ts×2", "day.ts×1"]);
  assert.equal(ownerOf(butler, engineLocations("butler")), "capability + engine reference");
});

test("the Gambler and the Pukka declare their resolver on the night-step capability", () => {
  const facts = roleModules();
  const gambler = facts.find((candidate) => candidate.id === "gambler");
  assert.ok(gambler);
  assert.deepEqual(gambler.declares, ["capability:night-step"]);
  // The step builder still names the role for the list of characters to guess.
  assert.deepEqual(engineLocations("gambler"), ["bmr.ts×1"]);
  assert.equal(ownerOf(gambler, engineLocations("gambler")), "capability + engine reference");
  const pukka = facts.find((candidate) => candidate.id === "pukka");
  assert.ok(pukka);
  assert.deepEqual(pukka.declares, ["capability:night-step"]);
  // The Demon set, the Exorcist's block, the outcome panel and the delayed
  // death still name the role; the step completion does not.
  assert.deepEqual(engineLocations("pukka"), ["bmr.ts×3", "pukka.ts×1"]);
  assert.equal(ownerOf(pukka, engineLocations("pukka")), "capability + engine reference");
});

test("the Sailor and the Innkeeper resolve on the night-step capability, not in the step completion", () => {
  const facts = roleModules();
  const sailor = facts.find((candidate) => candidate.id === "sailor");
  assert.ok(sailor);
  assert.deepEqual(sailor.declares, ["capability:night-step"]);
  // "You can't die" in the death path and the check of the drunk answer
  // still name the role; bmr.ts does not.
  assert.deepEqual(engineLocations("sailor"), ["effects.ts×1", "night.ts×3"]);
  assert.equal(ownerOf(sailor, engineLocations("sailor")), "capability + engine reference");
  const innkeeper = facts.find((candidate) => candidate.id === "innkeeper");
  assert.ok(innkeeper);
  assert.deepEqual(innkeeper.declares, ["capability:night-step"]);
  // The marker of the protection and the check of the drunk answer.
  assert.deepEqual(engineLocations("innkeeper"), ["effects.ts×2", "night.ts×1"]);
  assert.equal(ownerOf(innkeeper, engineLocations("innkeeper")), "capability + engine reference");
});

test("the Devil's Advocate and the Exorcist resolve on the night-step capability, not in the step completion", () => {
  const facts = roleModules();
  const advocate = facts.find((candidate) => candidate.id === "devilsadvocate");
  assert.ok(advocate);
  assert.deepEqual(advocate.declares, ["capability:night-step"]);
  // The execution check, the living-target check and the step builder's
  // "different to last night" still name the role; the completion does not.
  assert.deepEqual(engineLocations("devilsadvocate"), ["effects.ts×2", "night.ts×1", "bmr.ts×1"]);
  assert.equal(
    ownerOf(advocate, engineLocations("devilsadvocate")),
    "capability + engine reference",
  );
  const exorcist = facts.find((candidate) => candidate.id === "exorcist");
  assert.ok(exorcist);
  assert.deepEqual(exorcist.declares, ["capability:night-step"]);
  // The step builder's "different to last night" and the note of the step.
  assert.deepEqual(engineLocations("exorcist"), ["bmr.ts×2"]);
  assert.equal(ownerOf(exorcist, engineLocations("exorcist")), "capability + engine reference");
});

test("the Tinker, the Po and the Shabaloth resolve on the night-step capability, not in the step completion", () => {
  const facts = roleModules();
  const tinker = facts.find((candidate) => candidate.id === "tinker");
  assert.ok(tinker);
  assert.deepEqual(tinker.declares, ["capability:night-step"]);
  // The day command and the outcome of the step, where the host marks the
  // death, still name the role; the completion does not.
  assert.deepEqual(engineLocations("tinker"), ["day.ts×2", "bmr.ts×4"]);
  assert.equal(ownerOf(tinker, engineLocations("tinker")), "capability + engine reference");
  const po = facts.find((candidate) => candidate.id === "po");
  assert.ok(po);
  assert.deepEqual(po.declares, ["capability:night-step"]);
  // The Demon set, the size of the step after a night with no choice, and
  // the Lunatic who was shown the Po.
  assert.deepEqual(engineLocations("po"), ["bmr.ts×6"]);
  assert.equal(ownerOf(po, engineLocations("po")), "capability + engine reference");
  const shabaloth = facts.find((candidate) => candidate.id === "shabaloth");
  assert.ok(shabaloth);
  assert.deepEqual(shabaloth.declares, ["capability:night-step"]);
  // The Demon set, a Demon kept asleep, and the regurgitation on the outcome.
  assert.deepEqual(engineLocations("shabaloth"), ["bmr.ts×6"]);
  assert.equal(ownerOf(shabaloth, engineLocations("shabaloth")), "capability + engine reference");
});

test("the four Sects & Violets Demons resolve on the night-step capability, not in the step completion", () => {
  const facts = roleModules();
  // The Demon set, the outcome of the step where the host marks the death,
  // and the shared mechanics each Demon keeps: the Fang Gu's once-per-game
  // jump, the No Dashii's and the Vigormortis's poison, and the Vortox's
  // false information and win at dusk.
  const expected = {
    fanggu: ["sv.ts×5"],
    nodashii: ["sv.ts×3"],
    vigormortis: ["sv.ts×2"],
    vortox: ["death.ts×2", "sv.ts×2"],
  };
  for (const [id, locations] of Object.entries(expected)) {
    const module = facts.find((candidate) => candidate.id === id);
    assert.ok(module, id);
    assert.deepEqual(module.declares, ["capability:night-step"], id);
    assert.deepEqual(engineLocations(id), locations, id);
    assert.equal(ownerOf(module, engineLocations(id)), "capability + engine reference", id);
  }
});

test("the Cerenovus resolves on the night-step capability, not in the step completion", () => {
  const cerenovus = roleModules().find((candidate) => candidate.id === "cerenovus");
  assert.ok(cerenovus);
  assert.deepEqual(cerenovus.declares, ["capability:night-step"]);
  // The madness review in effects.ts and day.ts, and in sv.ts the list of
  // good characters on the step, the console note and the command check of
  // the character named.
  assert.deepEqual(engineLocations("cerenovus"), ["day.ts×1", "sv.ts×3"]);
  assert.equal(ownerOf(cerenovus, engineLocations("cerenovus")), "capability + engine reference");
});

test("the Sects & Violets information roles declare their step on the night-step capability and keep their presentation in the engine", () => {
  const facts = roleModules();
  // The wording and the win in svInfoForStep, the Mathematician's ledger and
  // the Dreamer's bar on choosing themself, and what each role's other rules
  // keep: the Evil Twin's pair and win, the day's yes-or-no questions.
  const expected = {
    clockmaker: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["sv.ts×2"],
    },
    dreamer: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["night.ts×1", "sv.ts×2", "host-choice.ts×1"],
    },
    eviltwin: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["model/state.ts×1", "death.ts×2", "setup.ts×3", "sv.ts×4", "corrections.ts×1"],
    },
    flowergirl: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["sv.ts×3", "host-choice.ts×1"],
    },
    mathematician: {
      declares: ["capability:night-step", "capability:information"],
      // The extra night.ts reference is the attack-step gate that stores the
      // Demon's chosen target only when the Lunatic jinx can run. The sixth
      // sv.ts reference is the completed-step guard that keeps a later Lunatic
      // completion from adding a mark after the Mathematician's clear.
      locations: ["night.ts×3", "sv.ts×6"],
    },
    oracle: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["sv.ts×2"],
    },
    towncrier: {
      declares: ["capability:night-step", "capability:information"],
      locations: ["sv.ts×1", "host-choice.ts×1"],
    },
  };
  for (const [id, expectedRole] of Object.entries(expected)) {
    const module = facts.find((candidate) => candidate.id === id);
    assert.ok(module, id);
    assert.deepEqual(module.declares, expectedRole.declares, id);
    assert.deepEqual(engineLocations(id), expectedRole.locations, id);
    assert.equal(ownerOf(module, engineLocations(id)), "capability + engine reference", id);
  }
});

test("the Snake Charmer and the Pit-Hag declare their step and resolve their change on capabilities", () => {
  const facts = roleModules();
  // sv.ts routes each change to its module by role and cause and applies it
  // through the shared swap or replacement; it builds the Pit-Hag's
  // character list and both console notes.
  const expected = { snakecharmer: ["sv.ts×4"], pithag: ["sv.ts×9"] };
  for (const [id, locations] of Object.entries(expected)) {
    const module = facts.find((candidate) => candidate.id === id);
    assert.ok(module, id);
    assert.deepEqual(module.declares, ["capability:night-step", "capability:transformation"], id);
    assert.deepEqual(engineLocations(id), locations, id);
    assert.equal(ownerOf(module, engineLocations(id)), "capability + engine reference", id);
  }
});

test("a migrated attack keeps the references of the shared succession, not of the step completion", () => {
  const imp = roleModules().find((candidate) => candidate.id === "imp");
  assert.ok(imp);
  assert.deepEqual(imp.declares, ["capability:night-step", "capability:death-trigger"]);
  // The succession fallback and the heir still name the role; the new Demon's
  // character now comes from the dead Demon, so `becoming.ts` no longer names
  // the Imp.
  assert.deepEqual(engineLocations("imp"), ["death.ts×2", "night.ts×1", "becoming.ts×1"]);
  assert.equal(ownerOf(imp, engineLocations("imp")), "capability + engine reference");
});

test("a migrated information role is owned by its module once no coordinator names it", () => {
  const empath = roleModules().find((candidate) => candidate.id === "empath");
  assert.ok(empath);
  assert.deepEqual(empath.declares, ["capability:night-step", "capability:information"]);
  // The count, the number shape and the possible answers come from the module;
  // the night completion and the information path read them through the lookup.
  assert.deepEqual(engineLocations("empath"), [], "empath is still named by a coordinator");
  assert.equal(ownerOf(empath, engineLocations("empath")), "capability");
});

test("a migrated information role keeps the references of its setup and its query, not of the night step", () => {
  const fortuneteller = roleModules().find((candidate) => candidate.id === "fortuneteller");
  assert.ok(fortuneteller);
  assert.deepEqual(fortuneteller.declares, ["capability:night-step", "capability:information"]);
  // The red herring is checked and chosen in setup, and the exported query
  // resolves the module's capability; the night completion and the
  // information path of a step no longer name the role.
  assert.deepEqual(engineLocations("fortuneteller"), ["setup.ts×3", "information.ts×1"]);
  assert.equal(
    ownerOf(fortuneteller, engineLocations("fortuneteller")),
    "capability + engine reference",
  );
});

test("a migrated information role whose query stays keeps that one reference", () => {
  const chef = roleModules().find((candidate) => candidate.id === "chef");
  assert.ok(chef);
  assert.deepEqual(chef.declares, ["capability:night-step", "capability:information"]);
  // The count, the legal range and the step shape come from the module. The
  // exported count query resolves the module; nothing else names the role.
  assert.deepEqual(engineLocations("chef"), ["information.ts×1"]);
  assert.equal(ownerOf(chef, engineLocations("chef")), "capability + engine reference");
});

test("a role that moved its answer and step owns both on capabilities", () => {
  const undertaker = roleModules().find((candidate) => candidate.id === "undertaker");
  assert.ok(undertaker);
  // The character on record, the legal registrations and the wake all come
  // from the module; the step's hooks read the game.
  assert.deepEqual(undertaker.declares, ["capability:night-step", "capability:information"]);
  assert.deepEqual(engineLocations("undertaker"), [], "undertaker is still named by a coordinator");
  assert.equal(ownerOf(undertaker, engineLocations("undertaker")), "capability");
});

test("a role woken by its own death keeps the references of that wake, not of the answer", () => {
  const ravenkeeper = roleModules().find((candidate) => candidate.id === "ravenkeeper");
  assert.ok(ravenkeeper);
  assert.deepEqual(ravenkeeper.declares, ["capability:night-step", "capability:information"]);
  // The step inserted on the night of the death still names the role; the
  // information path and the completion of the step do not.
  assert.deepEqual(engineLocations("ravenkeeper"), ["night.ts×4"]);
  assert.equal(
    ownerOf(ravenkeeper, engineLocations("ravenkeeper")),
    "capability + engine reference",
  );
});

test("a role whose answer is prepared in setup keeps the references of setup, not of the night step", () => {
  const facts = roleModules();
  for (const [id, locations] of [
    ["washerwoman", ["setup.ts×3"]],
    ["librarian", ["setup.ts×4"]],
    ["investigator", ["setup.ts×2"]],
  ] as const) {
    const module = facts.find((candidate) => candidate.id === id);
    assert.ok(module, id);
    assert.deepEqual(module.declares, ["capability:night-step", "capability:information"], id);
    // The check and the choice of the prepared answer are setup and still name
    // the role; the night completion and the information path do not.
    assert.deepEqual(engineLocations(id), locations, id);
    assert.equal(ownerOf(module, engineLocations(id)), "capability + engine reference", id);
  }
});

test("the Spy declares its step and its answer and keeps the references of its registration", () => {
  const spy = roleModules().find((candidate) => candidate.id === "spy");
  assert.ok(spy);
  assert.deepEqual(spy.declares, [
    "capability:night-step",
    "capability:information",
    "capability:adjudication",
  ]);
  // Who the Spy may register as is read where a registration is applied, in
  // the Virgin's nomination and in the check of a prepared answer. The night
  // completion names no role for its answer, and neither does `infoForStep`,
  // nor the Dreamer's pair since #211 reads the facts instead of the role.
  assert.deepEqual(engineLocations("spy"), ["day.ts×2", "setup.ts×2", "information-facts.ts×4"]);
  assert.equal(ownerOf(spy, engineLocations("spy")), "capability + engine reference");
});

test("only the arms of the capabilities array are reported, not the kinds a resolver returns", () => {
  const source = `
    export const role = {
      id: "example",
      // kind: "comment" is not a declaration
      capabilities: [
        {
          kind: "night-step",
          timing: "any",
          step: { target: "one-any", infoKind: "none" },
          resolve({ impaired }) {
            if (impaired) return { kind: "suppressed" };
            return { kind: "effects", effects: [{ kind: "timed-effect" }], text: 'kind: "quoted"' };
          },
        },
        { kind: "win", resolve: () => ({ kind: "no-effect" }) },
      ],
      other: [{ kind: "ignored" }],
    };`;
  assert.deepEqual(capabilityKinds(source), ["night-step", "win"]);
  assert.deepEqual(capabilityKinds('export const role = { id: "plain" };'), []);
});
