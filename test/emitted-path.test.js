import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';

import { addModule, contentHash, emittedFiles, writeInstallRecord } from '../src/add.ts';
import { UnsafeEmittedPathError, preflightEmittedPaths, resolveEmittedPath } from '../src/emitted-path.ts';
import { applyUpgrade, planUpgrade, readRecord } from '../src/lifecycle.ts';
import { ownedState } from '../src/detect.ts';
import { loadManifest } from '../src/manifest.ts';

const bin = resolve(import.meta.dirname, '..', 'dist', 'cli.js');

function write(root, rel, content) {
  const full = join(root, ...rel.split('/'));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function fixtureModule(dir, name = 'demo') {
  return {
    name,
    version: '2.0.0',
    rung: 0,
    summary: '',
    requires: [],
    conflicts: [],
    params: { path: { default: 'docs/demo' } },
    gates: [],
    detect: {},
    skills: {},
    provenance: { kind: 'designed', rationale: 'test fixture' },
    dir,
  };
}

const portableStorageAliases = [
  { label: 'sharp-s', left: 'ß', right: 'ss' },
  { label: 'ligature', left: 'ﬁ', right: 'fi' },
];

const compatibilitySeparators = [
  { label: 'fullwidth-reverse-solidus', character: '\uff3c' },
  { label: 'fullwidth-solidus', character: '\uff0f' },
];

const bundledSession = () => loadManifest(resolve(import.meta.dirname, '..', 'modules', 'session'));

test('emitted paths reject either platform\'s escape syntax and non-portable aliases', () => {
  const root = mkdtempSync(join(tmpdir(), 'rungs-emitted-lexical-'));
  const unsafe = [
    '../escape.md',
    'safe/../../escape.md',
    'safe\\..\\escape.md',
    'safe\\../escape.md',
    '/absolute.md',
    '\\rooted\\file.md',
    'C:\\absolute\\file.md',
    'C:drive-relative.md',
    '\\\\server\\share\\file.md',
    '\\\\?\\C:\\device.md',
    'safe/file:stream',
    'safe/NUL.txt',
    'safe/trailing.',
    'safe/line\nbreak.md',
  ];

  try {
    for (const target of unsafe) {
      assert.throws(
        () => resolveEmittedPath(root, 'demo', target),
        (error) =>
          error instanceof UnsafeEmittedPathError &&
          error.message.includes("module 'demo'") &&
          error.message.includes(JSON.stringify(target)),
        target,
      );
    }

    const loneHigh = `safe/${String.fromCharCode(0xd800)}.md`;
    const loneLow = `safe/${String.fromCharCode(0xdc00)}.md`;
    for (const target of [loneHigh, loneLow]) {
      assert.throws(
        () => resolveEmittedPath(root, 'demo', target),
        (error) =>
          error instanceof UnsafeEmittedPathError &&
          error.target === target &&
          /unpaired UTF-16 surrogate/.test(error.reason),
        'an unpaired surrogate must be refused before the host replaces or aliases it',
      );
    }

    const astral = resolveEmittedPath(root, 'demo', 'safe/astral-\u{1f680}.md');
    assert.equal(relative(realpathSync.native(root), astral.absolute).replace(/\\/g, '/'), 'safe/astral-\u{1f680}.md');

    for (const candidates of [
      [
        { moduleName: 'replacement', target: 'safe/\ufffd.md' },
        { moduleName: 'surrogate', target: loneHigh },
      ],
      [
        { moduleName: 'replacement', target: 'safe/\ufffd' },
        { moduleName: 'surrogate', target: `safe/${String.fromCharCode(0xd800)}/child.md` },
      ],
    ]) {
      assert.throws(
        () => preflightEmittedPaths(root, candidates),
        (error) =>
          error instanceof UnsafeEmittedPathError &&
          error.moduleName === 'surrogate' &&
          /unpaired UTF-16 surrogate/.test(error.reason),
        'a lone surrogate cannot become an exact or structural alias of U+FFFD',
      );
    }

    assert.throws(
      () => preflightEmittedPaths(root, [
        { moduleName: 'decomposed-after-case', target: 'safe/J\u030c.md' },
        { moduleName: 'precomposed', target: 'safe/\u01f0.md' },
      ]),
      /collides with module/,
      'canonical storage comparison catches an exact J+caron/U+01F0 alias',
    );
    assert.throws(
      () => preflightEmittedPaths(root, [
        { moduleName: 'decomposed-after-case', target: 'safe/J\u030c' },
        { moduleName: 'precomposed', target: 'safe/\u01f0/child.md' },
      ]),
      /file\/descendant collision/,
      'canonical storage comparison catches a structural J+caron/U+01F0 alias',
    );
    assert.throws(
      () => preflightEmittedPaths(root, [
        { moduleName: 'ordinary-sigma', target: 'safe/\u03a3.md' },
        { moduleName: 'final-sigma', target: 'safe/\u03c2.md' },
      ]),
      /collides with module/,
      'full-case storage comparison catches exact capital-sigma/final-sigma aliases',
    );
    assert.throws(
      () => preflightEmittedPaths(root, [
        { moduleName: 'ordinary-sigma', target: 'safe/\u03a3' },
        { moduleName: 'final-sigma', target: 'safe/\u03c2/child.md' },
      ]),
      /file\/descendant collision/,
      'full-case storage comparison catches structural capital-sigma/final-sigma aliases',
    );

    for (const { label, left, right } of portableStorageAliases) {
      for (const targets of [
        [`safe/${left}.md`, `safe/${right}.md`],
        [`safe/${right}.md`, `safe/${left}.md`],
      ]) {
        assert.throws(
          () => preflightEmittedPaths(
            root,
            targets.map((target, index) => ({ moduleName: `${label}-${index}`, target })),
          ),
          /collides with module/,
          `${label} exact storage collision is order independent: ${targets.join(', ')}`,
        );
      }

      for (const [ancestor, descendant] of [[left, right], [right, left]]) {
        const targets = [`safe/${ancestor}`, `safe/${descendant}/child.md`];
        for (const ordered of [targets, [...targets].reverse()]) {
          assert.throws(
            () => preflightEmittedPaths(
              root,
              ordered.map((target, index) => ({ moduleName: `${label}-${index}`, target })),
            ),
            /file\/descendant collision/,
            `${label} structural storage collision is order independent: ${ordered.join(', ')}`,
          );
        }
      }
    }

    const valid = resolveEmittedPath(root, 'demo', 'docs\\nested/file.md');
    assert.equal(valid.target, 'docs/nested/file.md');
    assert.equal(relative(realpathSync.native(root), valid.absolute).replace(/\\/g, '/'), 'docs/nested/file.md');

    writeFileSync(join(root, 'ordinary-file'), 'not a directory');
    assert.throws(
      () => resolveEmittedPath(root, 'demo', 'ordinary-file/child.md'),
      /deepest existing ancestor is not a directory/,
    );

    for (const targets of [
      ['planned-file', 'planned-file/child.md'],
      ['planned-file/child.md', 'planned-file'],
    ]) {
      assert.throws(
        () => preflightEmittedPaths(root, targets.map((target) => ({ moduleName: 'demo', target }))),
        /file\/descendant collision/,
        `structural collision is order independent: ${targets.join(', ')}`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('compatibility folds cannot manufacture emitted-path structure', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-compat-separator-'));

  try {
    for (const { label, character } of compatibilitySeparators) {
      const root = join(base, label);
      const flatTarget = `safe${character}file.md`;
      const nestedTarget = 'safe/file.md';
      mkdirSync(root);

      for (const targets of [
        [flatTarget, nestedTarget],
        [nestedTarget, flatTarget],
      ]) {
        const resolved = preflightEmittedPaths(
          root,
          targets.map((target, index) => ({ moduleName: `${label}-${index}`, target })),
        );
        assert.deepEqual(
          resolved.map((entry) => entry.target),
          targets,
          `${label} remains a filename character in either candidate order`,
        );
      }

      const [flat, nested] = preflightEmittedPaths(root, [
        { moduleName: `${label}-flat`, target: flatTarget },
        { moduleName: `${label}-nested`, target: nestedTarget },
      ]);

      try {
        mkdirSync(dirname(nested.absolute), { recursive: true });
        writeFileSync(flat.absolute, 'flat\n');
        writeFileSync(nested.absolute, 'nested\n');

        const flatReal = realpathSync.native(flat.absolute);
        const nestedReal = realpathSync.native(nested.absolute);
        if (flatReal === nestedReal) {
          t.diagnostic(`${label} does not coexist as a distinct filename on this filesystem`);
          continue;
        }

        assert.equal(readFileSync(flat.absolute, 'utf8'), 'flat\n');
        assert.equal(readFileSync(nested.absolute, 'utf8'), 'nested\n');
      } catch (error) {
        if (['EEXIST', 'EINVAL', 'ENOENT', 'ENOTDIR', 'EPERM'].includes(error?.code)) {
          t.diagnostic(`${label} coexistence is unavailable on this filesystem: ${error.code}`);
          continue;
        }
        throw error;
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('addModule preflights every target before writing the first safe file', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-add-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  const outside = join(base, 'outside');
  mkdirSync(consumer);
  mkdirSync(outside);
  write(moduleDir, 'files/a-safe.md', 'safe\n');
  write(moduleDir, 'files/{{path}}/unsafe.md', 'unsafe\n');
  writeFileSync(join(outside, 'sentinel.txt'), 'unchanged');
  const mod = fixtureModule(moduleDir);
  const params = { demo: { path: '../outside' } };

  try {
    for (const dryRun of [true, false]) {
      assert.throws(
        () => addModule(mod, consumer, params, { dryRun }),
        (error) =>
          error instanceof UnsafeEmittedPathError &&
          error.moduleName === 'demo' &&
          error.target === '../outside/unsafe.md',
      );
      assert.deepEqual(readdirSync(consumer), [], 'the earlier safe target was not written');
      assert.equal(readFileSync(join(outside, 'sentinel.txt'), 'utf8'), 'unchanged');
      assert.equal(existsSync(join(outside, 'unsafe.md')), false);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('canonical preflight rejects an outward alias and permits an inward directory alias', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-alias-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  const outside = join(base, 'outside');
  const alias = join(consumer, 'alias');
  mkdirSync(consumer);
  mkdirSync(outside);
  write(moduleDir, 'files/{{path}}/child.md', 'body\n');
  const mod = fixtureModule(moduleDir);

  try {
    try {
      symlinkSync(outside, alias, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('this host does not permit a directory alias');
        return;
      }
      throw error;
    }

    assert.throws(
      () => addModule(mod, consumer, { demo: { path: 'alias/missing' } }),
      /resolves outside the canonical consumer repository/,
    );
    assert.equal(existsSync(join(outside, 'missing', 'child.md')), false);

    unlinkSync(alias);
    mkdirSync(join(consumer, 'real'));
    symlinkSync(join(consumer, 'real'), alias, process.platform === 'win32' ? 'junction' : 'dir');
    addModule(mod, consumer, { demo: { path: 'alias/missing' } });
    assert.equal(readFileSync(join(consumer, 'real', 'missing', 'child.md'), 'utf8'), 'body\n');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stored unsafe parameters fail both upgrade planning and mixed-plan application before mutation', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-upgrade-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  const outside = join(base, 'outside');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  mkdirSync(outside);
  write(moduleDir, 'files/a-safe.md', 'new safe\n');
  write(moduleDir, 'files/{{path}}/unsafe.md', 'unsafe\n');
  const mod = fixtureModule(moduleDir);
  const recordText = [
    '[repo]',
    'harnesses = ["claude"]',
    '',
    '[modules.demo]',
    'version = "1.0.0"',
    'state = "managed"',
    'params = { path = "../outside" }',
    '',
    '[modules.demo.hashes]',
    `"a-safe.md" = "${contentHash('old safe\n')}"`,
    '',
  ].join('\n');
  writeFileSync(join(consumer, '.ai', 'rungs.toml'), recordText);
  writeFileSync(join(outside, 'sentinel.txt'), 'unchanged');

  try {
    const record = readRecord(consumer);
    assert.ok(record, 'the malicious value came through the stored install record');
    assert.throws(() => planUpgrade(consumer, [mod], record), UnsafeEmittedPathError);
    assert.throws(
      () => ownedState(mod, consumer, { ...record.modules.demo, skillsDir: '.claude/skills', params_all: { demo: { path: '../outside' } } }),
      UnsafeEmittedPathError,
      'doctor-owned state refuses the same stored destination before reading it',
    );

    const mixed = [{
      module: 'demo',
      from: '1.0.0',
      to: '2.0.0',
      files: [
        { rel: 'a-safe.md', state: 'missing' },
        { rel: '../outside/unsafe.md', state: 'missing' },
      ],
    }];
    assert.throws(() => applyUpgrade(consumer, [mod], record, mixed), UnsafeEmittedPathError);
    assert.throws(
      () => applyUpgrade(consumer, [mod], record, [{ ...mixed[0], files: [{ rel: 'rogue.md', state: 'missing' }] }]),
      /target 'rogue\.md' that the module does not emit/,
      'a supplied safe path must still belong to freshly generated emissions',
    );
    assert.equal(existsSync(join(consumer, 'a-safe.md')), false, 'the safe first plan entry was not written');
    assert.equal(existsSync(join(outside, 'unsafe.md')), false);
    assert.equal(readFileSync(join(outside, 'sentinel.txt'), 'utf8'), 'unchanged');
    assert.equal(readFileSync(join(consumer, '.ai', 'rungs.toml'), 'utf8'), recordText);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stored parameters cannot impersonate a reserved shared sink during plan or apply', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-stored-reserved-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  write(moduleDir, 'files/a-safe.md', 'new safe\n');
  write(moduleDir, 'files/{{path}}', 'not a gate registry\n');
  const mod = fixtureModule(moduleDir, 'session');
  const recordText = [
    '[repo]',
    'harnesses = ["claude"]',
    '',
    '[modules.session]',
    'version = "1.0.0"',
    'state = "managed"',
    'params = { path = ".ai/gates.toml" }',
    '',
    '[modules.session.hashes]',
    `"a-safe.md" = "${contentHash('old safe\n')}"`,
    '',
  ].join('\n');
  writeFileSync(join(consumer, '.ai', 'rungs.toml'), recordText);

  try {
    const record = readRecord(consumer);
    assert.ok(record);
    assert.throws(
      () => planUpgrade(consumer, [mod], record),
      (error) =>
        error instanceof UnsafeEmittedPathError &&
        error.moduleName === 'session' &&
        error.target === '.ai/gates.toml' &&
        /collides/.test(error.reason),
    );

    const plan = [{
      module: 'session',
      from: '1.0.0',
      to: '2.0.0',
      files: [
        { rel: 'a-safe.md', state: 'missing' },
        { rel: '.ai/gates.toml', state: 'missing' },
      ],
    }];
    assert.throws(
      () => applyUpgrade(consumer, [mod], record, plan),
      (error) =>
        error instanceof UnsafeEmittedPathError &&
        error.moduleName === 'session' &&
        error.target === '.ai/gates.toml' &&
        /collides/.test(error.reason),
    );
    assert.equal(existsSync(join(consumer, 'a-safe.md')), false, 'the earlier safe plan entry was not written');
    assert.equal(existsSync(join(consumer, '.ai', 'gates.toml')), false, 'the reserved sink was not created');
    assert.equal(readFileSync(join(consumer, '.ai', 'rungs.toml'), 'utf8'), recordText);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('stored APFS-alias parameters fail planning and forged application before mutation', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-stored-apfs-'));
  const mod = bundledSession();

  try {
    for (const { label, left, right } of portableStorageAliases) {
      for (const [orientation, pathPart, archivePart] of [
        ['left-right', left, right],
        ['right-left', right, left],
      ]) {
        for (const shape of ['exact', 'structural']) {
          const consumer = join(base, `${label}-${orientation}-${shape}`);
          mkdirSync(consumer);
          const path = shape === 'exact' ? `docs/${pathPart}/README.md` : `docs/${pathPart}`;
          const archive = `docs/${archivePart}`;
          const archiveReadme = `${archive}/README.md`;
          const record = {
            harnesses: [],
            modules: {
              session: {
                version: '1.2.0',
                params: { path, archive },
              },
            },
          };
          const expected = shape === 'exact' ? /collides with module/ : /file\/descendant collision/;

          assert.throws(
            () => planUpgrade(consumer, [mod], record),
            expected,
            `${label} ${orientation} ${shape} stored parameters must fail during planning`,
          );
          assert.throws(
            () => applyUpgrade(consumer, [mod], record, [{
              module: 'session',
              from: '1.2.0',
              to: mod.version,
              files: [
                { rel: path, state: 'missing' },
                { rel: archiveReadme, state: 'missing' },
              ],
            }]),
            expected,
            `${label} ${orientation} ${shape} forged plan must fail again during application`,
          );
          assert.deepEqual(readdirSync(consumer), [], `${label} ${orientation} ${shape} consumer remains empty`);
        }
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('valid nested files and alternate skills retain dry-run, record and upgrade semantics', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-valid-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  write(moduleDir, 'files/{{path}}/note.md', 'version one\n');
  write(moduleDir, 'skills/demo/SKILL.md', '---\nname: demo\ndescription: demo skill\n---\n\nbody\n');
  const mod = fixtureModule(moduleDir);
  const params = { demo: { path: 'docs/nested' } };

  try {
    const preview = addModule(mod, consumer, params, { dryRun: true, skillsDir: '.agents/skills' });
    assert.deepEqual(
      preview.map(({ disposition, target }) => ({ disposition, target })),
      [
        { disposition: 'create', target: 'docs/nested/note.md' },
        { disposition: 'skill', target: '.agents/skills/demo/SKILL.md' },
      ],
    );
    assert.equal(existsSync(join(consumer, 'docs', 'nested', 'note.md')), false);

    const actions = addModule(mod, consumer, params, { skillsDir: '.agents/skills' });
    const wrote = new Map([[mod.name, new Set(actions.map((action) => action.target))]]);
    writeInstallRecord(consumer, [mod], params, ['agents-md'], '2026-09-05', '.agents/skills', wrote);
    const record = readRecord(consumer);
    assert.ok(record);
    assert.deepEqual(
      [...emittedFiles(mod, params, '.agents/skills').keys()],
      ['docs/nested/note.md', '.agents/skills/demo/SKILL.md'],
    );
    assert.equal(planUpgrade(consumer, [mod], record)[0].files.every((file) => file.state === 'current'), true);

    write(moduleDir, 'files/{{path}}/note.md', 'version two\n');
    const plan = planUpgrade(consumer, [mod], record);
    assert.equal(plan[0].files.find((file) => file.rel === 'docs/nested/note.md').state, 'stale');
    applyUpgrade(consumer, [mod], record, plan);
    assert.equal(readFileSync(join(consumer, 'docs', 'nested', 'note.md'), 'utf8'), 'version two\n');
    assert.equal(readFileSync(join(consumer, '.agents', 'skills', 'demo', 'SKILL.md'), 'utf8').includes('demo skill'), true);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('CLI add preflights later modules, render-derived, fixed-sink and structural collisions', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-cli-'));

  const run = (name, args) => {
    const consumer = join(base, name);
    mkdirSync(consumer);
    const result = spawnSync(process.execPath, [bin, ...args, '--into', consumer], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /Nothing was written/);
    assert.deepEqual(readdirSync(consumer), [], `${name} must remain empty`);
    return result.stdout + result.stderr;
  };

  try {
    const direct = run('direct', ['add', 'adr', '--set', 'adr.path=../outside']);
    assert.match(direct, /module 'adr'.*\.\.\/outside\/README\.md/);

    const rendered = run('rendered', [
      'add',
      'workflows',
      '--set',
      'workflows.path=../../outside',
      '--set',
      'workflows.plan_path=../../outside',
    ]);
    assert.match(rendered, /module 'workflows'.*\.\.\/\.\.\/outside\/AGENTS\.md/);

    const collision = run('collision', ['add', 'session', '--set', 'session.path=.ai/rungs.toml']);
    assert.match(collision, /collides with module/);

    for (const [name, target] of [
      ['reserved-gates', '.ai/gates.toml'],
      ['reserved-agents', 'AGENTS.md'],
      ['reserved-agents-case', 'agents.md'],
    ]) {
      const reserved = run(name, ['add', 'session', '--set', `session.path=${target}`]);
      assert.match(reserved, /collides with module/);
    }

    const structural = run('structural', [
      'add',
      'session',
      '--set',
      'session.path=foo',
      '--set',
      'session.archive=foo/bar',
    ]);
    assert.match(structural, /file\/descendant collision/);

    for (const { label, left, right } of portableStorageAliases) {
      for (const [orientation, pathPart, archivePart] of [
        ['left-right', left, right],
        ['right-left', right, left],
      ]) {
        const exact = run(`${label}-${orientation}-exact`, [
          'add',
          'session',
          '--set',
          `session.path=docs/${pathPart}/README.md`,
          '--set',
          `session.archive=docs/${archivePart}`,
        ]);
        assert.match(exact, /collides with module/);

        const apfsStructural = run(`${label}-${orientation}-structural`, [
          'add',
          'session',
          '--set',
          `session.path=docs/${pathPart}`,
          '--set',
          `session.archive=docs/${archivePart}`,
        ]);
        assert.match(apfsStructural, /file\/descendant collision/);
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('upgrade treats an inward leaf symlink as diverged and never writes through it', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-leaf-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  write(moduleDir, 'files/managed.md', 'new\n');
  const mod = fixtureModule(moduleDir);
  const unrelated = join(consumer, 'unrelated.md');
  const managed = join(consumer, 'managed.md');
  writeFileSync(unrelated, 'old\n');
  try {
    try {
      symlinkSync(unrelated, managed, 'file');
    } catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('this host does not permit a file symlink');
        return;
      }
      throw error;
    }
    writeFileSync(
      join(consumer, '.ai', 'rungs.toml'),
      `[repo]\nharnesses = ["claude"]\n\n[modules.demo]\nversion = "1.0.0"\n\n[modules.demo.hashes]\n"managed.md" = "${contentHash('old\n')}"\n`,
    );
    const record = readRecord(consumer);
    const plan = planUpgrade(consumer, [mod], record);
    assert.equal(plan[0].files[0].state, 'diverged');
    assert.throws(
      () => applyUpgrade(consumer, [mod], record, [{ ...plan[0], files: [{ rel: 'managed.md', state: 'stale' }] }]),
      /will not write through it/,
    );
    assert.equal(readFileSync(unrelated, 'utf8'), 'old\n');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('a later fixed-sink leaf alias refuses the complete add before an earlier module writes', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-fixed-leaf-'));
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  const sentinel = join(consumer, 'README.md');
  const report = join(consumer, '.ai', 'render-report.md');
  writeFileSync(sentinel, '# untouched\n');

  try {
    try {
      symlinkSync(sentinel, report, 'file');
    } catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('this host does not permit a file symlink');
        return;
      }
      throw error;
    }

    const result = spawnSync(process.execPath, [bin, 'add', 'adr', '--into', consumer], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /render-report\.md.*will not write through it/);
    assert.match(result.stdout + result.stderr, /Nothing was written/);
    assert.equal(readFileSync(sentinel, 'utf8'), '# untouched\n');
    assert.equal(existsSync(join(consumer, 'AGENTS.md')), false, 'the earlier fragment phase never began');
    assert.equal(existsSync(join(consumer, 'docs', 'decisions')), false, 'the earlier module file never appeared');
    assert.equal(existsSync(join(consumer, '.ai', 'gates.toml')), false, 'the gate phase never began');
    assert.equal(existsSync(join(consumer, '.ai', 'rungs.toml')), false, 'the record phase never began');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('a later fixed-sink directory refuses the complete add before an earlier module writes', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-fixed-directory-'));
  const consumer = join(base, 'consumer');
  const report = join(consumer, '.ai', 'render-report.md');
  mkdirSync(report, { recursive: true });

  try {
    const result = spawnSync(process.execPath, [bin, 'add', 'adr', '--into', consumer], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /render-report\.md.*not a regular file/);
    assert.match(result.stdout + result.stderr, /Nothing was written/);
    assert.equal(existsSync(join(consumer, 'AGENTS.md')), false, 'the earlier fragment phase never began');
    assert.equal(existsSync(join(consumer, 'docs', 'decisions')), false, 'the earlier module file never appeared');
    assert.equal(existsSync(join(consumer, '.ai', 'gates.toml')), false, 'the gate phase never began');
    assert.equal(existsSync(join(consumer, '.ai', 'rungs.toml')), false, 'the record phase never began');
    assert.equal(existsSync(report), true, 'the obstructing directory is untouched');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('upgrade preflights a forged later directory target before writing an earlier file', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-upgrade-directory-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, 'later.md'), { recursive: true });
  write(moduleDir, 'files/a-safe.md', 'safe\n');
  write(moduleDir, 'files/later.md', 'replacement\n');
  const mod = fixtureModule(moduleDir);
  const record = { harnesses: [], modules: { demo: { version: '1.0.0' } } };
  const plan = [{
    module: 'demo',
    from: '1.0.0',
    to: '2.0.0',
    files: [
      { rel: 'a-safe.md', state: 'missing' },
      { rel: 'later.md', state: 'stale' },
    ],
  }];

  try {
    assert.throws(() => applyUpgrade(consumer, [mod], record, plan), /later\.md.*not a regular file/);
    assert.equal(existsSync(join(consumer, 'a-safe.md')), false, 'the earlier plan target was not written');
    assert.equal(existsSync(join(consumer, 'later.md')), true, 'the obstructing directory is untouched');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('upgrade refuses an existing hard-linked writable leaf before touching outside bytes', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-hardlink-upgrade-'));
  const moduleDir = join(base, 'module');
  const consumer = join(base, 'consumer');
  const outside = join(base, 'outside');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  mkdirSync(outside);
  write(moduleDir, 'files/a-safe.md', 'new safe\n');
  write(moduleDir, 'files/managed.md', 'new managed\n');
  const mod = fixtureModule(moduleDir);
  const outsideFile = join(outside, 'sentinel.md');
  const managedFile = join(consumer, 'managed.md');
  writeFileSync(outsideFile, 'old managed\n');
  linkSync(outsideFile, managedFile);
  const recordText = [
    '[repo]',
    'harnesses = ["claude"]',
    '',
    '[modules.demo]',
    'version = "1.0.0"',
    'state = "managed"',
    '',
    '[modules.demo.hashes]',
    `"managed.md" = "${contentHash('old managed\n')}"`,
    '',
  ].join('\n');
  writeFileSync(join(consumer, '.ai', 'rungs.toml'), recordText);

  try {
    const record = readRecord(consumer);
    const plan = planUpgrade(consumer, [mod], record);
    assert.equal(plan[0].files.find((file) => file.rel === 'managed.md').state, 'stale');
    assert.throws(
      () => applyUpgrade(consumer, [mod], record, plan),
      /managed\.md.*multiple hard links/,
    );
    assert.equal(existsSync(join(consumer, 'a-safe.md')), false, 'the earlier safe target was not written');
    assert.equal(readFileSync(outsideFile, 'utf8'), 'old managed\n');
    assert.equal(readFileSync(managedFile, 'utf8'), 'old managed\n');
    assert.equal(readFileSync(join(consumer, '.ai', 'rungs.toml'), 'utf8'), recordText);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('cross-phase hard-linked fixed sinks refuse the complete add atomically', () => {
  const base = mkdtempSync(join(tmpdir(), 'rungs-emitted-hardlink-fixed-'));
  const consumer = join(base, 'consumer');
  mkdirSync(join(consumer, '.ai'), { recursive: true });
  const registry = join(consumer, '.ai', 'gates.toml');
  const record = join(consumer, '.ai', 'rungs.toml');
  writeFileSync(registry, 'untouched shared bytes\n');
  linkSync(registry, record);

  try {
    const result = spawnSync(process.execPath, [bin, 'add', 'adr', '--into', consumer], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /gates\.toml.*multiple hard links/);
    assert.match(result.stdout + result.stderr, /Nothing was written/);
    assert.equal(readFileSync(registry, 'utf8'), 'untouched shared bytes\n');
    assert.equal(readFileSync(record, 'utf8'), 'untouched shared bytes\n');
    assert.equal(existsSync(join(consumer, 'AGENTS.md')), false, 'the fragment phase never began');
    assert.equal(existsSync(join(consumer, 'docs', 'decisions')), false, 'the module file phase never began');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
