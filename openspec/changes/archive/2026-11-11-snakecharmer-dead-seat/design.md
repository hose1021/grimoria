# Design

## Decision: one clause in the existing `disabled` expression

The target picker already computes `disabled` from the step's identity and the
engine's own constraints: the actor on `one-other` steps, the Dreamer and
Seamstress self-target rule, the previous target, and the Bad Moon Rising
resurrection exception. The Snake Charmer rule belongs in the same expression,
not in a separate component or a second render path:

```ts
(step.sv && step.roleId === "snakecharmer" && !player.alive)
```

The clause is scoped to the `snakecharmer` step because other Sects & Violets
roles may name a dead player. `step.roleId` is the character whose step is
rendered, and `!player.alive` matches the engine's check in
`src/core/engine/sv.ts`.

## Decision: UI guard, engine stays authoritative

The disabled seat is a usability guard. `completeStep` still returns
`error.55` for a dead Snake Charmer target, and `js/snv.test.mjs` asserts it.
The UI does not weaken or replace that rejection; it prevents the host from
choosing a command the engine will reject.

## Decision: browser regression seeded from the test entry

`js/test-entry.js` exposes the same `model`, `engine`, `store` and `rules`
instances the app bundle uses, so the regression can build a seven-player
Sects & Violets game, deal a Snake Charmer and a Fang Gu, start the night, skip
the steps before the Snake Charmer, mark one other player dead and replace the
store state. The check then asserts on the rendered `[data-target]` buttons:
the dead seat is disabled, a living seat is enabled. The game is restored to the
seven-player Trouble Brewing seed the rest of the script expects.

## Rejected alternatives

- A generic "dead targets are never selectable" rule: other steps legitimately
  name dead players (for example the Bad Moon Rising resurrection exception and
  the Mayor redirect list), so the rule stays per role.
- An engine-test-only change: the defect is in the rendered picker, so the
  regression has to drive the built screen.
