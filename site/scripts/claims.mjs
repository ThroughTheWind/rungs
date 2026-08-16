/**
 * The site's derivable facts, computed from the repo rather than typed.
 *
 * WI-051. `site.config.ts` carried `gates: { registered: 20, … }` beside its own
 * comment calling typed numbers "the thing this repo has the most scar tissue
 * about" and a `TODO (generate-derivable)`. On 2026-08-16 the registry held 22
 * and the site still said 20 — the failure that comment describes, on the page
 * that argues rungs prevents it.
 *
 * Two entry points share this module:
 *
 *   generate  writes src/generated/claims.json
 *   check     recomputes and refuses a mismatch (the `site-claims-current` gate)
 *
 * **Nothing here runs `rungs check`.** The gate is itself run by `rungs check`,
 * and a check that invokes its own runner is a recursion, not a verification.
 * So only facts readable from files are derived: how many gates the registry
 * declares, how many modules exist and at what rung, and what each profile
 * installs. Run *results* — pass, fail, unimplemented — are a dated measurement
 * of one execution and stay in `site.config.ts` with their date, in the same
 * category as the research snapshots.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = join(REPO, "site", "src", "generated", "claims.json");

const field = (text, name) => text.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n]+)"?`, "m"))?.[1]?.trim() ?? "";

export function derive() {
  // Gate ids in the repo's own registry. Counted from `[[gates]]` blocks rather
  // than from a run, so this never needs the runner.
  // Split by how they fire. A hook runs on a tool call, not in the runner, so
  // `rungs check` reports 22 where the registry declares 23 — and a site saying
  // "23 gates register, all 23 have engines" beside a transcript reading
  // "22 pass" would be two true numbers that read as a contradiction.
  // Split on the marker **at line start only**. Splitting on the bare string
  // counted the two `# [[gates]]` examples in the registry's own header comment,
  // which produced 24 gates where there are 22 — a derived number that was wrong
  // in the same direction as the typed one it replaced.
  const registry = readFileSync(join(REPO, ".ai", "gates.toml"), "utf8");
  const blocks = [];
  for (const line of registry.split("\n")) {
    if (/^\[\[gates\]\]\s*$/.test(line)) blocks.push([]);
    else if (blocks.length) blocks[blocks.length - 1].push(line);
  }
  const idOf = (b) => /^\s*id\s*=\s*"([^"]+)"/m.exec(b.join("\n"))?.[1] ?? "";
  const isHook = (b) => b.some((l) => /^\s*trigger\s*=/.test(l));
  const hookIds = blocks.filter(isHook).map(idOf).sort();
  const gateIds = blocks.filter((b) => !isHook(b)).map(idOf).sort();

  const modulesDir = join(REPO, "modules");
  const modules = readdirSync(modulesDir)
    .filter((name) => statSync(join(modulesDir, name)).isDirectory())
    .map((name) => {
      const toml = readFileSync(join(modulesDir, name, "module.toml"), "utf8");
      const requires = /^modules\s*=\s*\[([^\]]*)\]/m.exec(toml.split("[requires]")[1] ?? "")?.[1] ?? "";
      return {
        name,
        version: field(toml, "version"),
        rung: Number(field(toml, "rung")),
        summary: field(toml, "summary"),
        requires: [...requires.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
      };
    })
    .sort((a, b) => a.rung - b.rung || a.name.localeCompare(b.name));

  // The profile table is the CLI's, read as text so this stays dependency-free
  // and cannot drift from the source of truth by being re-typed here.
  const lifecycle = readFileSync(join(REPO, "src", "lifecycle.ts"), "utf8");
  const block = lifecycle.split("export const PROFILES")[1]?.split("};")[0] ?? "";
  const profiles = [...block.matchAll(/^\s*(\w[\w-]*):\s*\[([^\]]*)\]/gm)].map((m) => ({
    name: m[1],
    modules: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]),
  }));

  return { gateCount: gateIds.length, gateIds, hookCount: hookIds.length, hookIds, modules, profiles };
}

export function readSnapshot() {
  return JSON.parse(readFileSync(OUT, "utf8"));
}
