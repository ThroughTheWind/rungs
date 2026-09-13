import { existsSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from './assert.js';
import { frontmatter, sourceLinks, sourceText, fingerprint, commandHandoff } from '../src/ui/read.ts';
import { inspectSnapshot, inspectCheckPlan, inspectPreview, inspectDiagnostics, uiVersion } from '../src/ui/inspect.ts';
import { modulesRoot } from '../src/ejected.ts';
import { runGates, runGatesObserved } from '../src/check.ts';
import { fixture, item, registry } from './ui-helpers.js';

test('non-regular and oversized sources are explicit; foreign findings prose is not an empty register', (t) => {
  const f = fixture(t, {
    'docs/backlog/FINDINGS.md': 'This project uses a prose observation journal.',
    'large.md': 'x'.repeat(1024),
  });
  assert.equal(sourceText(f.root, 'large.md', 100).state, 'partial');
  assert.equal(sourceText(f.root, 'large.md', 100).text.length, 100);
  assert.throws(() => sourceText(f.root, 'docs'), /regular/);
  if (process.platform !== 'win32') {
    execFileSync('mkfifo', [join(f.root, 'pipe')]);
    assert.throws(() => sourceText(f.root, 'pipe'), /regular/);
  }
  const snapshot = inspectSnapshot(f.root);
  assert.equal(snapshot.work.findings.state, 'error');
  assert.match(snapshot.work.findings.issues[0].message, /not an empty/);
  assert.ok(snapshot.sources.includes('docs/backlog/FINDINGS.md'));
});

test('large inspection preserves 1000 items and 5000 findings within the specified fixture budget', (t) => {
  const f = fixture(t);
  for (let n = 1; n <= 1000; n++)
    f.write(
      `docs/backlog/items/WI-${String(n).padStart(4, '0')}.md`,
      item(`WI-${String(n).padStart(4, '0')}`, `Fixture ${n}`),
    );
  f.write(
    'docs/backlog/FINDINGS.md',
    '# Findings\n\n| Id | Observation |\n| --- | --- |\n' +
      Array.from({ length: 5000 }, (_, n) => `| F-${n + 1} | Finding ${n + 1} |`).join('\n'),
  );
  const start = performance.now();
  const snapshot = inspectSnapshot(f.root);
  const elapsed = performance.now() - start;
  t.diagnostic(`1000 items / 5000 findings: ${Math.round(elapsed)}ms (${process.platform}, ${process.version})`);
  assert.equal(snapshot.work.items.length, 1000);
  assert.equal(snapshot.work.findings.value.length, 5000);
  assert.ok(elapsed < 5000, `Inspection took ${elapsed}ms; budget is 5000ms.`);
});

test('UI frontmatter preserves quoted scalars, flat arrays and comments; unsupported syntax stays explicit', () => {
  const parsed = frontmatter(
    `---\nid: TASK-001\ntitle: "Use # inside: quoted text" # outside\nstatus: waiting_for_owner\nrelated: ['TASK-002', "ADR-0001"]\nchildren:\n  - TASK-003\n  - 'TASK-004'\n---\nBody`,
  );
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.fields.title, 'Use # inside: quoted text');
  assert.deepEqual(parsed.fields.children, ['TASK-003', 'TASK-004']);
  assert.deepEqual(parsed.fields.related, ['TASK-002', 'ADR-0001']);
  const invalid = frontmatter(
    '---\nid: WI-001\nid: WI-002\nvalue: &anchor {nested: true}\ntitle: |\n  multiline\n---\nraw remains',
  );
  assert.ok(invalid.issues.length >= 3);
  assert.equal(invalid.fields.id, 'WI-001');
  assert.equal(invalid.body, 'raw remains');
  assert.ok(frontmatter('---\nid: WI-001').issues[0].includes('Unterminated'));
});

test('UI reads configured work roots, custom prefixes, archived references and unknown statuses without inferring session state', (t) => {
  const f = fixture(t, {
    '.ai/rungs.toml':
      '[repo]\nharnesses=["claude"]\n[modules.backlog]\nversion="1.2.0"\nparams={root="plan",id_prefix="TASK"}\n[modules.findings]\nversion="1.2.0"\nparams={path="docs/observations.md"}\n[modules.adr]\nversion="1.2.1"\nparams={path="decisions",id_prefix="DEC"}\n',
    'docs/plan/items/TASK-002.md': item(
      'TASK-002',
      'Current work',
      'waiting_for_owner',
      'related: [TASK-001, TASK-999, DEC-0001]',
      'Evidence [OBS-007](../../observations.md).',
    ),
    'docs/plan/archive/TASK-001.md': item('TASK-001', 'Finished work', 'done'),
    'decisions/DEC-0001.md': item('DEC-0001', 'Decision', 'accepted'),
    'docs/observations.md':
      '# Findings\n\n## Closed\n\n| Id | What | Disposition | Reason |\n| --- | --- | --- | --- |\n| OBS-007 | A mismatch | fixed | [TASK-001](plan/archive/TASK-001.md) repaired it |\n',
    '.ai/session.md': '# Session\n\n## In progress\nTASK-001 is in progress.\n',
  });
  const snapshot = inspectSnapshot(f.root);
  assert.equal(snapshot.consistent, true);
  assert.equal(snapshot.work.backlogRoot, 'docs/plan');
  assert.equal(snapshot.work.items.length, 2);
  const current = snapshot.work.items.find((doc) => doc.id === 'TASK-002');
  assert.equal(current.status, 'waiting_for_owner');
  assert.equal(current.references.find((ref) => ref.id === 'TASK-001').paths[0], 'docs/plan/archive/TASK-001.md');
  assert.equal(current.references.find((ref) => ref.id === 'TASK-999').paths.length, 0);
  assert.equal(snapshot.work.items.find((doc) => doc.id === 'TASK-001').status, 'done');
  assert.equal(snapshot.work.findings.value[0].cells.Reason.includes('repaired it'), true);
  assert.equal(snapshot.work.decisions[0].id, 'DEC-0001');
});

test('UI distinguishes absence, malformed install/journal/registry, duplicate work ids and unsupported records', (t) => {
  const f = fixture(t, {
    'docs/backlog/items/WI-001-a.md': item('WI-001', 'First'),
    'docs/backlog/items/WI-001-b.md': item('WI-001', 'Second'),
    'docs/backlog/items/WI-002.md': 'Unrecognized, authored work record.',
  });
  let snapshot = inspectSnapshot(f.root);
  assert.equal(snapshot.install.record.state, 'absent');
  assert.equal(snapshot.work.items.length, 3);
  assert.ok(
    snapshot.work.items
      .filter((doc) => doc.id === 'WI-001')
      .every((doc) => doc.issues.some((issue) => issue.includes('Duplicate'))),
  );
  assert.equal(snapshot.work.items.find((doc) => doc.path.endsWith('WI-002.md')).state, 'unsupported');
  f.write('.ai/rungs.toml', '[modules.broken');
  f.write('.ai/rungs-install.journal.json', '{malformed');
  f.write('.ai/gates.toml', 'gates = "not a registry"');
  snapshot = inspectSnapshot(f.root);
  assert.equal(snapshot.install.record.state, 'error');
  assert.equal(snapshot.install.journal.state, 'error');
  assert.equal(snapshot.gates.registry.state, 'error');
  assert.equal(snapshot.work.state, 'error');
  assert.ok(snapshot.install.modules.every((mod) => mod.detection.state === 'unknown'));
  assert.equal(inspectCheckPlan(f.root).allowed, false);
});

test('UI refresh reads new configuration and fingerprints untracked content, not only Git HEAD', (t) => {
  const f = fixture(t, {
    '.ai/rungs.toml': '[modules.backlog]\nversion="1.2.0"\nparams={root="one"}',
    'docs/one/items/WI-001.md': item('WI-001', 'Old root'),
    'docs/two/items/WI-002.md': item('WI-002', 'New root'),
  });
  const first = inspectSnapshot(f.root);
  f.write('.ai/rungs.toml', '[modules.backlog]\nversion="1.2.0"\nparams={root="two"}');
  const second = inspectSnapshot(f.root);
  assert.equal(first.work.items[0].id, 'WI-001');
  assert.equal(second.work.items[0].id, 'WI-002');
  assert.notEqual(first.generation, second.generation);
  f.write('untracked.txt', 'changed without a commit');
  assert.notEqual(second.generation, fingerprint(f.root, modulesRoot()).generation);
});

test('UI source reads and links refuse traversal, aliases and remote command protocols', (t) => {
  const f = fixture(t, { 'docs/readme.md': 'Readable', 'other.md': 'Safe source' });
  assert.equal(sourceText(f.root, 'docs/readme.md').text, 'Readable');
  assert.throws(() => sourceText(f.root, '../outside.txt'), /traversal|outside/);
  assert.throws(() => sourceText(f.root, 'C:\\outside.txt'), /absolute|drive/);
  const links = sourceLinks(
    f.root,
    'docs/readme.md',
    '[ok](../other.md) [escape](../../outside.md) [run](javascript:alert(1)) [remote](https://example.org/)',
  );
  assert.equal(links[0].path, 'other.md');
  assert.equal(links[0].exists, true);
  assert.equal(links[1].path, undefined);
  assert.equal(links[2].path, undefined);
  assert.equal(links[3].path, undefined);
  const outside = fixture(t, { 'private.txt': 'not an inspection source' });
  symlinkSync(outside.root, join(f.root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => sourceText(f.root, 'alias/private.txt'), /outside/);
});

test('UI pin compatibility and eject remain explicit; inspection never executes a launcher', (t) => {
  const f = fixture(t, { '.ai/gates.toml': registry(), 'check.cjs': 'console.log("ok")' });
  assert.equal(inspectCheckPlan(f.root).allowed, true);
  f.write('.ai/rungs.mjs', `const pinnedPackageSpec = '@rungs/cli@${uiVersion()}';\n`);
  assert.equal(inspectCheckPlan(f.root).allowed, true);
  f.write('.ai/rungs.mjs', "const pinnedPackageSpec = '@rungs/cli@0.0.0';\n");
  assert.equal(inspectCheckPlan(f.root).pin.state, 'different');
  assert.equal(inspectCheckPlan(f.root).allowed, false);
  f.write('.ai/rungs.mjs', "throw new Error('Never execute this launcher to inspect it');");
  assert.equal(inspectCheckPlan(f.root).pin.state, 'unknown');
  f.write('.rungs/run-gate.mjs', '// frozen runner fixture');
  assert.equal(inspectCheckPlan(f.root).pin.state, 'ejected');
  assert.equal(inspectCheckPlan(f.root).allowed, false);
});

test('UI preserves legacy/corrupt ledger evidence and never assigns it current validation provenance', (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry(),
    '.ai/.gate-ledger.jsonl':
      '{"at":"2026-01-01","id":"fixture-command","status":"pass","ms":5}\nnot-json\n{"alien":true}\n',
  });
  const snapshot = inspectSnapshot(f.root);
  assert.equal(snapshot.gates.ledger.state, 'partial');
  assert.equal(snapshot.gates.ledger.value.records.length, 2);
  assert.equal(snapshot.gates.ledger.value.records[0].value.generation, undefined);
  assert.equal(snapshot.gates.budget.value.state, 'no-budget');
  const generation = snapshot.generation;
  f.write('.ai/.gate-ledger.jsonl', '{"id":"another","status":"fail"}\n');
  assert.equal(
    fingerprint(f.root, modulesRoot()).generation,
    generation,
    'ledger is an observation sink, not a validation input',
  );
});

test('UI previews label unpreviewed upgrade phases and archive through the existing planner', (t) => {
  const f = fixture(t, {
    '.ai/rungs.toml': '[repo]\nharnesses=[]\n[modules.gates]\nversion="0.0.0"\n',
    'docs/backlog/items/WI-001.md': item('WI-001', 'Finished', 'done'),
    'docs/backlog/BACKLOG.md': '# Board\n[WI-001](items/WI-001.md)',
  });
  const upgrade = inspectPreview(f.root, 'upgrade');
  assert.match(upgrade.coverage, /Gate registration, hook registration and install-record updates are not previewed/);
  const archive = inspectPreview(f.root, 'archive');
  assert.equal(archive.value.moves[0].id, 'WI-001');
  assert.equal(existsSync(join(f.root, 'docs/backlog/items/WI-001.md')), true);
  assert.equal(existsSync(join(f.root, 'docs/backlog/archive/WI-001.md')), false);
});

test('observed check runner preserves synchronous results and tiers while streaming output', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml':
      registry() +
      '\n[[gates]]\nid="unavailable"\nkind="declared"\nengine="does-not-exist"\ntier="full"\n\n[[gates]]\nid="hook"\nkind="command"\ncommand="node should-not-run.cjs"\ntrigger="pre-tool-use"\n\n[[gates]]\nid="census"\nkind="declared"\nengine="imperative-census"\nsurface="explain"\n',
    'check.cjs': 'console.log("out"); console.error("err"); process.exitCode = 2;',
  });
  const expected = runGates(f.root, 'full');
  const events = [];
  const observed = await runGatesObserved(f.root, 'full', {
    output: (gate, stream, text) => events.push({ gate, stream, text }),
  });
  assert.deepEqual(
    observed.map(({ ms, ...run }) => run),
    expected.map(({ ms, ...run }) => run),
  );
  assert.equal(observed.length, 2);
  assert.ok(events.some((event) => event.stream === 'stdout' && event.text.includes('out')));
  assert.ok(events.some((event) => event.stream === 'stderr' && event.text.includes('err')));
  assert.equal(inspectCheckPlan(f.root, 'fast').gates.length, 1);
  f.write('.ai/gates.toml', registry('node check.cjs', false));
  assert.equal(
    inspectCheckPlan(f.root).gates.length,
    1,
    'untiered runner configuration supports the default operation',
  );
});

test('CLI handoff quotes repo paths and arguments without a fallback into the wrong directory', () => {
  const handoff = commandHandoff("/path/with ' quote & $(bad)", ['check', "tier'&"], true);
  assert.match(handoff.command, /&&\n/);
  assert.match(handoff.command, /rungs\.mjs/);
  assert.ok(handoff.command.includes(process.platform === 'win32' ? "''" : "'\\''"));
});

test('a pasted handoff preserves shell metacharacters in the repository path and arguments', (t) => {
  const f = fixture(t),
    nested = "space & ' $(unexpected)";
  f.write(`${nested}/.ai/rungs.mjs`, 'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));');
  const root = join(f.root, nested),
    args = ['check', "literal'&$(unexpected)"];
  const handoff = commandHandoff(root, args, true);
  const output =
    process.platform === 'win32'
      ? execFileSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', handoff.command], {
          encoding: 'utf8',
          windowsHide: true,
        })
      : execFileSync('sh', ['-c', handoff.command], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { cwd: root, args });
});

test('foreign tracker evidence remains an explicit paradigm with reachable raw source', (t) => {
  const f = fixture(t, { 'docs/milestones/index.md': '# Milestones\n\nThis project uses its own tracker.' });
  const snapshot = inspectSnapshot(f.root),
    backlog = snapshot.install.modules.find((mod) => mod.name === 'backlog');
  assert.equal(backlog.detection.state, 'paradigm');
  assert.equal(snapshot.work.items.length, 0);
  assert.ok(snapshot.sources.includes('docs/milestones/index.md'));
});
