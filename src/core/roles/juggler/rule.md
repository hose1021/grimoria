# juggler

Edition: snv

| Rule ID        | Level    | Matrix revision | Asserting tests                                                                                                                                                                                                                                                                              |
| -------------- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SNV-JUGGLER-01 | verified | r2401           | `src/core/engine/snv.test.ts` "each Juggler holder keeps a separate guess ledger (SNV-JUGGLER-01)"; `src/core/engine/snv.test.ts` "the Juggler may guess zero times and still learns zero (SNV-JUGGLER-01)"; `src/core/engine/snv.test.ts` "the Juggler command has limits (SNV-JUGGLER-01)" |
| SNV-JUGGLER-02 | verified | r2401           | `src/core/engine/snv.test.ts` "the Juggler's answer counts the guesses from the guessing day (SNV-JUGGLER-02)"                                                                                                                                                                               |
