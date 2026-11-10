// Browser coordination adapter: one host writer via the Web Locks API, and a
// no-op release for browsers without it (the store's disk check still guards
// stale writes).
import type { Coordination } from "../../application/ports/index.ts";

export function createWebLocksCoordination(): Coordination {
  let release: (() => void) | null = null;
  let acquired = false;
  let pending: Promise<boolean> | null = null;

  return {
    acquireWriter() {
      if (acquired) return Promise.resolve(true);
      if (!navigator.locks) return Promise.resolve(true);
      if (pending) return pending;
      const gate = Promise.withResolvers<boolean>();
      const closed = Promise.withResolvers<void>();
      release = closed.resolve;
      const started = gate.promise.finally(() => {
        pending = null;
      });
      pending = started;
      navigator.locks.request("pocket-grimoire-writer", { ifAvailable: true }, async (lock) => {
        if (!lock) {
          gate.resolve(false);
          return;
        }
        acquired = true;
        gate.resolve(true);
        await closed.promise;
        acquired = false;
        release = null;
      }).catch(() => gate.resolve(false));
      return started;
    },
    release() {
      release?.();
    }
  };
}
