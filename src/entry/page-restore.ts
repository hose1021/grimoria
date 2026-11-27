import { parseReferenceRoute } from "../ui/reference-route.ts";
import { parseSheetRoute } from "../ui/sheet-route.ts";

export function needsRestoredHandoff(persisted: boolean, path: string): boolean {
  return persisted && path !== "/changelog" && !parseSheetRoute(path) && !parseReferenceRoute(path);
}
