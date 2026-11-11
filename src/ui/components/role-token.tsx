import type { Role } from "../../core/model/types.ts";

export interface RoleTokenProps {
  role: Role;
  image: string;
}

export function RoleToken({ role, image }: RoleTokenProps) {
  return (
    <article className="sheet-role" data-role-id={role.id}>
      <img src={image} alt="" loading="lazy" />
      <div className="sheet-role-body">
        <h3>{role.name}</h3>
        <p>{role.ability}</p>
      </div>
    </article>
  );
}
