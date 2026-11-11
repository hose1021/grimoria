import type { Role } from "../../core/model/types.ts";

export interface RoleTokenProps {
  role: Role;
  image: string;
}

export function RoleToken({ role, image }: RoleTokenProps) {
  return (
    <article
      className="sheet-role flex min-w-0 items-start gap-2.25 rounded-[9px] border border-line bg-sheet-role-bg p-2"
      data-role-id={role.id}
    >
      <img
        className="h-15.5 w-13 flex-[0_0_52px] object-contain max-[680px]:h-13.5 max-[680px]:w-11 max-[680px]:flex-[0_0_44px]"
        src={image}
        alt=""
        loading="lazy"
      />
      <div className="sheet-role-body min-w-0">
        <h3 className="mb-1 mt-px text-[13px] leading-tight">{role.name}</h3>
        <p className="m-0 text-[11.5px] leading-[1.4] text-muted">{role.ability}</p>
      </div>
    </article>
  );
}
