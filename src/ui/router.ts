// A route store over the application's History API subscription. The
// composition root supplies the subscription because legacy screens navigate
// through the same `go()`; this store adds a stable React snapshot, the
// previous path (for the private hand-back gate) and a version that changes on
// every dispatch, so a bridge remounts exactly where the legacy router did.
import { useSyncExternalStore } from "react";

export interface RouteSource {
  read(): string;
  subscribe(listener: () => void): () => void;
}

export interface RouteSnapshot {
  readonly path: string;
  readonly previousPath: string;
  readonly version: number;
}

export interface RouteStore {
  getSnapshot(): RouteSnapshot;
  subscribe(listener: () => void): () => void;
}

export function createRouteStore(source: RouteSource): RouteStore {
  const initial = source.read();
  let snapshot: RouteSnapshot = { path: initial, previousPath: initial, version: 0 };
  const listeners = new Set<() => void>();
  source.subscribe(() => {
    const path = source.read();
    snapshot = { path, previousPath: snapshot.path, version: snapshot.version + 1 };
    for (const listener of listeners) listener();
  });
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useRoute(store: RouteStore): RouteSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
