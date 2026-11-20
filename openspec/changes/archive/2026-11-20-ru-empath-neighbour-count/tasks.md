# Tasks

## 1. Worktree and RED evidence

- [x] 1.1 Create the worktree from `origin/dev`:
      `git worktree add ../grimoria-empath -b fix/ru-empath-neighbour-count origin/dev`.
- [x] 1.2 Read the pinned Empath r1724 text: "Each night, you learn how many of
      your 2 alive neighbors are evil."
- [x] 1.3 Run the focused finding against the unchanged catalog:
      `node --test --test-name-pattern="F-015" scripts/verification/findings.test.ts`
      — failed; the Russian ability was "Каждой ночью вы узнаете, сколько из
      ваших живых соседей - злые." and did not state the count.

## 2. Restore the count

- [x] 2.1 Insert `2` before `живых` in the Russian Empath ability.
- [x] 2.2 Require `2 живых соседей` in the F-015 assertion.
- [x] 2.3 GREEN: the focused finding passes and the catalog reads "Каждой ночью
      вы узнаете, сколько из ваших 2 живых соседей - злые."

## 3. Specifications and verification

- [x] 3.1 Add the role catalog requirement to the `app/ui-and-privacy` delta.
- [x] 3.2 Update the F-015 row and the counts in the verification register.
- [x] 3.3 Add the change to the `[Unreleased]` changelog.

- RED: `node --test --test-name-pattern="F-015" scripts/verification/findings.test.ts`
  failed with `The input did not match the regular expression /2/. Input:
  'Каждой ночью вы узнаете, сколько из ваших живых соседей - злые.'`
- GREEN: the same command passes; `ru_RU.js` reports "Каждой ночью вы узнаете,
  сколько из ваших 2 живых соседей - злые."
