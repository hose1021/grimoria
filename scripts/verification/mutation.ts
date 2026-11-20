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
    from: "poisoned: Boolean(poisonEffect),",
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
    name: "demon-dead win silenced",
    file: "src/core/engine/death.ts",
    from: 'return setWinner(state, "good", "demon-dead", ports);',
    to: "return null;",
    test: "src/core/engine/engine.test.ts",
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
  const suite = (
    target: string,
  ): { ok: boolean; passed: number; failed: number; failure: string | null } => {
    let output: string;
    try {
      output = execFileSync(process.execPath, ["--test", "--test-reporter=tap", target], {
        cwd: copy,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
    } catch (error) {
      const value = error as { stdout?: string; stderr?: string };
      output = (value.stdout ?? "") + (value.stderr ?? "");
    }
    const passed = Number(/# pass (\d+)/.exec(output)?.[1] ?? 0);
    const failed = Number(/# fail (\d+)/.exec(output)?.[1] ?? 0);
    return { ok: failed === 0 && passed > 0, passed, failed, failure: firstFailure(output) };
  };
  for (const probe of probes) {
    const path = join(copy, probe.file);
    const before = readFileSync(path, "utf8");
    if (!before.includes(probe.from)) {
      console.error(`MUTATION_SETUP_FAIL ${probe.name}: pattern not found`);
      failures += 1;
      continue;
    }
    const baseline = suite(probe.test);
    // A failure caused by an already broken suite is not detection.
    if (!baseline.ok) {
      console.error(
        `MUTATION_BASELINE_FAIL ${probe.name}: ${probe.test} is not green before the mutation` +
          (baseline.failure ? ` (${baseline.failure})` : ""),
      );
      failures += 1;
      continue;
    }
    console.log(`BASELINE PASS ${probe.name}: ${probe.test} (${baseline.passed} tests)`);
    writeFileSync(path, before.replace(probe.from, probe.to));
    try {
      const mutated = suite(probe.test);
      if (mutated.failed === 0) {
        console.error(`SURVIVED ${probe.name}: ${probe.test} still passes`);
        failures += 1;
      } else if (!mutated.failure) {
        // A crash, a syntax error or a missing module is not an assertion.
        console.error(
          `MUTATION_INVALID ${probe.name}: ${probe.test} reports ${mutated.failed} failures without an assertion diagnostic`,
        );
        failures += 1;
      } else {
        console.log(`DETECTED ${probe.name}: ${mutated.failure}`);
      }
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

/** The first failing test name and its assertion message, from TAP output. */
function firstFailure(output: string): string | null {
  const lines = output.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const name = /^\s*not ok \d+ - (.+)$/.exec(lines[index]);
    if (!name) continue;
    for (let cursor = index + 1; cursor < Math.min(index + 80, lines.length); cursor += 1) {
      const error = /^\s+error:\s*(.*)$/.exec(lines[cursor]);
      if (error) {
        const inline = error[1].trim();
        if (inline && inline !== "|-" && inline !== "|" && inline !== ">-") {
          return `${name[1].trim()} :: ${inline}`;
        }
        const detail: string[] = [];
        for (let next = cursor + 1; next < Math.min(cursor + 16, lines.length); next += 1) {
          const line = lines[next];
          if (/^\s*\.\.\.$/.test(line)) break;
          if (/^\s{0,3}[a-z]+:\s/.test(line)) break;
          const text = line.trim();
          if (text) detail.push(text);
          if (detail.length === 3) break;
        }
        return `${name[1].trim()} :: ${detail.join(" ") || "assertion failed"}`;
      }
      if (/^\s*\.\.\.$/.test(lines[cursor])) break;
    }
    return name[1].trim();
  }
  return null;
}
