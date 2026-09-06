/**
 * `tests-guard-large-equality` — every test file takes its assert from
 * `test/assert.js`, whose equality methods refuse to diff two large values that
 * differ, and the suite runs under a heap cap.
 *
 * F-059 / WI-095. A single `assert.equal` on a 186 KB artefact took the host
 * down three times (221 s of diff building, then `RangeError: Array buffer
 * allocation failed`). The repair compared digests and left a comment at each
 * site; CLAUDE.md's own rule for a rule that was read and broken anyway is *do
 * not restate it — make it mechanical*. Two mechanics:
 *
 *   1. `test/*.test.js` imports assert from `./assert.js` and from nowhere else,
 *      so the guard cannot be bypassed by a fresh file that copies the old
 *      import line.
 *   2. `package.json`'s `test` script carries `--max-old-space-size`, so a
 *      runaway allocation fails the test process instead of the machine.
 *
 * What this does not prove: that a test never compares two large values at
 * all — it may, and if they are equal the comparison is cheap. The guard fires
 * only on the failing case, which is the one that cost the machine.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

const testDir = join(root, 'test');
const files = readdirSync(testDir).filter((f) => f.endsWith('.test.js'));
for (const file of files) {
  const text = readFileSync(join(testDir, file), 'utf8');
  const guarded = /^import assert from '\.\/assert\.js';/m.test(text);
  const raw = [...text.matchAll(/^import[^\n]*from '(node:assert(?:\/strict)?|assert)';/gm)];
  if (!guarded) problems.push(`test/${file}: does not import assert from './assert.js'`);
  for (const m of raw) problems.push(`test/${file}: imports '${m[1]}' directly, bypassing the large-value guard`);
}
if (!files.length) problems.push('test/: no *.test.js files found — the guard has nothing to hold');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const script = String(pkg.scripts?.test ?? '');
if (!/--max-old-space-size=\d+/.test(script)) {
  problems.push(`package.json: the test script has no --max-old-space-size cap (is: ${JSON.stringify(script)})`);
}

if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`tests-guard-large-equality: ${files.length} test file(s) import the guarded assert; heap cap present in the test script`);
