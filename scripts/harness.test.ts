import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { mapLimit, shotPath, timed, workerCount } from "./harness.ts";

test("mapLimit runs no more than the limit at once and returns every result in input order", async () => {
  const items = ["a", "b", "c", "d", "e"];
  const gates = items.map(() => Promise.withResolvers<void>());
  const checkpoints = new Map<number, () => void>();
  const started: string[] = [];
  let active = 0;
  let peak = 0;

  const until = (count: number) => {
    if (started.length >= count) return Promise.resolve();
    const entry = Promise.withResolvers<void>();
    checkpoints.set(count, entry.resolve);
    return entry.promise;
  };
  const startedOne = () => {
    checkpoints.get(started.length)?.();
  };

  const pending = mapLimit(items, 2, async (item, index) => {
    started.push(item);
    startedOne();
    active += 1;
    peak = Math.max(peak, active);
    await gates[index].promise;
    active -= 1;
    return `${item}${index}`;
  });

  await until(2);
  assert.deepEqual(started, ["a", "b"], "only two workers start first");
  assert.equal(peak, 2);
  gates[0].resolve();
  gates[1].resolve();
  await until(4);
  assert.deepEqual(started, ["a", "b", "c", "d"], "each finished slot starts the next item");
  assert.equal(peak, 2, "the limit still caps concurrent workers");
  gates[2].resolve();
  gates[3].resolve();
  await until(5);
  gates[4].resolve();
  assert.deepEqual(await pending, ["a0", "b1", "c2", "d3", "e4"], "results keep input order");
  assert.equal(peak, 2);
});

test("mapLimit propagates a worker failure", async () => {
  await assert.rejects(
    mapLimit([1, 2, 3], 2, async (item) => {
      if (item === 2) throw new Error("scenario 2 exploded");
      return item;
    }),
    /scenario 2 exploded/,
  );
});

test("workerCount defaults to three and clamps the override", () => {
  assert.equal(workerCount(undefined), 3);
  assert.equal(workerCount(""), 3);
  assert.equal(workerCount("not-a-number"), 3);
  assert.equal(workerCount("4"), 4);
  assert.equal(workerCount("0"), 1);
  assert.equal(workerCount("-3"), 1);
  assert.equal(workerCount("99"), 8);
  assert.equal(workerCount("2.7"), 2);
});

test("timed prints the case name with its duration and rethrows failures", async () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (line: string) => lines.push(line);
  try {
    const value = await timed("fast case", async () => 7);
    assert.equal(value, 7);
    await assert.rejects(
      timed("broken case", async () => {
        throw new Error("assertion failed");
      }),
      /assertion failed/,
    );
  } finally {
    console.log = original;
  }
  assert.match(lines[0] ?? "", /^PASS fast case \(\d+ ms\)$/);
  assert.match(lines[1] ?? "", /^FAIL broken case \(\d+ ms\)$/);
});

test("shotPath keeps failure captures outside the served artifact when a run directory is set", () => {
  const fallback = join("/app", "dist");
  assert.equal(shotPath(undefined, fallback, "tb-8"), join(fallback, "scenario-tb-8.png"));
  assert.equal(
    shotPath(join("/tmp", "run"), fallback, "tb-8"),
    join("/tmp", "run", "scenario-tb-8.png"),
  );
});
