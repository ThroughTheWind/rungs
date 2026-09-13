import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from './assert.js';
import { stopWorker } from '../src/ui/server.ts';
import { request } from './ui-helpers.js';

/** Exercise the installed CLI entry, worker paths and assets with the consumer's offline environment. */
export async function inspectPackedUi(packageRoot, root, env) {
  const started = performance.now();
  const child = spawn(process.execPath, [join(packageRoot, 'dist/cli.js'), 'ui', root, '--no-open', '--read-only'], {
    cwd: root,
    env,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const url = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Packed UI did not listen: ${output}`)), 10000);
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/#[\w-]+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Packed UI exited ${code}: ${output}`));
      });
    });
    assert.ok(performance.now() - started < 3000, 'Packed UI listens within the three-second budget.');
    const parsed = new URL(url),
      ui = { origin: parsed.origin, token: parsed.hash.slice(1) };
    const snapshot = (await request(ui, '/api/snapshot')).value;
    assert.equal(snapshot.root, root);
    assert.equal(snapshot.readOnly, true);
    assert.equal(snapshot.consistent, true);
    assert.equal(snapshot.install.pin.state, 'compatible');
    assert.equal(snapshot.install.pin.version, snapshot.toolVersion);
    assert.ok(snapshot.install.modules.some((mod) => mod.name === 'backlog' && mod.installed));
    assert.ok(snapshot.generation.length === 64);
    for (const path of ['/', '/app.js', '/style.css']) {
      const response = await fetch(`${ui.origin}${path}`);
      assert.equal(response.status, 200, `Packed ${path} is available offline.`);
      const text = await response.text();
      assert.doesNotMatch(text, /(?:src|href)=['"]https?:|@import|url\(['"]?https?:/i, 'No remote asset is loaded.');
    }
    const plan = (await request(ui, '/api/check-plan', {})).value;
    assert.equal(plan.allowed, false);
    assert.ok(plan.gates.length > 0);
    assert.equal((await request(ui, '/api/export')).value.snapshot.generation, snapshot.generation);
  } finally {
    const exit = child.exitCode === null && child.signalCode === null ? once(child, 'exit') : Promise.resolve();
    await stopWorker(child);
    await exit;
  }
}
