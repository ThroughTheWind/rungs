/**
 * `docs-version-claims` — the version and size claims in this repo's prose must
 * agree with what the repo actually is.
 *
 * WI-051 derived the *site's* structural counts and gated them. The markdown was
 * left hand-kept, and every claim in it had drifted by 2026-08-17 (F-021): the
 * README and roadmap both named v0.1.2 as public latest two days after v0.1.3
 * reached npm, the README's gate count said 20 against an actual 25, and the
 * roadmap said "Nine commands, ~2,800 lines" against ten and 4,523.
 *
 * Each claim states **which sentence it is**, as a pattern. A scan for
 * version-shaped strings would fire on "first published 2026-08-14 at v0.1.0",
 * which is history and correct. A pattern that stops matching is itself a
 * failure: a claim reworded out of existence must not silently become
 * unverified, because that is indistinguishable from a claim that is checked.
 *
 * What this deliberately does not check is the **published** version. That is
 * only knowable from the registry, the runner does no network, and the answer
 * was to stop restating it in three places rather than to guess it offline —
 * it now lives on the versions page alone. Verifying it against
 * `npm view @rungs/cli dist-tags` is step 4 of the release runbook, and a
 * checklist item is weaker than a gate. Stated so that green is not read as
 * "every number here is verified".
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const pkg = JSON.parse(read('package.json'));
const srcLines = readdirSync(join(root, 'src'))
  .filter((f) => f.endsWith('.ts'))
  .reduce((n, f) => n + read(join('src', f)).split('\n').length, 0);
const commands = (() => {
  const help = execFileSync(process.execPath, ['--experimental-strip-types', 'src/cli.ts', '--help'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  // The help block lists one command per line as `rungs <name>`; count the distinct names.
  return new Set([...help.matchAll(/^\s+\[1mrungs (\w+)/gm)].map((m) => m[1])).size;
})();

/**
 * Two kinds of claim, checked differently on purpose.
 *
 * `exact` is identity — a version is right or it is wrong, and "close" is
 * meaningless. `approx` is magnitude: "roughly this big". Demanding an exact
 * line count in prose would fail the build on every source edit until someone
 * retyped a number nobody reads precisely, which is how a gate teaches people
 * to bypass it. The tolerance is what makes the claim honest *and* holdable —
 * it fires when the prose is misleading, not when it is merely not freshly
 * typed. Caught on this gate's first run: the count had already moved from
 * 4,523 to 4,715 inside the change that added the gate.
 */
const TOLERANCE = 0.1;

/** [file, human name, pattern capturing the claim, expected, 'exact' | 'approx'] */
const CLAIMS = [
  // These two patterns were rewritten when v0.2.0 shipped and "next release, untagged" stopped
  // being true. Both claims failed the "no longer matches" branch first, which is the branch
  // earning its keep: the prose and the check move together or the gate goes red.
  ['README.md', 'current release version', /\*\*Current release: v(\d+\.\d+\.\d+)\*\*/, pkg.version, 'exact'],
  ['docs/roadmap.md', 'released version', /v(\d+\.\d+\.\d+) released from/, pkg.version, 'exact'],
  ['README.md', 'CLI size', /The CLI, ~([\d,]+) lines/, String(srcLines), 'approx'],
  ['docs/roadmap.md', 'CLI size', /Ten commands, ~([\d,]+) lines/, String(srcLines), 'approx'],
];

const problems = [];

for (const [file, name, pattern, expected, kind] of CLAIMS) {
  const m = pattern.exec(read(file));
  if (!m) {
    problems.push(`${file}: the ${name} claim no longer matches /${pattern.source}/ — it was reworded or removed, so nothing is checking it`);
    continue;
  }
  const actual = m[1].replace(/,/g, '');
  if (kind === 'exact') {
    if (actual !== expected) problems.push(`${file}: ${name} says ${m[1]}, the repo says ${expected}`);
  } else {
    const drift = Math.abs(Number(actual) - Number(expected)) / Number(expected);
    if (drift > TOLERANCE) {
      problems.push(
        `${file}: ${name} says ~${m[1]}, the repo says ${expected} — ${Math.round(drift * 100)}% off, past the ${TOLERANCE * 100}% this claim is allowed`,
      );
    }
  }
}

// The command count is prose in one place and derivable, so it is checked the same way.
const roadmapCommands = /\|\s*\*\*5\*\*\s*\|\s*CLI\s*\|\s*✅\s*(\w+) commands/.exec(read('docs/roadmap.md'));
const WORDS = { Nine: 9, Ten: 10, Eleven: 11, Twelve: 12 };
if (!roadmapCommands) {
  problems.push('docs/roadmap.md: the Phase 5 command-count claim no longer matches its pattern');
} else if (WORDS[roadmapCommands[1]] !== commands) {
  problems.push(`docs/roadmap.md: Phase 5 says ${roadmapCommands[1]} commands, \`rungs --help\` lists ${commands}`);
}

if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`docs-version-claims: ${CLAIMS.length + 1} claims agree (version ${pkg.version}, ${srcLines} lines, ${commands} commands)`);
