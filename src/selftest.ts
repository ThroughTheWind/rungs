import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

  // A branch delta plus the companion files it carries. Unlike content-only
  // fixtures this needs a real repository: the engine deliberately observes
  // committed, staged, unstaged and untracked Git state rather than trusting a
  // fixture's list as the answer.
  if (Array.isArray(fx.changed) && Array.isArray(fx.fragments)) {
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim();
    git('init', '-q', '-b', 'main', '.');
    git('config', 'user.email', 'selftest@rungs.local');
    git('config', 'user.name', 'rungs-selftest');
    const written = [write('.fixture-base', 'base\n')];
    git('add', '--all');
    git('commit', '-q', '-m', 'base');
    git('switch', '-q', '-c', 'fixture/change');

    for (const [index, rel] of fx.changed.entries()) {
      const body = index === 0 && typeof fx.exempt === 'string'
        ? `// ${fx.exempt}\n`
        : 'fixture change\n';
      written.push(write(String(rel), body));
    }
    const changelogDir = fx.dir ?? 'changelog.d';
    for (const rel of fx.fragments) {
      const concrete = String(rel).replace(/\{\{changelog_dir\}\}/g, changelogDir);
      written.push(write(concrete, '# fixture fragment\n'));
    }
    git('add', '--all');
    git('commit', '-q', '-m', 'fixture change');
    return [...new Set(written)];
  }

  // A set of manifests and the version each states — the computed-claim shapes.
  // `{ "package.json": "1.2.0", "site/package.json": "1.1.0" }`.
  if (fx.packages && typeof fx.packages === 'object') {
    return Object.entries(fx.packages).map(([rel, version]) =>
      write(rel, JSON.stringify({ name: rel.replace(/\W/g, '-'), version })),
    );
  }

  // Format-aware release-version sources. Values are rendered into the real
  // source shape so one fixture can prove JSON, TOML and Directory.Build.props
  // all participate in the same comparison.
  if (fx.versions && typeof fx.versions === 'object') {
    return Object.entries(fx.versions).map(([rel, version]) => {
      const value = String(version).replace(/"/g, '\\"');
      if (rel.endsWith('.toml')) return write(rel, `[project]\nversion = "${value}"\n`);
      if (rel.endsWith('.props')) {
        return write(rel, `<Project><PropertyGroup><Version>${String(version)}</Version></PropertyGroup></Project>\n`);
      }
      return write(rel, JSON.stringify({ name: rel.replace(/\W/g, '-'), version }));
    });
  }

  // Raw version-source fixtures preserve malformed documents and missing or
  // non-scalar values exactly; normalising them would erase the failure under test.
  if (fx.version_files && typeof fx.version_files === 'object') {
    return Object.entries(fx.version_files).map(([rel, content]) => write(rel, String(content)));
  }

  // Named files in a parameterised directory, plus the version they are judged
  // against — the changelog shapes. `dir` is stated by the fixture rather than
  // assumed here, because the self-test sees the module's *raw* table and a
  // `{{changelog_dir}}` glob cannot match anything on disk; see `deparam`.
  if (Array.isArray(fx.fragments) && typeof fx.version === 'string') {
    const dir = fx.dir ?? 'changelog.d';
    // Forward slashes, not `join`: the returned paths are matched against the
    // spec's globs, and on Windows `join` yields `changelog.d\0.1.1.md`, which
    // `changelog.d/*.md` does not match. The gate then reports "did not fire"
    // about the harness rather than the fixture.
    const written = fx.fragments.map((n: string) => write(`${dir}/${n}`, `# ${n}\n`));
    written.push(write('package.json', JSON.stringify({ version: fx.version })));
    return written;
  }

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
 * Engines whose verdict can be reproduced completely by a fixture builder.
 * Most depend only on content in an empty directory; `change-requires-file`
 * gets the explicit Git repository built above.
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
  'changelog-freshness',
  'change-requires-file',
  'computed-claim',
]);

/**
 * Replace `{{param}}` segments in a spec's globs with the literal the fixture
 * stands in for.
 *
 * The runner reads the **module's** gate table, where paths are still written as
 * parameters — `{{changelog_dir}}/*.md`. Nothing substitutes them here, because
 * there is no installed repo to take values from. So a fixture that exercises a
 * parameterised path has to say what it is standing in for, and the spec has to
 * be told the same thing, or the glob matches a file the builder just wrote and
 * the gate reports "did not fire" about its own harness.
 */
function deparam<T>(spec: T, dir: string): T {
  const walk = (v: any): any =>
    typeof v === 'string' ? v.replace(/\{\{changelog_dir\}\}/g, dir)
      : Array.isArray(v) ? v.map(walk)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
      : v;
  return walk(spec);
}

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
      // A fixture states an opt-in with `opted_in`; the engine reads it from the
      // spec as `extensions_opted_in`. Without the bridge, the `pass` fixture for
      // an opted-in extension fired `non-spec key` — the harness asserting the
      // opposite of what the fixture said (F-018).
      let spec = b.fixture?.opted_in
        ? (Array.isArray(table) ? table.map((s: any) => ({ ...s, extensions_opted_in: b.fixture.opted_in })) : { ...table, extensions_opted_in: b.fixture.opted_in })
        : table;
      // Same bridge, for paths: a fixture that names a parameterised directory
      // has to hand the spec the same literal it wrote the files into.
      if (Array.isArray(b.fixture?.fragments)) spec = deparam(spec, b.fixture.dir ?? 'changelog.d');
      if (Array.isArray(b.fixture?.changed)) {
        const base = b.fixture.base_branch ?? 'main';
        spec = Array.isArray(spec)
          ? spec.map((s: any) => ({ ...s, base_branch: base }))
          : { ...spec, base_branch: base };
      }
      if (!files) {
        out.push({ gate: gateId, expect, outcome: 'unrun', detail: `no builder for fixture ${JSON.stringify(b.fixture).slice(0, 60)}` });
        continue;
      }
      let findings: Finding[];
      try {
        findings = ENGINES[engine](spec, root, files).findings;
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
