# mayor

Edition: tb

| Rule ID     | Level    | Matrix revision | Asserting tests                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TB-MAYOR-01 | verified | r2995           | `src/core/engine/engine.test.ts` "Saint loses on execution and Mayor wins at three alive without execution (TB-MAYOR-01, TB-SAINT-01)"; `src/core/engine/engine.test.ts` "a corpse execution counts as an execution event and prevents the Mayor win (TB-MAYOR-01)"; `src/core/engine/engine.test.ts` "a Mayor redirect onto the Imp is not the Imp's self-kill (TB-MAYOR-01)" |
