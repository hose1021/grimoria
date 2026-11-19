#!/usr/bin/env node
// Mutation probes on critical projections/gates. Runs in a temporary copy;
// the source worktree is never modified. A surviving mutation fails the job.
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const copy = mkdtempSync(join(tmpdir(), "grimoria-mutation-"));
const probes = [
  {
    name: "poison projection",
    file: "src/application/read-models/table.ts",
    from: "poisoned: !drunkEffect && isImpaired(state, playerId),",
    to: "poisoned: false,",
    test: "src/application/read-models/verification.test.ts",
  },
  {
    name: "given gate",
    file: "src/ui/screens/table/step-context.ts",
    from: "needsGiven: Boolean(info.needsChoice && !given && !targetsIncomplete),",
    to: "needsGiven: false,",
    test: "src/ui/screens/table/step-context.verification.test.ts",
  },
  {
    name: "registered-dead public count",
    file: "src/core/model/state.ts",
    from: "const living = livingPlayers(state).filter((player) => !player.registeredDead).length;",
    to: "const living = livingPlayers(state).length;",
    test: "src/application/read-models/read-models.test.ts",
  },
  {
    name: "consequence revival",
    file: "src/ui/screens/table/helpers.ts",
    from: 'add(event.payload.alive ? "revived" : "death", [String(event.payload.playerId)]);',
    to: 'add("death", [String(event.payload.playerId)]);',
    test: "src/ui/screens/table/helpers.test.ts",
  },
  {
    name: "empath count inversion",
    file: "src/core/roles/empath/role.ts",
    from: '.filter((playerId) => context.registeredTeamOf(playerId) === "evil").length;',
    to: '.filter((playerId) => context.registeredTeamOf(playerId) !== "evil").length;',
    test: "src/core/roles/empath/role.test.ts",
  },
  {
    name: "impairment silenced",
    file: "src/core/engine/effects.ts",
    from: "return graph.ok && graph.impaired.has(String(playerId));",
    to: "return false;",
    test: "src/core/engine/engine.test.ts",
  },
  {
    name: "phase guard disabled",
    file: "src/core/engine/lifecycle.ts",
    from: 'const policy = COMMAND_PHASES[type];\n  if (policy.phases === "any") return null;',
    to: 'const policy = COMMAND_PHASES[type];\n  if (policy.phases === "any") return null;\n  return null;',
    test: "src/core/engine/lifecycle.test.ts",
  },
  {
    name: "player projection leak",
    file: "src/ui/screens/player-projection.ts",
    from: "shownRoleId: player?.shownRoleId ?? null,",
    to: "shownRoleId: player?.shownRoleId ?? null, roleId: (player as { roleId?: string } | undefined)?.roleId ?? null,",
    test: "src/ui/screens/player-projection.test.ts",
  },
];

try {
  cpSync(ROOT, copy, {
    recursive: true,
    filter: (source) => !/node_modules|\.git|dist|\.codegraph/.test(source),
  });
  symlinkSync(join(ROOT, "node_modules"), join(copy, "node_modules"));
  let failures = 0;
  const suite = (target: string): boolean => {
    try {
      execFileSync(process.execPath, ["--test", target], {
        cwd: copy,
        stdio: ["ignore", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  };
  for (const probe of probes) {
    const path = join(copy, probe.file);
    const before = readFileSync(path, "utf8");
    if (!before.includes(probe.from)) {
      console.error(`MUTATION_SETUP_FAIL ${probe.name}: pattern not found`);
      failures += 1;
      continue;
    }
    // A failure caused by an already broken suite is not detection.
    if (!suite(probe.test)) {
      console.error(
        `MUTATION_BASELINE_FAIL ${probe.name}: ${probe.test} fails before the mutation`,
      );
      failures += 1;
      continue;
    }
    writeFileSync(path, before.replace(probe.from, probe.to));
    try {
      execFileSync(process.execPath, ["--test", probe.test], {
        cwd: copy,
        stdio: ["ignore", "pipe", "pipe"],
      });
      console.error(`SURVIVED ${probe.name}: ${probe.test} still passes`);
      failures += 1;
    } catch {
      console.log(`DETECTED ${probe.name}: ${probe.test} fails`);
    } finally {
      writeFileSync(path, before);
    }
  }
  if (failures) {
    console.error(`Mutation gate failed: ${failures} surviving/setup failure(s).`);
    process.exit(1);
  }
  console.log(`Mutation gate passed: ${probes.length} critical mutations detected.`);
} finally {
  rmSync(copy, { recursive: true, force: true });
}
