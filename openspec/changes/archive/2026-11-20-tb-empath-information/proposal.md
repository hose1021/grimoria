# Trouble Brewing information roles as capabilities: Empath

Issue: #200

## Why

The Empath already counts its evil neighbours in its module
(`step-kind-capabilities`), but the engine still owns the rest of the role by
name. `infoForStep` in `information.ts` has an Empath branch that calls the
module, falls back to an engine copy of the count (`empathCount`), fixes the
shape of the answer to a number and lists the numbers the host may show an
impaired Empath. `night.ts` names the role in the table of answer shapes and
in the gate of the step completion. The ownership ledger therefore reports the
role as a capability with four engine references.

`tb-night-step-capabilities`, `tb-butler-night-step` and `tb-imp-night-step`
moved the Trouble Brewing roles that act on a target. This change starts the
information roles, the rest of ADR 0002 slice 2 ("Night steps: Trouble Brewing
remainder"), with the one that needs the smallest contract.

## What changes

- The `answer` decision of the `information` capability gains `possible`:
  every value the answer can take. The role gives the same decision whether or
  not its owner is drunk or poisoned.
- The engine has one path for a role that owns its answer. It shows a working
  ability the role's answer. For an impaired owner it asks the host and offers
  the values the role named. Whether the owner is impaired, the question and
  the check of the host's answer stay in the engine.
- The Empath declares its step through the `night-step` capability for every
  night, with the number shape of its answer, and names 0, 1 and 2 as the
  possible answers. `information.ts` and `night.ts` no longer name the role;
  the engine copy of the count and its export are removed.
- `makeRoleStep` reads the shape of the answer from the declared step first;
  the table in `night.ts` stays as the fallback for the roles that have not
  moved.
- `docs/role-ownership.md`: the Empath row declares `capability:night-step`
  and `capability:information` with no engine reference. The summary moves
  from 3 to 4 roles owned by a capability alone and from 10 to 9 with an
  engine reference.

## Impact

Behavior is unchanged. The step, the stored answer and its key order, the
secret log lines and their order, the journaled registration and false
information, the host question and its options, the error code for an answer
that was not offered, the command events and the order of draws from the
command ports stay the same, so saved games and journals replay as before. No
storage, command payload, schema or pin changes.

`empathCount` was exported from the engine index and had no caller outside
`information.ts`: no screen, read model, script or test used it.

The Chef, the Fortune Teller, the Undertaker, the Ravenkeeper, the
Washerwoman, the Librarian, the Investigator and the Spy keep their engine
paths and are later pull requests of the same slice. The registration prompt
and the false-information prompt of the table are not part of this change.
