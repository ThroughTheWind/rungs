#!/usr/bin/env node
/**
 * The ejected gate runner. `rungs eject` bundles this file with every engine and
 * every runtime dependency into `.rungs/run-gate.mjs`, beside the frozen tables
 * and raw module metadata the engines read. Nothing here resolves from the
 * consumer's `node_modules`, from an installed Rungs package, or from npm: the
 * only executable it needs is the Node that is running it.
 *
 * Two modes, both reached through the local `.ai/rungs.mjs` forwarder:
 *
 *   run-gate.mjs check [tier]   the aggregate run — same selection, output,
 *                               ledger and exit code as `rungs check`
 *   run-gate.mjs <gate-id>      one converted gate; findings on stderr, exit 1
 *                               when it fires, 2 when the gate cannot run
 *
 * ADR-0002 calls the exit "a stated obligation, not a maybe". The first runner
 * imported five source files whose own imports were never copied, so it could
 * not load; a promise kept by a file that crashes is not kept.
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setEjectedRoots } from './ejected.ts';
import { checkCommand, isFrozenGate, loadRegistry, loadTable } from './check.ts';
import { hookVerdict } from './hooks.ts';
import { ENGINES, isImplemented } from './engines.ts';
import { selectEngineTable } from './engine-table.ts';
import { walk } from './glob.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

interface EjectedManifest {
  generator: string;
  rungsVersion: string;
  ejectedOn: string;
  retained: string[];
  gates: string[];
}

function readManifest(): EjectedManifest {
  const path = join(here, 'ejected.json');
  if (!existsSync(path)) {
    console.error(`ejected runner: ${path} is missing — .rungs/ is incomplete; re-run \`rungs eject\` from a Rungs checkout`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const manifest = readManifest();
setEjectedRoots({
  modulesRoot: join(here, 'modules'),
  frozenTables: join(here, 'tables'),
  rungsVersion: manifest.rungsVersion,
});

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(
    [
      `rungs ejected runner (from @rungs/cli ${manifest.rungsVersion}, ejected ${manifest.ejectedOn})`,
      '',
      '  node .rungs/run-gate.mjs check [path] [tier]   run every registered gate, or one tier (path: this repo)',
      '  node .rungs/run-gate.mjs <gate-id>        run one converted gate; exit 1 if it fires',
      '',
      `  ${manifest.gates.length} converted gate(s): ${manifest.gates.join(' ')}`,
      '  Lifecycle commands (add, upgrade, render, …) are not available after ejection.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

if (command === 'check') {
  const flags = new Set(args.slice(1).filter((a) => a.startsWith('--')));
  const positional = args.slice(1).filter((a) => !a.startsWith('--'));
  // F-063 / WI-094: the CLI's `check [path] [tier]` grammar, so the launcher command a consumer
  // learned before ejection means the same thing after it. This runner checks the repository it
  // lives in and nothing else, so a path that is not that repository is refused, not silently
  // re-rooted.
  const isDirectory = (p: string) => {
    try {
      return statSync(p).isDirectory();
    } catch {
      return false;
    }
  };
  const [first, second] = positional;
  const firstIsPath = first !== undefined && (second !== undefined || /[\\/]/.test(first) || isDirectory(resolve(first)));
  if (firstIsPath) {
    const same = isDirectory(resolve(first)) && realpathSync(resolve(first)) === realpathSync(root);
    if (!same) {
      console.error(`rungs (ejected): this runner checks ${root} only — run it from that repository, or pass its path.`);
      process.exit(1);
    }
  }
  const tier = (firstIsPath ? second : first) ?? (flags.has('--full') ? 'full' : flags.has('--fast') ? 'fast' : undefined);
  const stamp = process.env.RUNGS_DATE ?? new Date().toISOString().slice(0, 10);
  process.exit(checkCommand(root, tier, stamp, { ejected: true }));
}

// A lifecycle hook, from its frozen table. The harness configuration written at
// install names `node .ai/rungs.mjs hook <id>`, and ejection must not turn that
// into a command that blocks every tool call (ADR-0010).
if (command === 'hook') {
  if (!args[1]) {
    console.error('ejected runner: `hook <gate-id>` needs a gate id, with the harness payload on stdin');
    process.exit(1);
  }
  const verdict = hookVerdict(root, args[1], () => readFileSync(0, 'utf8'));
  if (verdict.message) console.error(verdict.message);
  process.exit(verdict.exit);
}

// One gate, by id. Only a converted declared gate qualifies: a repository's own
// command gate is run by the aggregate path as the command it is, never here.
const gate = loadRegistry(root).gates.find((g) => g.id === command);
if (!gate) {
  console.error(`unknown gate ${command}`);
  process.exit(2);
}
if (gate.trigger) {
  console.error(`gate ${command} is a hook — evaluate it with \`hook ${command}\` and the harness payload on stdin`);
  process.exit(2);
}
if (!isFrozenGate(gate) && !(gate.kind === 'declared' && gate.engine && gate.table)) {
  console.error(`gate ${command} is a repository command, not a converted gate — run it through \`check\``);
  process.exit(2);
}
if (!gate.engine || !isImplemented(gate.engine)) {
  console.error(`gate ${command}: engine '${gate.engine ?? '(none)'}' unavailable`);
  process.exit(2);
}
const table = loadTable(gate.table, root);
if (!table) {
  console.error(`gate ${command}: frozen table '${gate.table}' not found under .rungs/tables/`);
  process.exit(2);
}
try {
  const section = selectEngineTable(table, gate.engine, gate.id);
  const result = ENGINES[gate.engine](section, root, walk(root));
  for (const f of result.findings) console.error(`  ${f.file ? `${f.file}: ` : ''}${f.message}`);
  process.exit(result.findings.length ? 1 : 0);
} catch (error: any) {
  console.error(`gate ${command}: ${error?.message ?? error}`);
  process.exit(2);
}
