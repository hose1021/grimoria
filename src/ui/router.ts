// A route store over the application's History API subscription. The
// composition root supplies the subscription because legacy screens navigate
// through the same `go()`; this store adds a stable React snapshot and a
// version that changes on every dispatch, so a bridge remounts exactly where
// the legacy router remounted a screen.
import { useSyncExternalStore } from "react";

export interface RouteSource {
  read(): string;
  subscribe(listener: () => void): () => void;
}

export interface RouteSnapshot {
  readonly path: string;
  readonly version: number;
}

export interface RouteStore {
  getSnapshot(): RouteSnapshot;
  subscribe(listener: () => void): () => void;
}

export function createRouteStore(source: RouteSource): RouteStore {
  let snapshot: RouteSnapshot = { path: source.read(), version: 0 };
  const listeners = new Set<() => void>();
  source.subscribe(() => {
    snapshot = { path: source.read(), version: snapshot.version + 1 };
    for (const listener of [...listeners]) listener();
  });
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export function useRoute(store: RouteStore): RouteSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
