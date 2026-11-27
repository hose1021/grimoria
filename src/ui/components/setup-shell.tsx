// The three setup routes share the Arcane top bar and a full-width frame. The
// screen owns its own columns, as in the reference composition.
import type { ReactNode } from "react";
import { useShellPorts } from "../ports.ts";
import { ArcaneAppBar } from "./arcane/app-bar.tsx";

export type SetupStep = "bag" | "seat" | "secrets";

const STAGES = [
  ["bag", "ui.setupRoles"],
  ["player", "ui.setupNames"],
  ["seat", "seats"],
  ["secrets", "secrets"],
] as const;

export function SetupNavigation({ step }: { step: SetupStep }) {
  const ports = useShellPorts();
  return (
    <nav aria-label={ports.strings.t("setup")} className="shrink-0 border-b border-edge bg-crypt-2">
      <ol className="mx-auto grid max-w-[820px] list-none grid-cols-4 px-2">
        {STAGES.map(([route, label], index) => (
          <li key={route} className="min-w-0">
            <a
              href={ports.router.path(route)}
              aria-current={route === step ? "step" : undefined}
              className={`flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-medium sm:gap-2 sm:text-sm ${route === step ? "border-amber text-accent-text" : "border-transparent text-muted hover:bg-crypt-3 hover:text-text"}`}
            >
              <span aria-hidden="true" className="font-case tabular-nums">
                {index + 1}
              </span>
              <span>{ports.strings.t(label)}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SetupShell({ step, children }: { step: SetupStep; children: ReactNode }) {
  return (
    <>
      <ArcaneAppBar current={step} />
      <SetupNavigation step={step} />
      <div className="min-h-[calc(100dvh-56px)]">{children}</div>
    </>
  );
}
