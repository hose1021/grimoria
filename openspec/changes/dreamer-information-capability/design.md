# Design

## What the engine did

```ts
// sv.ts, svInfoForStep
if (role === "dreamer") {
  const good = supportedRolesOf(["townsfolk", "outsider"]);
  const evil = supportedRolesOf(["minion", "demon"]);
  const possible = possibleCharacters(state, target); // Spy/Recluse registration
  // every good x evil pair, legal when one side is the target's character or
  // its legal registration; every pair while impaired; neither true token
  // under a living, unimpaired Vortox
}
```

The wrapper around it was already the engine's: the `requiresInfoPair`
version gate, the free-text note for older journals, `vortoxFalsifies`, the
`impaired` flag, the Russian text, the suffixes and the `role-pair` record.

Two facts matter for a behavior-preserving move:

1. **The pools are the role's rule.** Dreamer r2904 names a kind, not the
   script, so the pool is every supported character of that kind. The role
   also says which characters the target may register as (Spy r3118, Recluse
   r3007, States r1039 for an impaired registrant).
2. **The choice is the Storyteller's and the falsity is the engine's.** The
   role cannot pick a pair, mark it false, require the host or read whether
   its owner works. The engine builds the options and asks.

## The one new arm

```ts
| {
    readonly kind: "role-pair";
    readonly subjectId: string;
    readonly good: readonly RoleId[];
    readonly evil: readonly RoleId[];
    readonly possible: readonly RoleId[];
  }
```

`good` and `evil` are pools, not answers. `possible` is the registration fact
for the target. The arm has no `value`, `pair`, `options`, `impaired` or
`needsChoice` field, so a role cannot choose the answer; the compile-time
checks in `ability.test-d.ts` hold that line.

## Role

Dreamer (r2904), timing `any`, the unchanged step `{ target: "one-any",
infoKind: "note" }`, plus an `information` capability with `infoKind:
"dreamer"`:

- `subjectId`: the chosen target;
- `good`: every supported Townsfolk and Outsider;
- `evil`: every supported Minion and Demon;
- `possible`: `context.mayRegisterAsCharacters(target)`, the Spy and Recluse
  registration facts.

No target or an unknown seat returns `no-effect`; the engine then records the
pair with no options, which still refuses every answer.

## Kept on purpose in `svInfoForStep`

- `requiresInfoPair(version)` and the identical free-text note branch, so a
  command recorded before `tb-bmr-snv-2026-11-18` replays as written;
- `impaired = isImpaired(state, actor.id, currentAt(state))` and
  `vortoxFalsifies(state, role)`;
- the pair derivation: a non-impaired, non-Vortox Dreamer may show a pair that
  names the target's character or a legal registration plus an opposite-kind
  character; an impaired one may show any pair; a living, unimpaired Vortox
  may show neither true token;
- `needsChoice: true`, `hostAnswer: true`, the text key, the variables, the
  text, the suffixes and the stored `role-pair` record;
- `caseForStep`, `givenIsLegal`, `recordHostChoice`, the journal and replay.

## Not in this change

- The Sage branch and the other Sects & Violets branches.
- Presentation moved into the decision; the ledger keeps `sv.ts` as the
  presentation reference for the Dreamer.
- Any rules pin or matrix row change beyond the Dreamer test references.

## Compatibility and proof

No storage, command, journal, schema or pin changes.

1. Role tests and a browser check were added before the move. The role tests
   fail on the untouched branch because the module owns no answer; the engine
   tests pass unchanged before and after.
2. The existing Dreamer tests keep their exact expected pairs, records, flags
   and texts as the regression gate.
3. `scripts/browser-check.ts` adds `dreamer-pair`, which chooses the target and
   pair on `/table`, then asserts the stored record, the secret journal entry,
   the public projection, replay and reload.
