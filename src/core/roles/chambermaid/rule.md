# chambermaid

Edition: bmr

| Rule ID            | Level       | Matrix revision | Asserting tests                                                                                                                                                                                                                                          |
| ------------------ | ----------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BMR-CHAMBERMAID-01 | verified    | r2966           | `src/core/engine/bmr.test.ts` "the Chambermaid counts only characters who woke due to their ability (BMR-CHAMBERMAID-01)"; `src/core/engine/bmr.test.ts` "a Demon blocked by the Exorcist is not counted as having woken (BMR-CHAMBERMAID-01)"           |
| BMR-CHAMBERMAID-02 | verified    | r2966           | `src/core/engine/bmr.test.ts` "the Chambermaid does not wake with fewer than two other living players (BMR-CHAMBERMAID-02)"                                                                                                                              |
| BMR-CHAMBERMAID-03 | verified    | r2966           | `src/core/engine/bmr.test.ts` "BMR target restrictions reject dead, self and evil targets (BMR-CHAMBERMAID-03)"; `src/core/engine/bmr.test.ts` "a multi-target night step rejects the same player twice (BMR-INNKEEPER-01, BMR-SHABALOTH-01, BMR-PO-01)" |
| BMR-CHAMBERMAID-04 | host-choice | r2966           | `src/core/engine/bmr.test.ts` "a Chambermaid choosing the Goon gets false information (BMR-CHAMBERMAID-04)"                                                                                                                                              |
| BMR-CHAMBERMAID-05 | verified    | r2966           | `src/core/engine/bmr.test.ts` "the Chambermaid does not wake without two registered-living choices (BMR-CHAMBERMAID-05)"                                                                                                                                 |
