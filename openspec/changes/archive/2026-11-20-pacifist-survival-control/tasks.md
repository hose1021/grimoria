# Tasks

## 1. Rules and characterization

- [x] 1.1 Read Pacifist r2601 and the target/impairment conditions. Rules check:
      compliant; the two UI conditions were the defect.
- [x] 1.2 Record RED: the day card offered the control for scripts without a
      Pacifist, and the dock offered it for an impaired Pacifist.

## 2. Engine and read model

- [x] 2.1 Export `survivesExecutionAllowed` and re-export it from the engine
      index.
- [x] 2.2 Add `survivalProjection(state, targetId)` to the application read
      models.

## 3. Console

- [x] 3.1 Render both controls from `survivalProjection`.
- [x] 3.2 Clear `executeSurvives` on a target change, the day change and an
      accepted execution.

## 4. Tests

- [x] 4.1 Read-model test: living healthy Pacifist and a good target allow it;
      an evil or unknown target, a dead Pacifist and an impaired Pacifist do not.
- [x] 4.2 Browser `pacifist-survival`: healthy/good shows the control; an evil
      target, a dead Pacifist, an impaired Pacifist and a script without one do
      not.

## 5. Documents

- [x] 5.1 Cite the projection test in the Pacifist matrix row and dossier.
- [x] 5.2 No schema, storage or command payload change.

## 6. Evidence

- RED: the day card offered the control for the BMR Fool bag without a Pacifist and the dock offered it for an impaired Pacifist.
- GREEN: `node --test --test-name-pattern="survivalProjection"` passes.
- GREEN: `PG_BROWSER_CHECK=pacifist-survival node scripts/browser-check.ts` passes on 390 px for all five cases.
- GREEN: `npm test` reports 1,306 tests, all passed; `npm run typecheck` passes.
