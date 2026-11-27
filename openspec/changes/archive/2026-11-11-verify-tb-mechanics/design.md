# Design

## Decision

Verify each audited Trouble Brewing row with a test that asserts the engine
behavior, and fix only the two gaps the new assertions expose: the Recluse
"evil" registration leaking into Demon queries, and the impaired Librarian
whose setup result is zero receiving no false-information override.

The Librarian fix reuses the existing impaired one-of-two shape: the step
reports `impaired`, `needsChoice` and the allowed Outsider roles, computes a
default pair from two other players, and omits the `zero` flag so the console
does not display the true zero result after the host chooses a false role. The
host still picks the false role; the engine does not invent information.

The registration fix narrows `registersAsDemon` to the explicit `demon`
registration. "Registers as evil" is an alignment statement, not a Demon
statement; the Chef and Fortune Teller UI already pass distinct `evil` and
`demon` values, and the Fortune Teller offers only `demon` for the Recluse.

## Alternatives

- Leave the Recluse `evil` registration as a Demon: it conflates two distinct
  Storyteller choices and would make a Recluse registered only as evil answer
  yes to the Fortune Teller, which the official text does not allow.
- Give the impaired Librarian zero result no override: the Storyteller must be
  able to give false information even when the true setup is zero.
- Add a new "false information" helper: the existing `needsChoice`/`options`
  contract already covers every role; a second path would duplicate it.
- Test only the role rows and not the cross-cutting rows: the audit table
  drives both lists, and the issue explicitly names the cross-cutting rows.

## Behavior

- Librarian pair: the shown role is the Outsider and the pair contains that
  player; the zero result requires no pair and is legal only when no Outsider
  is in play.
- Investigator pair: the shown role is a Minion and the pair contains that
  player.
- Impaired information roles return `needsChoice: true` and allowed options:
  the role team for one-of-two, a number range for the Chef and Empath, a
  boolean for the Fortune Teller, and any character for the Undertaker and
  Ravenkeeper.
- Registration applies to dead players. A dead Recluse may register evil, a
  Minion or a Demon; a dead Spy may register good, a Townsfolk or an Outsider.
- A Saint executed while impaired records `impaired: true` and does not give
  evil the win.
- The night queue uses `NIGHT_FIRST` and `NIGHT_OTHER` and the Spy wakes last.
- One nomination per living nominator per day and one per nominee per day.
- A printed preset bag plays through deal, first night, execution and the next
  night at every count from 5 to 15.

## Compatibility

No schema change or migration. The registration narrowing only affects an
engine call that passed `evil` to a Demon query; the UI never sends that value
to the Fortune Teller. The impaired Librarian zero path uses the existing step
contract, so no UI change is required.

## Verification

- RED: the two new defect tests fail before the fixes.
- GREEN: the same tests pass; the full suite stays green.
- `openspec validate --changes --strict` and `node scripts/openspec-check.mjs`
  pass.
