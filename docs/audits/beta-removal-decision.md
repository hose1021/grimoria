# BETA removal decision

Status: **BMR PASS, S&V PASS.** Both BETA labels are removed in the stacked
`chore/remove-bmr-snv-beta-final` branch. Nothing is merged, released or
tagged.

## Decision

| Scenario | Verdict | BETA label |
| --- | --- | --- |
| Bad Moon Rising | **PASS** | removed |
| Sects & Violets | **PASS** | removed |

The decision rests on source-derived audits and reproduced behavior, not on a
green CI run or a readiness matrix with zero recorded mechanical gaps.

## Evidence

| Gate | BMR | S&V |
| --- | --- | --- |
| Certified head | `e93d4c80267380198bdd1bc1268b44bff0a8dfff` | same |
| Characters accounted against pinned Wiki | 25/25 | 25/25 |
| Rule rows audited | 49 | 53 |
| Verified after fixes | 45 | 41 |
| Legal Storyteller choices | 4 | 12 |
| Confirmed defects found | 2, both fixed | 3, all fixed |
| Remaining mechanical gaps | 0 | 0 |
| Remaining mechanical evidence gaps | 0 | 0 (host-duty and out-of-scope residuals documented) |
| Full-game scenarios | 10/10 (suite includes two BMR scenarios) | 10/10 (suite includes three S&V scenarios) |
| Repository browser suite (test-mode artifact) | 37/37 named cases + all phases | same |
| Privacy, replay, undo/redo, reload, offline, RU/EN/AZ | pass | pass |
| `gates.ts --scope=all` | 523 official / 172 engine / 87 UI, 0 findings | same |
| `npm run verify`, OpenSpec strict, mutation 10/10, provenance 82, acceptance 72/57 | pass | same |
| Independent compliance verdict | **PASS** | **PASS** |

The detailed reports are [bmr-production-acceptance.md](bmr-production-acceptance.md),
[snv-production-acceptance.md](snv-production-acceptance.md) and the independent
compliance sign-off [compliance-signoff.md](compliance-signoff.md).

## Why the labels are removed

The original beta labels were introduced because the host resolves more printed
choices in these editions than in Trouble Brewing. The certification separates
those choices correctly:

- Every legal Storyteller decision is offered through the production `/table`,
  validated, journaled and replayable.
- No engine path silently answers a discretionary question.
- The confirmed defects in both editions are fixed with RED→GREEN regressions.
- The remaining host duties are disclosure-only (for example the Artist’s
  free-form answer) or source-ambiguous by design (the Pukka self-target), and
  each has an explicit justification in the acceptance report.

A host-choice count is not a quality metric. BMR has four host-choice rule rows
and S&V twelve, but each is a legal decision, not an unimplemented mechanic.

## The removal change

The stacked change is minimal:

- `src/ui/screens/bag.tsx`: remove `BETA_SCRIPT_IDS`, the badge style, the
  comment and both conditional badge spans.
- `src/ui/i18n/locales/{ru,en,az}.ts`: remove the now-unused `scriptBeta` key.
- `scripts/browser-check.ts`: add `no-beta-labels`, which opens the bag editor
  and the script picker at 390 px and asserts that no official scenario shows a
  beta badge, then register it in the full suite.
- `docs/audits/verification-gates/test-manifest.json`: record the new browser
  identity.

The check calls the real setup screen, not a source scan. It was observed
passing on the removal branch and is included in the full production browser
run.

## Residual risks and owner decisions

- The Pukka self-target remains a host-adjudicated default, disclosed in
  `docs/rules-matrix.md` and correctable through the correction dialog. It is
  not presented as a source-confirmed ruling.
- The Artist’s truthful false answer under a Vortox remains a Storyteller duty;
  the engine cannot compute truth for a free-form question and does not pretend
  to.
- Mixed-edition registration, Travellers, Fabled, Loric and jinxes remain
  explicit manual boundaries.
- Browser undo history does not survive a full reload; game state and journal
  replay do. Redo is now a visible control.
- Owner actions: review and merge the certification PR and the stacked beta
  removal PR, then run the release workflow, tag and Pages smoke. Do not close
  #200 or #223 until the owner accepts the merged `main` tree.

## Reproduction

```sh
# certification
gh pr checkout <certification-pr>
git rev-parse HEAD            # e93d4c80267380198bdd1bc1268b44bff0a8dfff
npm ci
npm run verify
VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all
npm run scenarios
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/browser-check.ts

# beta removal
gh pr checkout <beta-removal-pr>
git rev-parse HEAD            # the beta-removal PR head
PLAYWRIGHT_MODULE=<playwright/index.mjs> PG_BROWSER_CHECK=no-beta-labels node scripts/browser-check.ts
```

## Verdict

Remove the BETA marker from **Bad Moon Rising** and **Sects & Violets**. Both
scenarios satisfy the production criteria on the certified head. The final
release decision, merge, tag and production smoke test remain with the owner.
