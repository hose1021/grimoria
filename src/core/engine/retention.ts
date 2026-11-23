// The Vigormortis retention predicate reads only model facts and lives with
// the roles. The engine re-exports it so existing import paths stay stable.
export {
  mastermindRetainsAbility,
  minionRetainsAbility,
  vigormortisActive,
} from "../roles/retention.ts";
