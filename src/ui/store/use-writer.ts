// The exclusive writer lock, shared by every host screen and the bridge. One
// tab writes the saved game; the others show the busy card and can retry.
import { useEffect, useState } from "react";
import type { ShellPorts } from "../ports.ts";

export interface WriterLock {
  status: "pending" | "ready" | "busy";
  retry(): void;
}

export function useWriterLock(ports: ShellPorts): WriterLock {
  const [status, setStatus] = useState<WriterLock["status"]>("pending");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("pending");
    ports.writer.acquire().then(
      (allowed) => {
        if (alive) setStatus(allowed ? "ready" : "busy");
      },
      () => {
        if (alive) setStatus("busy");
      },
    );
    return () => {
      alive = false;
    };
  }, [ports, attempt]);

  return { status, retry: () => setAttempt((value) => value + 1) };
}
