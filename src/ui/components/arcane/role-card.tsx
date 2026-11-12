import type { ReactNode } from "react";
import { cx } from "./classes.ts";

export interface CardRole {
  name: string;
  teamLabel: string;
  ability: string;
}

export interface RoleCardProps {
  role: CardRole;
  image: string;
  mode?: "hidden" | "revealed" | "compact";
  orientation?: "stack" | "row";
  reminders?: string[];
  footer?: ReactNode;
  className?: string;
}

export function RoleCard({
  role,
  image,
  mode = "revealed",
  orientation = "stack",
  reminders = [],
  footer,
  className,
}: RoleCardProps) {
  if (mode === "hidden") {
    return (
      <article
        className={cx(
          "grid place-items-center gap-2 rounded-md border border-edge-2 bg-crypt-2 p-8 text-center",
          className,
        )}
        data-role-card="hidden"
      >
        <span className="font-role text-[28px] text-brass" aria-hidden="true">
          ✦
        </span>
        <p className="m-0 text-[11px] uppercase tracking-[.18em] text-muted">Роль скрыта</p>
      </article>
    );
  }
  const compact = mode === "compact";
  if (compact && orientation === "row") {
    return (
      <article
        className={cx(
          "grid grid-cols-[62px_minmax(0,1fr)] items-start gap-2.5 rounded-md border border-edge-2 bg-crypt-2 p-2.5",
          className,
        )}
        data-role-card={mode}
      >
        <img className="size-[62px] object-contain" src={image} alt="" />
        <div className="min-w-0">
          <span className="text-[7px] uppercase tracking-[.2em] text-brass">{role.teamLabel}</span>
          <h3 className="m-0 font-role text-[15px] leading-tight text-player-role-text">
            {role.name}
          </h3>
          <p className="mt-1 line-clamp-3 text-[9.5px] leading-[1.45] text-muted">{role.ability}</p>
        </div>
      </article>
    );
  }
  return (
    <article
      className={cx(
        "overflow-hidden rounded-md border border-edge-2 bg-crypt-2",
        compact ? "" : "shadow-deep",
        className,
      )}
      data-role-card={mode}
    >
      <div
        className={cx(
          "grid place-items-center border-b border-edge bg-crypt-3",
          compact ? "p-3" : "p-6",
        )}
      >
        <img
          className={compact ? "size-16 object-contain" : "size-40 object-contain"}
          src={image}
          alt=""
        />
      </div>
      <div className={cx("grid gap-2", compact ? "p-3" : "p-4")}>
        <span className="text-[8px] uppercase tracking-[.2em] text-brass">{role.teamLabel}</span>
        <h3
          className={cx(
            "m-0 font-role leading-tight text-player-role-text",
            compact ? "text-[18px]" : "text-[28px]",
          )}
        >
          {role.name}
        </h3>
        <p
          className={cx(
            "m-0 text-text",
            compact ? "text-[10.5px] leading-snug" : "text-[12px] leading-relaxed",
          )}
        >
          {role.ability}
        </p>
        {reminders.length ? (
          <div className="mt-1 rounded-sm border border-amber-dim bg-amber-dim/40 px-2 py-1.5 text-[10px] leading-relaxed text-amber-2">
            {reminders.map((reminder) => (
              <p key={reminder} className="m-0">
                {reminder}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {footer}
    </article>
  );
}
