// The three setup routes share the Arcane top bar and a full-width frame. The
// screen owns its own columns, as in the reference composition.
import type { ReactNode } from "react";
import { ArcaneAppBar } from "./arcane/app-bar.tsx";

export type SetupStep = "bag" | "seat" | "secrets";

export function SetupShell({ step, children }: { step: SetupStep; children: ReactNode }) {
  return (
    <>
      <ArcaneAppBar current={step} />
      <div className="min-h-[calc(100dvh-56px)]">{children}</div>
    </>
  );
}
