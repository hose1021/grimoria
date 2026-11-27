# Design

## The record

```ts
export interface ShownTwin {
  readonly playerId: string;
  readonly roleId: RoleId | null;
}

// InformationDecision, note arm
| {
    readonly kind: "note";
    readonly text: string;
    readonly shown?: readonly ShownTwin[];
  }
```

A note is "no computed answer"; an introduction may also name the players it
shows. The arm still carries no `value`, `needsChoice`, `options`, `impaired`,
`roleId` or `matchIndex`; the compile-time checks in `ability.test-d.ts` hold
that line and add the shown-entry shape.

## The fact

```ts
// InformationContext
readonly twins: { readonly goodId: string; readonly evilId: string } | null;
```

Ids only: a stored name breaks replay equality after a rename and leaks
presentation into the domain. `sv.ts` resolves names from `playerById` to build
`textVars` and the Russian fallback, exactly as before. The pair arrives
through an optional `informationFacts` query field, so no other caller changes
and `information-facts.ts` imports no `death.ts` (`death → night → information
→ sv → information-facts` would cycle).

`sv.ts` supplies `evilTwinPair(state)`, the validated pair, not a raw setup
read, so an impaired, dead or unpaired holder keeps today's missing note.

## Role

`eviltwin` keeps its first-night `night-step` and adds:

```ts
{
  kind: "information",
  infoKind: "eviltwin",
  resolve(context) {
    const twins = context.twins;
    if (!twins) return { kind: "note", text: "Партнёр Близнеца ещё не выбран." };
    return {
      kind: "note",
      text: "Покажите Близнецам друг друга.",
      shown: [
        { playerId: twins.evilId, roleId: context.actualRoleOf(twins.evilId) },
        { playerId: twins.goodId, roleId: context.actualRoleOf(twins.goodId) },
      ],
    };
  },
}
```

The role owns what is shown and the null-pair branch. It does not compute the
pair, the names, the sentence, the log or the projection.

## Kept in `svInfoForStep`

- `impaired` and the `actor` lookup, the two existing keys
  `note.sv.evilTwin` / `note.sv.evilTwinMissing`, `textVars` `{ actor, twin,
  twinRole }`, the Russian fallback built from the Good Twin's character, and
  the field order.
- No `impaired` flag, no `needsChoice`, no `options`, no host-choice case.
- The secret journal line and `finishStep`'s privacy boundary; `shown` is not
  added to the log detail.
- `...(recordsEvilTwinShown(version) && shown ? { shown } : {})`, appended
  last, so legacy bytes are unchanged.

The step cannot come through `moduleInfoForStep`: `infoForStep` dispatches
`step.sv` first, and `moduleInfoForStep` maps a note to `{ kind: "none" }`,
which would drop `shown`.

## Version

`EVIL_TWIN_SHOWN_RULESET_VERSION = "tb-bmr-snv-2026-11-21.1"` becomes
`RULESET_VERSION`, joins `SUPPORTED_RULESET_VERSIONS`, joins every
current-behavior predicate (`requiresInfoPair`, `recordsAttackSource`,
`rejectsMandatorySkip`, `restrictsSeatOrder`, `buildsFirstNightTinker`,
`validatesOneOfTwoAnswer`) and not the legacy ones. Missing a predicate would
silently revert an unrelated rule at the new version.

## Not in this change

- Reusing `prepared`, a synthetic `setup.info.eviltwin`, or a one-of-two
  renderer.
- Storing names, a rendered sentence omission, or a `shownRoleId` for a Drunk's
  token; those are separate rules-verified changes.
- Any new host choice; the introduction is not an answer the host supplies.
