import { useMemo, useSyncExternalStore } from "react";
import { countdownClock } from "./countdown-clock.ts";

export function Countdown({ end }: { end: number | null }) {
  const clock = useMemo(() => countdownClock(end), [end]);
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
}
