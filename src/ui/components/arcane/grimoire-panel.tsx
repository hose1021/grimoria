import { cx } from "./classes.ts";
import { RoleCard, type CardRole } from "./role-card.tsx";

export interface GrimoireRole extends CardRole {
  id: string;
  image: string;
}

export interface GrimoireGroup {
  id: string;
  label: string;
  colour: string;
  roles: GrimoireRole[];
}

export function GrimoirePanel({
  groups,
  className,
}: {
  groups: GrimoireGroup[];
  className?: string;
}) {
  return (
    <div className={cx("grid gap-3", className)}>
      {groups.map((group) => (
        <section
          key={group.id}
          className="rounded-md border border-edge border-l-[3px] bg-crypt-2 p-3"
          style={{ borderLeftColor: group.colour }}
          data-team={group.id}
        >
          <div className="mb-2 flex items-center gap-2">
            <i
              className="size-2 rounded-full"
              style={{ background: group.colour }}
              aria-hidden="true"
            />
            <h2 className="m-0 flex-1 text-[14px] font-semibold">{group.label}</h2>
            <span className="text-[9px] tabular-nums text-muted">{group.roles.length}</span>
          </div>
          <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {group.roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                image={role.image}
                mode="compact"
                className="border-edge"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
