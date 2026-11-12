// The storyteller console. Route-level screen: reads the published game
// through one subscription, keeps every transient draft in
// `useTableDrafts`, and dispatches through the shell ports only.
import { useCallback, useEffect, useState } from "react";
import type { DispatchResult } from "../../../core/commands/result.ts";
import { mayorRedirectNeeded, tableProjection } from "../../../application/read-models/table.ts";
import { playerById } from "../../../core/model/state.ts";
import { buttonClass } from "../../components/button.tsx";
import { useShellPorts } from "../../ports.ts";
import type { PreviewOutcome, ShellPorts } from "../../ports.ts";
import { useGame } from "../../store/use-game.ts";
import { DealCard, MainCard, OverCard, SetupPrompt } from "./cards.tsx";
import { Overlays } from "./dialogs.tsx";
import { useTableDrafts } from "./drafts.ts";
import { ArcaneAppBar } from "../../components/arcane/index.ts";
import { DayPanel, QueuePanel, SidePanel, TableStage } from "./frame.tsx";
import { rejectionOf } from "./helpers.ts";
import type { Rejection } from "./helpers.ts";
import { readStepDraft } from "./step-draft.ts";
import type { TableActions, TableView } from "./view.ts";
import { ALERT, ALERT_BAD, GRID, HOST, MAIN_COL } from "./styles.ts";

export interface TableScreenProps {
  /** Mounted after a private route: the grimoire stays hidden until revealed. */
  covered?: boolean;
}

export function TableScreen({ covered = false }: TableScreenProps) {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const [guidedPreference] = useState(() => ports.prefs.read("pg.guided") === "true");
  // Read the recovery record once, for the step that is current at mount: a
  // reload mid-night reopens it with the host's untouched choices.
  const [restoredDraft] = useState(() => {
    const step = tableProjection(state).step;
    return step
      ? readStepDraft(ports.prefs.read, `${state.createdAt}:${state.night.number}:${step.key}`)
      : null;
  });
  const drafts = useTableDrafts(guidedPreference, covered ? "hide" : null, restoredDraft);
  const [now, setNow] = useState(() => Date.now());
  const [rejection, setRejection] = useState<Rejection | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const closeOverlay = drafts.closeOverlay;
  useEffect(() => {
    if (!drafts.overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOverlay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drafts.overlay, closeOverlay]);

  const run = useCallback(
    (command: Parameters<ShellPorts["commands"]["dispatch"]>[0]): DispatchResult => {
      const result = ports.commands.dispatch(command);
      setRejection(rejectionOf(result));
      return result;
    },
    [ports],
  );

  const preview = useCallback(
    (command: Parameters<ShellPorts["commands"]["preview"]>[0]): PreviewOutcome =>
      ports.commands.preview(command),
    [ports],
  );

  const openCorrection = (playerId: string) => {
    const player = playerById(state, playerId);
    drafts.setCorrection({
      playerId,
      kind: "alive",
      value: player && player.alive ? "dead" : "alive",
      reason: "",
    });
    drafts.setOverlay("correction");
  };

  const actions: TableActions = {
    run,
    preview,
    rejection,
    dismissRejection: () => setRejection(null),
    undo: () => {
      if (ports.history.undo()) closeOverlay();
    },
    closeOverlay,
    closeRole: () => {
      drafts.setOverlay(drafts.roleCardBack);
      drafts.setRoleCardBack(null);
      drafts.setRoleCardId(null);
    },
    openRole: (id) => {
      drafts.setRoleCardBack(drafts.overlay);
      drafts.setRoleCardId(id);
      drafts.setOverlay("role");
    },
    openInfo: (key) => {
      drafts.setInfoKey(key);
      drafts.setOverlay("info");
    },
    openCorrection,
    selectSeat: (playerId) => {
      const step = tableProjection(state).step;
      if (state.phase !== "night" || !step || step.targetMode === "none") {
        openCorrection(playerId);
        return;
      }
      const key = `${state.createdAt}:${state.night.number}:${step.key}`;
      const list = (drafts.targets.get(key) || []).slice();
      const before = list[0];
      const at = list.indexOf(playerId);
      if (at !== -1) list.splice(at, 1);
      else if (step.targetMode === "two") {
        if (list.length >= 2) list.shift();
        list.push(playerId);
      } else list.splice(0, list.length, playerId);
      drafts.putTargets(key, list);
      if (before !== list[0]) drafts.dropRedirect(key);
      if (mayorRedirectNeeded(state, step, list[0] || "") && !drafts.redirects.has(key)) {
        drafts.putRedirect(key, "none");
      }
    },
    openGrimoire: () => drafts.setOverlay("grimoire"),
    openExport: () => {
      drafts.setExportText(ports.game.exportGame());
      drafts.setOverlay("export");
    },
    openImport: () => drafts.setOverlay("import"),
    toggleGuided: (open) => {
      drafts.setGuided(open);
      ports.prefs.write("pg.guided", String(open));
    },
    startTimer: () => drafts.setTimerEnd(Date.now() + 5 * 60 * 1000),
    stopTimer: () => drafts.setTimerEnd(null),
    armNew: () => {
      if (!drafts.armedNew) {
        drafts.setArmedNew(true);
        window.alert(ports.strings.t("ui.newConfirm"));
        return;
      }
      actions.startNewGame();
    },
    startNewGame: () => {
      run({ type: "newGame", payload: { count: 8 } });
      ports.router.go("/bag");
    },
    applyImport: () => {
      if (!window.confirm(ports.strings.t("ui.importConfirm"))) return;
      const result = ports.commands.dispatch({
        type: "importGame",
        payload: { text: drafts.importText },
      });
      if (result.status !== "allowed") {
        setRejection(rejectionOf(result) ?? { text: ports.strings.t("importError"), code: null });
        return;
      }
      setRejection(null);
      closeOverlay();
    },
    download: () => {
      const blob = new Blob([drafts.exportText], { type: "application/json" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = "grimoria-tb.json";
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    },
    copy: () => {
      navigator.clipboard.writeText(drafts.exportText).catch(() => {});
    },
    now,
  };

  const view: TableView = { state, viewVersion: snapshot.viewVersion, ports, drafts, actions };
  const t = ports.strings.t;
  const rejectionWarning = rejection ? (
    <div className={`${ALERT} ${ALERT_BAD}`} role="alert" data-rejection>
      <b>{t("ui.rejectedTitle")}</b>
      <p className="my-1">{rejection.text || t("setupErrors")}</p>
      <button
        className={buttonClass()}
        type="button"
        data-act="dismiss-rejection"
        onClick={actions.dismissRejection}
      >
        {t("ui.dismiss")}
      </button>
    </div>
  ) : null;
  // Privacy surfaces replace the console entirely: the host DOM behind a hide
  // cover, an information card or the grimoire must not be present at all.
  if (drafts.overlay === "hide" || drafts.overlay === "info" || drafts.overlay === "grimoire") {
    return <Overlays view={view} />;
  }
  return (
    <>
      <ArcaneAppBar current="table" />
      <div className={`host ${HOST}`} data-console="table">
        {rejectionWarning}
        <div className={GRID}>
          <main className={`host-main ${MAIN_COL}`}>
            {state.phase === "day" || state.phase === "night" ? (
              <div
                className="grid grid-cols-2 gap-0.5 rounded-md border border-edge bg-crypt p-0.5"
                role="status"
                aria-label={`${t("day")} / ${t("night")}`}
              >
                <span
                  className={`grid min-h-9 place-items-center rounded-sm text-[9px] uppercase tracking-[.16em] ${
                    state.phase === "day"
                      ? "bg-crypt-3 text-amber shadow-[inset_0_0_0_1px_var(--color-amber-dim)]"
                      : "text-muted"
                  }`}
                >
                  {t("day")} {state.day.number}
                </span>
                <span
                  className={`grid min-h-9 place-items-center rounded-sm text-[9px] uppercase tracking-[.16em] ${
                    state.phase === "night"
                      ? "bg-crypt-3 text-amber shadow-[inset_0_0_0_1px_var(--color-amber-dim)]"
                      : "text-muted"
                  }`}
                >
                  {t("night")} {state.night.number}
                </span>
              </div>
            ) : null}
            {state.phase === "over" && state.reviewOpen ? (
              <OverCard view={view} />
            ) : state.phase === "setup" && !state.setup.roles.length ? (
              <SetupPrompt view={view} />
            ) : state.phase === "deal" || state.phase === "seat" ? (
              <DealCard view={view} />
            ) : (
              <MainCard view={view} />
            )}
            {state.phase === "night" ? <QueuePanel view={view} /> : null}
            {state.phase === "day" ? <DayPanel view={view} /> : null}
          </main>
          <TableStage view={view} />
          <SidePanel view={view} hidden={false} />
        </div>
        <Overlays view={view} />
      </div>
    </>
  );
}
