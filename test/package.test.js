import { readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, resolve, join } from 'node:path';
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

test('a consumer gets one exact launcher shared by local instructions and CI', () => {
  const bin = resolve(root, manifest.bin.rungs);
  const dir = mkdtempSync(join(tmpdir(), 'rungs-exact-launcher-'));

  try {
    assert.equal(spawnSync('git', ['init', '-q', '-b', 'main', dir], { encoding: 'utf8' }).status, 0);
    writeFileSync(join(dir, 'README.md'), '# Consumer\n');
    assert.equal(spawnSync('git', ['-C', dir, 'add', 'README.md'], { encoding: 'utf8' }).status, 0);
    assert.equal(
      spawnSync(
        'git',
        ['-C', dir, '-c', 'user.name=rungs-test', '-c', 'user.email=rungs@localhost', 'commit', '-q', '-m', 'seed'],
        { encoding: 'utf8' },
      ).status,
      0,
    );

    const installed = spawnSync(process.execPath, [bin, 'init', dir, 'disciplined'], { encoding: 'utf8' });
    assert.equal(installed.status, 0, installed.stdout || installed.stderr);

    const launcherPath = join(dir, '.ai', 'rungs.mjs');
    const launcher = readFileSync(launcherPath, 'utf8');
    const exact = `@rungs/cli@${manifest.version}`;
    assert.equal(launcher.split(exact).length - 1, 1);

    const instructions = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.match(instructions, /node \.ai\/rungs\.mjs check/);

    const workflow = readFileSync(join(dir, '.github', 'workflows', 'checks.yml'), 'utf8');
    assert.match(workflow, /run: node \.ai\/rungs\.mjs check/);
    assert.doesNotMatch(workflow, /npx @rungs\/cli check/);

    const record = readFileSync(join(dir, '.ai', 'rungs.toml'), 'utf8');
    assert.match(record, /"\.ai\/rungs\.mjs" = "[a-f0-9]{12}"/);

    const fakeNpm = join(dir, 'fake-npm.mjs');
    const log = join(dir, 'fake-npm-args.json');
    writeFileSync(
      fakeNpm,
      [
        "import { writeFileSync } from 'node:fs';",
        "writeFileSync(process.env.RUNGS_LAUNCHER_LOG, JSON.stringify(process.argv.slice(2)));",
        'process.exit(Number(process.env.RUNGS_LAUNCHER_EXIT));',
        '',
      ].join('\n'),
    );
    const run = spawnSync(process.execPath, [launcherPath, 'check', 'fast', 'literal&not-shell'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_execpath: fakeNpm,
        PATH: `${dirname(fakeNpm)}${delimiter}${process.env.PATH ?? ''}`,
        RUNGS_LAUNCHER_LOG: log,
        RUNGS_LAUNCHER_EXIT: '23',
      },
    });
    assert.equal(run.status, 23, run.stderr);
    assert.deepEqual(JSON.parse(readFileSync(log, 'utf8')), [
      'exec',
      '--yes',
      `--package=${exact}`,
      '--',
      'rungs',
      'check',
      'fast',
      'literal&not-shell',
    ]);

    const upgradeLog = join(dir, 'fake-npm-upgrade-args.json');
    const upgrade = spawnSync(process.execPath, [launcherPath, 'upgrade', '--to', '2.0.0-beta.1', '--apply'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_execpath: fakeNpm,
        RUNGS_LAUNCHER_LOG: upgradeLog,
        RUNGS_LAUNCHER_EXIT: '0',
      },
    });
    assert.equal(upgrade.status, 0, upgrade.stderr);
    assert.deepEqual(JSON.parse(readFileSync(upgradeLog, 'utf8')), [
      'exec',
      '--yes',
      '--package=@rungs/cli@2.0.0-beta.1',
      '--',
      'rungs',
      'upgrade',
      '--apply',
    ]);

    const mutable = spawnSync(process.execPath, [launcherPath, 'upgrade', '--to', 'latest', '--apply'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, npm_execpath: fakeNpm, RUNGS_LAUNCHER_LOG: join(dir, 'must-not-run.json') },
    });
    assert.equal(mutable.status, 1);
    assert.match(mutable.stderr, /requires an exact version/);
    assert.equal(existsSync(join(dir, 'must-not-run.json')), false, 'a mutable selector never reaches npm');

    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    assert.equal(manifest.dependencies['smol-toml'], '1.8.0');
    assert.equal(lock.packages[''].dependencies['smol-toml'], '1.8.0');
    assert.equal(lock.packages['node_modules/smol-toml'].version, '1.8.0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
