// Console overlays. The information card and the grimoire are full-screen
// privacy surfaces; the role card, correction and the two backup dialogs use
// the shared Radix dialog for the focus trap and Escape handling.
import type { ReactNode } from "react";
import { stepProjection } from "../../../application/read-models/table.ts";
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import { ALL_ROLES, roleTeam } from "../../../core/model/rules.ts";
import { Dialog, DialogClose } from "../../components/dialog.tsx";
import { defaultCorrectionValue, displayName, infoText, roleNameOf, stepTitle } from "./helpers.ts";
import { EffectBadges, PanelHead, RoleToken } from "./parts.tsx";
import type { TableView } from "./view.ts";
import { CHIPS, FIELD_BOX, GRIMOIRE, INLINE, MUTED, OVERLAY, WARNING } from "./styles.ts";

const HIDDEN_TRIGGER = <button className="hidden" type="button" tabIndex={-1} aria-hidden="true" />;

export function Overlays({ view }: { view: TableView }) {
  const overlay = view.drafts.overlay;
  if (overlay === "info") return <InfoOverlay view={view} />;
  if (overlay === "grimoire") return <GrimoireOverlay view={view} />;
  if (overlay === "role") return <RoleCardDialog view={view} />;
  if (overlay === "correction") return <CorrectionDialog view={view} />;
  if (overlay === "export") return <ExportDialog view={view} />;
  if (overlay === "import") return <ImportDialog view={view} />;
  return null;
}

function InfoOverlay({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const step = state.night.queue.find((candidate) => candidate.key === drafts.infoKey);
  if (!step) return null;
  const draftKey = `${state.createdAt}:${state.night.number}:${step.key}`;
  const info = stepProjection(state, step, {
    targetIds: drafts.targets.get(draftKey) || [],
    registrations: drafts.registrations.get(draftKey) || {},
  }).info;
  const shown = drafts.givens.get(draftKey) || info;
  const bluffs = shown.bluffs || state.bluffs || [];
  const minions = livingPlayers(state)
    .filter((player) => roleTeam(player.roleId || "") === "minion")
    .map((player) => displayName(player, t));
  return (
    <div className={OVERLAY} role="dialog" aria-modal="true" aria-label={t("showCard")}>
      <div className="w-[min(560px,100%)] rounded-md border border-amber-dim bg-amber-dim/40 p-[22px] text-center">
        <p className="label">
          {t("night")} {state.night.number} · {stepTitle(step, ports.roles.byId, t)}
        </p>
        {shown.kind === "demon-info" ? (
          <div className="my-1.5 text-left">
            <span className="label">{t("ui.minions")}</span>
            <p className="my-1 text-[14px] leading-[1.4]">{minions.join(", ") || "—"}</p>
            <span className="label">{t("ui.bluffs")}</span>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {bluffs.length ? (
                bluffs.map((id) => <RoleToken key={id} id={id} ports={ports} />)
              ) : (
                <p className={MUTED}>{t("ui.noBluffs")}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="my-3 text-[clamp(18px,3vw,24px)] leading-[1.45]">
            {infoText(state, step, shown, ports.roles.byId, t)}
          </p>
        )}
        <button
          className="btn btn--accent mt-2"
          type="button"
          data-act="hide-info"
          onClick={actions.closeOverlay}
        >
          {t("hideCard")}
        </button>
      </div>
    </div>
  );
}

function GrimoireOverlay({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <div className={GRIMOIRE} role="dialog" aria-modal="true" aria-label={t("ui.grimoire")}>
      <div className="mx-auto w-[min(1000px,100%)] rounded-md border border-edge-2 bg-crypt-2 p-4">
        <PanelHead
          label={`${t("ui.spy")} · ${t("ui.grimoire")}`}
          note={
            <button
              className="btn"
              type="button"
              data-act="hide-grimoire"
              onClick={actions.closeOverlay}
            >
              {t("ui.hideGrimoire")}
            </button>
          }
        />
        <p className={MUTED}>{t("ui.spyOnly")}</p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-1.5">
          {orderedPlayers(state).map((player) => (
            <article
              key={player.id}
              className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-sm border border-edge bg-crypt-3 p-2 ${
                player.alive ? "" : "border-dashed opacity-65"
              }`}
            >
              <span className="text-[10px] text-muted">{player.seat}</span>
              <div className="min-w-0">
                <b className="block text-[12px]">{displayName(player, t)}</b>
                {player.roleId ? <RoleToken id={player.roleId} ports={ports} /> : null}
                <p className="my-0.5 text-[10.5px]">
                  {roleTeam(player.roleId || "")
                    ? ports.strings.teamText(roleTeam(player.roleId || "") || "")
                    : "—"}{" "}
                  · {player.alive ? t("ui.alive") : t("ui.dead")}
                </p>
                <span className={CHIPS}>
                  <EffectBadges state={state} player={player} ports={ports} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleCardDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  const role = drafts.roleCardId ? ports.roles.byId(drafts.roleCardId) : null;
  if (!role) return null;
  return (
    <ShellDialog
      open
      onClose={actions.closeRole}
      title={role.name}
      description={ports.strings.teamText(role.team)}
      closeLabel={t("close")}
    >
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
        <img className="h-[96px] w-[96px] object-contain" src={ports.roles.image(role)} alt="" />
        <div>
          <p className="mb-2 text-[13px] leading-[1.5]">{role.ability || ""}</p>
          {typeof role.flavor === "string" && role.flavor ? (
            <p className="text-[13px] leading-[1.5] text-muted">{role.flavor}</p>
          ) : null}
        </div>
      </div>
    </ShellDialog>
  );
}

function CorrectionDialog({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const current = drafts.correction || {
    playerId: players[0] ? players[0].id : "",
    kind: "alive",
    value: "dead",
    reason: "",
  };
  const selected = playerById(state, current.playerId);
  const update = (patch: Partial<typeof current>) => drafts.setCorrection({ ...current, ...patch });
  const apply = () => {
    if (!current.reason.trim()) {
      window.alert(t("correctionReason"));
      return;
    }
    const base = { playerId: current.playerId, reason: current.reason };
    const change =
      current.kind === "alive"
        ? { ...base, kind: "alive" as const, value: current.value === "alive" }
        : current.kind === "role"
          ? { ...base, kind: "role" as const, value: current.value }
          : current.kind === "reminder"
            ? { ...base, kind: "reminder" as const, value: current.value }
            : { kind: "clear-winner" as const, reason: current.reason };
    const result = actions.run({ type: "manualCorrection", payload: { change } });
    if (result.status === "allowed") actions.closeOverlay();
  };
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("correction")}
      description={t("correctionHint")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button
            className="btn btn--accent"
            type="button"
            data-act="apply-correction"
            onClick={apply}
          >
            {t("apply")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("cancel")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <label className={FIELD_BOX}>
        <span className="label">Игрок</span>
        <select
          className="field"
          data-correct="player"
          value={current.playerId}
          onChange={(event) =>
            update({
              playerId: event.target.value,
              value: defaultCorrectionValue(current.kind, playerById(state, event.target.value)),
            })
          }
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.seat} · {displayName(player, t)}
            </option>
          ))}
        </select>
      </label>
      <label className={FIELD_BOX}>
        <span className="label">Действие</span>
        <select
          className="field"
          data-correct="kind"
          value={current.kind}
          onChange={(event) =>
            update({
              kind: event.target.value,
              value: defaultCorrectionValue(event.target.value, selected),
            })
          }
        >
          <option value="alive">
            {t("markDead")} / {t("revive")}
          </option>
          <option value="role">{t("role")}</option>
          <option value="reminder">{t("addReminder")}</option>
          <option value="clear-winner">{t("rollback")}</option>
        </select>
      </label>
      {current.kind === "alive" ? (
        <label className={FIELD_BOX}>
          <span className="label">Статус</span>
          <select
            className="field"
            data-correct="alive-value"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            <option value="dead">{t("markDead")}</option>
            <option value="alive">{t("revive")}</option>
          </select>
        </label>
      ) : null}
      {current.kind === "role" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("role")}</span>
          <select
            className="field"
            data-correct="role-value"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            {ALL_ROLES.map((id) => (
              <option key={id} value={id}>
                {roleNameOf(id, ports.roles.byId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {current.kind === "reminder" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("addReminder")}</span>
          <input
            className="field"
            data-correct="reminder-value"
            maxLength={28}
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          />
        </label>
      ) : null}
      <label className={FIELD_BOX}>
        <span className="label">{t("correctionReason")}</span>
        <input
          className="field"
          data-correct="reason"
          maxLength={120}
          placeholder={t("correctionReason")}
          value={current.reason}
          onChange={(event) => update({ reason: event.target.value })}
        />
      </label>
      {current.kind === "clear-winner" ? <p className={WARNING}>{t("reviewHidden")}</p> : null}
      <button
        className="btn"
        type="button"
        data-act="recover-claim"
        onClick={() => {
          const reason = window.prompt(t("correctionReason"));
          if (!reason) return;
          const id = current.playerId;
          actions.closeOverlay();
          actions.run({ type: "recoverClaim", payload: { playerId: id, reason } });
        }}
      >
        {t("recoverClaim")}
      </button>
      <p className={MUTED}>{t("recoverClaimHint")}</p>
    </ShellDialog>
  );
}

function ExportDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("export")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button className="btn" type="button" data-act="download" onClick={actions.download}>
            {t("save")}
          </button>
          <button className="btn" type="button" data-act="copy" onClick={actions.copy}>
            {t("ui.copy")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("close")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <p className={WARNING}>{t("exportWarning")}</p>
      <textarea
        className="field min-h-[220px] w-full resize-y font-mono text-[10.5px]"
        readOnly
        value={drafts.exportText}
      />
    </ShellDialog>
  );
}

function ImportDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("import")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button
            className="btn btn--accent"
            type="button"
            data-act="apply-import"
            onClick={actions.applyImport}
          >
            {t("apply")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("cancel")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <p className={WARNING}>{t("exportWarning")}</p>
      <textarea
        className="field min-h-[220px] w-full resize-y font-mono text-[10.5px]"
        data-import-text
        placeholder={t("importLabel")}
        value={drafts.importText}
        onChange={(event) => drafts.setImportText(event.target.value)}
      />
    </ShellDialog>
  );
}

function ShellDialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  footer,
  children,
}: {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  closeLabel: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      trigger={HIDDEN_TRIGGER}
      title={title}
      {...(description === undefined ? {} : { description })}
      closeLabel={closeLabel}
      footer={footer}
    >
      {children}
    </Dialog>
  );
}
