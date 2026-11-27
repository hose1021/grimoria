import type { Role } from "../../core/model/types.ts";

function suffix(role: Role): string {
  return role.team === "minion" || role.team === "demon" ? "_e" : "_g";
}

export function imageName(role?: Role | null): string {
  if (!role) return "";
  const images = Array.isArray(role.image) ? role.image : [role.image];
  const want = suffix(role);
  const match = images.find((path) => path && path.includes(want + "."));
  const chosen = match || images[0] || "";
  return chosen.slice(chosen.lastIndexOf("/") + 1);
}
