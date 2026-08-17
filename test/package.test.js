import { readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('the published bin points at a built executable and answers help', () => {
  const bin = resolve(root, manifest.bin.rungs);
  assert.equal(manifest.bin.rungs, 'dist/cli.js');
  assert.ok(existsSync(bin), 'pretest should build the package executable');

  const run = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /installs and maintains a repository's agentic development system/);
});

// F-020 / ADR-0008. `cut-release` told every consumer to gate a release with `--tier full`, which
// selected zero gates on any registry whose gates are all `fast` — and the runner answered "is this
// a rungs repo?" about a repo holding 25 of them, then exited as though the gates had passed. The
// bug was never the empty run; it was an empty run wearing a passing exit code, in the one
// procedure that says do not proceed until this is green.
test('a higher tier is a superset, an unknown tier is refused, and neither can look like a pass', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const dir = mkdtempSync(join(tmpdir(), 'rungs-tier-'));
  const run = (...args) => spawnSync(process.execPath, [bin, 'check', dir, ...args], { encoding: 'utf8' });

  try {
    mkdirSync(join(dir, '.ai'), { recursive: true });
    writeFileSync(
      join(dir, '.ai', 'gates.toml'),
      [
        '[runner]',
        'tiers = ["fast", "full"]',
        '',
        '[[gates]]',
        'id = "quick"',
        'kind = "command"',
        'tier = "fast"',
        'command = "node --version"',
        '',
        '[[gates]]',
        'id = "slow"',
        'kind = "command"',
        'tier = "full"',
        'command = "node --version"',
        '',
        '[[gates]]',
        'id = "always"',
        'kind = "command"',
        'command = "node --version"',
      ].join('\n'),
    );

    // fast selects the fast gate and the untiered one, and stops there.
    const fast = run('fast');
    assert.equal(fast.status, 0, fast.stdout);
    assert.match(fast.stdout, /quick/);
    assert.match(fast.stdout, /always/, 'an untiered gate runs in every tier');
    assert.doesNotMatch(fast.stdout, /slow/, 'fast must not reach a full-tier gate');

    // full is a superset of fast — the whole point of ADR-0008.
    const full = run('full');
    assert.equal(full.status, 0, full.stdout);
    for (const id of ['quick', 'slow', 'always']) assert.match(full.stdout, new RegExp(id));

    // A tier nobody declared is an error, not an empty pass.
    const bogus = run('banana');
    assert.equal(bogus.status, 1, 'an unrecognised tier must never exit 0');
    assert.match(bogus.stdout, /unknown tier "banana"/);
    assert.match(bogus.stdout, /fast, full/, 'it should name what is declared');

    // And a repo with no registry at all is still its own, different problem.
    const bare = mkdtempSync(join(tmpdir(), 'rungs-bare-'));
    try {
      const none = spawnSync(process.execPath, [bin, 'check', bare], { encoding: 'utf8' });
      assert.equal(none.status, 1);
      assert.match(none.stdout, /is this a rungs repo/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
