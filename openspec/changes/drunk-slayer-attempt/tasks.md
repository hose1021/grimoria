# Tasks

- [x] Reproduce the rejected Drunk shot with an asserting test.
- [x] Accept and record the attempt in the engine and expose it in the Storyteller controls.
- [ ] Run the regression and verification suites.

- RED: `node --test --test-name-pattern="a Drunk shown the Slayer" src/core/engine/tb-audit.test.ts` rejected the actor with `error.29`.
- GREEN: The same test passes. The focused suite also verifies the real Slayer's kill and the poisoned Slayer's spent miss.
