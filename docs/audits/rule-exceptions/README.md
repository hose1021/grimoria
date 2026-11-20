# Documented rule exceptions

Every official sentence that is not sentence-verified is either a recorded
mechanical gap or a documented non-mechanical exception. Registers are split by
edition and shared group:

- `tb.json` — Trouble Brewing role-scoped rules.
- `bmr.json`, `snv.json` — the other editions' role-scoped rules.
- `shared.json` — `role === null` categories (CORE, SETUP, NIGHT, DAY, VOTE,
  EXEC, DEATH, STATUS, INFO, WIN, ST).

Each entry is:

```json
{
  "id": "ROLE-...",
  "statement": "the pinned sentence",
  "source": { "file": "docs/official/wiki/....wikitext", "page": "....", "revision": 0, "section": "...." },
  "status": "non-mechanical-exception",
  "reason": "why the sentence has no engine-visible consequence, or what evidence is missing",
  "evidence": "src/....test.ts::test name — assertion (covered-but-unmapped only)"
}
```

Statuses:

- `non-mechanical-exception` — physical action, gesture, wording/advice,
  player conduct, or Storyteller presentation with no engine-visible
  consequence. The reason names the kind; the source is the pinned official
  text.
- `mechanical-gap` — a mechanical consequence with no sufficient test. The
  reason names the missing assertion. This is not an exception; it is open
  work.
- `covered-but-unmapped` — an existing test asserts the sentence; the evidence
  names the test and assertion, and the atomic map can be reviewed separately.

`node docs/audits/rule-exceptions/check-tb.ts` proves that `tb.json` covers
exactly every Trouble Brewing official rule whose status is `ROLE_LEVEL_ONLY`
or `ENGINE_PARTIAL`: it rejects duplicates, extras and omissions, requires a
pinned source and a non-empty reason, and requires test evidence for
`covered-but-unmapped`. The other registers land separately; once they are all
present, one union check can run across them.

The register does not claim 523/523. It makes every remaining sentence either
evidenced or explicitly non-mechanical with a pinned source.
