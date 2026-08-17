/**
 * `module-commands-exist` — every command a module tells a repo to run must be a
 * command the CLI actually dispatches.
 *
 * The `concurrency` module documented four commands that did not exist —
 * `session start`, `land`, `preflight`, `worktrees` — for weeks, in a table
 * headed "The loop", with no note anywhere that they were unimplemented. One of
 * the files was `fragments/AGENTS.md`, which merges into the consumer's *agent*
 * entry document, so an agent was instructed to run them and told "never
 * `git merge` by hand" (F-026). WI-062 built them; this stops the next one.
 *
 * **Both sides are derived.** The command list comes from the `switch (cmd)` in
 * `src/cli.ts` and the subcommand lists from the guards inside it, so this
 * cannot drift the way a hand-kept list would — which is the failure it exists
 * to catch, one level up.
 *
 * Three things are checked, and the second and third were added after the first
 * version missed a live defect:
 *
 *   1. **Commands.** In `.md`/`.toml`, code-span mentions only — prose says
 *      "rungs installs modules" and that is not a command claim.
 *   2. **Template files.** Anything else under `modules/` is a file that gets
 *      *executed*, so a bare `rungs …` or `npx @rungs/cli …` in it is a command
 *      claim with no backticks to look for. The `ci` module's workflow shipped
 *      `check --tier full --reporter github` to three of five profiles and the
 *      first version of this gate could not see it (F-030).
 *   3. **Flags**, against the `FLAGS` table in `src/cli.ts`. Both real defects
 *      here were flag defects, not command defects — `--tier` is not a flag and
 *      `--reporter` does not exist, and each was parsed as a positional instead.
 *
 * What it still cannot see: a claim about *behaviour* of a command that does
 * exist. F-029 is exactly that, and this gate is no help with it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = readFileSync(join(root, 'src', 'cli.ts'), 'utf8');

// Derived side 1: what the dispatch actually handles.
const commands = new Set([...cli.matchAll(/^\s{2}case '([a-z-]+)':/gm)].map((m) => m[1]));
// `help` never reaches the switch — it is the default branch's success case.
commands.add('help');

// Derived side 2: the fixed subcommand of each command that takes one. Each is
// enforced by a guard of exactly this shape, which is also what makes them
// refusable at all (F-027 was one of these guards being absent).
const subcommands = new Map();
for (const m of cli.matchAll(/case '([a-z]+)': \{\s*\n\s*if \(args\[0\] !== '([a-z]+)'\)/g)) {
  subcommands.set(m[1], m[2]);
}
// `backlog` guards on the same shape but its case body opens differently.
for (const m of cli.matchAll(/case '([a-z]+)': \{\s*\n\s*if \(args\[0\] !== '([a-z]+)'\)/gm)) {
  subcommands.set(m[1], m[2]);
}

// Derived side 3: every flag the parser honours, from the same `FLAGS` help table
// the CLI prints. Entries look like `--fast, --full` or `--into <path>`.
const flags = new Set();
for (const m of cli.matchAll(/^\s*\['(--[^']+)',/gm)) {
  for (const f of m[1].split(',')) {
    const name = f.trim().split(/[ =]/)[0];
    if (name.startsWith('--')) flags.add(name);
  }
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const problems = [];
let spans = 0;

for (const file of walk(join(root, 'modules'))) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file).replace(/\\/g, '/');
  const prose = /\.(md|toml)$/.test(file);

  // Prose needs the backticks to tell a command from a sentence. A template is
  // executed, so the bare string is the claim.
  const pattern = prose
    ? /`(?:npx @rungs\/cli|rungs) ([a-z][a-z-]*)([^`]*)`/g
    : /(?:npx @rungs\/cli|\brungs) ([a-z][a-z-]*)([^\n]*)/g;

  for (const m of text.matchAll(pattern)) {
    const [, cmd, rest] = m;
    const line = text.slice(0, m.index).split('\n').length;
    // In a template, `rungs` also appears in prose comments. Only judge a token
    // that is actually a command — anything else is a word in a sentence.
    if (!prose && !commands.has(cmd)) continue;
    spans++;

    if (!commands.has(cmd)) {
      problems.push(`${rel}:${line}: \`rungs ${cmd}\` is not a command the CLI dispatches`);
      continue;
    }

    for (const f of rest.match(/--[a-z][a-z-]*/g) ?? []) {
      if (!flags.has(f)) problems.push(`${rel}:${line}: \`rungs ${cmd} … ${f}\` — no such flag; it is parsed as a positional`);
    }

    const required = subcommands.get(cmd);
    if (!required) continue;
    // A bare `rungs backlog` in prose is a reference to the command, not an
    // invocation. Only judge it when a second word is actually present.
    const sub = rest.trim().split(/\s+/)[0] ?? '';
    if (sub && !sub.startsWith('-') && sub !== required) {
      problems.push(`${rel}:${line}: \`rungs ${cmd} ${sub}\` — the only subcommand of \`${cmd}\` is \`${required}\``);
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\n  Dispatched: ${[...commands].sort().join(', ')}`);
  process.exit(1);
}
console.log(`module-commands-exist: ${spans} command span(s) across modules/ all resolve (${commands.size} dispatched)`);
