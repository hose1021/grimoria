import { timerText } from "./helpers.ts";

export function countdownClock(end: number | null) {
  return {
    getSnapshot: () => timerText(end, Date.now()),
    subscribe(notify: () => void) {
      if (end === null || end <= Date.now()) return () => {};
      const timer = setInterval(() => {
        notify();
        if (Date.now() >= end) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    },
  };
}
