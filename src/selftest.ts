import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ENGINES, type Finding } from './engines.ts';

/**
 * Execute a gate's `[[self_test]]` fixtures instead of only checking they exist.
 *
 * F-006 / WI-045. `gateMeta` confirmed that a `pass` block and a `fail` block
 * were declared and never ran either, so every fixture in the repo was
 * documentation shaped like a test. `gates-links-resolve`'s
 * `See [the plan](./does-not-exist.md).` had never been executed — and had it
 * been, it would have caught F-005 months before a person found it by hand.
 *
 * That is `gate-self-test`'s own argument turned on itself: *a gate whose rules
 * are all currently satisfied is indistinguishable from a gate that matches
 * nothing*, and a self-test that never runs is indistinguishable from one that
 * would fail.
 *
 * **What this does not do is as important as what it does.** A fixture whose
 * shape has no builder is reported **unrun, by name**. It is never counted as a
 * pass, because a suite that reports green while three quarters of it never
 * executed is this finding again, one level up.
 */

export interface SelfTestResult {
  gate: string;
  expect: 'pass' | 'fail';
  outcome: 'ok' | 'mismatch' | 'unrun';
  detail?: string;
}

/**
 * A concrete path the table's `scan` would match, for writing a fixture into.
 *
 * The table may be an **array** — `[[frontmatter_schema]]` declares several — in
 * which case `t.file`/`t.scan` are undefined and the first "scan pattern" was
 * an entire schema object. That silently produced a nonsense path, the engine
 * saw no file, and the fixture was reported as a gate failure (F-018).
 */
function targetPath(table: any): string {
  const t = Array.isArray(table) ? table[0] ?? {} : table ?? {};
  const pattern: string = t.file ?? [t.scan ?? []].flat()[0] ?? '**/*.md';
  if (!pattern.includes('*')) return pattern;
  return pattern
    .replace(/\*\*\//g, 'probe/')
    .replace(/\/\*\*/g, '/probe')
    .replace(/\*/g, 'probe')
    .replace(/probe\.probe$/, 'probe.md');
}

/**
 * Build the fixture's repo state, or return null when its shape has no builder.
 *
 * The declarative keys are deliberately handled generically — `frontmatter`,
 * `sections`, `opening` and `body` are all "a markdown file with this in it",
 * and writing one builder per key would be the same per-shape sprawl that left
 * 85 of 114 fixtures unrunnable in the first place.
 */
function build(root: string, table: any, fx: any, input?: string): string[] | null {
  const write = (rel: string, body: string) => {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
    return rel;
  };

  if (typeof input === 'string') return [write(targetPath(table), `${input}\n`)];
  if (!fx || typeof fx !== 'object') return null;

  // N files matching the table's scan — the population shapes.
  if (typeof fx.matching_files === 'number') {
    const base = fx.location ?? dirname(targetPath(table));
    const marker = fx.exempt ? `<!-- ${fx.exempt} -->\n` : '';
    return Array.from({ length: fx.matching_files }, (_, i) =>
      write(join(base === '.' ? '' : base, `probe-${i}.md`), `${marker}# probe ${i}\n`),
    );
  }

  // A single markdown file described declaratively.
  const contentKeys = ['frontmatter', 'sections', 'opening', 'body', 'row', 'table'];
  if (contentKeys.some((k) => k in fx)) {
    const parts: string[] = [];
    // `table = "Closed"` names the heading the row belongs under. A register
    // engine finds rows by section, so a row written without its heading is in
    // no table at all — which read as "the gate did not fire" (F-018).
    if (fx.table) parts.push(`## ${fx.table}`, '');
    if (fx.frontmatter && typeof fx.frontmatter === 'object') {
      parts.push('---');
      for (const [k, v] of Object.entries(fx.frontmatter)) parts.push(`${k}: ${v}`);
      parts.push('---', '');
    }
    if (fx.opening) parts.push(String(fx.opening), '');
    for (const s of fx.sections ?? []) parts.push(`## ${s}`, '', 'text', '');
    if (fx.row && typeof fx.row === 'object') {
      const cols = Object.keys(fx.row);
      parts.push(`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`,
        `| ${cols.map((c) => (fx.row as any)[c]).join(' | ')} |`, '');
    }
    if (fx.body) parts.push(String(fx.body), '');
    return [write(fx.file ?? targetPath(table), `${parts.join('\n')}\n`)];
  }

  return null;
}

/**
 * Engines whose verdict depends **only on the content of the file the fixture
 * describes**, so a fixture can be executed faithfully in an empty directory.
 *
 * The rest need context the fixture does not carry, and running them anyway
 * produces confident nonsense. `gates-links-resolve`'s `pass` fixture is
 * `See [this table](./structural.toml).` — it asserts that a link *which
 * resolves* passes, and in a temp directory it does not resolve, so the runner
 * would report the gate broken. Creating the target to make it pass would be
 * assuming the answer, and only for `expect = "pass"` blocks, which is worse.
 *
 * Measured 2026-08-16: without this restriction the runner reported 17
 * "failures", and the ones inspected were all its own artifacts. A test harness
 * that cries wolf gets deleted faster than the gate it was checking.
 *
 * This is the same shape as `applicability` in ADR-0007, one level down: ask
 * whether the check can legitimately run before running it.
 */
const CONTEXT_FREE: ReadonlySet<string> = new Set([
  'frontmatter-schema',
  'sections',
  'file-budget',
  'register-schema',
  'file-population',
]);

export function runSelfTests(
  gateId: string,
  engine: string,
  table: any,
  blocks: { expect: string; input?: string; fixture?: any }[],
): SelfTestResult[] {
  const out: SelfTestResult[] = [];
  for (const b of blocks) {
    const expect = b.expect === 'fail' ? 'fail' : 'pass';
    if (!CONTEXT_FREE.has(engine)) {
      out.push({ gate: gateId, expect, outcome: 'unrun', detail: `${engine} fixtures need context the fixture does not carry` });
      continue;
    }
    if (!(engine in ENGINES)) {
      out.push({ gate: gateId, expect, outcome: 'unrun', detail: `engine '${engine}' not implemented` });
      continue;
    }
    const root = mkdtempSync(join(tmpdir(), 'rungs-selftest-'));
    try {
      const files = build(root, table, b.fixture, b.input);
      if (!files) {
        out.push({ gate: gateId, expect, outcome: 'unrun', detail: `no builder for fixture ${JSON.stringify(b.fixture).slice(0, 60)}` });
        continue;
      }
      let findings: Finding[];
      try {
        findings = ENGINES[engine](table, root, files).findings;
      } catch (e: any) {
        out.push({ gate: gateId, expect, outcome: 'unrun', detail: `engine threw: ${e.message}`.slice(0, 90) });
        continue;
      }
      const fired = findings.length > 0;
      out.push(
        fired === (expect === 'fail')
          ? { gate: gateId, expect, outcome: 'ok' }
          : { gate: gateId, expect, outcome: 'mismatch', detail: `expected ${expect}, ${fired ? `fired: ${findings[0].message}`.slice(0, 80) : 'did not fire'}` },
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  return out;
}
