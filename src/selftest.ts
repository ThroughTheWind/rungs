import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ENGINES, type Finding } from './engines.ts';
import { HOOK_EVALUATORS } from './hook-engine.ts';
import { setModulesRootOverride } from './ejected.ts';

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
 *
 * WI-087 gave every shipped shape a builder. The rule that survived: a builder
 * is keyed on what the fixture *declares* — files that exist, an item's status,
 * a branch state, a registry row — and never on the verdict it expects. Context
 * a fixture needs is written into the fixture, in the module's table, where the
 * next reader can see what the assertion assumes.
 */

export interface SelfTestResult {
  gate: string;
  expect: 'pass' | 'fail';
  /** `error` is an engine that threw on its own fixture — a defect, never a coverage gap. */
  outcome: 'ok' | 'mismatch' | 'unrun' | 'error';
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

/** The directory a glob such as `docs/backlog/items/**​/*.md` walks from. */
function globRoot(pattern: string | undefined, fallback: string): string {
  if (!pattern) return fallback;
  const star = pattern.indexOf('*');
  const head = star === -1 ? pattern : pattern.slice(0, star);
  // `docs/decisions/ADR-*.md` walks from `docs/decisions`, not from `docs/decisions/ADR-`.
  const dir = head.endsWith('/') ? head.slice(0, -1) : head.split('/').slice(0, -1).join('/');
  return dir || fallback;
}

const firstSpec = (table: any) => (Array.isArray(table) ? table[0] ?? {} : table ?? {});

interface Built {
  files: string[];
  /** Adjust the spec the engine sees, for context the fixture states and the table cannot. */
  spec?: (spec: any) => any;
  cleanup?: () => void;
}

/**
 * Shapes a table declares that no engine implements. Named so the runner's
 * output says *why* a fixture did not run, and so the producer-side inventory
 * can hold the list to an explicit allowlist rather than a shrinking count.
 */
export function unsupportedReason(engine: string, fx: any): string | null {
  if (engine === 'render-freshness' && fx && Array.isArray(fx.modified)) {
    return 'rule `detect = "local-modification"` is unimplemented, and the `rungs design pull` it presupposes does not exist';
  }
  return null;
}

function gitInit(root: string, branch: string) {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim();
  git('init', '-q', '-b', branch, '.');
  git('config', 'user.email', 'selftest@rungs.local');
  git('config', 'user.name', 'rungs-selftest');
  return git;
}

/**
 * Build the fixture's repo state, or return null when its shape has no builder.
 *
 * The declarative keys are deliberately handled generically — `frontmatter`,
 * `sections`, `opening` and `body` are all "a markdown file with this in it",
 * and writing one builder per key would be the same per-shape sprawl that left
 * 85 of 114 fixtures unrunnable in the first place.
 *
 * Paths are written with forward slashes and returned that way: the engines
 * match them against globs, and `join` on Windows yields backslashes that
 * `docs/**‍/*.md` never matches — which is how the audit population silently
 * examined nothing on this host (WI-087).
 */
function build(root: string, engine: string, table: any, fx: any, input?: string): Built | null {
  const write = (rel: string, body: string) => {
    const clean = rel.replace(/\\/g, '/').replace(/^\.\//, '');
    const full = join(root, ...clean.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
    return clean;
  };
  const spec = firstSpec(table);
  const written: string[] = [];
  const itemsDir = (kind: any, fallback: string) => globRoot(kind?.sources?.[0], fallback);

  // ── content fixtures: `input` is the document (or, for a filename schema, the path) ──
  if (typeof input === 'string') {
    if (engine === 'filename-schema') return { files: [write(input, '')] };
    if (engine === 'board-reconcile') return buildBoard(write, spec, input, fx?.item_status ?? 'proposed');
    if (engine === 'rule-propagation' && fx && typeof fx.retired === 'string') {
      const registry = String(spec.registry ?? 'docs/working-rules.md');
      const surface = String(fx.surface ?? 'docs/surface.md');
      written.push(write(registry, [
        '# Working rules',
        '',
        '| Rule | Authority | Surfaces that restate it | Retired wording |',
        '| --- | --- | --- | --- |',
        `| ${fx.rule ?? 'the rule'} | AGENTS.md | ${surface} | ${fx.retired} |`,
        '',
      ].join('\n')));
      written.push(write(surface, `${input}\n`));
      return { files: written };
    }
    // Explicit context a link or a stale-blocker needs: files that exist, items
    // that are done. Written the same way whatever the fixture expects.
    for (const rel of Array.isArray(fx?.exists) ? fx.exists : []) written.push(write(String(rel), 'exists\n'));
    for (const id of Array.isArray(fx?.done) ? fx.done : []) {
      written.push(write(`${itemsDir(table?.kinds?.item, 'docs/backlog/items')}/${id}-done.md`, `---\nid: ${id}\nstatus: done\n---\n\n# ${id}\n`));
    }
    written.push(write(fx?.file ?? targetPath(table), `${input}\n`));
    return { files: written };
  }
  if (!fx || typeof fx !== 'object') return null;

  // A branch delta plus the companion files it carries. Unlike content-only
  // fixtures this needs a real repository: the engine deliberately observes
  // committed, staged, unstaged and untracked Git state rather than trusting a
  // fixture's list as the answer.
  if (Array.isArray(fx.changed) && Array.isArray(fx.fragments)) {
    const changed = fx.changed.map(String);
    const git = gitInit(root, 'main');
    written.push(write('.fixture-base', 'base\n'));
    if (changed.length && typeof fx.inherited_exempt === 'string') {
      written.push(write(changed[0], `// ${fx.inherited_exempt}\nexport const fixtureState = 'base';\n`));
    }
    git('add', '--all');
    git('commit', '-q', '-m', 'base');
    git('switch', '-q', '-c', 'fixture/change');
    for (const [index, rel] of changed.entries()) {
      const evidence = index === 0 && typeof fx.exempt === 'string'
        ? fx.exempt
        : index === 0 && typeof fx.inherited_exempt === 'string'
          ? fx.inherited_exempt
          : undefined;
      written.push(write(rel, evidence ? `// ${evidence}\nexport const fixtureState = 'branch';\n` : 'fixture change\n'));
    }
    const changelogDir = fx.dir ?? 'changelog.d';
    for (const rel of fx.fragments) written.push(write(String(rel).replace(/\{\{changelog_dir\}\}/g, changelogDir), '# fixture fragment\n'));
    git('add', '--all');
    git('commit', '-q', '-m', 'fixture change');
    const base = fx.base_branch ?? 'main';
    return {
      files: [...new Set(written)],
      spec: (s) => (Array.isArray(s) ? s.map((x: any) => ({ ...x, base_branch: base })) : { ...s, base_branch: base }),
    };
  }

  // A merged or unmerged item branch, observed from Git rather than declared.
  if (typeof fx.item_status === 'string' && typeof fx.branch_state === 'string') {
    const integration = String(spec.integration_branch ?? 'main');
    const git = gitInit(root, integration);
    const branch = 'feature/fixture-item';
    written.push(write('docs/backlog/items/WI-001-fixture.md', `---\nid: WI-001\nstatus: ${fx.item_status}\nbranch: ${branch}\n---\n\n# WI-001\n`));
    git('add', '--all');
    git('commit', '-q', '-m', 'base');
    git('switch', '-q', '-c', branch);
    write('work.txt', 'landed work\n');
    git('add', '--all');
    git('commit', '-q', '-m', 'work');
    git('switch', '-q', integration);
    if (fx.branch_state === 'merged') git('merge', '--no-ff', '-q', '-m', `merge ${branch}`, branch);
    return { files: written };
  }

  // A board row and the item it names.
  if (typeof fx.board === 'string') return buildBoard(write, spec, fx.board, fx.item_status ?? 'proposed');

  // Linked worktrees holding named branches; the root repo holds none of them.
  if (Array.isArray(fx.worktrees)) {
    const git = gitInit(root, 'fixture-root');
    written.push(write('README.md', '# fixture\n'));
    git('add', '--all');
    git('commit', '-q', '-m', 'base');
    fx.worktrees.forEach((wt: any, i: number) => {
      if (wt?.branch) git('worktree', 'add', '-q', join(root, `wt${i}`), '-b', String(wt.branch));
    });
    return { files: written };
  }

  // Merge drivers declared in .gitattributes, and which of them git has configured.
  if (Array.isArray(fx.declared) && Array.isArray(fx.installed)) {
    const git = gitInit(root, 'main');
    written.push(write(String(spec.attributes_file ?? '.gitattributes'), fx.declared.map((d: string) => `*.${d}.jsonl merge=${d}\n`).join('')));
    for (const d of fx.installed) git('config', `merge.${d}.driver`, 'true');
    return { files: written };
  }

  // A set of manifests and the version each states — the computed-claim shapes.
  if (fx.packages && typeof fx.packages === 'object') {
    return { files: Object.entries(fx.packages).map(([rel, version]) => write(rel, JSON.stringify({ name: rel.replace(/\W/g, '-'), version }))) };
  }

  // Format-aware release-version sources.
  if (fx.versions && typeof fx.versions === 'object') {
    return {
      files: Object.entries(fx.versions).map(([rel, version]) => {
        const value = String(version).replace(/"/g, '\\"');
        if (rel.endsWith('.toml')) return write(rel, `[project]\nversion = "${value}"\n`);
        if (rel.endsWith('.props')) return write(rel, `<Project><PropertyGroup><Version>${String(version)}</Version></PropertyGroup></Project>\n`);
        return write(rel, JSON.stringify({ name: rel.replace(/\W/g, '-'), version }));
      }),
    };
  }

  // Raw version-source fixtures preserve malformed documents exactly.
  if (fx.version_files && typeof fx.version_files === 'object') {
    return { files: Object.entries(fx.version_files).map(([rel, content]) => write(rel, String(content))) };
  }

  // Named fragments in a parameterised directory, plus the version they are judged against.
  if (Array.isArray(fx.fragments) && typeof fx.version === 'string') {
    const dir = fx.dir ?? 'changelog.d';
    for (const n of fx.fragments) written.push(write(`${dir}/${n}`, `# ${n}\n`));
    if (fx.version_file === 'Directory.Build.props') {
      written.push(write('Directory.Build.props', `<Project><PropertyGroup><Version>${fx.version}</Version></PropertyGroup></Project>\n`));
    } else if (fx.version_file === 'pyproject.toml') {
      written.push(write('pyproject.toml', `[project]\nversion = "${fx.version}"\n`));
    } else {
      written.push(write('package.json', JSON.stringify({ version: fx.version })));
    }
    if ('consumed_through' in fx) written.push(write(`${dir}/CONSUMED_THROUGH`, `${fx.consumed_through}\n`));
    return { files: written, spec: (s) => deparam(s, dir) };
  }

  // N workflow files sharing a fraction of their structure — the ci shape.
  if (typeof fx.workflows === 'number' && typeof fx.similarity === 'number') {
    const dir = globRoot([spec.scan ?? []].flat()[0], '.github/workflows');
    const total = 20;
    const common = Math.round(fx.similarity * total);
    for (let i = 0; i < fx.workflows; i++) {
      // Job ids only, so the pairwise Jaccard index is common/(2·total − common) and
      // tracks the fixture's stated similarity: 0.97 → 0.90, 0.30 → 0.18 against 0.85.
      const jobs = [
        ...Array.from({ length: common }, (_, j) => `  shared-job-${j}:\n    runs-on: ubuntu-latest\n`),
        ...Array.from({ length: total - common }, (_, j) => `  only-${i}-job-${j}:\n    runs-on: ubuntu-latest\n`),
      ].join('');
      const marker = fx.exempt ? `# ${fx.exempt}\n` : '';
      written.push(write(`${dir}/workflow-${i}.yml`, `${marker}name: w${i}\non: push\njobs:\n${jobs}`));
    }
    return { files: written };
  }

  // N files matching the table's scan — the population shapes.
  if (typeof fx.matching_files === 'number') {
    const base = String(fx.location ?? dirname(targetPath(table))).replace(/\/+$/, '');
    const marker = fx.exempt ? `<!-- ${fx.exempt} -->\n` : '';
    return { files: Array.from({ length: fx.matching_files }, (_, i) => write(base === '.' ? `probe-${i}.md` : `${base}/probe-${i}.md`, `${marker}# probe ${i}\n`)) };
  }

  // A document that is only a pointer, or is not — the redirect-stub shape.
  if (typeof fx.body_words === 'number' && typeof fx.links === 'number') {
    const links = Array.from({ length: fx.links }, (_, i) => `[see ${i}](other-${i}.md)`);
    const plain = Array.from({ length: Math.max(0, fx.body_words - fx.links) }, (_, i) => `word${i}`);
    return { files: [write(targetPath(table), `# Pointer\n\n${[...links, ...plain].join(' ')}\n`)] };
  }

  // A file of N lines — the budget shapes.
  if (typeof fx.file === 'string' && typeof fx.lines === 'number') {
    return { files: [write(fx.file, Array.from({ length: fx.lines }, (_, i) => `line ${i + 1}`).join('\n') + '\n')] };
  }

  // A file carrying named managed blocks.
  if (typeof fx.file === 'string' && Array.isArray(fx.blocks)) {
    const blocks = fx.blocks.map((b: string) => `<!-- rungs:begin ${b} -->\n<!-- rungs:end ${b} -->\n`).join('\n');
    return { files: [write(fx.file, `# ${fx.file}\n\n${blocks}`)] };
  }

  // Rule sources and the renderings that exist for them.
  if (Array.isArray(fx.sources) && Array.isArray(fx.targets)) {
    for (const rel of fx.sources) written.push(write(String(rel), '---\ndescription: fixture rule\nenforcement: review-only\n---\n\nbody\n'));
    for (const rel of fx.targets) written.push(write(String(rel), '<!-- Generated by `rungs render` -->\n\nbody\n'));
    return { files: written };
  }

  // A derived index block with N rows beside M source files.
  if (typeof fx.block_rows === 'number' && typeof fx.source_files === 'number' && spec.block?.file) {
    const pattern = String([spec.sources ?? []].flat()[0] ?? 'docs/decisions/ADR-*.md');
    const dir = globRoot(pattern, 'docs/decisions');
    const stem = pattern.slice(dir.length + 1).split('*')[0] || 'ADR-';
    for (let i = 0; i < fx.source_files; i++) {
      written.push(write(`${dir}/${stem}000${i + 1}-fixture.md`, `---\nid: ${stem}000${i + 1}\ntitle: fixture ${i + 1}\nstatus: accepted\ndate: 2026-01-0${i + 1}\n---\n\n# fixture\n`));
    }
    const columns: string[] = Array.isArray(spec.columns) ? spec.columns : ['id', 'title', 'status', 'date'];
    const rows = fx.block_rows
      ? [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...Array.from({ length: fx.block_rows }, (_, i) => `| ${columns.map(() => `row ${i + 1}`).join(' | ')} |`)]
      : [];
    written.push(write(spec.block.file, `# Index\n\n<!-- rungs:begin ${spec.block.marker} -->\n${rows.join('\n')}${rows.length ? '\n' : ''}<!-- rungs:end ${spec.block.marker} -->\n`));
    return { files: written };
  }

  // Work items by filename, and optionally the board's next-id marker.
  if (Array.isArray(fx.items)) {
    const kind = table?.kinds?.item;
    const dir = itemsDir(kind, 'docs/backlog/items');
    for (const name of fx.items) {
      const id = String(name).match(new RegExp(kind?.format ?? '[A-Z]+-\\d+'))?.[0] ?? String(name);
      written.push(write(`${dir}/${name}`, `---\nid: ${id}\nstatus: proposed\n---\n\n# ${id}\n`));
    }
    if (typeof fx.marker === 'string' && kind?.marker?.file) written.push(write(kind.marker.file, `# Backlog\n\n<!-- NEXT-ID: ${fx.marker} -->\n`));
    return { files: written };
  }

  // Register rows by id — the findings shape.
  if (Array.isArray(fx.register_rows)) {
    const kind = table?.kinds?.finding ?? Object.values(table?.kinds ?? {})[0];
    const rel = String(kind?.sources?.[0] ?? 'docs/backlog/FINDINGS.md');
    const rows = fx.register_rows.map((id: string) => `| ${id} | high | now | what | evidence | when | how |`);
    return { files: [write(rel, `# Findings\n\n## Open\n\n| Id | Sev | Pri | What | Evidence | When to act | How to fix |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`)] };
  }

  // Story files by id — the specs shape.
  if (Array.isArray(fx.stories)) {
    const kind = table?.kinds?.story;
    const dir = itemsDir(kind, 'docs/specs');
    fx.stories.forEach((id: string, i: number) => written.push(write(`${dir}/story-${i}.md`, `---\nid: ${id}\n---\n\n# ${id}\n`)));
    return { files: written };
  }

  // An open finding and its detail section.
  if (Array.isArray(fx.open) && typeof fx.detail === 'string') {
    const rel = String(spec.file ?? 'docs/backlog/FINDINGS.md');
    const rows = fx.open.map((id: string) => `| ${id} | high | now | what | evidence | when | how |`);
    const detail = fx.detail.replace(/\\n/g, '\n');
    return {
      files: [write(rel, [
        '# Findings', '', `## ${spec.open_heading ?? 'Open'}`, '',
        '| Id | Sev | Pri | What | Evidence | When to act | How to fix |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows, '',
        `## ${spec.closed_heading ?? 'Closed'}`, '', '| Id | What | Disposition | Reason |', '| --- | --- | --- | --- |', '',
        `## ${spec.detail_heading ?? 'Detail'}`, '', detail, '',
      ].join('\n'))],
    };
  }

  // Skills naming (or not naming) their neighbours.
  if (typeof fx.skill_count === 'number' && typeof fx.mentions_peer === 'boolean') {
    const dir = globRoot([spec.scan ?? []].flat()[0], '.claude/skills');
    for (let i = 0; i < fx.skill_count; i++) {
      const peer = `skill-${(i + 1) % fx.skill_count}`;
      const description = fx.mentions_peer ? `Use when doing thing ${i}; for the neighbouring case use ${peer} instead.` : `Use when doing thing ${i} and nothing else.`;
      const body = fx.exempt ? `\n<!-- ${fx.exempt} -->\n` : '';
      written.push(write(`${dir}/skill-${i}/SKILL.md`, `---\nname: skill-${i}\ndescription: ${description}\n---\n\n# skill-${i}\n${body}`));
    }
    return { files: written };
  }

  // One skill with the given description — the routing shape.
  if (typeof fx.description === 'string' && Object.keys(fx).length === 1) {
    return { files: [write(targetPath(table), `---\nname: probe\ndescription: ${fx.description}\n---\n\n# probe\n`)] };
  }

  // A document restating (or merely mentioning) a topic another document owns.
  if (typeof fx.terms_matched === 'number') {
    const registry = String(spec.registry ?? 'docs/doc-ownership.md');
    const owner = String(fx.owner ?? 'AGENTS.md');
    const file = String(fx.file ?? 'docs/other.md');
    const topicTerms = ['release', 'candidate', 'branch', 'naming', 'policy', 'rules', 'cadence'];
    written.push(write(registry, [
      '# Ownership', '',
      '| Topic | Owner | Must NOT appear in |', '| --- | --- | --- |',
      `| ${topicTerms.join(' ')} | ${owner} | ${file} |`, '',
    ].join('\n')));
    written.push(write(owner, `# Owner\n\n${topicTerms.join(' ')}\n`));
    written.push(write(file, `# Other\n\n## Section\n\n${topicTerms.slice(0, fx.terms_matched).join(' ')} and unrelated prose.\n`));
    return { files: written };
  }

  // The meta-gate examining a registry whose gate declares the given directions.
  if (typeof fx.gate === 'string' && Array.isArray(fx.self_tests)) {
    const modules = join(root, 'modules');
    written.push(write('modules/example/module.toml', '[module]\nname    = "example"\nversion = "1.0.0"\nrung    = 1\nsummary = "fixture module"\n\n[provenance]\nkind      = "designed"\nrationale = "a fixture the meta-gate examines"\n'));
    const inner = fx.self_tests.map((d: string) => `\n[[self_test]]\ngate    = "${fx.gate}"\nexpect  = "${d}"\nfixture = { file = "a.md", sections = ["${d === 'pass' ? 'Purpose' : 'Other'}"] }\n`).join('');
    written.push(write('modules/example/gates/x.toml', `[sections]\nfile     = "a.md"\nrequired = ["Purpose"]\n${inner}`));
    written.push(write('.ai/gates.toml', `[[gates]]\nid      = "${fx.gate}"\nkind    = "declared"\nengine  = "sections"\ntable   = "example/x.toml"\n`));
    setModulesRootOverride(modules);
    return { files: written, cleanup: () => setModulesRootOverride(null) };
  }

  // A single markdown file described declaratively.
  const contentKeys = ['frontmatter', 'sections', 'opening', 'body', 'row', 'table', 'tier', 'subsections'];
  if (contentKeys.some((k) => k in fx)) {
    const parts: string[] = [];
    // A register spec names the table its rows belong under; a fixture may say
    // so too. Without the heading the row is in no table at all, which read as
    // "the gate did not fire" (F-018, and again for design-sync in WI-087).
    const heading = fx.table ?? spec.table;
    if (heading) parts.push(`## ${heading}`, '');
    const frontmatter: Record<string, unknown> = { ...(fx.frontmatter && typeof fx.frontmatter === 'object' ? fx.frontmatter : {}) };
    if (fx.tier !== undefined) frontmatter.tier = fx.tier;
    if (Object.keys(frontmatter).length) {
      parts.unshift('---', ...Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`), '---', '');
    }
    if (fx.opening) parts.push(String(fx.opening), '');
    for (const s of fx.sections ?? []) {
      parts.push(`## ${s}`, '', 'text', '');
      for (const sub of fx.subsections?.[s] ?? []) parts.push(`### ${sub}`, '', 'text', '');
    }
    if (fx.row && typeof fx.row === 'object') {
      const cols = Object.keys(fx.row);
      const values = cols.map((c) => (fx.row as any)[c]);
      if (typeof fx.note === 'string') {
        cols.push('Note');
        values.push(fx.note);
      }
      parts.push(`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, `| ${values.join(' | ')} |`, '');
    }
    if (fx.body) parts.push(String(fx.body), '');
    return { files: [write(fx.file ?? targetPath(table), `${parts.join('\n')}\n`)] };
  }

  return null;
}

/** A board with the given text, plus every item file its rows link to, at one status. */
function buildBoard(write: (rel: string, body: string) => string, spec: any, board: string, status: string): Built {
  const rel = String(spec.file ?? 'docs/backlog/BACKLOG.md');
  const dir = rel.split('/').slice(0, -1).join('/');
  // The engine requires every declared group heading to appear (its typo check),
  // so the board carries all of them; the fixture's text supplies the row under test.
  const headings = Object.keys(spec.groups ?? {}).filter((g) => !new RegExp(`^##\\s+${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(board));
  const scaffold = headings.map((g) => `## ${g}\n\n| Id | Title | Type |\n| --- | --- | --- |\n`).join('\n');
  const files = [write(rel, `# Backlog\n\n${scaffold}\n${board}\n`)];
  for (const m of board.matchAll(/\]\(([^)]+\.md)\)/g)) {
    const id = m[1].match(/[A-Z]{1,6}-\d{1,4}/)?.[0] ?? 'WI-000';
    files.push(write(`${dir}/${m[1]}`, `---\nid: ${id}\nstatus: ${status}\n---\n\n# ${id}\n`));
  }
  return { files };
}

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
    // A hook engine evaluates one command, so its fixture is the command text
    // itself and needs no repository (WI-086).
    const hook = HOOK_EVALUATORS[engine];
    if (hook) {
      if (typeof b.input !== 'string') {
        out.push({ gate: gateId, expect, outcome: 'unrun', detail: `${engine} fixtures need an input command` });
        continue;
      }
      const fired = hook(table, b.input).length > 0;
      out.push(
        fired === (expect === 'fail')
          ? { gate: gateId, expect, outcome: 'ok' }
          : { gate: gateId, expect, outcome: 'mismatch', detail: `expected ${expect}, ${fired ? 'fired' : 'did not fire'} on ${JSON.stringify(b.input).slice(0, 60)}` },
      );
      continue;
    }
    if (!(engine in ENGINES)) {
      out.push({ gate: gateId, expect, outcome: 'unrun', detail: `engine '${engine}' not implemented` });
      continue;
    }
    const unsupported = unsupportedReason(engine, b.fixture);
    if (unsupported) {
      out.push({ gate: gateId, expect, outcome: 'unrun', detail: unsupported });
      continue;
    }
    const root = mkdtempSync(join(tmpdir(), 'rungs-selftest-'));
    let built: Built | null = null;
    try {
      built = build(root, engine, table, b.fixture, b.input);
      if (!built) {
        out.push({ gate: gateId, expect, outcome: 'unrun', detail: `no builder for fixture ${JSON.stringify(b.fixture).slice(0, 60)}` });
        continue;
      }
      // A fixture states an opt-in with `opted_in`; the engine reads it from the
      // spec as `extensions_opted_in`. Without the bridge, the `pass` fixture for
      // an opted-in extension fired `non-spec key` — the harness asserting the
      // opposite of what the fixture said (F-018).
      let spec = b.fixture?.opted_in
        ? (Array.isArray(table) ? table.map((s: any) => ({ ...s, extensions_opted_in: b.fixture.opted_in })) : { ...table, extensions_opted_in: b.fixture.opted_in })
        : table;
      if (built.spec) spec = built.spec(spec);
      let findings: Finding[];
      try {
        findings = ENGINES[engine](spec, root, built.files).findings;
      } catch (e: any) {
        // A defect in the engine, surfaced as one. Folding it into `unrun` hid
        // exceptions inside a count nobody reads.
        out.push({ gate: gateId, expect, outcome: 'error', detail: `engine threw: ${e.message}`.slice(0, 120) });
        continue;
      }
      const fired = findings.length > 0;
      out.push(
        fired === (expect === 'fail')
          ? { gate: gateId, expect, outcome: 'ok' }
          : { gate: gateId, expect, outcome: 'mismatch', detail: `expected ${expect}, ${fired ? `fired: ${findings[0].message}`.slice(0, 80) : 'did not fire'}` },
      );
    } finally {
      built?.cleanup?.();
      rmSync(root, { recursive: true, force: true });
    }
  }
  return out;
}
