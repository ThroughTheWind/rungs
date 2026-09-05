import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { hostname, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { land, sessionStart, worktrees } from '../src/concurrency.ts';

import { loadAllModules, auditModules, loadManifest } from '../src/manifest.ts';
import { blockedByConflict, blockedByParadigm, contentHash, emittedFiles } from '../src/add.ts';
import { applyArchive, planArchive } from '../src/backlog.ts';
import { changeRequiresFile, gitStatusReconcile, registerSchema, selfDeclaredClosure } from '../src/engines2.ts';
import { boardReconcile } from '../src/engines3.ts';
import { applyUpgrade, eject, planUpgrade, readRecord, updateRecordAfterUpgrade } from '../src/lifecycle.ts';
import { ENGINES, frontmatterSchema, linkIntegrity } from '../src/engines.ts';
import { markers, mergeBlock, resolveParams, substitute } from '../src/substitute.ts';
import { collapseDuplicates, explainWith } from '../src/explain.ts';
import { runSelfTests } from '../src/selftest.ts';
import { loadTable, runGates } from '../src/check.ts';
import { ENGINE_TABLE_KEYS, selectEngineTable } from '../src/engine-table.ts';

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

test('resolveParams exposes the executing package version as a reserved render fact', () => {
  const expected = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
  const resolved = resolveParams([], { rungs: { version: '9.9.9' } }, '.');

  assert.equal(resolved.rungs.version, expected);
  assert.equal(
    substitute('use @rungs/cli@{{rungs.version}} and keep ${{ github.sha }}', 'instructions', resolved),
    `use @rungs/cli@${expected} and keep \${{ github.sha }}`,
  );
});

test('the generated launcher upgrades when managed and remains protected when diverged', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-launcher-upgrade-'));
  const instructions = loadManifest(resolve('modules', 'instructions'));
  const rel = '.ai/rungs.mjs';
  const old = "const packageSpec = '@rungs/cli@0.0.0';\n";

  try {
    mkdirSync(join(root, '.ai'), { recursive: true });
    writeFileSync(join(root, rel), old);
    writeFileSync(
      join(root, '.ai', 'rungs.toml'),
      [
        '[repo]',
        'harnesses = ["agents-md"]',
        '',
        '[modules.instructions]',
        'version = "1.1.0"',
        'state = "managed"',
        '',
        '[modules.instructions.hashes]',
        `"${rel}" = "${contentHash(old)}"`,
        '',
      ].join('\n'),
    );

    const record = readRecord(root);
    assert.ok(record);
    const planned = planUpgrade(root, [instructions], record);
    const launcher = planned[0].files.find((file) => file.rel === rel);
    assert.equal(launcher?.state, 'stale', 'an unchanged old launcher is ours to advance');

    applyUpgrade(root, [instructions], record, [
      { ...planned[0], files: planned[0].files.filter((file) => file.rel === rel) },
    ]);
    const updatedRecord = readRecord(root);
    assert.ok(updatedRecord);
    const current = planUpgrade(root, [instructions], updatedRecord)[0].files.find((file) => file.rel === rel);
    assert.equal(current?.state, 'current', 'the rewritten launcher and recorded hash agree');

    const edited = `${readFileSync(join(root, rel), 'utf8')}\n// consumer edit\n`;
    writeFileSync(join(root, rel), edited);
    const divergedPlan = planUpgrade(root, [instructions], updatedRecord);
    const diverged = divergedPlan[0].files.find((file) => file.rel === rel);
    assert.equal(diverged?.state, 'diverged');
    applyUpgrade(root, [instructions], updatedRecord, divergedPlan);
    assert.equal(readFileSync(join(root, rel), 'utf8'), edited, 'upgrade never overwrites a diverged launcher');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mergeBlock replaces only the managed block and preserves surrounding text', () => {
  const existing = ['before', '<!-- rungs:begin demo@1.0.0 -->', 'old', '<!-- rungs:end demo -->', 'after', ''].join('\n');
  const updated = mergeBlock(existing, '<!-- rungs:begin demo@1.1.0 -->\nnew\n<!-- rungs:end demo -->', 'demo');

  assert.match(updated, /^before\n<!-- rungs:begin demo@1\.1\.0 -->\nnew/m);
  assert.match(updated, /<!-- rungs:end demo -->\nafter\n$/);
  assert.equal(updated.includes('old'), false);
});

test('mergeBlock preserves gate-block separators and the terminal newline', () => {
  const first = '# rungs:begin first@1.0.0\nfirst body\n# rungs:end first';
  const second = '# rungs:begin second@1.0.0\nsecond body\n# rungs:end second';
  const registry = ['[runner]', '', first, '', second, ''].join('\n');

  assert.equal(mergeBlock(registry, first, 'first'), registry, 'an unchanged middle block is byte-stable');
  assert.equal(mergeBlock(registry, second, 'second'), registry, 'an unchanged final block keeps the final newline');

  const replacement = '# rungs:begin first@1.1.0\nnew first body\n# rungs:end first';
  const expected = ['[runner]', '', replacement, '', second, ''].join('\n');
  assert.equal(
    mergeBlock(registry, replacement, 'first'),
    expected,
    'a real replacement changes only the selected managed block',
  );

  const crlfRegistry = registry.replace(/\n/g, '\r\n');
  const crlfExpected = expected.replace(/\n/g, '\r\n');
  assert.equal(
    mergeBlock(crlfRegistry, first, 'first'),
    crlfRegistry,
    'an LF fragment identical to a CRLF middle block preserves every original byte',
  );
  assert.equal(
    mergeBlock(crlfRegistry, second.replace(/\n/g, '\r\n'), 'second'),
    crlfRegistry,
    'an unchanged CRLF final block preserves its terminal CRLF',
  );
  assert.equal(
    mergeBlock(crlfRegistry, replacement, 'first'),
    crlfExpected,
    'a real replacement adopts the managed block CRLF convention',
  );
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

test('register schema ignores an explicit no-record row but still validates a real open finding', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-register-empty-'));
  const table = {
    file: 'FINDINGS.md',
    table: 'Closed',
    required_cols: ['Id', 'What', 'Disposition', 'Reason'],
    non_empty: ['Reason'],
    open: {
      table: 'Open',
      non_empty: ['Sev', 'Pri', 'What', 'Evidence'],
      enum: { Sev: ['high', 'medium', 'low'], Pri: ['now', 'next', 'someday'] },
    },
  };
  const document = (openRow) =>
    [
      '## Open',
      '',
      '| Id | Sev | Pri | What | Evidence | When to act | How to fix |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      openRow,
      '',
      '## Closed',
      '',
      '| Id | What | Disposition | Reason |',
      '| --- | --- | --- | --- |',
      '| — | | | *nothing closed* |',
      '',
    ].join('\n');

  try {
    writeFileSync(join(root, 'FINDINGS.md'), document('| — | | | *nothing open* | | | |'));
    const empty = registerSchema(table, root, ['FINDINGS.md']);
    assert.deepEqual(empty.findings, []);
    assert.equal(empty.examined, 0, 'a no-record row is not evidence that a finding was checked');

    writeFileSync(join(root, 'FINDINGS.md'), document('| F-001 | | | real observation | | later | investigate |'));
    const malformed = registerSchema(table, root, ['FINDINGS.md']);
    assert.deepEqual(
      malformed.findings.map((finding) => finding.message),
      ["row F-001: 'Sev' is empty", "row F-001: 'Pri' is empty", "row F-001: 'Evidence' is empty"],
    );
    assert.equal(malformed.examined, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
        { id: 'adr-sections', kind: 'declared', engine: 'sections', applicability: 'repo-content', table: 'gates/adr.toml' },
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
    sections: stub('sections'),
  };

  const result = explainWith(engines, mods, theirs, '/nowhere', []);

  assert.deepEqual(ran, ['sections'], 'only repo-content runs on a repo that is not ours');
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
  // `\r?$`, because the assertion is about the *key being emitted*, not about
  // which line ending the checkout used. `.gitattributes` now normalises to LF
  // so this should not vary — but a test that fails on a CRLF checkout is
  // testing the checkout, and this one failed on windows-latest while passing
  // on a machine whose `core.autocrlf` happened to be false (F-034).
  assert.match(skill, /^disable-model-invocation: true\r?$/m, 'and it reaches the emitted skill');
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

// An epic got *more* stuck the more of it landed: the hold searched only `items/`, so every child
// that had already been archived read as unfinished. Measured on this repo — WI-037 was held for
// "unfinished children: WI-038, WI-039, WI-040, WI-042, WI-043", all five of them `done` and
// sitting in `archive/`. A completed epic could never be archived, and the message said the
// opposite of the truth.
test('backlog archive counts an already-archived child as finished, but still holds on an unknown one', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-arch3-'));
  const w = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  w('docs/backlog/items/WI-010-epic.md', '---\nid: WI-010\nstatus: done\ntype: epic\nchildren: [WI-011, WI-012]\n---\n\nbody\n');
  w('docs/backlog/archive/WI-011-a.md', '---\nid: WI-011\nstatus: done\ntype: feature\n---\n\nbody\n');
  w('docs/backlog/archive/WI-012-b.md', '---\nid: WI-012\nstatus: done\ntype: feature\n---\n\nbody\n');

  const plan = planArchive(root);
  assert.deepEqual(plan.held, [], 'children already in archive/ are finished by definition');
  assert.deepEqual(plan.moves.map((m) => m.id), ['WI-010'], 'so the epic can finally be archived');

  // A child nobody can find is still an unknown, and an unknown holds.
  w('docs/backlog/items/WI-020-epic.md', '---\nid: WI-020\nstatus: done\ntype: epic\nchildren: [WI-021]\n---\n\nbody\n');
  const second = planArchive(root);
  assert.equal(second.held.length, 1);
  assert.match(second.held[0].reason, /WI-021/, 'a missing child is not evidence that it finished');

  rmSync(root, { recursive: true, force: true });
});

// The skip for the backlog's own README/TEMPLATE was `/TEMPLATE\.md$/i` against the whole path, so
// it also matched any item whose *filename* ends in `-template.md`. Measured on this repo:
// WI-010-framework-extraction-template.md was `done` and skipped on every run since the command
// shipped, while the command reported "nothing to archive". A regex anchored to the wrong end
// reads as careful and is not.
test('backlog archive skips only the real README and TEMPLATE, not items named like them', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-arch4-'));
  const w = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  w('docs/backlog/items/README.md', '# Items\n');
  w('docs/backlog/TEMPLATE.md', '---\nid: WI-000\nstatus: done\n---\n');
  w('docs/backlog/items/WI-010-extraction-template.md', '---\nid: WI-010\nstatus: done\ntype: docs\n---\n\nbody\n');
  w('docs/backlog/items/WI-011-project-readme.md', '---\nid: WI-011\nstatus: done\ntype: docs\n---\n\nbody\n');

  const ids = planArchive(root).moves.map((m) => m.id).sort();
  assert.deepEqual(ids, ['WI-010', 'WI-011'], 'both items archive despite their filenames');

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

test('merged-status resolves origin and a sole other remote when no local integration ref exists', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-wi067-remote-'));
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, stdio: 'pipe' }).toString().trim();
  const item = 'docs/backlog/items/WI-067-x.md';

  git('init -q -b main .');
  git('config user.email t@t.t');
  git('config user.name t');
  mkdirSync(join(root, 'docs', 'backlog', 'items'), { recursive: true });
  writeFileSync(
    join(root, item),
    '---\nid: WI-067\nbranch: feature/WI-067-x\nstatus: in_progress\n---\n\nbody\n',
  );
  git('add -A');
  git('commit -qm base');
  git('switch -q -c feature/WI-067-x');
  writeFileSync(join(root, 'work.txt'), 'landed\n');
  git('add -A');
  git('commit -qm work');
  git('switch -q main');
  git('merge --no-ff -q feature/WI-067-x -m merge');
  const mergedTip = git('rev-parse main');
  git('switch -q -c release-checkout');
  git('remote add origin https://example.invalid/origin.git');
  git('remote add upstream https://example.invalid/upstream.git');
  git(`update-ref refs/remotes/origin/main ${mergedTip}`);
  git('branch -D main');

  const table = { integration_branch: 'main', pre_review_statuses: ['planned', 'in_progress'] };
  const againstOrigin = gitStatusReconcile(table, root, [item]);
  assert.equal(againstOrigin.findings.length, 1, 'origin/main is a usable integration ref');
  assert.match(againstOrigin.findings[0].message, /branch feature\/WI-067-x is merged/);

  git(`update-ref refs/remotes/upstream/main ${mergedTip}`);
  git('update-ref -d refs/remotes/origin/main');
  const againstSoleRemote = gitStatusReconcile(table, root, [item]);
  assert.equal(againstSoleRemote.findings.length, 1, 'one non-origin remote is a usable integration ref');
  assert.match(againstSoleRemote.findings[0].message, /branch feature\/WI-067-x is merged/);

  git('branch -D feature/WI-067-x');
  const withoutItemBranch = gitStatusReconcile(table, root, [item]);
  assert.equal(withoutItemBranch.examined, 1, 'the item is still examined when its branch ref is absent');
  assert.equal(withoutItemBranch.findings.length, 0, 'integration fallback does not invent a missing item branch');

  rmSync(root, { recursive: true, force: true });
});

test('merged-status uses deterministic ref precedence and refuses an ambiguous or absent base', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-wi067-precedence-'));
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, stdio: 'pipe' }).toString().trim();
  const item = 'docs/backlog/items/WI-067-x.md';

  git('init -q -b main .');
  git('config user.email t@t.t');
  git('config user.name t');
  mkdirSync(join(root, 'docs', 'backlog', 'items'), { recursive: true });
  writeFileSync(
    join(root, item),
    '---\nid: WI-067\nbranch: feature/WI-067-x\nstatus: in_progress\n---\n\nbody\n',
  );
  git('add -A');
  git('commit -qm base');
  const unmergedBase = git('rev-parse main');
  git('switch -q -c feature/WI-067-x');
  writeFileSync(join(root, 'work.txt'), 'landed\n');
  git('add -A');
  git('commit -qm work');
  git('switch -q main');
  git('merge --no-ff -q feature/WI-067-x -m merge');
  const mergedTip = git('rev-parse main');
  git(`update-ref refs/remotes/origin/main ${unmergedBase}`);
  git('remote add origin https://example.invalid/origin.git');
  git('remote add upstream https://example.invalid/upstream.git');
  git(`update-ref refs/remotes/upstream/main ${mergedTip}`);

  const table = { integration_branch: 'main', pre_review_statuses: ['planned', 'in_progress'] };
  const againstLocal = gitStatusReconcile(table, root, [item]);
  assert.equal(againstLocal.findings.length, 1, 'the merged local ref wins over a stale origin ref');
  assert.match(againstLocal.findings[0].message, /branch feature\/WI-067-x is merged/);

  git('switch -q -c release-checkout');
  git('branch -D main');
  assert.equal(
    gitStatusReconcile(table, root, [item]).findings.length,
    0,
    'origin wins over a different non-origin remote when local main is absent',
  );

  git('update-ref -d refs/remotes/origin/main');
  git('remote add fork https://example.invalid/fork.git');
  git(`update-ref refs/remotes/fork/main ${unmergedBase}`);
  const ambiguous = gitStatusReconcile(table, root, [item]);
  assert.equal(ambiguous.examined, 0);
  assert.equal(ambiguous.findings.length, 1);
  assert.match(ambiguous.findings[0].message, /ambiguous across refs\/remotes\/fork\/main, refs\/remotes\/upstream\/main/);

  git('update-ref -d refs/remotes/fork/main');
  git('remote remove fork');
  git('update-ref -d refs/remotes/upstream/main');
  git(`update-ref refs/remotes/upstream/release/main ${mergedTip}`);
  const nestedOnly = gitStatusReconcile(table, root, [item]);
  assert.equal(nestedOnly.examined, 0);
  assert.equal(nestedOnly.findings.length, 1);
  assert.match(nestedOnly.findings[0].message, /has no local or remote-tracking ref/);

  git('update-ref -d refs/remotes/upstream/release/main');
  const absent = gitStatusReconcile(table, root, [item]);
  assert.equal(absent.examined, 0);
  assert.equal(absent.findings.length, 1);
  assert.match(absent.findings[0].message, /has no local or remote-tracking ref/);

  rmSync(root, { recursive: true, force: true });
});

const releaseChangeTable = {
  base_branch: 'main',
  require_when_changed: ['src/**', 'lib/**', 'app/**', 'server/**', 'web/**', 'packages/**'],
  requires_one_of: ['changelog.d/*.md'],
  ignore_when_only: ['docs/**', '**/*.test.*', '**/*.spec.*', '.github/**', '*.md'],
  exempt_marker: 'changelog-ok:',
  message: 'add a changed changelog fragment',
};

function releaseDeltaRepo(baseFiles = {}) {
  const root = mkdtempSync(join(tmpdir(), 'rungs-release-delta-'));
  const git = (...args) => {
    const run = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, `git ${args.join(' ')}: ${run.stderr || run.stdout}`);
    return run.stdout.trim();
  };
  const write = (rel, body = 'fixture\n') => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  git('init', '-q', '-b', 'main', '.');
  git('config', 'user.email', 'release-test@rungs.local');
  git('config', 'user.name', 'rungs-release-test');
  write('.fixture-base', 'base\n');
  for (const [rel, body] of Object.entries(baseFiles)) write(rel, body);
  git('add', '--all');
  git('commit', '-q', '-m', 'base');
  git('switch', '-q', '-c', 'feature/release-test');
  return { root, git, write };
}

test('change-requires-file sees untracked, staged and committed work and requires this branch\'s fragment', () => {
  const { root, git, write } = releaseDeltaRepo();
  try {
    write('src/a.ts');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 1, 'untracked source engages');

    git('add', '--all');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 1, 'staged source engages');

    git('commit', '-q', '-m', 'shipping work');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 1, 'committed source engages');

    write('changelog.d/42.feature.md', '# changed here\n');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 0, 'untracked companion satisfies');
    git('add', '--all');
    git('commit', '-q', '-m', 'add fragment');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 0, 'committed companion satisfies');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('change-requires-file rejects inherited and deleted fragments but accepts a modified one', () => {
  for (const [state, mutate, expected] of [
    ['inherited', () => {}, 1],
    ['deleted', ({ root }) => rmSync(join(root, 'changelog.d', 'old.md')), 1],
    ['modified', ({ write }) => write('changelog.d/old.md', '# changed on this branch\n'), 0],
  ]) {
    const fixture = releaseDeltaRepo({ 'changelog.d/old.md': '# old fragment\n' });
    try {
      fixture.write('src/a.ts');
      mutate(fixture);
      assert.equal(
        changeRequiresFile(releaseChangeTable, fixture.root, []).findings.length,
        expected,
        `${state} fragment verdict`,
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('change-requires-file ignores non-shipping work and requires an exemption reason on the same line', () => {
  const { root, write } = releaseDeltaRepo();
  try {
    write('docs/a.md', '# docs\n');
    write('src/a.test.ts', 'test only\n');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 0, 'ignore-only changes pass');

    write('src/a.ts', '// changelog-ok:\nconst laterLineIsNotAReason = true;\n');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 1, 'bare marker cannot borrow next line');
    for (const bareWrapper of ['<!-- changelog-ok: -->\n', '/* changelog-ok: */\n', '"changelog-ok:"\n']) {
      write('src/a.ts', bareWrapper);
      assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 1, `${bareWrapper.trim()} is not a reason`);
    }
    write('src/a.ts', '// changelog-ok: internal rename, no user-visible effect\n');
    assert.equal(changeRequiresFile(releaseChangeTable, root, []).findings.length, 0, 'same-line reason exempts');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('change-requires-file refuses missing or malformed pattern configuration', () => {
  const { root } = releaseDeltaRepo();
  try {
    for (const broken of [
      { ...releaseChangeTable, require_when_changed: [] },
      { ...releaseChangeTable, requires_one_of: undefined },
      { ...releaseChangeTable, ignore_when_only: [''] },
    ]) {
      const result = changeRequiresFile(broken, root, []);
      assert.equal(result.examined, 0);
      assert.equal(result.findings.length, 1);
      assert.match(result.findings[0].message, /pattern|patterns/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('change-requires-file resolves remote-only bases and refuses ambiguous or absent refs', () => {
  const { root, git, write } = releaseDeltaRepo();
  try {
    const base = git('rev-parse', 'main');
    write('src/a.ts');
    git('add', '--all');
    git('commit', '-q', '-m', 'shipping work');
    git('remote', 'add', 'origin', 'https://example.invalid/origin.git');
    git('update-ref', 'refs/remotes/origin/main', base);
    git('branch', '-D', 'main');

    const origin = changeRequiresFile(releaseChangeTable, root, []);
    assert.equal(origin.findings.length, 1, 'exact origin/main is evaluated');
    assert.ok(origin.examined > 0);

    git('update-ref', '-d', 'refs/remotes/origin/main');
    git('remote', 'add', 'upstream', 'https://example.invalid/upstream.git');
    git('remote', 'add', 'fork', 'https://example.invalid/fork.git');
    git('update-ref', 'refs/remotes/upstream/main', base);
    git('update-ref', 'refs/remotes/fork/main', base);
    const ambiguous = changeRequiresFile(releaseChangeTable, root, []);
    assert.equal(ambiguous.examined, 0);
    assert.match(ambiguous.findings[0].message, /ambiguous across/);

    git('update-ref', '-d', 'refs/remotes/fork/main');
    const soleRemote = changeRequiresFile(releaseChangeTable, root, []);
    assert.equal(soleRemote.findings.length, 1, 'a sole non-origin remote is evaluated');
    assert.ok(soleRemote.examined > 0);

    git('update-ref', '-d', 'refs/remotes/upstream/main');
    const absent = changeRequiresFile(releaseChangeTable, root, []);
    assert.equal(absent.examined, 0);
    assert.match(absent.findings[0].message, /has no local or remote-tracking ref/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('release fragment fixtures execute and every engine uses the strict shared table selector', () => {
  assert.deepEqual(
    Object.keys(ENGINE_TABLE_KEYS).filter((key) => key !== 'shell-safety').sort(),
    Object.keys(ENGINES).sort(),
    'an implemented engine cannot exist without an explicit section mapping',
  );
  assert.throws(
    () => selectEngineTable({}, 'unknown-engine', 'demo'),
    /no table-section mapping/,
  );
  assert.throws(
    () => selectEngineTable({}, 'changelog-freshness', 'release-fragment-current'),
    /requires table section 'changelog_freshness'/,
  );

  const table = loadTable('release/release.toml', resolve('.'));
  const blocks = table.self_test
    .filter((block) => block.gate === 'release-changelog-fragment')
    .map((block) => ({ expect: block.expect, fixture: block.fixture }));
  const results = runSelfTests(
    'release-changelog-fragment',
    'change-requires-file',
    selectEngineTable(table, 'change-requires-file', 'release-changelog-fragment'),
    blocks,
  );
  assert.equal(results.length, 5);
  assert.deepEqual(results.map((result) => result.outcome), ['ok', 'ok', 'ok', 'ok', 'ok']);
});

test('the production and generated runners select changelog tables without a whole-document fallback', () => {
  const staleRoot = mkdtempSync(join(tmpdir(), 'rungs-stale-fragment-'));
  const ejectRoot = mkdtempSync(join(tmpdir(), 'rungs-ejected-selector-'));
  try {
    mkdirSync(join(staleRoot, '.ai'), { recursive: true });
    mkdirSync(join(staleRoot, 'changelog.d'), { recursive: true });
    writeFileSync(join(staleRoot, 'package.json'), JSON.stringify({ version: '0.2.0' }));
    writeFileSync(join(staleRoot, 'changelog.d', '0.1.0.md'), '# stale\n');
    writeFileSync(
      join(staleRoot, '.ai', 'gates.toml'),
      '[[gates]]\nid = "release-fragment-current"\nkind = "declared"\nengine = "changelog-freshness"\ntable = "release/release.toml"\n',
    );
    const [stale] = runGates(staleRoot);
    assert.equal(stale.status, 'fail');
    assert.equal(stale.examined, 1, 'the production path must reach the one stale fragment');

    mkdirSync(join(ejectRoot, '.ai'), { recursive: true });
    writeFileSync(
      join(ejectRoot, '.ai', 'gates.toml'),
      '[[gates]]\nid = "release-fragment-current"\nkind = "declared"\nengine = "changelog-freshness"\ntable = "release/release.toml"\n',
    );
    eject(ejectRoot, loadAllModules(resolve('modules')));
    const runner = readFileSync(join(ejectRoot, '.rungs', 'run-gate.mjs'), 'utf8');
    assert.match(runner, /import \{ selectEngineTable \} from '\.\/engine-table\.ts'/);
    assert.match(runner, /selectEngineTable\(raw, engine, id\)/);
    assert.doesNotMatch(runner, /const KEYS|\?\? raw/);
    assert.ok(existsSync(join(ejectRoot, '.rungs', 'engine-table.ts')));
  } finally {
    rmSync(staleRoot, { recursive: true, force: true });
    rmSync(ejectRoot, { recursive: true, force: true });
  }
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
 * F-038. `[conflicts]` was parsed into the manifest and read by nothing, so a
 * module declaring an incompatibility installed in silence.
 *
 * The asymmetric case is the one that matters and the one a symmetric-looking
 * implementation gets wrong: only the *newer* module can name the older one. A
 * module authored outside this package declares `conflicts = ["backlog"]`;
 * `backlog` will never declare it back, and requiring both would make the field
 * useless for the only case it exists for.
 */
test('a declared conflict blocks in both directions and propagates to dependents', () => {
  const all = [
    { name: 'instructions', requires: [], conflicts: [] },
    { name: 'backlog', requires: ['instructions'], conflicts: [] },
    { name: 'findings', requires: ['backlog'], conflicts: [] },
    { name: 'adr', requires: ['instructions'], conflicts: [] },
    { name: 'gh-issues', requires: ['instructions'], conflicts: ['backlog'] },
  ];
  const order = (...names) => all.filter((m) => names.includes(m.name));

  // The declaring side: `add gh-issues` on a repo that already has `backlog`.
  const forward = blockedByConflict(order('instructions', 'gh-issues'), new Set(['backlog', 'instructions', 'gh-issues']), all);
  assert.deepEqual(forward.get('gh-issues'), { cause: 'gh-issues', with: 'backlog' });
  assert.ok(!forward.has('instructions'), 'a shared dependency is not blocked');

  // The declared-about side: `add backlog` on a repo that already has the
  // module which names it. Nothing in `backlog` mentions the conflict.
  const reverse = blockedByConflict(order('instructions', 'backlog', 'findings'), new Set(['gh-issues', 'instructions', 'backlog', 'findings']), all);
  assert.deepEqual(reverse.get('backlog'), { cause: 'backlog', with: 'gh-issues' }, 'the undeclaring side is blocked too');
  assert.deepEqual(reverse.get('findings'), { cause: 'backlog', with: 'gh-issues' }, 'and so is its dependent, naming the cause');

  // Both requested at once: they cannot arrive together either.
  const together = blockedByConflict(order('instructions', 'backlog', 'gh-issues'), new Set(['instructions', 'backlog', 'gh-issues']), all);
  assert.ok(together.has('backlog') && together.has('gh-issues'), 'a conflict inside one install set is still a conflict');

  // And the negative direction: no partner present, nothing blocked.
  const clean = blockedByConflict(order('instructions', 'backlog', 'adr'), new Set(['instructions', 'backlog', 'adr']), all);
  assert.equal(clean.size, 0, 'a repo without the conflicting module installs normally');
});

/**
 * F-037. The provenance schema had one shape and it asserted extraction, so a
 * module authored outside this package could only get past the validator by
 * writing prose into `sources`, `patterns` and `incident`. Nothing then
 * distinguished an honest "none" from an invented incident.
 *
 * Both directions matter here: `designed` must load, and a designed module that
 * *also* claims an incident must not — half a claim is the failure mode.
 */
test('provenance declares extracted or designed, and a designed module cannot half-claim', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rungs-prov-'));
  const write = (toml) => {
    writeFileSync(join(dir, 'module.toml'), toml);
    return () => loadManifest(dir);
  };
  const head = '[module]\nname = "demo"\nversion = "1.0.0"\nrung = 1\n\n';

  const designed = write(`${head}[provenance]\nkind = "designed"\nrationale = "I wanted it. Nobody has run this yet."\n`)();
  assert.equal(designed.provenance.kind, 'designed');

  assert.throws(write(`${head}[provenance]\nkind = "designed"\n`), /rationale is required/, 'a designed module must say why it exists');
  assert.throws(
    write(`${head}[provenance]\nkind = "designed"\nrationale = "mine"\nincident = "hexguard ran an audit 268 times"\n`),
    /incident belongs to an extracted module/,
    'a designed module may not borrow an incident',
  );
  assert.throws(
    write(`${head}[provenance]\nkind = "designed"\nrationale = "mine"\nsources = ["rift-forge"]\n`),
    /sources belongs to an extracted module/,
    'nor name sources, which read as a repo that paid for it',
  );
  assert.throws(write(`${head}[provenance]\nkind = "borrowed"\nrationale = "x"\n`), /must be 'extracted' or 'designed'/);

  // The default is unchanged, which is what keeps fifteen manifests untouched.
  const extracted = write(`${head}[provenance]\nsources = ["rift-forge"]\npatterns = ["x"]\nincident = "it happened"\n`)();
  assert.equal(extracted.provenance.kind, 'extracted', 'an absent kind is extracted');
  assert.throws(write(`${head}[provenance]\npatterns = ["x"]\nincident = "it happened"\n`), /sources is required/);

  rmSync(dir, { recursive: true, force: true });
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
    // `only` is set on the merge-base re-run and absent on the merged run, so a
    // runner can answer differently for each. This one is clean at the base and
    // red after the merge: the branch caused it.
    const introduced = (_dir, only) => (only ? { pass: 1, failing: [] } : { pass: 3, failing: [{ id: 'a-gate', findings: ['boom'] }] });
    const r = land(dir, 'feature/red', introduced);

    assert.equal(r.ok, false, 'a failure this branch introduced must not land');
    assert.match(r.lines.join('\n'), /INTRODUCED a-gate/);
    assert.equal(g('rev-parse', 'main'), before, 'the integration branch must be bit-for-bit unchanged');
    assert.match(r.lines.join('\n'), /parked on 'integ\/feature\/red'/);
    assert.ok(g('rev-parse', '--verify', 'refs/heads/integ/feature/red'), 'the merge is kept, not discarded');
    assert.equal(existsSync(join(dir, '.git', 'rungs-land.lock')), false, 'the lock is released');

    // Green now advances it, and marks the result verified.
    const green = () => ({ pass: 4, failing: [] });
    const ok = land(dir, 'feature/red', green);
    assert.equal(ok.ok, true, ok.lines.join('\n'));
    assert.notEqual(g('rev-parse', 'main'), before);
    assert.equal(g('rev-parse', 'green/main'), g('rev-parse', 'main'), 'green marks the verified tip');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// F-029. A gate that is red for reasons you did not cause and cannot fix is a gate you learn to
// bypass, and a bypassed gate reports nothing. So `land` re-runs each failing gate against the
// merge base and only blocks on what this branch caused — and an unattributable failure blocks,
// because we do not land on an unknown.
test('land distinguishes an inherited failure from an introduced one, and blocks on an unattributable one', () => {
  const { dir, g } = loopRepo();
  try {
    g('branch', 'feature/x');
    execSync('git checkout -q feature/x', { cwd: dir });
    writeFileSync(join(dir, 'a.txt'), 'branch work\n');
    g('add', '-A');
    g('commit', '-qm', 'work');
    execSync('git checkout -q main', { cwd: dir });
    const before = g('rev-parse', 'main');

    // Red after the merge *and* red at the base: not this branch's doing.
    const red = { id: 'old-gate', findings: ['a.txt: already broken'] };
    const inherited = (_d, only) => (only ? { pass: 0, failing: [red] } : { pass: 2, failing: [red] });
    const landed = land(dir, 'feature/x', inherited);

    assert.equal(landed.ok, true, 'a failure that predates the branch must not block it');
    assert.match(landed.lines.join('\n'), /inherited\s+old-gate/);
    assert.doesNotMatch(landed.lines.join('\n'), /INTRODUCED/);
    assert.notEqual(g('rev-parse', 'main'), before, 'the branch landed');
    assert.equal(g('rev-parse', 'green/main'), g('rev-parse', 'main'), 'and the green ref followed it');

    // The blind spot attribution-by-gate created, and the reason it is by finding: an already-red
// gate must not excuse the *new* violations of it this branch brings. Measured before the fix —
    // a branch adding its own broken link landed clean because the link gate was already red.
    g('branch', 'feature/sneaky');
    execSync('git checkout -q feature/sneaky', { cwd: dir });
    writeFileSync(join(dir, 'c.txt'), 'more\n');
    g('add', '-A');
    g('commit', '-qm', 'sneaky');
    execSync('git checkout -q main', { cwd: dir });

    const held = g('rev-parse', 'main');
    const sameGateNewFinding = (_d, only) =>
      only
        ? { pass: 0, failing: [{ id: 'old-gate', findings: ['a.txt: already broken'] }] }
        : { pass: 2, failing: [{ id: 'old-gate', findings: ['a.txt: already broken', 'c.txt: brand new'] }] };
    const sneaky = land(dir, 'feature/sneaky', sameGateNewFinding);
    assert.equal(sneaky.ok, false, 'a new violation of an already-red gate is still this branch\'s');
    assert.match(sneaky.lines.join('\n'), /INTRODUCED old-gate — c\.txt: brand new/);
    assert.equal(g('rev-parse', 'main'), held);

    // A base that cannot be gated at all attributes nothing, so everything blocks.
    g('branch', 'feature/y');
    execSync('git checkout -q feature/y', { cwd: dir });
    writeFileSync(join(dir, 'b.txt'), 'more\n');
    g('add', '-A');
    g('commit', '-qm', 'more');
    execSync('git checkout -q main', { cwd: dir });

    const tip = g('rev-parse', 'main');
    const unknowable = (_d, only) => {
      if (only) throw new Error('the base could not be gated');
      return { pass: 1, failing: [{ id: 'mystery', findings: ['unknown'] }] };
    };
    const blocked = land(dir, 'feature/y', unknowable);
    assert.equal(blocked.ok, false, 'an unattributable failure must block');
    assert.match(blocked.lines.join('\n'), /INTRODUCED mystery/);
    assert.match(blocked.lines.join('\n'), /do not land on an unknown|could not be gated/);
    assert.equal(g('rev-parse', 'main'), tip, 'and the branch does not move');
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
    const conflict = land(dir, 'feature/conflict', () => ({ pass: 1, failing: [] }));
    assert.equal(conflict.ok, false);
    assert.match(conflict.lines.join('\n'), /merge conflict/);
    assert.equal(g('rev-parse', 'main'), before);

    // A live holder is refused by name, not silently merged alongside.
    writeFileSync(
      join(dir, '.git', 'rungs-land.lock'),
      JSON.stringify({ pid: process.pid, host: hostname(), started: '2026-08-17T02:00:00Z', branch: 'feature/other' }),
    );
    const busy = land(dir, 'feature/conflict', () => ({ pass: 1, failing: [] }));
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
