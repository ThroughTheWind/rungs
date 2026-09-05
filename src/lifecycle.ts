import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'smol-toml';
import type { Manifest } from './types.ts';
import { contentHash, emittedFiles, moduleEmissionCandidates, preflightModuleEmissions, registerGates } from './add.ts';
import { resolveParams, substitute, type Params } from './substitute.ts';
import { loadRegistry } from './check.ts';
import { preflightEmittedPaths, resolveEmittedPath, UnsafeEmittedPathError } from './emitted-path.ts';

const SRC = dirname(fileURLToPath(import.meta.url));

/** Bundles from the module catalogue. `init` offers these, not a list of fifteen. */
export const PROFILES: Record<string, string[]> = {
  minimal: ['instructions'],
  tracked: ['instructions', 'gates', 'backlog', 'findings', 'adr', 'session'],
  disciplined: ['instructions', 'gates', 'backlog', 'findings', 'adr', 'session', 'ci', 'specs', 'workflows', 'skills', 'audit'],
  hardened: ['instructions', 'gates', 'backlog', 'findings', 'adr', 'session', 'ci', 'specs', 'workflows', 'skills', 'audit', 'release', 'doc-authority'],
  fleet: ['instructions', 'gates', 'backlog', 'findings', 'adr', 'session', 'ci', 'specs', 'workflows', 'skills', 'audit', 'release', 'doc-authority', 'concurrency', 'design-sync'],
};

export interface InstallRecord {
  harnesses: string[];
  modules: Record<string, { version: string; params?: Record<string, unknown>; hashes?: Record<string, string>; kept?: { files: string[] } }>;
}

export function readRecord(repoRoot: string): InstallRecord | null {
  const resolved = resolveEmittedPath(repoRoot, 'rungs', '.ai/rungs.toml');
  if (resolved.leafAlias) {
    throw new UnsafeEmittedPathError(
      'rungs',
      '.ai/rungs.toml',
      'the install record is a symlink or junction leaf and will not be used as configuration',
    );
  }
  const p = resolved.absolute;
  if (!existsSync(p)) return null;
  try {
    const raw = parse(readFileSync(p, 'utf8')) as any;
    return { harnesses: raw.repo?.harnesses ?? [], modules: raw.modules ?? {} };
  } catch {
    return null;
  }
}

export type FileState = 'current' | 'diverged' | 'stale' | 'missing';

export interface UpgradeItem {
  module: string;
  from: string;
  to: string;
  files: { rel: string; state: FileState }[];
}

/**
 * Compare what is on disk against both the recorded hash and what the module
 * would emit now. Those two comparisons answer different questions:
 *
 *   matches recorded, matches current  → current, nothing to do
 *   matches recorded, differs current  → **stale**, ours to replace
 *   differs recorded                   → **diverged**, theirs; never touched
 *
 * Without the recorded hash the middle two collapse, and upgrade would either
 * clobber deliberate edits or refuse to move anything.
 */
export function planUpgrade(repoRoot: string, mods: Manifest[], record: InstallRecord): UpgradeItem[] {
  const params = resolveParams(mods, paramsFrom(record), repoRoot);
  const skillsDir = record.harnesses.includes('claude') ? '.claude/skills' : '.agents/skills';
  const items: UpgradeItem[] = [];
  const installedMods = mods.filter((mod) => record.modules[mod.name]);

  // Parameters in the install record are untrusted input to this newer CLI.
  // Validate every installed module before examining any one of them, so a
  // later unsafe target cannot make a partial plan look usable.
  preflightModuleEmissions(installedMods, repoRoot, params, skillsDir);

  for (const mod of installedMods) {
    const installed = record.modules[mod.name];
    const emitted = emittedFiles(mod, params, skillsDir);
    const files: UpgradeItem['files'] = [];
    const kept = new Set(installed.kept?.files ?? []);
    for (const [rel, wouldEmit] of emitted) {
      if (kept.has(rel)) continue;   // never ours; upgrade does not touch it
      const resolved = resolveEmittedPath(repoRoot, mod.name, rel);
      const full = resolved.absolute;
      if (resolved.leafAlias) {
        files.push({ rel, state: 'diverged' });
        continue;
      }
      if (!existsSync(full)) {
        files.push({ rel, state: 'missing' });
        continue;
      }
      const onDisk = contentHash(readFileSync(full, 'utf8'));
      const recorded = installed.hashes?.[rel];
      if (onDisk === contentHash(wouldEmit)) files.push({ rel, state: 'current' });
      else if (recorded && onDisk === recorded) files.push({ rel, state: 'stale' });
      else files.push({ rel, state: 'diverged' });
    }
    items.push({ module: mod.name, from: installed.version, to: mod.version, files });
  }
  return items;
}

/** Applies only `stale` and `missing`. Divergence is a decision, not an error. */
export function applyUpgrade(repoRoot: string, mods: Manifest[], record: InstallRecord, plan: UpgradeItem[]) {
  const params = resolveParams(mods, paramsFrom(record), repoRoot);
  const skillsDir = record.harnesses.includes('claude') ? '.claude/skills' : '.agents/skills';
  const prepared = plan.map((item) => {
    const mod = mods.find((candidate) => candidate.name === item.module);
    if (!mod) throw new Error(`upgrade plan names unknown module '${item.module}'`);
    const emitted = emittedFiles(mod, params, skillsDir);
    const files = item.files.map((file) => {
      const resolved = resolveEmittedPath(repoRoot, mod.name, file.rel);
      if ((file.state === 'stale' || file.state === 'missing') && resolved.leafAlias) {
        throw new UnsafeEmittedPathError(
          mod.name,
          file.rel,
          'the destination is a symlink or junction leaf and upgrade will not write through it',
        );
      }
      if ((file.state === 'stale' || file.state === 'missing') && !emitted.has(resolved.target)) {
        throw new Error(`module '${mod.name}' upgrade plan names target '${file.rel}' that the module does not emit`);
      }
      return { ...file, target: resolved.target, absolute: resolved.absolute };
    });
    return { item, mod, emitted, files };
  });

  // Rebuild and validate the complete emission set at apply time.  Callers may
  // retain or manufacture a plan, so application never trusts planning to have
  // happened in this process or against this filesystem.
  const writable = new Set(
    prepared.flatMap(({ mod, files }) =>
      files
        .filter((file) => file.state === 'stale' || file.state === 'missing')
        .map((file) => `${mod.name}\0${file.target}`),
    ),
  );
  preflightEmittedPaths(repoRoot, [
    ...moduleEmissionCandidates(prepared.map(({ mod }) => mod), params, skillsDir).map((candidate) =>
      writable.has(`${candidate.moduleName}\0${candidate.target}`)
        ? { ...candidate, writeExisting: true }
        : candidate,
    ),
    { moduleName: prepared[0]?.mod.name ?? 'upgrade', target: '.ai/rungs.toml', writeExisting: true },
  ]);

  let written = 0;
  // Only files this run rewrote. A diverged file is not in here, which is what
  // keeps its recorded hash — and therefore its protection — intact (F-017).
  const rewritten = new Map<string, Map<string, string>>();
  for (const { mod, emitted, files } of prepared) {
    for (const f of files) {
      if (f.state !== 'stale' && f.state !== 'missing') continue;
      const content = emitted.get(f.target)!;
      mkdirSync(dirname(f.absolute), { recursive: true });
      writeFileSync(f.absolute, content);
      if (!rewritten.has(mod.name)) rewritten.set(mod.name, new Map());
      rewritten.get(mod.name)!.set(f.target, contentHash(content));
      written++;
    }
  }

  // F-016. Upgrading rewrote a module's **files** and never its **gates**, so a
  // module version that added, removed or renamed one left the registry on the
  // old block and told the user the upgrade succeeded. Reproduced 2026-08-16
  // against a scratch consumer: `session` 1.1.0 → 1.2.0 with a new gate, and
  // `.ai/gates.toml` kept `rungs:begin session@1.1.0` and 20 entries.
  //
  // Registration is by whole merge block, so this fixes removal too — a gate
  // dropped from a manifest leaves the registry with the block that replaces it.
  // Idempotent, and cheap enough to run for every module in the plan rather than
  // only the ones whose files happened to be stale.
  const upgraded = prepared.map(({ mod }) => mod);
  const gateActions = upgraded.length ? registerGates(upgraded, repoRoot, false) : [];

  const recorded = updateRecordAfterUpgrade(
    repoRoot,
    upgraded.map((m) => ({ module: m.name, version: m.version, hashes: rewritten.get(m.name) ?? new Map() })),
  );

  return { written, gates: gateActions.length, recorded };
}

/**
 * Update `.ai/rungs.toml` in place after an upgrade: the version each module
 * moved to, and a new hash for each file this run actually rewrote.
 *
 * **Surgical, and text-level, on purpose.** F-017: `upgrade` left the record
 * naming the old version, so a repo on 1.2.0 described itself to its owner as
 * 1.1.0 and `planUpgrade` offered the same move forever. The obvious fix —
 * calling `writeInstallRecord` — is worse than the bug: it re-derives the whole
 * record and hashes **every emitted file that exists**, which would stamp our
 * hash onto a file the user had diverged. That file would then match its record
 * and be silently reclassified from `diverged` to `current`, so the next upgrade
 * would overwrite the edit rungs promises never to touch.
 *
 * So: only the lines that must change, and only for files we wrote. Everything
 * else — the header comment, kept-file lists, and the hash of every file we did
 * not touch — is left exactly as it was.
 */
export function updateRecordAfterUpgrade(
  repoRoot: string,
  updates: { module: string; version: string; hashes: Map<string, string> }[],
): number {
  const path = preflightEmittedPaths(repoRoot, [
    { moduleName: updates[0]?.module ?? 'upgrade', target: '.ai/rungs.toml', writeExisting: true },
  ])[0].absolute;
  if (!existsSync(path) || !updates.length) return 0;

  const lines = readFileSync(path, 'utf8').split('\n');
  const byModule = new Map(updates.map((u) => [u.module, u]));
  let changed = 0;
  let current: { module: string; hashes: boolean } | null = null;

  const out: string[] = [];
  for (const line of lines) {
    const header = /^\[modules\.([^\].]+)(\.[^\]]+)?\]/.exec(line);
    if (header) {
      current = byModule.has(header[1]) ? { module: header[1], hashes: header[2] === '.hashes' } : null;
      out.push(line);
      continue;
    }

    if (current && !current.hashes && /^version\s*=/.test(line)) {
      const next = `version = "${byModule.get(current.module)!.version}"`;
      if (next !== line) changed++;
      out.push(next);
      continue;
    }

    if (current?.hashes) {
      const entry = /^"([^"]+)"\s*=/.exec(line);
      const replacement = entry && byModule.get(current.module)!.hashes.get(entry[1]);
      if (replacement) {
        out.push(`"${entry[1]}" = "${replacement}"`);
        changed++;
        continue;
      }
    }

    out.push(line);
  }

  writeFileSync(path, out.join('\n'));
  return changed;
}

function paramsFrom(record: InstallRecord): Params {
  const out: Params = {};
  for (const [name, entry] of Object.entries(record.modules)) {
    if (entry.params) out[name] = { ...entry.params };
  }
  return out;
}

/**
 * ADR-0002's promised exit. Materialises the engines and their tables into the
 * repo and rewrites every declared gate to a `command` gate that runs them.
 *
 * This is a stated obligation, not a nicety: a tool whose checks disappear when
 * you uninstall it is one nobody should adopt, and promising the exit is what
 * makes the no-scripts-in-your-repo default acceptable.
 */
export function eject(repoRoot: string, mods: Manifest[], dryRun = false) {
  const dest = join(repoRoot, '.rungs');
  // Only what the runner actually needs, and nothing that imports a package.
  // The first version copied `check.ts` and `manifest.ts` too, which pull in the
  // TOML parser — so an ejected repo crashed on a module it could not resolve.
  // An exit that does not work is not an exit.
  const engines = ['glob.ts', 'engine-table.ts', 'engines.ts', 'engines2.ts'];
  const { gates } = loadRegistry(repoRoot);
  const declared = gates.filter((g) => g.kind === 'declared' && g.table);
  const tables = [...new Set(declared.map((g) => g.table!))];

  const actions: string[] = [];
  for (const f of engines) actions.push(`.rungs/${f}`);
  for (const t of tables) actions.push(`.rungs/tables/${t.replace('/', '-').replace(/.toml$/, '.json')}`);
  actions.push('.rungs/run-gate.mjs', '.ai/gates.toml (rewritten to command gates)');

  if (dryRun) return { actions, gates: declared.length };

  mkdirSync(join(dest, 'tables'), { recursive: true });
  for (const f of engines) copyFileSync(join(SRC, f), join(dest, f));

  // Tables are **converted to JSON at eject time**, parsed here with the parser
  // this CLI already has. The ejected repo then needs no TOML dependency at all
  // — which is the same promise ADR-0002 makes about installation, kept on the
  // way out. Parameters are substituted now, for the same reason.
  const record = readRecord(repoRoot);
  const params = resolveParams(mods, record ? paramsFrom(record) : {}, repoRoot);
  for (const t of tables) {
    const [mod, file] = t.split('/');
    const src = join(SRC, '..', 'modules', mod, 'gates', file);
    if (!existsSync(src)) continue;
    try {
      const parsed = parse(substitute(readFileSync(src, 'utf8'), mod, params));
      writeFileSync(join(dest, 'tables', `${mod}-${file.replace(/\.toml$/, '.json')}`), JSON.stringify(parsed, null, 2));
    } catch {
      /* an unparseable table is dropped, and its gate will say so when run */
    }
  }

  writeFileSync(join(dest, 'run-gate.mjs'), RUNNER);
  writeFileSync(join(dest, 'README.md'), EJECT_README);

  const registry = join(repoRoot, '.ai', 'gates.toml');
  let text = readFileSync(registry, 'utf8');
  for (const g of declared) {
    text = text.replace(
      new RegExp(`(id\\s*=\\s*"${g.id}"[\\s\\S]*?)kind\\s*=\\s*"declared"`),
      `$1kind   = "command"\ncommand = "node .rungs/run-gate.mjs ${g.id}"`,
    );
  }
  writeFileSync(registry, `${text}\n# Ejected: gates above run from .rungs/ and no longer need rungs installed.\n`);
  return { actions, gates: declared.length };
}

const RUNNER = `#!/usr/bin/env node
// Ejected gate runner. Runs one declared gate from the tables in ./tables/.
// Self-contained: this repo no longer needs rungs installed to run its gates.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINES } from './engines.ts';
import { selectEngineTable } from './engine-table.ts';
import { walk } from './glob.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const id = process.argv[2];
const registry = readFileSync(join(root, '.ai', 'gates.toml'), 'utf8');
const entry = registry.split('[[gates]]').find((b) => b.includes(\`id      = "\${id}"\`) || b.includes(\`id     = "\${id}"\`));
if (!entry) { console.error(\`unknown gate \${id}\`); process.exit(2); }

const engine = entry.match(/^engine\\s*=\\s*"(.+)"/m)?.[1];
const table = entry.match(/^table\\s*=\\s*"(.+)"/m)?.[1];
if (!engine || !ENGINES[engine]) { console.error(\`gate \${id}: engine '\${engine}' unavailable\`); process.exit(2); }

// Tables were converted to JSON when this was ejected, so nothing here needs a
// TOML parser — or any dependency at all beyond Node itself.
const raw = JSON.parse(readFileSync(join(here, 'tables', table.replace('/', '-').replace(/\\.toml$/, '.json')), 'utf8'));
const section = selectEngineTable(raw, engine, id);
const r = ENGINES[engine](section, root, walk(root));
for (const f of r.findings) console.error(\`  \${f.file ? f.file + ': ' : ''}\${f.message}\`);
process.exit(r.findings.length ? 1 : 0);
`;

const EJECT_README = `# .rungs — ejected

The gate engines and tables, materialised into this repo. Every gate in
\`.ai/gates.toml\` now runs as a \`command\` gate pointing here, so **this repo no
longer needs rungs installed** to run its checks.

What you gave up: engine fixes no longer arrive with a CLI version bump. These
files are yours now, including their bugs.

What you kept: every gate, every table, and the reason each one exists — the
\`why\` field travelled with the registry entry, so a gate can still explain
itself to whoever finds it.

To go back, delete this directory and re-run \`rungs add\`.
`;

/**
 * Install the merge drivers `.gitattributes` names, and turn on rerere.
 *
 * The `concurrency` module's own gate reports these as missing until this runs,
 * and it was reporting against a command that did not exist — a module telling
 * a repo to run something rungs had never implemented. A driver named in
 * `.gitattributes` is inert until configured, so a fresh clone silently falls
 * back to git's default merge on files that must never be text-merged.
 */
export function setupGit(repoRoot: string, dryRun = false) {
  const attrs = join(repoRoot, '.gitattributes');
  if (!existsSync(attrs)) return { drivers: [] as string[], rerere: false };
  const drivers = [...new Set([...readFileSync(attrs, 'utf8').matchAll(/merge=(rungs-[\w-]+)/g)].map((m) => m[1]))];
  const done: string[] = [];
  for (const d of drivers) {
    // `ledger` takes the higher counter and keeps both claim comments;
    // `generated` always refuses and prints the regenerate command. Both are
    // implemented as scripts the runner ships, so the config points at rungs.
    const cmd =
      d === 'rungs-generated'
        ? 'node -e "process.stderr.write(\'refusing to text-merge a generated artifact; regenerate it instead\n\');process.exit(1)"'
        : 'git merge-file -L ours -L base -L theirs %A %O %B';
    if (!dryRun) {
      try {
        // argv, not a shell string. The `rungs-generated` driver command carries
        // single quotes, a literal `\n` and `%A %O %B`, and it was being handed
        // to a shell through `JSON.stringify` — quoting that happens to survive
        // cmd.exe and does not survive bash the same way. The same class of bug
        // as F-033, found in the same sweep.
        execFileSync('git', ['config', `merge.${d}.name`, `rungs ${d.replace('rungs-', '')} driver`], { cwd: repoRoot, stdio: 'pipe' });
        execFileSync('git', ['config', `merge.${d}.driver`, cmd], { cwd: repoRoot, stdio: 'pipe' });
      } catch {
        continue;
      }
    }
    done.push(d);
  }
  let rerere = false;
  if (!dryRun) {
    try {
      execFileSync('git', ['config', 'rerere.enabled', 'true'], { cwd: repoRoot, stdio: 'pipe' });
      rerere = true;
    } catch {
      /* not a git repo */
    }
  }
  return { drivers: done, rerere };
}
