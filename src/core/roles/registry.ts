import type { SupportedRoleId } from "../model/role-ids.ts";
import type { RoleModule } from "./types.ts";
import { role as washerwoman } from "./washerwoman/role.ts";
import { role as librarian } from "./librarian/role.ts";
import { role as investigator } from "./investigator/role.ts";
import { role as chef } from "./chef/role.ts";
import { role as empath } from "./empath/role.ts";
import { role as fortuneteller } from "./fortuneteller/role.ts";
import { role as undertaker } from "./undertaker/role.ts";
import { role as monk } from "./monk/role.ts";
import { role as ravenkeeper } from "./ravenkeeper/role.ts";
import { role as virgin } from "./virgin/role.ts";
import { role as slayer } from "./slayer/role.ts";
import { role as soldier } from "./soldier/role.ts";
import { role as mayor } from "./mayor/role.ts";
import { role as butler } from "./butler/role.ts";
import { role as drunk } from "./drunk/role.ts";
import { role as recluse } from "./recluse/role.ts";
import { role as saint } from "./saint/role.ts";
import { role as poisoner } from "./poisoner/role.ts";
import { role as spy } from "./spy/role.ts";
import { role as scarletwoman } from "./scarletwoman/role.ts";
import { role as baron } from "./baron/role.ts";
import { role as imp } from "./imp/role.ts";
import { role as chambermaid } from "./chambermaid/role.ts";
import { role as courtier } from "./courtier/role.ts";
import { role as exorcist } from "./exorcist/role.ts";
import { role as fool } from "./fool/role.ts";
import { role as gambler } from "./gambler/role.ts";
import { role as gossip } from "./gossip/role.ts";
import { role as grandmother } from "./grandmother/role.ts";
import { role as innkeeper } from "./innkeeper/role.ts";
import { role as minstrel } from "./minstrel/role.ts";
import { role as pacifist } from "./pacifist/role.ts";
import { role as professor } from "./professor/role.ts";
import { role as sailor } from "./sailor/role.ts";
import { role as tealady } from "./tealady/role.ts";
import { role as goon } from "./goon/role.ts";
import { role as lunatic } from "./lunatic/role.ts";
import { role as moonchild } from "./moonchild/role.ts";
import { role as tinker } from "./tinker/role.ts";
import { role as assassin } from "./assassin/role.ts";
import { role as devilsadvocate } from "./devilsadvocate/role.ts";
import { role as godfather } from "./godfather/role.ts";
import { role as mastermind } from "./mastermind/role.ts";
import { role as po } from "./po/role.ts";
import { role as pukka } from "./pukka/role.ts";
import { role as shabaloth } from "./shabaloth/role.ts";
import { role as zombuul } from "./zombuul/role.ts";
import { role as artist } from "./artist/role.ts";
import { role as clockmaker } from "./clockmaker/role.ts";
import { role as dreamer } from "./dreamer/role.ts";
import { role as flowergirl } from "./flowergirl/role.ts";
import { role as juggler } from "./juggler/role.ts";
import { role as mathematician } from "./mathematician/role.ts";
import { role as oracle } from "./oracle/role.ts";
import { role as philosopher } from "./philosopher/role.ts";
import { role as sage } from "./sage/role.ts";
import { role as savant } from "./savant/role.ts";
import { role as seamstress } from "./seamstress/role.ts";
import { role as snakecharmer } from "./snakecharmer/role.ts";
import { role as towncrier } from "./towncrier/role.ts";
import { role as barber } from "./barber/role.ts";
import { role as klutz } from "./klutz/role.ts";
import { role as mutant } from "./mutant/role.ts";
import { role as sweetheart } from "./sweetheart/role.ts";
import { role as cerenovus } from "./cerenovus/role.ts";
import { role as eviltwin } from "./eviltwin/role.ts";
import { role as pithag } from "./pithag/role.ts";
import { role as witch } from "./witch/role.ts";
import { role as fanggu } from "./fanggu/role.ts";
import { role as nodashii } from "./nodashii/role.ts";
import { role as vigormortis } from "./vigormortis/role.ts";
import { role as vortox } from "./vortox/role.ts";

/** Every supported character, keyed by its role id. */
export const ROLE_MODULES = {
  washerwoman,
  librarian,
  investigator,
  chef,
  empath,
  fortuneteller,
  undertaker,
  monk,
  ravenkeeper,
  virgin,
  slayer,
  soldier,
  mayor,
  butler,
  drunk,
  recluse,
  saint,
  poisoner,
  spy,
  scarletwoman,
  baron,
  imp,
  chambermaid,
  courtier,
  exorcist,
  fool,
  gambler,
  gossip,
  grandmother,
  innkeeper,
  minstrel,
  pacifist,
  professor,
  sailor,
  tealady,
  goon,
  lunatic,
  moonchild,
  tinker,
  assassin,
  devilsadvocate,
  godfather,
  mastermind,
  po,
  pukka,
  shabaloth,
  zombuul,
  artist,
  clockmaker,
  dreamer,
  flowergirl,
  juggler,
  mathematician,
  oracle,
  philosopher,
  sage,
  savant,
  seamstress,
  snakecharmer,
  towncrier,
  barber,
  klutz,
  mutant,
  sweetheart,
  cerenovus,
  eviltwin,
  pithag,
  witch,
  fanggu,
  nodashii,
  vigormortis,
  vortox,
} satisfies Record<SupportedRoleId, RoleModule>;

/** The module for one role id, or null for a role the game does not support. */
export function roleModule(id: string): RoleModule | null {
  const modules: Record<string, RoleModule> = ROLE_MODULES;
  return modules[id] ?? null;
}
