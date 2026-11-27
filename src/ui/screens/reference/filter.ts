import type { Role } from "../../../core/model/types.ts";

export function matchesReference(
  role: Pick<Role, "id" | "name" | "edition">,
  query: string,
  edition: string,
  lang: string,
): boolean {
  if (edition !== "all" && edition !== role.edition) return false;
  const needle = query.trim();
  if (!needle || role.name.toLocaleLowerCase(lang).includes(needle.toLocaleLowerCase(lang)))
    return true;
  const id = needle.toLowerCase().replace(/[\s'-]+/g, "");
  return id.length > 0 && role.id.includes(id);
}
