import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

import { applyArchive, planArchive } from '../src/backlog.ts';
import { UnsafeEmittedPathError } from '../src/emitted-path.ts';

const bin = join(import.meta.dirname, '..', 'dist', 'cli.js');

function write(root, relativePath, content) {
  const path = join(root, ...relativePath.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture(prefix = 'rungs-archive-boundary-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  write(
    root,
    'docs/backlog/items/WI-001-done.md',
    '---\nid: WI-001\nstatus: done\ntype: feature\n---\n\nDone.\n',
  );
  write(root, 'docs/backlog/BACKLOG.md', '[Done](items/WI-001-done.md)\n');
  return root;
}

test('archive planning refuses portable escapes and outward backlog aliases before inspection', (t) => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'rungs-archive-outside-'));

  try {
    for (const configured of [
      '../outside',
      'docs/../../outside',
      'docs\\..\\outside',
      '/absolute',
      '\\rooted',
      'C:drive-relative',
      'C:\\absolute',
    ]) {
      assert.throws(
        () => planArchive(root, configured),
        (error) => error instanceof UnsafeEmittedPathError && error.target.includes(configured),
        configured,
      );
    }

    write(
      root,
      '.ai/rungs.toml',
      '[repo]\nharnesses = []\n\n[modules.backlog]\nversion = "1.0.0"\nparams = { root = "../outside" }\n',
    );
    const stored = spawnSync(process.execPath, [bin, 'backlog', 'archive', root, '--dry-run'], {
      encoding: 'utf8',
    });
    assert.equal(stored.status, 1, stored.stdout + stored.stderr);
    assert.match(stored.stdout + stored.stderr, /refused:.*parent traversal/is);

    const items = join(root, 'docs', 'backlog', 'items');
    rmSync(items, { recursive: true });
    write(outside, 'WI-002-done.md', '---\nid: WI-002\nstatus: done\ntype: feature\n---\n');
    try {
      symlinkSync(outside, items, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (process.platform === 'win32' && error && ['EPERM', 'EACCES'].includes(error.code)) {
        t.skip('this host does not permit a directory junction');
        return;
      }
      throw error;
    }

    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /items/.test(error.target),
      'an outward items alias must not make archive inspect an outside tree',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('outward aliases at the backlog root and an archive leaf are refused', (t) => {
  const root = fixture('rungs-archive-root-alias-');
  const outside = mkdtempSync(join(tmpdir(), 'rungs-archive-root-outside-'));
  const backlog = join(root, 'docs', 'backlog');

  try {
    rmSync(backlog, { recursive: true });
    write(outside, 'items/WI-001-done.md', '---\nid: WI-001\nstatus: done\ntype: feature\n---\n');
    try {
      symlinkSync(outside, backlog, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (process.platform === 'win32' && error && ['EPERM', 'EACCES'].includes(error.code)) {
        t.skip('this host does not permit a directory junction');
        return;
      }
      throw error;
    }
    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /items/.test(error.target),
      'the configured backlog root may not redirect item discovery outside the repository',
    );

    rmSync(backlog, { recursive: true });
    write(
      root,
      'docs/backlog/items/WI-001-done.md',
      '---\nid: WI-001\nstatus: done\ntype: feature\n---\n',
    );
    mkdirSync(join(root, 'docs', 'backlog', 'archive'), { recursive: true });
    const leaf = join(root, 'docs', 'backlog', 'archive', 'WI-001-done.md');
    symlinkSync(outside, leaf, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /WI-001-done\.md/.test(error.target),
      'an occupied archive leaf may not redirect the move outside the repository',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('the exact outward archive junction is refused before dry-run or apply can claim success', (t) => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'rungs-archive-f049-'));
  const archive = join(root, 'docs', 'backlog', 'archive');
  const item = join(root, 'docs', 'backlog', 'items', 'WI-001-done.md');
  const board = join(root, 'docs', 'backlog', 'BACKLOG.md');
  const itemBefore = readFileSync(item);
  const boardBefore = readFileSync(board);
  const safePlan = planArchive(root);

  try {
    try {
      symlinkSync(outside, archive, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (process.platform === 'win32' && error && ['EPERM', 'EACCES'].includes(error.code)) {
        t.skip('this host does not permit a directory junction');
        return;
      }
      throw error;
    }

    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /archive/.test(error.target),
    );
    const dryRun = spawnSync(process.execPath, [bin, 'backlog', 'archive', root, '--dry-run'], {
      encoding: 'utf8',
    });
    assert.equal(dryRun.status, 1, dryRun.stdout + dryRun.stderr);
    assert.match(dryRun.stdout + dryRun.stderr, /refused:.*backlog archive.*archive/is);
    assert.match(dryRun.stdout + dryRun.stderr, /Nothing was written/);
    assert.throws(
      () => applyArchive(root, safePlan),
      (error) => error instanceof UnsafeEmittedPathError && /archive/.test(error.target),
      'application must revalidate an archive alias created after planning',
    );
    assert.deepEqual(readFileSync(item), itemBefore);
    assert.deepEqual(readFileSync(board), boardBefore);
    assert.deepEqual(readdirSync(outside), []);
    assert.equal(existsSync(join(outside, 'WI-001-done.md')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('archive planning refuses a hard-linked rewrite and an occupied archive leaf atomically', () => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'rungs-archive-hardlink-'));
  const board = join(root, 'docs', 'backlog', 'BACKLOG.md');
  const outsideBoard = join(outside, 'board.md');
  const item = join(root, 'docs', 'backlog', 'items', 'WI-001-done.md');
  const itemBefore = readFileSync(item);
  const boardBefore = readFileSync(board);

  try {
    linkSync(board, outsideBoard);
    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /multiple hard links/.test(error.reason),
    );
    assert.deepEqual(readFileSync(item), itemBefore);
    assert.deepEqual(readFileSync(board), boardBefore);
    assert.deepEqual(readFileSync(outsideBoard), boardBefore);

    unlinkSync(outsideBoard);
    mkdirSync(join(root, 'docs', 'backlog', 'archive'), { recursive: true });
    write(root, 'docs/backlog/archive/WI-001-done.md', 'occupied\n');
    assert.throws(
      () => planArchive(root),
      (error) => error instanceof UnsafeEmittedPathError && /already exists/.test(error.reason),
    );
    assert.deepEqual(readFileSync(item), itemBefore);
    assert.deepEqual(readFileSync(board), boardBefore);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('apply revalidates forged and stale plans before the first rewrite or move', () => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'rungs-archive-forged-'));
  const item = join(root, 'docs', 'backlog', 'items', 'WI-001-done.md');
  const board = join(root, 'docs', 'backlog', 'BACKLOG.md');
  const itemBefore = readFileSync(item);
  const plan = planArchive(root);

  try {
    const forged = structuredClone(plan);
    forged.moves[0].to = `${relative(root, outside).replace(/\\/g, '/')}/WI-001-done.md`;
    assert.throws(() => applyArchive(root, forged), UnsafeEmittedPathError);
    assert.deepEqual(readFileSync(item), itemBefore);
    assert.equal(existsSync(join(outside, 'WI-001-done.md')), false);

    rmSync(board);
    mkdirSync(board);
    assert.throws(
      () => applyArchive(root, plan),
      (error) => error instanceof UnsafeEmittedPathError && /BACKLOG\.md/.test(error.target),
    );
    assert.deepEqual(readFileSync(item), itemBefore);
    assert.equal(existsSync(join(root, 'docs', 'backlog', 'archive', 'WI-001-done.md')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('an inward archive alias remains contained and archives normally', (t) => {
  const root = fixture();
  const realArchive = join(root, 'docs', 'archive-store');
  const alias = join(root, 'docs', 'backlog', 'archive');

  try {
    mkdirSync(realArchive, { recursive: true });
    try {
      symlinkSync(realArchive, alias, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (process.platform === 'win32' && error && ['EPERM', 'EACCES'].includes(error.code)) {
        t.skip('this host does not permit a directory junction');
        return;
      }
      throw error;
    }

    const plan = planArchive(root);
    applyArchive(root, plan);

    assert.equal(existsSync(join(realArchive, 'WI-001-done.md')), true);
    assert.match(readFileSync(join(root, 'docs', 'backlog', 'BACKLOG.md'), 'utf8'), /archive\/WI-001-done\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
