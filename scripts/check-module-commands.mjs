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
 * What it checks is deliberately narrow: **code-span mentions only**, `` `rungs
 * …` ``. Prose says "rungs installs modules" and that is not a command claim.
 * A flag inside the span is not checked either — `--tier full` was a real defect
 * (F-020) that this would not have caught. Stated so that green is not read as
 * "every command line in every module is valid".
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

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(md|toml)$/.test(p)) out.push(p);
  }
  return out;
}

const problems = [];
let spans = 0;

for (const file of walk(join(root, 'modules'))) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file).replace(/\\/g, '/');
  for (const m of text.matchAll(/`rungs ([a-z][a-z-]*)((?: [a-z][a-z-]*)?)[^`]*`/g)) {
    spans++;
    const [, cmd, rawSub] = m;
    const line = text.slice(0, m.index).split('\n').length;
    if (!commands.has(cmd)) {
      problems.push(`${rel}:${line}: \`rungs ${cmd}\` is not a command the CLI dispatches`);
      continue;
    }
    const required = subcommands.get(cmd);
    if (!required) continue;
    const sub = rawSub.trim();
    // A bare `rungs backlog` in prose is a reference to the command, not an
    // invocation. Only judge it when a second word is actually present.
    if (sub && sub !== required) {
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
