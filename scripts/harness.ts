// Bounded concurrency, timing and failure-capture paths shared by the browser
// harness scripts.
import { join } from "node:path";

export const DEFAULT_WORKERS = 3;
const MAX_WORKERS = 8;

export function workerCount(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) return DEFAULT_WORKERS;
  return Math.min(MAX_WORKERS, Math.max(1, Math.trunc(parsed)));
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };
  const width = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: width }, run));
  return results;
}

export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    console.log(`PASS ${name} (${Date.now() - started} ms)`);
    return result;
  } catch (error) {
    console.log(`FAIL ${name} (${Date.now() - started} ms)`);
    throw error;
  }
}

export function shotPath(directory: string | undefined, fallbackDir: string, name: string): string {
  return join(directory || fallbackDir, `scenario-${name}.png`);
}
