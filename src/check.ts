import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import { ENGINES, isImplemented, type Finding } from './engines.ts';
import { walk } from './glob.ts';
import { resolveParams, substitute, type Params } from './substitute.ts';
import { loadAllModules } from './manifest.ts';

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

export function runGates(repoRoot: string, tier?: string, now = () => Date.now()): GateRun[] {
  const { gates } = loadRegistry(repoRoot);
  const files = walk(repoRoot);
  const runs: GateRun[] = [];

  for (const g of gates) {
    // A hook fires on a tool call, not in the runner. Skipping it here is
    // correct; counting it as a pass would not be.
    if (g.trigger) continue;
    if (tier && g.tier && g.tier !== tier) continue;

    const started = now();
    let status: Status = 'pass';
    let findings: Finding[] = [];
    let examined = 0;

    if (g.kind === 'command' && g.command) {
      try {
        execSync(g.command, { cwd: repoRoot, stdio: 'pipe' });
      } catch (e: any) {
        status = 'fail';
        findings = [{ message: String(e.stderr ?? e.stdout ?? e.message).trim().split('\n').slice(-3).join(' ') }];
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
          const key = tableKey(g.engine);
          let section = table[key] ?? table;
          // An array table holds one entry per gate; select by trailing id.
          if (Array.isArray(section) && section.some((s: any) => s?.id)) {
            const mine = section.filter((s: any) => !s.id || g.id.includes(s.id));
            if (mine.length) section = mine;
          }
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
function loadTable(ref: string | undefined, repoRoot: string): any | null {
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
function installedParams(repoRoot: string): Params {
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

const tableKey = (engine: string) =>
  ({
    'file-budget': 'file_budget',
    sections: 'sections',
    'frontmatter-schema': 'frontmatter_schema',
    'link-integrity': 'link_integrity',
    'file-population': 'file_population',
    'gate-meta': 'gate_meta',
    'id-integrity': '__whole__',
    'render-freshness': 'render_freshness',
    'register-schema': 'register_schema',
    'self-declared-closure': 'self_declared_closure',
    'filename-schema': 'filename_schema',
    'cross-reference': 'cross_reference',
    'git-status-reconcile': 'merged_status',
    'computed-claim': 'computed_claim',
    'term-ownership': 'term_ownership',
    'rule-propagation': 'rule_propagation',
    'git-state': 'git_state',
    'merge-driver-check': 'merge_driver_check',
  })[engine] ?? engine;

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
