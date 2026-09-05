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

// F-027: `setup` read its path from args[1], so omitting the `git` subcommand put the path in the
// subcommand slot where it was discarded — and the command then wrote git config into the *current
// directory* while printing the success line about the repo you named. Measured with the published
// 0.2.0 binary before the fix: the named repo got nothing, the cwd got the driver.
test('setup refuses an unknown subcommand and never writes to the wrong repo', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const base = mkdtempSync(join(tmpdir(), 'rungs-setup-'));
  const target = join(base, 'target');
  const elsewhere = join(base, 'elsewhere');

  try {
    for (const dir of [target, elsewhere]) {
      mkdirSync(dir, { recursive: true });
      spawnSync('git', ['init', '-q', dir], { encoding: 'utf8' });
      writeFileSync(join(dir, '.gitattributes'), '*.md merge=rungs-ledger\n');
    }
    const driver = (dir) =>
      spawnSync('git', ['-C', dir, 'config', '--get', 'merge.rungs-ledger.name'], { encoding: 'utf8' }).stdout.trim();

    // The exact shape that used to silently target the cwd.
    const slipped = spawnSync(process.execPath, [bin, 'setup', target], { cwd: elsewhere, encoding: 'utf8' });
    assert.equal(slipped.status, 1, 'a mistaken subcommand must not report success');
    assert.match(slipped.stdout, /The only subcommand is/);
    assert.equal(driver(elsewhere), '', 'it must not configure the directory it happened to be run from');
    assert.equal(driver(target), '', 'and it must not configure the target either — it did nothing');

    assert.equal(spawnSync(process.execPath, [bin, 'setup', 'banana'], { cwd: elsewhere, encoding: 'utf8' }).status, 1);

    // The real form still works, and targets what it names.
    const ok = spawnSync(process.execPath, [bin, 'setup', 'git', target], { cwd: elsewhere, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stdout);
    assert.equal(driver(target), 'rungs ledger driver');
    assert.equal(driver(elsewhere), '', 'the cwd is still not the target');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// F-028: `--set` refused a malformed key but not an unknown name, then printed `set nosuch.param = 1`
// as though it had applied. The install proceeded on defaults and looked successful — the exact
// failure the malformed-key check already existed to prevent, one level up.
test('--set refuses a module or parameter that does not exist, and still accepts a real one', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const dir = mkdtempSync(join(tmpdir(), 'rungs-set-'));
  const run = (...set) =>
    spawnSync(process.execPath, [bin, 'init', dir, 'minimal', '--dry-run', ...set.flatMap((s) => ['--set', s])], {
      encoding: 'utf8',
    });

  try {
    spawnSync('git', ['init', '-q', dir], { encoding: 'utf8' });

    const badModule = run('nosuch.param=1');
    assert.equal(badModule.status, 1);
    assert.match(badModule.stdout, /module that does not exist: nosuch/);

    const badParam = run('instructions.core_budgets=999');
    assert.equal(badParam.status, 1);
    assert.match(badParam.stdout, /parameter instructions does not have: core_budgets/);
    assert.match(badParam.stdout, /core_budget/, 'the real name should be in the list it prints');

    const good = run('instructions.core_budget=150');
    assert.equal(good.status, 0, good.stdout);
    assert.match(good.stdout, /set instructions\.core_budget = 150/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a fresh tracked scaffold passes its generated empty findings register', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const dir = mkdtempSync(join(tmpdir(), 'rungs-tracked-empty-findings-'));

  try {
    const initialized = spawnSync('git', ['init', '-q', '-b', 'main', dir], { encoding: 'utf8' });
    assert.equal(initialized.status, 0, initialized.stderr);
    writeFileSync(join(dir, 'README.md'), '# Existing repository\n');
    assert.equal(spawnSync('git', ['-C', dir, 'add', 'README.md'], { encoding: 'utf8' }).status, 0);
    const committed = spawnSync(
      'git',
      ['-C', dir, '-c', 'user.name=rungs-test', '-c', 'user.email=rungs@localhost', 'commit', '-q', '-m', 'seed'],
      { encoding: 'utf8' },
    );
    assert.equal(committed.status, 0, committed.stderr);

    const install = spawnSync(process.execPath, [bin, 'init', dir, 'tracked'], { encoding: 'utf8' });
    assert.equal(install.status, 0, install.stdout || install.stderr);

    const check = spawnSync(process.execPath, [bin, 'check', dir], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stdout || check.stderr);
    assert.doesNotMatch(check.stdout, /findings-disposition-has-reason\s+.*fail/);
    assert.match(check.stdout, /findings-disposition-has-reason/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
