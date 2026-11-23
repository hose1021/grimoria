# #211 remaining capability adapters

Updated 2026-11-23. This is the explicit exception list required by issue #211
and the verified-jinx change. The ten legacy night-step declarations were moved
onto `night-step` capabilities in this change; the entries below are the
remaining pure `engine branch` roles in `docs/role-ownership.md`.

| Role | Current engine reference | Classification | Why it stays | Follow-up |
| --- | --- | --- | --- | --- |
| Artist | `day.ts` | Host-choice day action | The question/answer is a free-text Storyteller exchange; a capability would need a new day-decision shape. | Move to `day-action` with the existing `artistQuestion` command. |
| Drunk | model/setup/information/day effects | Shared identity mechanic | The Drunk has no ability; the mask is read by every information and step path. | Keep as shared mechanic; no role capability is meaningful. |
| Fool | `effects.ts`, `death.ts`, `bmr.ts` | Shared death protection | The first-death protection is applied by the shared death path. | Keep as shared mechanic. |
| Goon | `effects.ts`, `bmr.ts`, `sv.ts` | Shared passive trigger | The trigger reacts to any player's choice, not to a Goon step; it uses the shared effect and step writer. | A later `trigger` capability if a second passive trigger needs it. |
| Mastermind | `death.ts`, `day.ts` | Shared succession/win state | The extra day is a multi-day state armed at Demon execution and read at day end. | A `succession`/`win` extension when a second role needs it. |
| Mayor | `effects.ts`, `death.ts`, `night.ts` | Shared redirect/passive win | The redirect is part of the shared attack path; the three-player win is a shared end-day rule. | Keep as shared mechanic. |
| Minstrel | `day.ts` | Shared execution consequence | The all-drunk effect follows any Minion execution and is applied by the day path. | Keep as shared mechanic. |
| Mutant | `sv.ts` | Host-choice madness | Madness is an effect and a day review; the Mutant's exception is a Storyteller judgment. | Move the reconciliation into an `adjudication` slice with the Cerenovus. |
| Savant | `day.ts` | Host-choice day answer | Two statements and a truth choice are free-text host input. | Move to `day-action` with the existing `savantVisit` command. |
| Scarlet Woman | `becoming.ts` | Shared succession | The inheritance is the Demon death trigger's fallback; the new living-Demon guard is part of it. | A `succession` capability if a second inheritance role needs it. |
| Soldier | `effects.ts` | Shared protection | The protection is read by the shared death and No Dashii paths. | Keep as shared mechanic. |
| Tea Lady | `effects.ts` | Shared protection | The neighbour protection is read by the shared death path. | Keep as shared mechanic. |
| Virgin | `day.ts` | Shared first-nomination trigger | The trigger is part of the nomination path and the shared win check. | Keep as shared mechanic. |

## Capability + engine reference roles

Roles that already declare a capability but still have a named engine reference
are not exceptions to ownership: the reference is the shared mechanic they
use (setup, information facts, death, win, correction or the step writer). The
generated ledger keeps each count visible and the architecture test keeps the
role import edge closed.

## Justification

The remaining entries are either:

1. **Shared mechanics** with no role-owned decision. Moving them into a role
   would duplicate protection, death, execution or win logic and break the
   one-writer invariant.
2. **Host-choice day actions** that need a day-decision shape wider than the
   current `RoleEffect`; they are already command-backed and journaled, so the
   behavior is not missing, only the ownership move.

No entry is an unsupported or unverified mechanic. The interaction registry and
`roles-rules-matrix` remain the authority for support.
