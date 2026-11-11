# Design

## Decision: one event priority list

`EVENT_PRIORITY` in `src/core/model/effect-graph.ts` is the only list that ranks
event classes, frozen at module load:

| Rank | Kind             | Meaning                                                        |
| ---- | ---------------- | -------------------------------------------------------------- |
| 10   | `death`          | record a death before the wakes it causes                      |
| 20   | `on-death`       | a wake whose owner died (Ravenkeeper, Sweetheart, Barber, Sage) |
| 30   | `delayed`        | a step deferred to a later night (the Pukka's pending death)   |
| 40   | `conditional-wake` | a wake that depends on the current state                     |
| 50   | `impairment`     | poison and drunk resolution over the whole effect list         |
| 60   | `win`            | the win check after every effect                               |

A higher rank resolves later. The list is shared, so a caller never invents its
own order; within one rank the declared dependencies decide.

## Decision: one cascade resolver

`orderCascade(items)` is a Kahn topological sort over `{ key, kind, after }`
items. It returns either `{ ok: true, order }` or
`{ ok: false, errorCode: "CYCLIC_CASCADE", keys }` where `keys` is the sorted
set of nodes that never became ready. It sorts the ready set by kind priority
and then by key, so the result is independent of the insertion order, and it
never mutates its input. A missing `after` target is ignored: an edge can only
point at an event that exists in the same call.

The effect graph builds `after` edges from `targetId` to `sourceId` and calls
`orderCascade` with kind `impairment`, replacing its private topological sort.
A genuinely unresolvable effect cycle still surfaces as
`CYCLIC_EFFECT_DEPENDENCY` for the command contract; the shared resolver reports
the raw `CYCLIC_CASCADE` and the graph maps it.

The graph only ever passes impairing effects, so every node has the same kind
and the priority never separates two of them. Within that one class the final
tie-break is the effect id, and it only changes the order in which independent
effects apply: a node is skipped exactly when an edge put it after an active
effect that impairs its source, so the tie-break cannot change the active or
impaired sets.

## Decision: wake order follows the official night sheet

Every pending step carries `order`, the compressed index into
`nightSequence(night, edition)` shared by all three scripts: the official
`nightsheet.json` order without the printed 0–99 sheet numbers. `insertStepInto`
owns the only insertion: it places the step before the first pending step with a
larger index. Death-triggered and conditional steps must use it, never
`Array.push`, and must derive `order` from `nightSequence(...).indexOf(roleId)`,
never from the printed sheet number, or they compare two different scales.

Trouble Brewing already did this for the Ravenkeeper. Bad Moon Rising appended
the Grandmother at the printed 73 and Sects & Violets appended the Sweetheart,
Barber and Sage at the printed 60, 59 and 62, so they landed after every regular
step. Both now resolve their slot from the sequence: Grandmother 17, Barber 9,
Sweetheart 10, Sage 11. A role with no slot on that night (the death-triggered
roles are other-night only) wakes after the last step.

A death triggers the conditional append path, which may add several steps at
once; the recording order of the deaths then has no effect on the queue.

## Decision: atomic rejection

`orderCascade` is pure, so a rejected cascade changes nothing by construction.
Command validation, preview and apply already run on a draft and return the
typed effect cycle before mutating, so a cyclic cascade leaves the saved state
unchanged and never throws or recurses.
