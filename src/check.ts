import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import { ENGINES, isImplemented, type Finding } from './engines.ts';
import { walk } from './glob.ts';
import { resolveParams, substitute, type Params } from './substitute.ts';
import { loadAllModules } from './manifest.ts';
import { selectEngineTable } from './engine-table.ts';

const MODULES = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules');

export type Status = 'pass' | 'fail' | 'unimplemented' | 'error';

export interface GateRun {
  id: string;
  module?: string;
  kind: string;
  engine?: string;
  tier: string;
  status: Status;
  ms: number;
  examined: number;
  findings: Finding[];
  why?: string;
}

interface RegistryGate {
  id: string;
  kind: string;
  module?: string;
  engine?: string;
  table?: string;
  command?: string;
  tier?: string;
  trigger?: string;
  why?: string;
}

export function loadRegistry(repoRoot: string): { runner: any; gates: RegistryGate[] } {
  const path = join(repoRoot, '.ai', 'gates.toml');
  if (!existsSync(path)) return { runner: {}, gates: [] };
  const raw = parse(readFileSync(path, 'utf8')) as any;
  return { runner: raw.runner ?? {}, gates: raw.gates ?? [] };
}

/**
 * ADR-0008: a tier is an ordered **level**, not a tag. `[runner] tiers` declares
 * the order, and asking for one runs every gate at that level or below it.
 *
 * This was string equality, so `full` selected only gates labelled `full` — zero
 * of them on a registry where everything is `fast`, which is this repo. The run
 * then reported no gates and exited as though the release had been gated, and
 * `cut-release` told every consumer to gate on exactly that command (F-020).
 */
export function tierSelects(runnerTiers: string[], requested: string, gateTier?: string): boolean {
  if (!gateTier) return true; // untiered gates run in every tier
  const at = runnerTiers.indexOf(requested);
  const of = runnerTiers.indexOf(gateTier);
  // An undeclared tier on either side cannot be ordered. Fall back to equality
  // rather than guessing a position — silently including it would be worse.
  if (at < 0 || of < 0) return gateTier === requested;
  return of <= at;
}

/**
 * No parameter properties: Node's strip-only TypeScript mode rejects them, and
 * `dist/` is built from these sources for a runtime that has no compiler. The
 * same constraint is what v0.1.1 shipped broken (ERR_UNSUPPORTED_NODE_MODULES_
 * TYPE_STRIPPING), so it is worth the four extra lines.
 */
export class UnknownTierError extends Error {
  requested: string;
  declared: string[];
  constructor(requested: string, declared: string[]) {
    super(`unknown tier "${requested}"`);
    this.requested = requested;
    this.declared = declared;
  }
}

function commandText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
}

function normalizeCommandText(value: unknown, repoRoot: string): string {
  let text = commandText(value).replace(/\r\n?/g, '\n').trim();
  const absolute = resolve(repoRoot);
  const variants = [...new Set([
    absolute,
    absolute.replaceAll('\\', '/'),
    absolute.replaceAll('/', '\\'),
  ])].sort((left, right) => right.length - left.length);
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, process.platform === 'win32' ? 'gi' : 'g'), '<repo>');
  }
  return text;
}

/** Preserve actionable command output while keeping land attribution independent of root spelling and EOL. */
function commandFailure(error: any, repoRoot: string): Finding {
  const stderr = normalizeCommandText(error?.stderr, repoRoot);
  const stdout = normalizeCommandText(error?.stdout, repoRoot);
  const fallback = normalizeCommandText(error?.message, repoRoot);
  const status = typeof error?.status === 'number'
    ? String(error.status)
    : error?.signal
      ? `signal ${error.signal}`
      : 'unknown';
  const streams = [
    ...(stderr ? [`stderr:\n${stderr}`] : []),
    ...(stdout ? [`stdout:\n${stdout}`] : []),
  ];
  const detail = streams.length ? streams.join('\n') : fallback;
  const diagnostic = `command exited with status ${status}${detail ? `\n${detail}` : ''}`;
  return {
    message: diagnostic,
    identity: `command:${status}${detail ? `\n${detail}` : ''}`,
  };
}

/**
 * `only` narrows the run to named gate ids. Attribution needs it: after a merged
 * tree goes red, `land` re-runs **just the failing gates** against the merge base
 * to decide whether they were already red. Re-running all of them would give the
 * same verdict and cost a second full pass for gates nobody asked about.
 */
export function runGates(repoRoot: string, tier?: string, now = () => Date.now(), only?: ReadonlySet<string>): GateRun[] {
  const { runner, gates } = loadRegistry(repoRoot);
  const runnerTiers: string[] = Array.isArray(runner?.tiers) ? runner.tiers : [];
  // A tier nobody declared selects nothing, and "selected nothing" is
  // indistinguishable from "everything passed" at the exit code. Refuse it here
  // rather than let a typo read as a green release gate.
  if (tier && runnerTiers.length && !runnerTiers.includes(tier)) {
    throw new UnknownTierError(tier, runnerTiers);
  }
  const files = walk(repoRoot);
  const runs: GateRun[] = [];

  for (const g of gates) {
    // A hook fires on a tool call, not in the runner. Skipping it here is
    // correct; counting it as a pass would not be.
    if (g.trigger) continue;
    if (only && !only.has(g.id)) continue;
    if (tier && !tierSelects(runnerTiers, tier, g.tier)) continue;

    const started = now();
    let status: Status = 'pass';
    let findings: Finding[] = [];
    let examined = 0;

    if (g.kind === 'command' && g.command) {
      try {
        execSync(g.command, { cwd: repoRoot, stdio: 'pipe' });
      } catch (e: any) {
        status = 'fail';
        findings = [commandFailure(e, repoRoot)];
      }
    } else if (!g.engine || !isImplemented(g.engine)) {
      // Never green. An engine named in a table and missing from the CLI is an
      // unknown, and a registry reporting green because most of its gates do
      // nothing is the worst failure this tool could have.
      status = 'unimplemented';
      findings = [{ message: `engine '${g.engine ?? '(none)'}' is not implemented` }];
    } else {
      const table = loadTable(g.table, repoRoot);
      if (!table) {
        status = 'error';
        findings = [{ message: `table '${g.table}' not found` }];
      } else {
        try {
          const section = selectEngineTable(table, g.engine, g.id);
          const r = ENGINES[g.engine](section, repoRoot, files);
          findings = r.findings;
          examined = r.examined;
          status = r.findings.length ? 'fail' : 'pass';
        } catch (e: any) {
          status = 'error';
          findings = [{ message: e.message }];
        }
      }
    }

    runs.push({
      id: g.id,
      module: g.module,
      kind: g.kind,
      engine: g.engine,
      tier: g.tier ?? 'fast',
      status,
      ms: now() - started,
      examined,
      findings,
      why: g.why,
    });
  }
  return runs;
}

/**
 * A table lives in the CLI's module set, not in the repo (ADR-0002) — but it is
 * authored with `{{param}}` placeholders, so it is **not valid TOML until
 * substituted**: `max_lines = {{core_budget}}` parses as nothing.
 *
 * Found by running the runner, which reported `table not found` for a file
 * plainly on disk. Tables are substituted against the repo's own installed
 * parameters before parsing — which is also what makes a gate honour the
 * prefix, root and budget that repo actually chose.
 */
export function loadTable(ref: string | undefined, repoRoot: string): any | null {
  if (!ref) return null;
  const [mod, file] = ref.split('/');
  const path = join(MODULES, mod, 'gates', file);
  if (!existsSync(path)) return null;
  try {
    return parse(substitute(readFileSync(path, 'utf8'), mod, installedParams(repoRoot)));
  } catch {
    return null;
  }
}

let paramCache: { root: string; params: Params } | null = null;

/** Parameters as the repo installed them, falling back to module defaults. */
export function installedParams(repoRoot: string): Params {
  if (paramCache?.root === repoRoot) return paramCache.params;
  const defaults = resolveParams(loadAllModules(MODULES), {}, repoRoot);
  const recordPath = join(repoRoot, '.ai', 'rungs.toml');
  if (existsSync(recordPath)) {
    try {
      const rec = parse(readFileSync(recordPath, 'utf8')) as any;
      for (const [name, entry] of Object.entries<any>(rec.modules ?? {})) {
        if (entry?.params) defaults[name] = { ...(defaults[name] ?? {}), ...entry.params };
      }
    } catch {
      /* a malformed record falls back to defaults rather than failing every gate */
    }
  }
  paramCache = { root: repoRoot, params: defaults };
  return defaults;
}

/**
 * ADR-0005 tier A. One line per gate per run: what the runner directly observes
 * and nothing that needs interpretation. Local, gitignored, never transmitted.
 */
export function appendLedger(repoRoot: string, runs: GateRun[], stamp: string) {
  const { runner } = loadRegistry(repoRoot);
  if (runner.ledger === false) return;
  const path = join(repoRoot, '.ai', '.gate-ledger.jsonl');
  const lines = runs
    .map((r) => JSON.stringify({ at: stamp, id: r.id, status: r.status, ms: r.ms, examined: r.examined }))
    .join('\n');
  appendFileSync(path, lines + '\n');
}

/** The two questions ADR-0005 tier B allows, both binary facts. */
export function ledgerQuestions(repoRoot: string, gates: RegistryGate[]) {
  const path = join(repoRoot, '.ai', '.gate-ledger.jsonl');
  if (!existsSync(path)) return { neverFired: [], alwaysFires: [], runs: 0 };
  const rows = readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { id: string; status: Status });
  const by = new Map<string, { total: number; failed: number }>();
  for (const r of rows) {
    const e = by.get(r.id) ?? { total: 0, failed: 0 };
    e.total++;
    if (r.status === 'fail') e.failed++;
    by.set(r.id, e);
  }
  const whyOf = (id: string) => gates.find((g) => g.id === id)?.why;
  const neverFired = [...by].filter(([, e]) => e.total >= 3 && e.failed === 0).map(([id]) => ({ id, why: whyOf(id) }));
  const alwaysFires = [...by]
    .filter(([, e]) => e.total >= 3 && e.failed / e.total > 0.9)
    .map(([id, e]) => ({ id, why: whyOf(id), rate: `${e.failed}/${e.total}` }));
  return { neverFired, alwaysFires, runs: rows.length };
}
