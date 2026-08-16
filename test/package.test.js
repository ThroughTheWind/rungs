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

// F-020: `cut-release` told every consumer to gate a release with a tier that selects nothing, and
// the runner answered "is this a rungs repo?" — about a repo holding 25 registered gates. The bug
// was never the empty run; it was that the empty run accused the wrong thing, in the one procedure
// that says do not proceed until this is green.
test('a tier that selects no gate blames the tier, not the repo, and still fails', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const dir = mkdtempSync(join(tmpdir(), 'rungs-tier-'));

  try {
    mkdirSync(join(dir, '.ai'), { recursive: true });
    writeFileSync(
      join(dir, '.ai', 'gates.toml'),
      '[runner]\ntiers = ["fast", "full"]\n\n[[gates]]\nid = "only-fast"\nkind = "command"\ntier = "fast"\ncommand = "node --version"\n',
    );

    const empty = spawnSync(process.execPath, [bin, 'check', dir, 'full'], { encoding: 'utf8' });
    assert.equal(empty.status, 1, 'a release step that ran nothing must not look like a pass');
    assert.match(empty.stdout, /no gates in the full tier/);
    assert.match(empty.stdout, /1 are registered/, 'it should say how many it declined to run');
    assert.doesNotMatch(empty.stdout, /is this a rungs repo/, 'the repo is plainly a rungs repo');

    // The other branch still has to work: no registry at all is a different problem.
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
