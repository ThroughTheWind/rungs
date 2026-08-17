import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { hostname, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { land, sessionStart, worktrees } from '../src/concurrency.ts';

import { loadAllModules, auditModules } from '../src/manifest.ts';
import { blockedByParadigm, emittedFiles } from '../src/add.ts';
import { applyArchive, planArchive } from '../src/backlog.ts';
import { gitStatusReconcile, selfDeclaredClosure } from '../src/engines2.ts';
import { boardReconcile } from '../src/engines3.ts';
import { applyUpgrade, updateRecordAfterUpgrade } from '../src/lifecycle.ts';
import { frontmatterSchema, linkIntegrity } from '../src/engines.ts';
import { markers, mergeBlock, resolveParams, substitute } from '../src/substitute.ts';
import { collapseDuplicates, explainWith } from '../src/explain.ts';
import { runSelfTests } from '../src/selftest.ts';

test('substitute resolves local and cross-module values without touching passthrough expressions', () => {
  const params = {
    workflows: { path: 'docs/workflows' },
    repo: { dirname: 'demo' },
  };

  assert.equal(
    substitute('See {{path}} and {{repo.dirname}}; keep ${{github.sha}}.', 'workflows', params),
    'See docs/workflows and demo; keep ${{github.sha}}.',
  );
});

test('resolveParams applies overrides before cross-module defaults', () => {
  const modules = [
    {
      name: 'backlog',
      params: { root: { default: 'backlog' } },
    },
    {
      name: 'findings',
      params: { path: { default: 'docs/{{backlog.root}}/FINDINGS.md' } },
    },
  ];

  const resolved = resolveParams(modules, { backlog: { root: '.ai/backlog' } });
  assert.equal(resolved.findings.path, 'docs/.ai/backlog/FINDINGS.md');
});

test('mergeBlock replaces only the managed block and preserves surrounding text', () => {
  const existing = ['before', '<!-- rungs:begin demo@1.0.0 -->', 'old', '<!-- rungs:end demo -->', 'after', ''].join('\n');
  const updated = mergeBlock(existing, '<!-- rungs:begin demo@1.1.0 -->\nnew\n<!-- rungs:end demo -->', 'demo');

  assert.match(updated, /^before\n<!-- rungs:begin demo@1\.1\.0 -->\nnew/m);
  assert.match(updated, /<!-- rungs:end demo -->\nafter\n$/);
  assert.equal(updated.includes('old'), false);
});

test('module manifests are complete and parameter-auditable', () => {
  const modules = loadAllModules(resolve('modules'));
  assert.equal(modules.length, 15);
  assert.deepEqual(auditModules(modules), []);
});

test('managed marker syntax matches markdown and TOML files', () => {
  assert.deepEqual(markers('AGENTS.md', 'session', '1.1.0'), {
    begin: '<!-- rungs:begin session@1.1.0 -->',
    end: '<!-- rungs:end session -->',
  });
  assert.deepEqual(markers('.ai/gates.toml', 'gates', '1.0.0'), {
    begin: '# rungs:begin gates@1.0.0',
    end: '# rungs:end gates',
  });
});

test('self-declared closure catches an open finding declaring itself fixed, but honours a reasoned exception', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-closure-'));
  const table = {
    file: 'FINDINGS.md',
    open_heading: 'Open findings',
    closed_heading: 'Closed findings',
    detail_heading: 'Detail',
    id_pattern: 'F-\\d{1,4}',
    open_row_pattern: '^\\|\\s*\\[?(F-\\d{1,4})\\]',
    detail_heading_pattern: '^###\\s+(F-\\d{1,4})\\s+—\\s+',
    declares_fixed: ['\\*\\*Fixed[.,)*]'],
    exempt_marker: 'closure-ok:',
  };
  const header = ['## Open findings', '', '| [F-001] |', '', '## Closed findings', '', '## Detail', ''].join('\n');

  writeFileSync(join(root, 'FINDINGS.md'), `${header}### F-001 — stale observation\n\n**Fixed.**\n`);
  assert.equal(selfDeclaredClosure(table, root, ['FINDINGS.md']).findings.length, 1);

  writeFileSync(join(root, 'FINDINGS.md'), `${header}### F-001 — stale observation\n\n<!-- closure-ok: only the mitigation shipped -->\n**Fixed.**\n`);
  assert.deepEqual(selfDeclaredClosure(table, root, ['FINDINGS.md']).findings, []);

  writeFileSync(join(root, 'FINDINGS.md'), `${header}### F-001 — stale observation\n\nThis is a citation: F-002 is **Fixed.**\n`);
  assert.deepEqual(selfDeclaredClosure(table, root, ['FINDINGS.md']).findings, []);
});

/**
 * WI-038. The detector pass runs rungs' own engines over repos that never
 * adopted rungs, so its whole risk is confident noise: a finding that is true
 * about our conventions and meaningless about their repo.
 *
 * Measured on the source repos 2026-08-16 before this restriction existed:
 * `adr-index-current` reported a missing `adr-index` block on hexguard's
 * perfectly healthy decision index, and `specs-status-evidence` produced 70
 * findings on hexguard-templates whose spec register simply has its own
 * columns. Both are guaranteed by the repo's *state*, not its *content*.
 */
test('explain runs only repo-content gates over a repo that has its own equivalent', () => {
  const mods = [
    {
      name: 'adr',
      gates: [
        { id: 'adr-index-current', kind: 'declared', engine: 'render-freshness', applicability: 'our-artifacts', table: 'gates/adr.toml' },
        { id: 'adr-schema', kind: 'declared', engine: 'frontmatter-schema', applicability: 'our-schema', table: 'gates/adr.toml' },
        { id: 'adr-links', kind: 'declared', engine: 'link-integrity', applicability: 'repo-content', table: 'gates/adr.toml' },
        { id: 'adr-script', kind: 'command', command: 'rm -rf /' },
      ],
    },
  ];
  const theirs = [{ module: 'adr', state: 'theirs' }];

  const ran = [];
  const stub = (name) => () => (ran.push(name), { findings: [], examined: 1 });
  const engines = {
    'render-freshness': stub('render-freshness'),
    'frontmatter-schema': stub('frontmatter-schema'),
    'link-integrity': stub('link-integrity'),
  };

  const result = explainWith(engines, mods, theirs, '/nowhere', []);

  assert.deepEqual(ran, ['link-integrity'], 'only repo-content runs on a repo that is not ours');
  assert.equal(result.skipped.command, 1, 'a command gate is counted, never executed');
});

/**
 * WI-052. Applicability has **no default**. A gate that never said whether it
 * can read a foreign repo does not read one, and is named — silence resolving
 * to "safe" is precisely how WI-038's first version produced 71 findings that
 * were true about our conventions and meaningless about the repos they landed on.
 */
test('an undeclared gate does not run on a foreign repo and is reported by name', () => {
  const mods = [{ name: 'adr', gates: [{ id: 'adr-mystery', kind: 'declared', engine: 'link-integrity', table: 'gates/adr.toml' }] }];
  const ran = [];
  const engines = { 'link-integrity': () => (ran.push('ran'), { findings: [], examined: 1 }) };

  const foreign = explainWith(engines, mods, [{ module: 'adr', state: 'theirs' }], '/nowhere', []);
  assert.deepEqual(ran, [], 'an undeclared gate does not read somebody else\'s repo');
  assert.deepEqual(foreign.skipped.undeclared, ['adr-mystery'], 'and it is named, not silently dropped');

  // On a repo that *is* ours the question does not arise: the artifacts are ours
  // to read, so an undeclared gate still runs.
  const ours = explainWith(engines, mods, [{ module: 'adr', state: 'ours-current' }], '/nowhere', []);
  assert.deepEqual(ours.skipped.undeclared, [], 'applicability constrains foreign repos only');
});

/**
 * WI-045 / F-006. Self-test fixtures were declared and never executed, so every
 * one was documentation shaped like a test. The runner exists; this pins that it
 * actually distinguishes a passing fixture from a failing one, and that a shape
 * it cannot build is reported `unrun` rather than counted as a pass.
 */
test('the self-test runner executes a fixture and refuses to guess at one it cannot build', () => {
  const table = [{ id: 'demo', scan: ['probe.md'], required: ['id'] }];

  const ok = runSelfTests('demo', 'frontmatter-schema', table, [
    { expect: 'pass', fixture: { file: 'probe.md', frontmatter: { id: 'X' } } },
    { expect: 'fail', fixture: { file: 'probe.md', frontmatter: { title: 'no id here' } } },
  ]);
  assert.deepEqual(ok.map((r) => r.outcome), ['ok', 'ok'], 'both directions execute and agree');

  const wrong = runSelfTests('demo', 'frontmatter-schema', table, [
    { expect: 'fail', fixture: { file: 'probe.md', frontmatter: { id: 'X' } } },
  ]);
  assert.equal(wrong[0].outcome, 'mismatch', 'a fixture that disagrees with its engine is reported');

  const unbuildable = runSelfTests('demo', 'frontmatter-schema', table, [
    { expect: 'pass', fixture: { worktrees: [{ branch: 'x' }] } },
  ]);
  assert.equal(unbuildable[0].outcome, 'unrun', 'a shape with no builder is never a pass');

  const contextual = runSelfTests('demo', 'link-integrity', table, [{ expect: 'pass', input: 'x' }]);
  assert.equal(contextual[0].outcome, 'unrun', 'engines needing context the fixture lacks do not run');
});

/**
 * F-019. `[skills.<name>].extensions` was declared in manifests, documented in
 * `modules/README.md`, and implemented at **no** layer — not parsed, not
 * emitted, not read by the gate. `work-item` creates branches and merges, and
 * the manifest's reason for opting it out of model invocation had been inert
 * since it was written.
 *
 * Both directions matter: an opted-in key must be legal, and a key nobody opted
 * into must still fail — otherwise the fix is just a hole.
 */
test('a skill extension is legal only when its module opted in', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-ext-'));
  const write = (rel, fm) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), `---\n${fm}\n---\n\nbody\n`);
    return rel;
  };
  const spec = {
    scan: ['.claude/skills/**/SKILL.md'],
    required: ['name', 'description'],
    allowed: ['name', 'description'],
    extensions_allowed_from: 'module.toml:skills.<name>.extensions',
  };

  const opted = write('.claude/skills/a/SKILL.md', 'name: a\ndescription: d\ndisable-model-invocation: true');
  const notOpted = write('.claude/skills/b/SKILL.md', 'name: b\ndescription: d\nargument-hint: x');

  const legal = frontmatterSchema({ ...spec, extensions_opted_in: ['disable-model-invocation'] }, root, [opted]);
  assert.deepEqual(legal.findings, [], 'an opted-in extension is not a non-spec key');

  const illegal = frontmatterSchema({ ...spec, extensions_opted_in: [] }, root, [notOpted]);
  assert.equal(illegal.findings.length, 1, 'a key nobody opted into still fails');
  assert.match(illegal.findings[0].message, /argument-hint/);

  // And with the rule absent entirely, nothing is legalised.
  const noRule = frontmatterSchema({ ...spec, extensions_allowed_from: undefined }, root, [opted]);
  assert.equal(noRule.findings.length, 1, 'without the rule, an extension is a non-spec key again');

  rmSync(root, { recursive: true, force: true });
});

test('the shipped work-item skill carries the extension its module opted into', () => {
  const modules = loadAllModules(resolve('modules'));
  const backlog = modules.find((m) => m.name === 'backlog');
  assert.ok(backlog.skills?.['work-item']?.extensions, 'the manifest declares the opt-in');

  const emitted = emittedFiles(backlog, resolveParams(modules, {}, '.'));
  const skill = emitted.get('.claude/skills/work-item/SKILL.md');
  assert.match(skill, /^disable-model-invocation: true$/m, 'and it reaches the emitted skill');
  assert.doesNotMatch(
    emitted.get('.claude/skills/backlog-summary/SKILL.md'),
    /disable-model-invocation/,
    'a skill with no opt-in is untouched',
  );
});

test('every shipped gate declares its applicability', () => {
  const modules = loadAllModules(resolve('modules'));
  const undeclared = modules.flatMap((m) =>
    m.gates.filter((g) => g.kind === 'declared' && !g.applicability).map((g) => `${m.name}/${g.id}`),
  );
  assert.deepEqual(undeclared, [], 'the audit reports these too, but a test states the invariant');
});

test('explain collapses two gate ids reporting the identical finding set into one row', () => {
  const reported = collapseDuplicates([
    { module: 'gates', gate: 'gates-links-resolve', findings: [{ file: 'a.md', message: 'broken link → b.md' }], examined: 1 },
    { module: 'gates', gate: 'gates-paths-exist', findings: [{ file: 'a.md', message: 'broken link → b.md' }], examined: 1 },
    { module: 'gates', gate: 'gates-other', findings: [{ file: 'c.md', message: 'broken link → d.md' }], examined: 1 },
  ]);

  assert.equal(reported.length, 2, 'F-007: one check behind two ids is one finding, reported once');
  assert.equal(reported[0].gate, 'gates-links-resolve + gates-paths-exist', 'both ids stay visible');
});

/**
 * F-016. `upgrade --apply` rewrote a module's files and never its gates, so a
 * module version that added one left the registry on the old block and reported
 * success. Worse, the apply step only ran when a file was *stale* — and a
 * version that only adds a gate has none, so nothing happened at all.
 *
 * Unit-level here; the end-to-end reproduction against a scratch consumer is in
 * the item. This pins the two properties that matter: registration happens for
 * every module in the plan, not only ones with stale files, and it goes through
 * the same whole-block merge that makes removal work.
 */
/**
 * F-017. `upgrade` left the record naming the old version, so a repo on 1.2.0
 * described itself as 1.1.0 forever. The obvious fix — `writeInstallRecord` —
 * is worse than the bug: it hashes every emitted file that exists, which would
 * stamp our hash onto a **diverged** file, silently reclassify it as current,
 * and let the next upgrade overwrite an edit rungs promises never to touch.
 *
 * So the assertion that matters is the last one.
 */
test('the record update touches only the version and the files this run rewrote', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-rec-'));
  mkdirSync(join(root, '.ai'), { recursive: true });
  writeFileSync(
    join(root, '.ai', 'rungs.toml'),
    [
      '# Installed by `rungs`. Header comment that must survive.',
      '',
      '[modules.session]',
      'version = "1.1.0"',
      'state   = "managed"',
      '',
      '[modules.session.hashes]',
      '".ai/session.md" = "MINE-diverged"',
      '".ai/archive/README.md" = "old-hash"',
      '',
      '[modules.other]',
      'version = "9.9.9"',
      '',
    ].join('\n'),
  );

  const changed = updateRecordAfterUpgrade(root, [
    { module: 'session', version: '1.2.0', hashes: new Map([['.ai/archive/README.md', 'new-hash']]) },
  ]);
  const text = readFileSync(join(root, '.ai', 'rungs.toml'), 'utf8');

  assert.equal(changed, 2, 'one version line and one hash');
  assert.match(text, /\[modules\.session\]\nversion = "1\.2\.0"/, 'the version moved');
  assert.match(text, /"\.ai\/archive\/README\.md" = "new-hash"/, 'the rewritten file has its new hash');
  assert.match(text, /"\.ai\/session\.md" = "MINE-diverged"/, 'a diverged file keeps its hash, so it stays diverged');
  assert.match(text, /\[modules\.other\]\nversion = "9\.9\.9"/, 'an untouched module is untouched');
  assert.match(text, /^# Installed by `rungs`/, 'the header comment survives');

  rmSync(root, { recursive: true, force: true });
});

test('applyUpgrade registers gates even when no file is stale', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-upg-'));
  mkdirSync(join(root, '.ai'), { recursive: true });
  writeFileSync(join(root, '.ai', 'gates.toml'), '# registry\n');

  const mod = {
    name: 'demo',
    version: '1.1.0',
    dir: join(root, 'nonexistent'),
    params: {},
    gates: [{ id: 'demo-new', kind: 'declared', engine: 'sections', table: 'gates/demo.toml', tier: 'fast', why: 'x' }],
    requires: [],
    detect: {},
  };
  const record = { harnesses: ['claude'], modules: { demo: { version: '1.0.0' } } };
  // Every file current: the exact shape that skipped the apply step entirely.
  const plan = [{ module: 'demo', from: '1.0.0', to: '1.1.0', files: [{ rel: 'a.md', state: 'current' }] }];

  const result = applyUpgrade(root, [mod], record, plan);
  const registry = readFileSync(join(root, '.ai', 'gates.toml'), 'utf8');

  assert.equal(result.written, 0, 'no file was stale, so none is written');
  assert.equal(result.gates, 1, 'the module is still registered');
  assert.match(registry, /demo-new/, 'the new gate reaches the registry');
  assert.match(registry, /rungs:begin demo@1\.1\.0/, 'and the block carries the new version');

  rmSync(root, { recursive: true, force: true });
});

/**
 * WI-050. The board groups rows by status; each item declares its own. Nothing
 * reconciled them, and on 2026-08-16 fourteen rows disagreed — nine under
 * `Proposed`, five under `Planned`, all naming files whose status was `done`,
 * nine of them already in `archive/`.
 *
 * Case C is why the plan's own requirement 4 was dropped: reporting every
 * undeclared heading caught the board's narrative history tables, which are
 * correct. The typo case it was aimed at is case D instead, and that one is
 * exact rather than a guess.
 */
test('board-reconcile catches a mis-grouped row, ignores narrative, and notices a missing group', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-board-'));
  mkdirSync(join(root, 'docs', 'backlog', 'items'), { recursive: true });
  mkdirSync(join(root, 'docs', 'backlog', 'archive'), { recursive: true });
  const item = (dir, name, status) =>
    writeFileSync(join(root, 'docs', 'backlog', dir, name), `---\nid: WI-001\nstatus: ${status}\n---\n\nbody\n`);
  item('items', 'WI-002-open.md', 'proposed');
  item('archive', 'WI-001-done.md', 'done');

  const table = {
    file: 'docs/backlog/BACKLOG.md',
    groups: { 'In progress': ['in_progress'], Planned: ['planned'], Proposed: ['proposed'] },
  };
  const board = (body) => writeFileSync(join(root, 'docs', 'backlog', 'BACKLOG.md'), body);
  const fired = () => boardReconcile(table, root, []).findings;
  const head = '## In progress\n\n| — | | |\n\n## Planned\n\n| — | | |\n\n';

  board(`${head}## Proposed\n\n| [WI-001](archive/WI-001-done.md) | x | docs |\n`);
  assert.match(fired()[0].message, /status is 'done'/, 'a done item filed as proposed is caught');

  board(`${head}## Proposed\n\n| [WI-002](items/WI-002-open.md) | x | docs |\n`);
  assert.deepEqual(fired(), [], 'a correctly grouped row passes');

  board(`${head}## Proposed\n\n| — | | |\n\n---\n\n## The first-user path, closed\n\n| [WI-001](archive/WI-001-done.md) | what it fixed |\n`);
  assert.deepEqual(fired(), [], 'a narrative table under an undeclared heading is not a board row');

  board(`## In progress\n\n| — | | |\n\n## Planned\n\n| — | | |\n\n## Propsed\n\n| [WI-001](archive/WI-001-done.md) | x | docs |\n`);
  assert.match(fired()[0].message, /declared group 'Proposed' has no heading/, 'a misspelled heading cannot hide rows');

  rmSync(root, { recursive: true, force: true });
});

/**
 * F-015. `rungs backlog archive` was named in three files shipped into every
 * consumer repo, two of them saying "never by hand", and did not exist.
 *
 * The link rewrite is the whole substance of the command, so this asserts the
 * three spellings of one target that a real repo actually contains — board-
 * relative, parent-relative, and sibling — plus the two things the first
 * implementation got wrong: it must not touch a link whose target did not move,
 * and it must not touch module templates.
 */
test('backlog archive moves finished items and repoints every spelling of a link to them', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-arch-'));
  const w = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  const item = (id, status, extra = '') =>
    `---\nid: ${id}\nstatus: ${status}\ntype: feature\n${extra}---\n\nbody\n`;

  w('docs/backlog/items/WI-001-done.md', item('WI-001', 'done'));
  w('docs/backlog/items/WI-002-open.md', `${item('WI-002', 'planned')}\nSee [one](WI-001-done.md).\n`);
  w('docs/backlog/BACKLOG.md', 'Board: [one](items/WI-001-done.md) and [two](items/WI-002-open.md).\n');
  w('docs/roadmap.md', 'Elsewhere: [one](backlog/items/WI-001-done.md).\n');
  w('docs/backlog/README.md', 'Unrelated: [board](BACKLOG.md).\n');
  w('modules/backlog/files/docs/{{root}}/BACKLOG.md', 'Template: [x](items/{{id_prefix}}-001-x.md).\n');

  const plan = planArchive(root);
  assert.deepEqual(plan.moves.map((m) => m.id), ['WI-001'], 'only the finished item moves');
  assert.equal(plan.moves[0].to, 'docs/backlog/archive/WI-001-done.md', 'basename, not the whole path');

  applyArchive(root, plan);
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  assert.match(read('docs/backlog/BACKLOG.md'), /\(archive\/WI-001-done\.md\)/, 'board-relative');
  assert.match(read('docs/roadmap.md'), /\(backlog\/archive\/WI-001-done\.md\)/, 'from another directory');
  assert.match(read('docs/backlog/items/WI-002-open.md'), /\(\.\.\/archive\/WI-001-done\.md\)/, 'sibling becomes parent-relative');
  assert.match(read('docs/backlog/BACKLOG.md'), /\(items\/WI-002-open\.md\)/, 'an unmoved target is left alone');
  assert.match(read('docs/backlog/README.md'), /\(BACKLOG\.md\)/, 'a file citing nothing moved is untouched');
  assert.match(
    read('modules/backlog/files/docs/{{root}}/BACKLOG.md'),
    /\(items\/\{\{id_prefix\}\}-001-x\.md\)/,
    'a module template is never rewritten — its links belong to the consumer repo',
  );

  rmSync(root, { recursive: true, force: true });
});

test('backlog archive holds an epic whose children have not all finished', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-arch2-'));
  const w = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  w('docs/backlog/items/WI-010-epic.md', '---\nid: WI-010\nstatus: done\ntype: epic\nchildren: [WI-011, WI-012]\n---\n\nbody\n');
  w('docs/backlog/items/WI-011-a.md', '---\nid: WI-011\nstatus: done\ntype: feature\n---\n\nbody\n');
  w('docs/backlog/items/WI-012-b.md', '---\nid: WI-012\nstatus: planned\ntype: feature\n---\n\nbody\n');

  const plan = planArchive(root);

  assert.deepEqual(plan.moves.map((m) => m.id), ['WI-011'], 'the finished child moves, the epic does not');
  assert.equal(plan.held.length, 1);
  assert.match(plan.held[0].reason, /WI-012/, 'the hold names which child is unfinished');

  rmSync(root, { recursive: true, force: true });
});

/**
 * F-007. `backticked_paths` sat in the table's `check` list, implemented
 * nowhere, so `gates-paths-exist` ran the markdown-link scan instead and
 * reported every link finding a second time. The shape below is not a guess:
 * the first working version produced ten findings on this repo and all ten were
 * wrong, and each exclusion here is one of them.
 */
test('backticked-path checking catches a stale repo path and ignores everything that is not one', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-f007-'));
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'real.md'), 'here\n');
  writeFileSync(
    join(root, 'AGENTS.md'),
    [
      'Read `docs/real.md` before starting.', //          exists
      'Then run `/work-item` on `feature/WI-###-slug`.', // slash command, placeholder
      'Rules render into `.cursor/rules/`.', //           a directory
      'The `Result<T>` type wraps it.', //                not a path
      'See `docs/gone.md` for the rest.', //              THE finding
    ].join('\n\n'),
  );

  const table = { check: ['backticked_paths'], scan: ['AGENTS.md'], path_hint: ['/', '.md'] };
  const { findings } = linkIntegrity(table, root, ['AGENTS.md']);

  assert.equal(findings.length, 1, 'exactly one of the five spans is a stale repo path');
  assert.match(findings[0].message, /docs\/gone\.md/);

  rmSync(root, { recursive: true, force: true });
});

/**
 * F-001. `git branch --merged` is true of a branch cut and never committed to,
 * so the gate fired on every item between `git switch -c` and the first commit
 * — four times in two days. The obvious fix ("has commits ahead of base") is
 * wrong and this test is why: after any merge the branch is zero ahead, so that
 * version would never fire again, silently deleting the check.
 */
test('merged-status ignores a branch that landed nothing, and still catches one that landed work', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-f001-'));
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, stdio: 'pipe' }).toString().trim();
  const item = 'docs/backlog/items/WI-001-x.md';
  const write = (branch, status) =>
    writeFileSync(join(root, item), `---\nid: WI-001\nbranch: ${branch}\nstatus: ${status}\n---\n\nbody\n`);

  git('init -q -b main .');
  git('config user.email t@t.t');
  git('config user.name t');
  mkdirSync(join(root, 'docs', 'backlog', 'items'), { recursive: true });
  write('', 'planned');
  git('add -A');
  git('commit -qm base');

  const table = { integration_branch: 'main', pre_review_statuses: ['planned', 'in_progress'] };
  const fired = () => gitStatusReconcile(table, root, [item]).findings.length;

  git('switch -q -c feature/WI-001-x main');
  write('feature/WI-001-x', 'in_progress');
  assert.equal(fired(), 0, 'a branch cut and not yet committed to has not landed anything');

  git('add -A');
  git('commit -qm work');
  git('switch -q main');
  git('merge --no-ff -q feature/WI-001-x -m merge');
  assert.equal(fired(), 1, 'a branch that landed work and left the status behind is still caught');

  rmSync(root, { recursive: true, force: true });
});

/**
 * WI-043. ADR-0004 state 5 says `add` prints the comparison and stops. A
 * refusal has to travel *up* the dependency edges: `audit → findings → backlog`
 * is a declared chain precisely because one repo ran a good audit prompt 268
 * times into documents with no register to close them. Installing `audit` while
 * refusing `backlog` would rebuild that incident through the installer.
 */
test('a paradigm refusal propagates to every module that depends on it', () => {
  const mods = [
    { name: 'instructions', requires: [] },
    { name: 'backlog', requires: ['instructions'] },
    { name: 'findings', requires: ['backlog'] },
    { name: 'audit', requires: ['findings'] },
    { name: 'adr', requires: ['instructions'] },
  ];

  const blocked = blockedByParadigm(mods, new Set(['backlog']));

  assert.equal(blocked.get('backlog'), 'backlog', 'the matching module names itself as the cause');
  assert.equal(blocked.get('findings'), 'backlog', 'a direct dependent is blocked, and by whom');
  assert.equal(blocked.get('audit'), 'backlog', 'a transitive dependent too');
  assert.ok(!blocked.has('adr'), 'an unrelated module is untouched');
  assert.ok(!blocked.has('instructions'), 'a dependency of the blocked module is not itself blocked');
});

/**
 * WI-042. `path/file.ts:387` is the code-reference form CLAUDE.md mandates, and
 * `link-integrity` resolved it literally — 1,794 false findings on rift-forge,
 * 46.6% of that repo's link findings, every one a file that was exactly there.
 *
 * The strip must be monotone: it may only ever remove findings. A missing file
 * with a line number is still a missing file.
 */
test('link-integrity resolves a :line code reference but still reports a missing target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rungs-links-'));
  writeFileSync(join(dir, 'forge-store.ts'), 'export const x = 1;\n');
  writeFileSync(
    join(dir, 'doc.md'),
    [
      'Built in [the store](./forge-store.ts:222).',
      'Also [with a column](./forge-store.ts:222:14).',
      'And [gone](./no-such-file.ts:222).',
      'And [plainly gone](./no-such-file.ts).',
    ].join('\n'),
  );

  const { findings } = linkIntegrity({ scan: ['**/*.md'] }, dir, ['doc.md']);
  const broken = findings.map((f) => f.message);

  assert.equal(broken.length, 2, 'only the two genuinely missing targets are reported');
  assert.ok(broken.some((m) => m.includes('no-such-file.ts:222')), 'a missing file with a line number still fails');
  assert.ok(broken.some((m) => m.endsWith('no-such-file.ts')), 'a missing file without one still fails');
  assert.ok(!broken.some((m) => m.includes('forge-store')), 'an existing file with a line number is not a broken link');
});

/**
 * The hook exists because CLAUDE.md's shell rule was read and broken anyway
 * (2026-08-16, WI-038): `python - <<'PY'` against an interpreter this machine
 * does not have left `src/explain.ts` as 8,486 NUL bytes. A guard nobody tests
 * is a guard that silently stops matching, which is the failure it was added to
 * prevent, one level up.
 *
 * The allow-cases are not decoration — every one is a command actually used in
 * the session that added the hook. A guard that blocks the work is removed.
 */
test('the shell hook blocks interpreter heredocs and multi-line -e, and nothing else', () => {
  const hook = resolve(import.meta.dirname, '..', '.claude', 'hooks', 'no-inline-interpreter-scripts.mjs');
  const verdict = (command) => {
    const r = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
      encoding: 'utf8',
    });
    return r.status === 2 ? 'blocked' : 'allowed';
  };

  assert.equal(verdict("python - <<'PY'\nimport io\nPY"), 'blocked', 'the exact command that corrupted a source file');
  assert.equal(verdict('node -e "\nconst a = 1;\n"'), 'blocked');
  assert.equal(verdict("perl -0777 -pe 's/a/b/' docs/x.md"), 'allowed', 'a one-line re-derivation is rule 1 compliant');
  assert.equal(verdict("git commit -F- <<'EOF'\nmsg\nEOF"), 'allowed', 'a heredoc that feeds no interpreter');
  assert.equal(verdict('node src/cli.ts check'), 'allowed');
});

// WI-062 / F-026. These four commands were documented for weeks without existing, so the tests
// assert the guarantees ADR-0009 makes rather than that the happy path prints something: verify
// before you advance, refuse rather than destroy, and never leave the integration branch moved by
// a merge nobody gated.
function loopRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'rungs-loop-'));
  const g = (...a) => execSync(`git ${a.join(' ')}`, { cwd: dir, stdio: 'pipe' }).toString().trim();
  g('init', '-q', '-b', 'main', '.');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  writeFileSync(join(dir, 'a.txt'), 'base\n');
  g('add', '-A');
  g('commit', '-qm', 'init');
  return { dir, g };
}

test('session start states a fallback to the tip instead of silently cutting from an unverified merge', () => {
  const { dir, g } = loopRepo();
  try {
    const first = sessionStart(dir, 'feature/one', join(dir, '..', `wt-${basename(dir)}-1`), true);
    assert.ok(first.ok);
    assert.match(first.lines.join('\n'), /no green\/main ref yet/, 'the fallback must be stated');
    assert.match(first.lines.join('\n'), /has not been verified/);

    // With a green ref present it cuts from that, and says which.
    g('update-ref', 'refs/heads/green/main', 'main');
    const second = sessionStart(dir, 'feature/two', join(dir, '..', `wt-${basename(dir)}-2`), true);
    assert.match(second.lines.join('\n'), /base green\/main/);
    assert.doesNotMatch(second.lines.join('\n'), /has not been verified/);

    // It refuses a branch that exists rather than moving it.
    g('branch', 'feature/taken');
    assert.equal(sessionStart(dir, 'feature/taken', join(dir, '..', 'nope'), true).ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('land refuses a red merged tree, leaves the integration branch untouched, and parks the merge', () => {
  const { dir, g } = loopRepo();
  try {
    g('branch', 'feature/red');
    execSync('git checkout -q feature/red', { cwd: dir });
    writeFileSync(join(dir, 'a.txt'), 'branch work\n');
    g('add', '-A');
    g('commit', '-qm', 'work');
    execSync('git checkout -q main', { cwd: dir });

    const before = g('rev-parse', 'main');
    const red = () => ({ pass: 3, fail: 1, detail: ['  FAIL a-gate'] });
    const r = land(dir, 'feature/red', red);

    assert.equal(r.ok, false, 'a red merged tree must not land');
    assert.equal(g('rev-parse', 'main'), before, 'the integration branch must be bit-for-bit unchanged');
    assert.match(r.lines.join('\n'), /parked on 'integ\/feature\/red'/);
    assert.ok(g('rev-parse', '--verify', 'refs/heads/integ/feature/red'), 'the merge is kept, not discarded');
    assert.equal(existsSync(join(dir, '.git', 'rungs-land.lock')), false, 'the lock is released');

    // Green now advances it, and marks the result verified.
    const green = () => ({ pass: 4, fail: 0, detail: [] });
    const ok = land(dir, 'feature/red', green);
    assert.equal(ok.ok, true, ok.lines.join('\n'));
    assert.notEqual(g('rev-parse', 'main'), before);
    assert.equal(g('rev-parse', 'green/main'), g('rev-parse', 'main'), 'green marks the verified tip');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('land refuses a conflict, and refuses to run while another land holds the lock', () => {
  const { dir, g } = loopRepo();
  try {
    g('branch', 'feature/conflict');
    execSync('git checkout -q feature/conflict', { cwd: dir });
    writeFileSync(join(dir, 'a.txt'), 'theirs\n');
    g('add', '-A');
    g('commit', '-qm', 'theirs');
    execSync('git checkout -q main', { cwd: dir });
    writeFileSync(join(dir, 'a.txt'), 'ours\n');
    g('add', '-A');
    g('commit', '-qm', 'ours');

    const before = g('rev-parse', 'main');
    const conflict = land(dir, 'feature/conflict', () => ({ pass: 1, fail: 0, detail: [] }));
    assert.equal(conflict.ok, false);
    assert.match(conflict.lines.join('\n'), /merge conflict/);
    assert.equal(g('rev-parse', 'main'), before);

    // A live holder is refused by name, not silently merged alongside.
    writeFileSync(
      join(dir, '.git', 'rungs-land.lock'),
      JSON.stringify({ pid: process.pid, host: hostname(), started: '2026-08-17T02:00:00Z', branch: 'feature/other' }),
    );
    const busy = land(dir, 'feature/conflict', () => ({ pass: 1, fail: 0, detail: [] }));
    assert.equal(busy.ok, false);
    assert.match(busy.lines.join('\n'), /another land is in progress/);
    assert.match(busy.lines.join('\n'), /feature\/other/, 'it names the holder');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('worktrees reports merged-and-dirty, and never removes anything', () => {
  const { dir, g } = loopRepo();
  const wt = join(dir, '..', `wt-${basename(dir)}`);
  try {
    g('worktree', 'add', '-q', '-b', 'feature/landed', wt, 'main');
    const before = worktrees(dir).rows;
    assert.equal(before.length, 1);
    assert.equal(before[0].merged, true, 'a branch at the tip is merged');
    assert.equal(before[0].dirty, false);

    writeFileSync(join(wt, 'a.txt'), 'uncommitted\n');
    const after = worktrees(dir).rows;
    assert.equal(after[0].dirty, true, 'uncommitted work on a landed branch is the dangerous row');
    assert.ok(existsSync(wt), 'reporting must never remove the worktree');
  } finally {
    rmSync(wt, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});
