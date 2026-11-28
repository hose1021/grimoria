# Tasks

- [x] Reproduce the capacity loss with a regression for both saved collections.
- RED: `node --test src/infrastructure/library/bag-library.test.ts` passed 7 and failed 2. The 201st save and oversized import both returned success.
- GREEN: the same command passed all 9 tests, including updates at capacity, deletion and retry, and readback after a rejected write.
- [x] In the built-in browser, load 200 synthetic bags, attempt to save another, check the capacity message and retained name, then reload and count all 200 original entries. The library dialog fit a 390 px viewport.
- [x] Run `node scripts/verification/gates.ts --scope=findings` against the parent commit and the verified scope against the pull request base. Both passed with zero findings.
- [x] Run `node --test scripts/check-types-policy.test.ts` with fixtures for ignored worktrees, tracked and new JavaScript sources and a Git-less archive.
- [x] Run `npm run verify`, `npm run verification:mutation` and both strict OpenSpec validation commands. The mutation suite detected all 10 probes.
