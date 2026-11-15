# saint

Edition: tb

| Rule ID     | Level    | Matrix revision | Asserting tests                                                                                                                                                                                                                               |
| ----------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TB-SAINT-01 | verified | r3119           | `src/core/engine/engine.test.ts` "Saint loses on execution and Mayor wins at three alive without execution (TB-MAYOR-01, TB-SAINT-01)"; `src/core/engine/engine.test.ts` "the Saint loss is scoped to the day of the execution (TB-SAINT-01)" |
| TB-SAINT-02 | verified | r3119           | `src/core/engine/engine.test.ts` "a poisoned Saint executed by the town does not lose the game for good (TB-SAINT-02)"                                                                                                                        |
