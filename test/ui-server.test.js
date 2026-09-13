import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { request as httpRequest } from 'node:http';
import assert from './assert.js';
import { startUi, runUi } from '../src/ui/server.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture, item, registry, request, finished, until } from './ui-helpers.js';

async function serving(t, f, options = {}) {
  const ui = await startUi({ root: f.root, ...options });
  f.beforeCleanup(() => ui.close());
  return ui;
}

test('CLI validates UI arguments and browser failure leaves a usable foreground address', async (t) => {
  const f = fixture(t),
    cli = new URL('../dist/cli.js', import.meta.url);
  for (const args of [
    ['--port'],
    ['--port', '0'],
    ['--port', 'abc'],
    ['--port', '65536'],
    ['--port', '1', '--port', '2'],
    ['--read-only=yes'],
    ['--unknown'],
    ['a', 'b'],
  ]) {
    const run = spawnSync(process.execPath, [fileURLToPath(cli), 'ui', ...args], {
      cwd: f.root,
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.notEqual(run.status, 0, `Refuse ${args.join(' ')}`);
    assert.equal(run.error, undefined, 'Invalid arguments must not start a listener.');
  }
  const output = [],
    errors = [];
  t.mock.method(console, 'log', (line) => output.push(line));
  t.mock.method(console, 'error', (line) => errors.push(line));
  const listeners = process.listenerCount('SIGINT');
  const ui = await runUi({ root: f.root }, async () => {
    throw new Error('fixture opener unavailable');
  });
  f.beforeCleanup(() => ui.close());
  assert.ok(output.join('\n').includes(ui.url));
  assert.match(errors.join('\n'), /Browser did not open.*fixture opener unavailable/);
  assert.equal((await request(ui, '/api/snapshot')).value.git.state, 'unavailable');
  await ui.close();
  assert.equal(process.listenerCount('SIGINT'), listeners);
});

test('local UI protects reads and actions and serves only packaged inert assets', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry(),
    'check.cjs': 'require("fs").writeFileSync("executed", "bad");',
    'docs/backlog/items/WI-001.md': item(
      'WI-001',
      'Untrusted source',
      'proposed',
      '',
      '<img src="https://example.org/leak" onerror="alert(1)"> [command](javascript:alert(1))',
    ),
    'private.txt': 'not a declared inspection source',
  });
  const ui = await serving(t, f);
  assert.equal((await fetch(`${ui.origin}/api/snapshot`)).status, 401);
  assert.equal((await request(ui, '/api/snapshot', undefined, { Origin: 'https://unrelated.invalid' })).status, 403);
  // Fetch controls Host itself; use the wire-level transport to exercise rebinding protection.
  const hostileHost = await new Promise((resolve, reject) => {
    const req = httpRequest(
      `${ui.origin}/api/snapshot`,
      {
        headers: { Host: 'unrelated.invalid', Authorization: `Bearer ${ui.token}` },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(hostileHost, 403);
  const asset = await fetch(`${ui.origin}/`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(asset.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(asset.headers.get('access-control-allow-origin'), null);
  const script = await (await fetch(`${ui.origin}/app.js`)).text();
  assert.equal(
    /\.innerHTML\s*=|insertAdjacentHTML|document\.write\(/.test(script),
    false,
    'repository text never enters an HTML sink',
  );
  const snap = await request(ui, '/api/snapshot');
  assert.equal(snap.status, 200);
  assert.equal(snap.value.work.items.length, 1);
  assert.equal((await request(ui, '/api/source?path=private.txt')).status, 403);
  assert.equal((await request(ui, '/api/source?path=..%2Foutside.txt')).status, 403);
  assert.equal(
    (await request(ui, '/api/source?path=docs%2Fbacklog%2Fitems%2FWI-001.md')).value.text.includes('<img'),
    true,
    'source stays literal data',
  );
  assert.equal((await request(ui, '/api/jobs')).status, 404);
  assert.equal((await request(ui, '/api/diagnostics')).status, 404);
  assert.equal((await request(ui, '/api/preview', { operation: 'exec', command: 'bad' })).status, 400);
  assert.equal(existsSync(join(f.root, 'executed')), false);
});

test('UI check plans are single-use, current, explicit and disabled in read-only mode', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry(),
    'check.cjs': 'require("fs").writeFileSync("executed", "yes"); console.log("visible output");',
  });
  const ui = await serving(t, f);
  const first = (await request(ui, '/api/check-plan', { tier: 'full' })).value;
  assert.equal(first.allowed, true);
  assert.equal(existsSync(join(f.root, 'executed')), false);
  f.write('changed.txt', 'invalidates the displayed plan');
  const stale = (await request(ui, '/api/jobs', { planId: first.id })).value;
  const refused = await finished(ui, stale.id);
  assert.equal(refused.status, 'error');
  assert.match(refused.error, /changed after/);
  assert.equal(existsSync(join(f.root, 'executed')), false);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  const run = await request(ui, '/api/jobs', { planId: plan.id });
  assert.equal(run.status, 202);
  const done = await finished(ui, run.value.id);
  assert.equal(done.status, 'completed');
  assert.equal(done.runs[0].status, 'pass');
  assert.equal(done.result.changed, true, 'the fixture intentionally changed files');
  assert.match(done.output, /visible output/);
  assert.equal(f.read('executed'), 'yes');
  assert.equal((await request(ui, '/api/jobs', { planId: plan.id })).status, 409);
  assert.ok(f.read('.ai/.gate-ledger.jsonl').includes('fixture-command'));
  const ro = await serving(t, f, { readOnly: true });
  const blocked = (await request(ro, '/api/check-plan', {})).value;
  assert.equal(blocked.allowed, false);
  assert.equal((await request(ro, '/api/jobs', { planId: blocked.id })).status, 403);
});

test('UI refresh, source navigation and export preserve complete data while configuration changes', async (t) => {
  const f = fixture(t, {
    '.ai/rungs.toml': '[modules.backlog]\nversion="1.2.0"\nparams={root="first"}',
    'docs/first/items/WI-001.md': item('WI-001', 'First root'),
    'docs/second/items/WI-002.md': item('WI-002', 'Second root'),
  });
  const ui = await serving(t, f);
  const first = (await request(ui, '/api/snapshot')).value;
  assert.equal(first.work.items[0].id, 'WI-001');
  f.write('.ai/rungs.toml', '[modules.backlog]\nversion="1.2.0"\nparams={root="second"}');
  const fresh = (await request(ui, '/api/freshness')).value;
  assert.notEqual(first.generation, fresh.generation);
  const second = (await request(ui, '/api/snapshot')).value;
  assert.equal(second.work.items[0].id, 'WI-002');
  const exported = await request(ui, '/api/export');
  assert.equal(exported.value.snapshot.work.items[0].id, 'WI-002');
  assert.equal(exported.value.snapshot.generation, second.generation);
  assert.match(exported.headers.get('content-disposition'), /attachment/);
});

test('slow check jobs leave HTTP responsive; cancellation terminates the owned tree and never passes', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry(),
    'check.cjs':
      'const {spawn}=require("child_process"); const fs=require("fs"); const c=spawn(process.execPath,["child.cjs"],{stdio:"inherit"}); fs.writeFileSync("child.pid",String(c.pid)); setInterval(()=>console.log("still running"),60);',
    'child.cjs': 'setInterval(()=>{},100);',
  });
  const ui = await serving(t, f);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  const started = (await request(ui, '/api/jobs', { planId: plan.id })).value;
  await until(() => existsSync(join(f.root, 'child.pid')));
  const pingStart = Date.now();
  assert.equal((await request(ui, `/api/jobs/${started.id}`)).status, 200);
  assert.ok(Date.now() - pingStart < 1000, 'job polling does not wait on a synchronous command');
  assert.equal((await request(ui, '/api/jobs', { planId: plan.id })).status, 409);
  const childPid = Number(f.read('child.pid'));
  const cancelled = await request(ui, `/api/jobs/${started.id}/cancel`, {});
  assert.equal(cancelled.value.status, 'interrupted');
  assert.match(cancelled.value.termination, /terminat/i);
  await until(() => {
    try {
      process.kill(childPid, 0);
      return false;
    } catch {
      return true;
    }
  }, 5000);
  const ended = await finished(ui, started.id);
  assert.equal(ended.status, 'interrupted');
  assert.equal(
    existsSync(join(f.root, '.ai/.gate-ledger.jsonl')),
    false,
    'an interrupted incomplete run is not recorded as complete',
  );
});

test('noisy output is bounded, failures retain evidence, and the default operation supports no tiers', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry('node check.cjs', false),
    'check.cjs': 'process.stdout.write("x".repeat(350000)); console.error("failure evidence"); process.exitCode=3;',
  });
  const ui = await serving(t, f);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  assert.equal(plan.allowed, true);
  const run = (await request(ui, '/api/jobs', { planId: plan.id })).value;
  const done = await finished(ui, run.id);
  assert.equal(done.status, 'failed');
  assert.equal(done.outputTruncated, true);
  assert.ok(Buffer.byteLength(done.output) <= 256 * 1024 + 3);
  assert.match(done.runs[0].findings[0].message, /failure evidence/);
});

test('startup validates ports, reports conflicts, and shutdown closes its listener', async (t) => {
  const f = fixture(t);
  await assert.rejects(startUi({ root: f.root, port: 0 }), /port/);
  const ui = await serving(t, f);
  const port = Number(new URL(ui.origin).port);
  await assert.rejects(startUi({ root: f.root, port }), /EADDRINUSE/);
  await ui.close();
  await assert.rejects(fetch(ui.origin));
});

test('UI refuses malformed and oversized action bodies before any work runs', async (t) => {
  const f = fixture(t);
  const ui = await serving(t, f);
  for (const [body, type, status] of [
    ['{broken', 'application/json', 400],
    ['x'.repeat(20000), 'application/json', 413],
    ['{}', 'text/plain', 415],
  ]) {
    const response = await fetch(`${ui.origin}/api/check-plan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ui.token}`, 'Content-Type': type },
      body,
    });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error.message, 'string');
  }
  assert.equal((await fetch(`${ui.origin}/api/export`)).status, 401);
  assert.equal((await request(ui, '/api/jobs', {}, { Origin: 'https://other.invalid' })).status, 403);
});

test('registry and pin edits reject old plans; disabled history stays disabled', async (t) => {
  const f = fixture(t, { '.ai/gates.toml': registry(), 'check.cjs': 'require("fs").writeFileSync("executed","bad");' });
  const ui = await serving(t, f);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  f.write('.ai/gates.toml', registry('node changed.cjs'));
  const stale = (await request(ui, '/api/jobs', { planId: plan.id })).value;
  assert.equal((await finished(ui, stale.id)).status, 'error');
  const next = (await request(ui, '/api/check-plan', {})).value;
  f.write('.ai/rungs.mjs', "const pinnedPackageSpec = '@rungs/cli@0.0.0';");
  const incompatible = (await request(ui, '/api/jobs', { planId: next.id })).value;
  assert.equal((await finished(ui, incompatible.id)).status, 'error');
  assert.equal(existsSync(join(f.root, 'executed')), false);
  f.write('.ai/gates.toml', registry().replace('ledger = true', 'ledger = false'));
  assert.equal((await request(ui, '/api/snapshot')).value.gates.budget.value.state, 'disabled');
});

test('output overflow ends with an explicit error and shutdown terminates a running owned child', async (t) => {
  const f = fixture(t, {
    '.ai/gates.toml': registry(),
    'check.cjs':
      'require("fs").writeFileSync("command.pid",String(process.pid)); setInterval(()=>process.stdout.write("x".repeat(100000)),10);',
  });
  const ui = await serving(t, f);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  const run = (await request(ui, '/api/jobs', { planId: plan.id })).value;
  const failed = await finished(ui, run.id);
  assert.equal(failed.status, 'error');
  assert.match(failed.error, /exceeded.*limit/);
  await until(() => {
    try {
      process.kill(Number(f.read('command.pid')), 0);
      return false;
    } catch {
      return true;
    }
  }, 5000);
  f.write('check.cjs', 'require("fs").writeFileSync("shutdown.pid",String(process.pid));setInterval(()=>{},100);');
  const next = (await request(ui, '/api/check-plan', {})).value;
  await request(ui, '/api/jobs', { planId: next.id });
  await until(() => existsSync(join(f.root, 'shutdown.pid')));
  const pid = Number(f.read('shutdown.pid'));
  await ui.close();
  await until(() => {
    try {
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  }, 5000);
  assert.equal(existsSync(join(f.root, '.ai/.gate-ledger.jsonl')), false);
});

test('diagnostics and check jobs/export preserve more than four findings from shared engines', async (t) => {
  const f = fixture(t, {
    'AGENTS.md':
      '# Instructions\n\n' +
      Array.from({ length: 60 }, (_, n) => `You must run \`npm run missing${n}\` before committing.`).join('\n'),
    'package.json': '{"scripts":{"test":"node check.cjs"}}',
    '.ai/gates.toml':
      '[[gates]]\nid="instructions-stale-commands"\nkind="declared"\nengine="command-reference"\nmodule="instructions"\ntable="instructions/core.toml"\nwhy="Fixture command references"\n',
  });
  const ui = await serving(t, f);
  const snap = (await request(ui, '/api/snapshot')).value;
  assert.equal(snap.install.modules.find((mod) => mod.name === 'instructions').detection.state, 'theirs');
  const diagnostics = (await request(ui, '/api/diagnostics', {})).value;
  const group = diagnostics.reported.find((group) => group.gate === 'instructions-stale-commands');
  assert.equal(group.findings.length, 60);
  const plan = (await request(ui, '/api/check-plan', {})).value;
  const job = (await request(ui, '/api/jobs', { planId: plan.id })).value;
  const done = await finished(ui, job.id);
  assert.equal(done.status, 'failed');
  assert.deepEqual(done.runs[0].findings, group.findings);
  const exported = (await request(ui, '/api/export')).value;
  assert.deepEqual(exported.jobs[0].runs[0].findings, group.findings);
  assert.deepEqual(exported.diagnostics, diagnostics);
});

test('continuous edits mark an in-flight snapshot inconsistent and invalidate previews', async (t) => {
  const f = fixture(t, {
    'docs/backlog/items/WI-001.md': item('WI-001', 'Finished', 'done'),
    'volatile.txt': 'initial',
  });
  const ui = await serving(t, f);
  const preview = (await request(ui, '/api/preview', { operation: 'archive' })).value;
  let n = 0;
  const writer = setInterval(() => f.write('volatile.txt', String(++n).repeat(50000)), 3);
  try {
    const snapshot = (await request(ui, '/api/snapshot')).value;
    assert.equal(snapshot.consistent, false);
    assert.notEqual(snapshot.generation, preview.generation);
  } finally {
    clearInterval(writer);
  }
  const current = (await request(ui, '/api/snapshot')).value;
  assert.equal(current.consistent, true);
  assert.notEqual(current.generation, preview.generation);
});
