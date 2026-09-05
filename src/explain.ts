import { ENGINES, type Finding } from './engines.ts';
import { loadTable } from './check.ts';
import type { DetectResult, Manifest } from './types.ts';
import { selectEngineTable } from './engine-table.ts';

/**
 * `doctor` answers a *presence* question — which of our modules does this repo
 * already have an equivalent of. The question a repo actually arrives with is a
 * *defect* question: which of my agent rules say MUST and have nothing checking
 * them, how many near-identical CI workflows do I have, which topics have two
 * documents claiming authority.
 *
 * Those detectors were already written. They ship as gates inside modules and
 * ran only after installation, over rungs-managed content — so the analysis was
 * gated behind installing the thing the analysis exists to justify, which is
 * backwards for a tool whose primary case is retrofit (WI-038).
 *
 * Nothing here is new detection. It is the same `ENGINES` table the runner
 * uses, over a registry synthesized in memory from the module manifests rather
 * than read from `.ai/gates.toml`, which an unmanaged repo does not have.
 */

export interface DetectorFinding {
  module: string;
  gate: string;
  /** The extracted incident behind the gate, from the manifest. */
  why?: string;
  findings: Finding[];
  examined: number;
}

export interface ExplainResult {
  reported: DetectorFinding[];
  /** Gates skipped, by reason — printed, because a silent skip reads as a pass. */
  skipped: { command: number; unimplemented: string[]; undeclared: string[]; errored: { gate: string; message: string }[] };
  /** Modules whose detectors ran at all. */
  scope: string[];
}

type EngineTable = Record<string, (t: any, root: string, files: string[]) => { findings: Finding[]; examined: number }>;

/**
 * A `command` gate runs a shell command the *repo* owns. On a repo that never
 * installed rungs there is no registry to own one, but a module can still
 * declare one — and executing an arbitrary command against somebody else's
 * checkout because they typed a read-only-sounding flag is not a thing this
 * tool gets to do. Skipped, and counted, never run.
 */
const isRunnable = (g: Manifest['gates'][number]) => g.kind !== 'command' && !g.trigger && !!g.engine;

/**
 * Which modules' detectors are allowed to run.
 *
 * **Only what the repo already has.** ADR-0004 biased detection signatures
 * toward false negatives; the same bias applies here for a stronger reason —
 * these engines read rungs-shaped inputs, so on a foreign repo a
 * technically-correct finding can still be framed against a convention the repo
 * never adopted. A module the repo has no equivalent of has nothing to check,
 * and running it anyway produces exactly the confident noise that loses an
 * adoption wedge.
 *
 * `paradigm` is excluded too: the repo solves that problem a different way, and
 * measuring their solution against our shape is the same error with a nastier
 * tone.
 */
export const IN_SCOPE: ReadonlySet<string> = new Set(['theirs', 'ours-current', 'ours-diverged']);

/**
 * Which declared applicability may run against a repo that is not ours.
 *
 * This was two hard-coded sets of **engine names** in this file, and the
 * knowledge lived nowhere near the gates it governed: adding a gate on
 * `file-population` silently made it foreign-safe, and adding one on a new
 * engine silently made it not, with nothing at either declaration saying so.
 * It is now a required field on each gate — see `Applicability` in `types.ts`
 * for what the three cases mean and which measurement produced them.
 */
const FOREIGN_SAFE: ReadonlySet<string> = new Set(['repo-content']);

export function explain(
  mods: Manifest[],
  results: DetectResult[],
  repoRoot: string,
  files: string[],
): ExplainResult {
  return explainWith(ENGINES, mods, results, repoRoot, files);
}

/**
 * `explain` with the engine table injected, so the scope rules above can be
 * tested without a repo on disk. Those rules are the whole safety argument of
 * this pass; testing them through fifteen real manifests would test the
 * manifests instead.
 */
export function explainWith(
  engines: EngineTable,
  mods: Manifest[],
  results: DetectResult[],
  repoRoot: string,
  files: string[],
): ExplainResult {
  const inScope = results.filter((r) => IN_SCOPE.has(r.state));
  const scope = inScope.map((r) => r.module);
  const stateOf = new Map(inScope.map((r) => [r.module, r.state]));
  const reported: DetectorFinding[] = [];
  const skipped: ExplainResult['skipped'] = { command: 0, unimplemented: [], undeclared: [], errored: [] };

  for (const name of scope) {
    const mod = mods.find((m) => m.name === name);
    if (!mod) continue;
    const isOurs = stateOf.get(name) !== 'theirs';

    for (const g of mod.gates) {
      if (!isRunnable(g)) {
        if (g.kind === 'command') skipped.command++;
        continue;
      }
      // No default. A gate that has not said whether it can read a foreign repo
      // does not read one, and is named — silence resolving to "safe" is how the
      // 71 mis-framed findings of WI-038's first version happened.
      if (!isOurs) {
        if (!g.applicability) {
          skipped.undeclared.push(g.id);
          continue;
        }
        if (!FOREIGN_SAFE.has(g.applicability)) continue;
      }
      if (!(g.engine! in engines)) {
        // Same rule as the runner: an engine named and missing is an unknown,
        // and an unknown is never reported as clean.
        skipped.unimplemented.push(g.id);
        continue;
      }

      const table = loadTable(g.table ? `${mod.name}/${g.table.replace(/^gates\//, '')}` : undefined, repoRoot);
      if (!table) {
        skipped.errored.push({ gate: g.id, message: `table '${g.table ?? '(none)'}' not found` });
        continue;
      }

      try {
        const section = selectEngineTable(table, g.engine!, g.id);
        const r = engines[g.engine!](section, repoRoot, files);
        if (r.findings.length) {
          reported.push({ module: mod.name, gate: g.id, why: g.why, findings: r.findings, examined: r.examined });
        }
      } catch (e: any) {
        // An engine that throws on a foreign repo's shapes is a fact about this
        // pass, not about the repo. Reported as ours, not as their finding.
        skipped.errored.push({ gate: g.id, message: e.message });
      }
    }
  }

  return { reported: collapseDuplicates(reported), skipped, scope };
}

/**
 * Two gate ids that produce the identical finding set are one check reported
 * twice, and on a repo with 112 broken links that is 224 lines of the same
 * thing. `gates-links-resolve` and `gates-paths-exist` currently run the same
 * markdown-link scan — F-007 in `docs/backlog/FINDINGS.md`, open before this
 * pass existed and unchanged by it.
 *
 * Collapsed here rather than fixed there on purpose: the duplication is a defect
 * in the gate set, this is a defect in *reading* the gate set, and a reporting
 * layer that hides a registry problem is how the registry problem survives. The
 * merged row names both ids, so the duplication stays visible to anyone who
 * looks at the output — which is the point.
 */
export function collapseDuplicates(reported: DetectorFinding[]): DetectorFinding[] {
  const out: DetectorFinding[] = [];
  const seen = new Map<string, DetectorFinding>();
  for (const r of reported) {
    const key = `${r.module} ${r.findings.map((f) => `${f.file ?? ''}|${f.message}`).join('')}`;
    const prior = seen.get(key);
    if (prior) {
      prior.gate = `${prior.gate} + ${r.gate}`;
      continue;
    }
    seen.set(key, r);
    out.push(r);
  }
  return out;
}
