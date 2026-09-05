import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, relative, resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const combinedOutput = (run) => [run.stdout, run.stderr].filter(Boolean).join('\n');
const withoutAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

function expectOk(run, label) {
  assert.equal(run.error, undefined, `${label}: ${run.error?.message ?? ''}`);
  assert.equal(run.status, 0, `${label}: ${combinedOutput(run)}`);
  return run;
}

function runNpm(args, options = {}) {
  const npmEntry = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(dirname(dirname(process.execPath)), 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].find((candidate) => candidate && existsSync(candidate));
  const common = { encoding: 'utf8', ...options };
  return npmEntry
    ? spawnSync(process.execPath, [npmEntry, ...args], common)
    : spawnSync('npm', args, common);
}

function runGit(repo, args) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function gitText(repo, args) {
  return expectOk(runGit(repo, args), `git ${args.join(' ')}`).stdout.trim();
}

function gitState(repo) {
  return {
    head: gitText(repo, ['rev-parse', 'HEAD']),
    symbolicHead: gitText(repo, ['symbolic-ref', 'HEAD']),
    refs: gitText(repo, ['for-each-ref', '--sort=refname', '--format=%(refname)=%(objectname)', 'refs/heads', 'refs/remotes']),
    status: gitText(repo, ['status', '--porcelain=v1', '--untracked-files=all']),
  };
}

function gitFiles(repo, includeUntracked = false) {
  const args = includeUntracked
    ? ['ls-files', '--cached', '--others', '--exclude-standard', '-z']
    : ['ls-files', '-z'];
  return expectOk(runGit(repo, args), `git ${args.join(' ')}`).stdout.split('\0').filter(Boolean).sort();
}

function trackedDigest(repo) {
  const hash = createHash('sha256');
  for (const file of gitFiles(repo)) {
    hash.update(file).update('\0').update(readFileSync(join(repo, file))).update('\0');
  }
  return hash.digest('hex');
}

function isWithin(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function parsePackResult(stdout) {
  const start = stdout.search(/^\[/m);
  assert.notEqual(start, -1, `npm pack did not return JSON: ${stdout}`);
  const parsed = JSON.parse(stdout.slice(start));
  assert.equal(parsed.length, 1, 'npm pack should describe exactly one artifact');
  return parsed[0];
}

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

test('a packed candidate retrofits an existing repository without taking over its authorities', () => {
  const producerStatus = gitText(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'rungs-existing-consumer-'));
  const packRoot = join(temporaryRoot, 'pack');
  const toolRoot = join(temporaryRoot, 'tool');
  const consumer = join(temporaryRoot, 'consumer');
  const npmCache = join(temporaryRoot, 'npm-cache');
  for (const dir of [packRoot, toolRoot, consumer, npmCache]) mkdirSync(dir, { recursive: true });

  const packageEnv = { ...process.env, npm_config_cache: npmCache };
  const initArgs = [
    'init',
    consumer,
    'tracked',
    '--set',
    'backlog.id_prefix=NEXT',
    '--set',
    'findings.id_prefix=AF',
  ];

  try {
    const packedCandidate = parsePackResult(
      expectOk(
        runNpm(['pack', '.', '--json', '--pack-destination', packRoot], { cwd: root, env: packageEnv }),
        'pack candidate',
      ).stdout,
    );
    assert.equal(packedCandidate.name, '@rungs/cli');
    assert.equal(packedCandidate.version, manifest.version);
    const candidateTarball = join(packRoot, packedCandidate.filename);
    const candidateIntegrity = `sha512-${createHash('sha512').update(readFileSync(candidateTarball)).digest('base64')}`;
    assert.equal(candidateIntegrity, packedCandidate.integrity, 'the candidate bytes must match npm\'s integrity');

    const dependencyVersion = manifest.dependencies['smol-toml'];
    assert.match(dependencyVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'the runtime dependency must be exact');
    const dependencySpec = `smol-toml@${dependencyVersion}`;
    const packedDependency = parsePackResult(
      expectOk(
        runNpm(['pack', dependencySpec, '--json', '--ignore-scripts', '--pack-destination', packRoot], {
          cwd: packRoot,
          env: packageEnv,
        }),
        `pack ${dependencySpec}`,
      ).stdout,
    );
    assert.equal(`${packedDependency.name}@${packedDependency.version}`, dependencySpec);
    const dependencyTarball = join(packRoot, packedDependency.filename);

    const installFlags = [
      '--offline',
      '--prefix',
      toolRoot,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--cache',
      npmCache,
    ];
    expectOk(
      runNpm(['install', ...installFlags, dependencyTarball], { cwd: toolRoot, env: packageEnv }),
      'install exact runtime dependency',
    );
    expectOk(
      runNpm(['install', ...installFlags, candidateTarball], { cwd: toolRoot, env: packageEnv }),
      'install packed candidate',
    );

    const installedPackageRoot = realpathSync(join(toolRoot, 'node_modules', '@rungs', 'cli'));
    const installedDependencyRoot = realpathSync(join(toolRoot, 'node_modules', 'smol-toml'));
    assert.ok(isWithin(toolRoot, installedPackageRoot), 'the candidate must resolve inside the isolated tool prefix');
    assert.ok(isWithin(toolRoot, installedDependencyRoot), 'the dependency must resolve inside the isolated tool prefix');
    assert.equal(isWithin(root, installedPackageRoot), false, 'the candidate must not resolve from the producer');
    assert.equal(isWithin(root, installedDependencyRoot), false, 'the dependency must not resolve from the producer');
    const installedManifest = JSON.parse(readFileSync(join(installedPackageRoot, 'package.json'), 'utf8'));
    const installedDependency = JSON.parse(readFileSync(join(installedDependencyRoot, 'package.json'), 'utf8'));
    assert.equal(installedManifest.name, '@rungs/cli');
    assert.equal(installedManifest.version, manifest.version);
    assert.deepEqual(installedManifest.bin, { rungs: 'dist/cli.js' });
    assert.equal(installedManifest.dependencies['smol-toml'], dependencyVersion);
    assert.equal(installedDependency.name, 'smol-toml');
    assert.equal(installedDependency.version, dependencyVersion);
    const installedBin = join(toolRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'rungs.cmd' : 'rungs');
    assert.ok(existsSync(installedBin), 'npm should expose the installed package bin in the isolated prefix');

    const isolatedEnv = { ...process.env };
    for (const key of Object.keys(isolatedEnv)) {
      if (key === 'INIT_CWD' || key.startsWith('npm_package_')) delete isolatedEnv[key];
    }
    isolatedEnv.NODE_PATH = '';
    isolatedEnv.NO_COLOR = '1';
    isolatedEnv.FORCE_COLOR = '0';
    isolatedEnv.RUNGS_DATE = '2026-09-05';
    isolatedEnv.npm_config_cache = npmCache;
    isolatedEnv.npm_config_offline = 'true';
    isolatedEnv.npm_config_audit = 'false';
    isolatedEnv.npm_config_fund = 'false';
    isolatedEnv.PATH = (process.env.PATH ?? '')
      .split(delimiter)
      .filter((entry) => entry && !isWithin(root, entry))
      .join(delimiter);
    assert.equal(isolatedEnv.PATH.toLowerCase().includes(root.toLowerCase()), false);

    const candidate = (...args) =>
      runNpm(['exec', '--offline', '--prefix', toolRoot, '--', 'rungs', ...args], {
        cwd: consumer,
        env: isolatedEnv,
      });

    expectOk(runGit(consumer, ['init', '-q', '-b', 'main']), 'initialise consumer git repository');
    expectOk(runGit(consumer, ['config', 'core.autocrlf', 'false']), 'disable fixture line-ending conversion');
    const existing = new Map([
      ['README.md', '# Existing repository\n\nThis project predates Rungs.\n'],
      ['AGENTS.md', '# Existing agent authority\n\nKeep the repository headless and deterministic.\n'],
      ['CLAUDE.md', '# Existing Claude authority\n\nRead AGENTS.md before changing this repository.\n'],
      ['.gitignore', '# Existing ignores\nscratch/\n'],
      ['docs/backlog.md', '# Existing backlog authority\n\nProduct work remains in this historical flat file.\n'],
      ['docs/decisions.md', '# Existing decision authority\n\nDEC-001 keeps product decisions in this register.\n'],
      ['docs/session-log.md', '# Existing session history\n\n2026-09-04: discovery handoff preserved.\n'],
      [
        '.github/scripts/check-existing.mjs',
        [
          "import { readFileSync } from 'node:fs';",
          "const backlog = readFileSync(new URL('../../docs/backlog.md', import.meta.url), 'utf8');",
          "if (!backlog.includes('Existing backlog authority')) throw new Error('existing authority changed');",
          "console.log('existing validator passed');",
          '',
        ].join('\n'),
      ],
    ]);
    for (const [rel, content] of existing) {
      mkdirSync(dirname(join(consumer, rel)), { recursive: true });
      writeFileSync(join(consumer, rel), content);
    }
    expectOk(runGit(consumer, ['add', '--all']), 'stage seed repository');
    expectOk(
      runGit(consumer, [
        '-c',
        'user.name=rungs-test',
        '-c',
        'user.email=rungs@localhost',
        'commit',
        '-q',
        '-m',
        'seed existing repository',
      ]),
      'commit seed repository',
    );
    const seedCommit = gitText(consumer, ['rev-parse', 'HEAD']);
    const seedFiles = gitFiles(consumer);
    expectOk(
      runGit(consumer, ['remote', 'add', 'origin', 'https://example.invalid/arena-lab.git']),
      'add inert origin remote',
    );
    expectOk(runGit(consumer, ['update-ref', 'refs/remotes/origin/main', seedCommit]), 'create origin/main');
    expectOk(runGit(consumer, ['switch', '-q', '-c', 'consumer/canary']), 'create canary branch');
    expectOk(runGit(consumer, ['branch', '-D', 'main']), 'remove local main');
    assert.equal(runGit(consumer, ['show-ref', '--verify', '--quiet', 'refs/heads/main']).status, 1);
    expectOk(runGit(consumer, ['show-ref', '--verify', '--quiet', 'refs/remotes/origin/main']), 'verify origin/main');

    const beforeReadOnlyCommands = gitState(consumer);
    const doctor = expectOk(candidate('doctor', consumer), 'packed doctor');
    assert.match(doctor.stdout, /not a rungs repo/);
    const dryRun = expectOk(candidate(...initArgs, '--dry-run'), 'packed tracked init dry-run');
    assert.match(dryRun.stdout, /dry run/i);
    assert.deepEqual(gitState(consumer), beforeReadOnlyCommands, 'doctor and dry-run must not change files or refs');

    const installed = expectOk(candidate(...initArgs), 'packed tracked init');
    assert.match(installed.stdout, /adopting 1 existing validator/);
    const installedFiles = gitFiles(consumer, true);
    const generatedFiles = installedFiles.filter((file) => !seedFiles.includes(file));
    const allowedGeneratedPath = (file) =>
      file.startsWith('.ai/') ||
      file.startsWith('.claude/') ||
      file.startsWith('docs/backlog/') ||
      file.startsWith('docs/decisions/');
    assert.deepEqual(
      generatedFiles.filter((file) => !allowedGeneratedPath(file)),
      [],
      'tracked init should write only its declared repository-infrastructure families',
    );
    for (const required of ['.ai/gates.toml', '.ai/rungs.mjs', '.ai/rungs.toml', 'docs/backlog/BACKLOG.md']) {
      assert.ok(generatedFiles.includes(required), `${required} should be generated`);
    }

    for (const rel of [
      'README.md',
      'CLAUDE.md',
      'docs/backlog.md',
      'docs/decisions.md',
      'docs/session-log.md',
      '.github/scripts/check-existing.mjs',
    ]) {
      assert.equal(readFileSync(join(consumer, rel), 'utf8'), existing.get(rel), `${rel} must remain byte-for-byte`);
    }
    const agents = readFileSync(join(consumer, 'AGENTS.md'), 'utf8');
    assert.equal(agents.slice(0, existing.get('AGENTS.md').length), existing.get('AGENTS.md'));
    assert.match(agents.slice(existing.get('AGENTS.md').length), /^\n<!-- rungs:begin instructions@/);
    const gitignore = readFileSync(join(consumer, '.gitignore'), 'utf8');
    assert.equal(gitignore.slice(0, existing.get('.gitignore').length), existing.get('.gitignore'));
    assert.match(gitignore.slice(existing.get('.gitignore').length), /^\n# rungs:begin gates@/);

    const backlogBoard = readFileSync(join(consumer, 'docs', 'backlog', 'BACKLOG.md'), 'utf8');
    const findings = readFileSync(join(consumer, 'docs', 'backlog', 'FINDINGS.md'), 'utf8');
    const record = readFileSync(join(consumer, '.ai', 'rungs.toml'), 'utf8');
    const registry = readFileSync(join(consumer, '.ai', 'gates.toml'), 'utf8');
    assert.match(backlogBoard, /NEXT-ID: NEXT-001/);
    assert.match(findings, /NEXT-ID: AF-001/);
    assert.match(record, /\[modules\.backlog\][\s\S]*?params\s*=\s*\{[^}]*id_prefix = "NEXT"/);
    assert.match(record, /\[modules\.findings\][\s\S]*?params\s*=\s*\{[^}]*id_prefix = "AF"/);
    assert.match(registry, /id\s*=\s*"adopted-check-existing"/);
    assert.match(registry, /command\s*=\s*"node \.github\/scripts\/check-existing\.mjs"/);

    const launcher = readFileSync(join(consumer, '.ai', 'rungs.mjs'), 'utf8');
    const exactPackage = `@rungs/cli@${manifest.version}`;
    assert.equal(launcher.split(exactPackage).length - 1, 1, 'the launcher owns one exact package spec');
    const launcherHash = createHash('sha256').update(launcher.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
    assert.ok(record.includes(`".ai/rungs.mjs" = "${launcherHash}"`), 'the launcher hash must be recorded');
    const consumerCorpus = installedFiles.map((file) => readFileSync(join(consumer, file), 'utf8')).join('\n');
    assert.equal([...consumerCorpus.matchAll(/@rungs\/cli@\d+[0-9A-Za-z.+-]*/g)].length, 1);
    assert.doesNotMatch(consumerCorpus, /@rungs\/cli@(latest|next|beta|\^|~|\*)/);
    assert.equal(consumerCorpus.includes(candidateTarball), false, 'the local candidate path must not leak into the repo');
    assert.equal(consumerCorpus.includes(packedCandidate.filename), false, 'the tarball name must not become an authority');
    for (const rel of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'node_modules']) {
      assert.equal(existsSync(join(consumer, rel)), false, `consumer must not gain ${rel}`);
    }

    expectOk(runGit(consumer, ['add', '--all']), 'stage Rungs adoption');
    expectOk(
      runGit(consumer, [
        '-c',
        'user.name=rungs-test',
        '-c',
        'user.email=rungs@localhost',
        'commit',
        '-q',
        '-m',
        'adopt repository infrastructure',
      ]),
      'commit Rungs adoption',
    );
    const adoptedCommit = gitText(consumer, ['rev-parse', 'HEAD']);
    assert.notEqual(adoptedCommit, seedCommit);
    const adoptedDigest = trackedDigest(consumer);
    const repeatedInit = candidate(...initArgs);
    assert.equal(repeatedInit.status, 1, combinedOutput(repeatedInit));
    assert.match(repeatedInit.stdout, /already initialised/);
    assert.equal(trackedDigest(consumer), adoptedDigest);
    assert.equal(gitText(consumer, ['status', '--porcelain=v1', '--untracked-files=all']), '');

    const firstCheck = expectOk(candidate('check', consumer, 'full'), 'first full consumer check');
    const firstCheckText = withoutAnsi(firstCheck.stdout);
    assert.match(firstCheckText, /pass\s+backlog-merged-status/);
    assert.match(firstCheckText, /pass\s+adopted-check-existing/);
    assert.doesNotMatch(firstCheckText, /cannot read git branches/);
    assert.match(firstCheckText, /0 fail/);
    const ledger = join(consumer, '.ai', '.gate-ledger.jsonl');
    const firstLedgerCount = readFileSync(ledger, 'utf8').trim().split(/\r?\n/).filter(Boolean).length;
    assert.ok(firstLedgerCount > 0, 'the first check should record gate observations');
    assert.equal(gitText(consumer, ['status', '--porcelain=v1', '--untracked-files=all']), '');
    assert.equal(trackedDigest(consumer), adoptedDigest);

    const secondCheck = expectOk(candidate('check', consumer, 'full'), 'second full consumer check');
    const secondCheckText = withoutAnsi(secondCheck.stdout);
    assert.match(secondCheckText, /pass\s+backlog-merged-status/);
    assert.match(secondCheckText, /pass\s+adopted-check-existing/);
    assert.match(secondCheckText, /0 fail/);
    const secondLedgerCount = readFileSync(ledger, 'utf8').trim().split(/\r?\n/).filter(Boolean).length;
    assert.equal(secondLedgerCount, firstLedgerCount * 2, 'the ignored append-only ledger should record both runs');
    assert.equal(gitText(consumer, ['status', '--porcelain=v1', '--untracked-files=all']), '');
    assert.equal(trackedDigest(consumer), adoptedDigest);

    const preview = expectOk(candidate('upgrade', consumer), 'same-version upgrade preview');
    assert.match(preview.stdout, /0 to update\s*·\s*0 diverged/);
    assert.equal(trackedDigest(consumer), adoptedDigest, 'upgrade preview must be read-only');
    const applyDigests = [];
    const applyDiffs = [];
    for (let pass = 1; pass <= 2; pass++) {
      const applied = expectOk(candidate('upgrade', consumer, '--apply'), `same-version upgrade apply ${pass}`);
      assert.match(applied.stdout, /0 to update\s*·\s*0 diverged/);
      applyDigests.push(trackedDigest(consumer));
      applyDiffs.push(gitText(consumer, ['diff', '--no-ext-diff', '--']));
      assert.equal(
        gitText(consumer, ['status', '--porcelain=v1', '--untracked-files=all']),
        '',
        `same-version upgrade apply ${pass} must leave the consumer clean`,
      );
    }
    const finalPreview = expectOk(candidate('upgrade', consumer), 'post-apply upgrade preview');
    assert.match(finalPreview.stdout, /0 to update\s*·\s*0 diverged/);

    const resolvedTemporaryRoot = realpathSync(temporaryRoot);
    const resolvedConsumer = realpathSync(consumer);
    assert.ok(isWithin(resolvedTemporaryRoot, resolvedConsumer) && resolvedConsumer !== resolvedTemporaryRoot);
    expectOk(runGit(resolvedConsumer, ['reset', '--hard', seedCommit]), 'rollback tracked consumer files');
    expectOk(runGit(resolvedConsumer, ['clean', '-fdx']), 'rollback untracked consumer files');
    assert.equal(gitText(consumer, ['rev-parse', 'HEAD']), seedCommit);
    assert.deepEqual(gitFiles(consumer), seedFiles);
    assert.equal(gitText(consumer, ['status', '--porcelain=v1', '--untracked-files=all']), '');
    assert.deepEqual(gitState(consumer), beforeReadOnlyCommands, 'rollback must restore the original refs and branch');
    for (const [rel, content] of existing) {
      assert.equal(readFileSync(join(consumer, rel), 'utf8'), content, `${rel} must be restored by rollback`);
    }
    assert.deepEqual(
      applyDigests,
      [adoptedDigest, adoptedDigest],
      `same-version applies must both be byte-idempotent:\n${applyDiffs.filter(Boolean).join('\n---\n')}`,
    );
  } finally {
    const resolvedTemporaryRoot = realpathSync(temporaryRoot);
    const resolvedSystemTemp = realpathSync(tmpdir());
    assert.ok(
      resolvedTemporaryRoot !== resolvedSystemTemp && isWithin(resolvedSystemTemp, resolvedTemporaryRoot),
      `refusing to remove non-temporary path: ${resolvedTemporaryRoot}`,
    );
    rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
    assert.equal(
      gitText(root, ['status', '--porcelain=v1', '--untracked-files=all']),
      producerStatus,
      'packing and running the consumer journey must not change the producer checkout',
    );
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
