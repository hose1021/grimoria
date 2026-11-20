# Rule exceptions

These registers document the official rule sentences that the atomic map still
leaves `ROLE_LEVEL_ONLY` or `ENGINE_PARTIAL`. A register does not claim that the
product implements every official rule; it explains, per assigned rule, why the
sentence is not sentence-level verified and what evidence exists.

Each register is a JSON object with `edition` (or `scope.role`), the selected
traceability `statuses`, `counts` and a `rules` array. Every rule carries the
traceability `id`, `statement` and `source`, plus:

- `non-mechanical-exception` — physical action, gesture, wording, advice,
  player conduct or Storyteller presentation/judgment with no engine-visible
  consequence. The official source and the reason it is not automatable.
- `mechanical-gap` — a mechanical consequence without sufficient executable
  evidence. The missing assertion is named.
- `covered-but-unmapped` — an existing test already asserts the sentence, or
  the cited tests assert each mechanical clause; only the atomic-map entry (and
  therefore the `ENGINE_VERIFIED` status) is missing.

The atomic map is not edited by these registers. They record exceptions, not
promotions.

## Check

```sh
node scripts/verification/check-rule-exceptions.ts docs/audits/rule-exceptions/snv.json
```

The check recomputes the assigned set from
`docs/audits/verification-gates/traceability.json` and the role modules'
`edition`, then proves that the register names each assigned rule exactly once,
in traceability order, with a matching statement and source, a declared status,
and a non-empty reason and evidence. With no path it checks every `*.json`
register in this directory.
