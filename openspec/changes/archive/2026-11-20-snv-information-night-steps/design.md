# Design

## The steps

| Role | Legacy field | Arm | Pinned text |
| --- | --- | --- | --- |
| Clockmaker | `firstNightStep` | `first` | "During the first night, wake the Clockmaker" (r2967) |
| Evil Twin | `firstNightStep` | `first` | "During the first night, wake both Twins" (r3101) |
| Dreamer | `nightStep` | `any` | "Each night, wake the Dreamer" (r2904) |
| Mathematician | `nightStep` | `any` | "Each night, wake the Mathematician" (r3153) |
| Flowergirl | `nightStep` | `other` | "Each night except the first, wake the Flowergirl" (r2907) |
| Oracle | `nightStep` | `other` | "Each night except the first, wake the Oracle" (r2909) |
| Town Crier | `nightStep` | `other` | "Each night except the first, wake the Town Crier" (r3145) |

The official night sheet agrees. Each arm keeps the step the legacy field
declared: the target, the shape of the answer, nothing else.

The legacy `nightStep` of the Flowergirl, the Oracle and the Town Crier
also answered for the first night. No reader built a step from it: the
first-night sequence does not name them, `requeueForCharacter` returns
before a role without a slot that night, and a Philosopher who gains one
of them on the first night gets no step that night because the sequence
has no slot for it. An `other` arm answers nothing for the first night,
and the same readers still build nothing.

## Who reads the steps

- `buildSvNightQueue` builds each step from `nightStepFor` and wakes the
  holder through `stillWakes`, as before.
- `philosopherAbilityStep` reads `nightStepFor` and, for an ability chosen
  tonight, `firstNightStepOf`. The Clockmaker's `first` arm answers the
  second, so a Philosopher who gains the Clockmaker on a later night still
  learns at once ("If this ability is used on the first night only, they
  use it tonight", Philosopher r2421), right after their own step.
- `requeueForCharacter` reads `nightStepFor` for a character a Pit-Hag, a
  Barber or a Snake Charmer gives tonight.

## No resolver yet

None of the seven owns a resolver. `completeSvStep` hands only a role with
a resolver to the coordinator, so the completion keeps its path: the
stored answer from `svInfoForStep`, the shared note, and for the
Mathematician the removal of the ABNORMAL marks ("Remove all ABNORMAL
reminders", r3153). Giving the Mathematician a resolver now would skip
that removal; it moves with the Mathematician's answer, in slice 5, where
the Vortox's false information gets its contract.

## What does not move

- `sv.ts` names each role where its answer is computed, the Mathematician
  where the ledger is cleared, the Evil Twin where its pair is set and
  cleared, and the Flowergirl and the Town Crier where the day's answer is
  read.
- `night.ts` names the Dreamer in the bar on choosing themself, and the
  Mathematician where a skipped step, or one dropped because its owner
  died, still clears the ledger; `host-choice.ts`
  names the Flowergirl and the Town Crier; the Evil Twin's pair and win are
  named in `model/state.ts`, `death.ts`, `setup.ts` and `corrections.ts`.

## The ledger

The seven rows declare `capability:night-step` and move from "engine
branch" to "capability + engine reference", with their engine references
unchanged. The counts become 34 and 32.
