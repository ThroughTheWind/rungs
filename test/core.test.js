import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { loadAllModules, auditModules } from '../src/manifest.ts';
import { blockedByParadigm } from '../src/add.ts';
import { applyArchive, planArchive } from '../src/backlog.ts';
import { gitStatusReconcile, selfDeclaredClosure } from '../src/engines2.ts';
import { linkIntegrity } from '../src/engines.ts';
import { markers, mergeBlock, resolveParams, substitute } from '../src/substitute.ts';
import { collapseDuplicates, explainWith } from '../src/explain.ts';

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
test('explain runs only convention-free engines over a repo that has its own equivalent', () => {
  const mods = [
    {
      name: 'adr',
      gates: [
        { id: 'adr-index-current', kind: 'declared', engine: 'render-freshness', table: 'gates/adr.toml' },
        { id: 'adr-links', kind: 'declared', engine: 'link-integrity', table: 'gates/adr.toml' },
        { id: 'adr-script', kind: 'command', command: 'rm -rf /' },
      ],
    },
  ];
  const theirs = [{ module: 'adr', state: 'theirs' }];

  const ran = [];
  const engines = {
    'render-freshness': () => (ran.push('render-freshness'), { findings: [{ message: 'x' }], examined: 1 }),
    'link-integrity': () => (ran.push('link-integrity'), { findings: [], examined: 1 }),
  };

  const result = explainWith(engines, mods, theirs, '/nowhere', []);

  assert.deepEqual(ran, ['link-integrity'], 'shape-conformance engines must not run on a repo that is not ours');
  assert.equal(result.skipped.command, 1, 'a command gate is counted, never executed');
  assert.equal(result.reported.length, 0);
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
