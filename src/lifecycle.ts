import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'smol-toml';
import type { Manifest } from './types.ts';
import { contentHash, emittedFiles, moduleEmissionCandidates, ownershipHash, preflightModuleEmissions, registerGates } from './add.ts';
import { resolveParams, substitute, type Params } from './substitute.ts';
import { loadRegistry } from './check.ts';
import { preflightEmittedPaths, resolveEmittedPath, UnsafeEmittedPathError } from './emitted-path.ts';
import { semanticText } from './text.ts';
import { EJECTED_RUNNER, ejectedCommandFor, frozenTableName, isEjectedCommand } from './ejected.ts';

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
      // Ownership ignores generated block bodies (WI-087). Records written
      // before that hashed the raw bytes, so a recorded hash still matches
      // through either reading.
      const raw = readFileSync(full, 'utf8');
      const onDisk = ownershipHash(raw);
      const recorded = installed.hashes?.[rel];
      const recordedMatches = !!recorded && (onDisk === recorded || contentHash(raw) === recorded);
      if (onDisk === ownershipHash(wouldEmit)) files.push({ rel, state: 'current' });
      else if (recordedMatches) files.push({ rel, state: 'stale' });
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
      rewritten.get(mod.name)!.set(f.target, ownershipHash(content));
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

  const original = readFileSync(path, 'utf8');
  const newline = original.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  const lines = semanticText(original).split('\n');
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
        const next = `"${entry[1]}" = "${replacement}"`;
        if (next !== line) changed++;
        out.push(next);
        continue;
      }
    }

    out.push(line);
  }

  const updated = out.join(newline);
  if (changed > 0 && updated !== original) writeFileSync(path, updated);
  return changed;
}

function paramsFrom(record: InstallRecord): Params {
  const out: Params = {};
  for (const [name, entry] of Object.entries(record.modules)) {
    if (entry.params) out[name] = { ...entry.params };
  }
  return out;
}

// ── eject ────────────────────────────────────────────────────────────────────

/** A refused eject. Nothing has been written when this is thrown. */
export class EjectRefusal extends Error {}

export interface EjectResult {
  /** One line per destination: `create`, `rewrite` or `unchanged`, then the path. */
  actions: string[];
  /** Declared gates converted to `command` gates. */
  gates: number;
  /** True when a repeat found every destination already byte-identical. */
  unchanged: boolean;
}

/**
 * Commands the ejected launcher still forwards. Everything else Rungs did is
 * gone after ejection. `hook` is retained because the harness configuration
 * WI-086 writes names this launcher, and an adapter pointing at a command
 * ejection removed would block every tool call in an ejected repo (ADR-0010).
 */
export const EJECTED_RETAINED = ['check', 'hook'];

const EJECT_TRAILER = '# Ejected: gates above run from .rungs/ and no longer need rungs installed.';
const EJECTED_LAUNCHER_MARKER = 'rungs ejected launcher';
const EJECT_GENERATOR = 'rungs eject';

/**
 * ADR-0002's promised exit. Materialises the engines and their tables into the
 * repo and rewrites every declared gate to a `command` gate that runs them.
 *
 * This is a stated obligation, not a nicety: a tool whose checks disappear when
 * you uninstall it is one nobody should adopt, and promising the exit is what
 * makes the no-scripts-in-your-repo default acceptable.
 *
 * What goes into `.rungs/`, and why each piece (WI-077, closing F-042 and F-045):
 *
 * - `run-gate.mjs` — the runner esbuild bundled with every engine and every
 *   runtime dependency. The first version copied five source files whose own
 *   imports were never copied, so the "exit" crashed on `smol-toml`.
 * - `tables/<module>-<table>.json` — each gate table substituted with the
 *   parameters this repo installed, then frozen. Ejection removes the parameter
 *   source, so re-substituting later is impossible; freezing is the honest form.
 * - `modules/<name>/module.toml`, `modules/<name>/gates/*.toml` — raw metadata
 *   for the gates that read the module set: the self-test meta-gate and the
 *   skill-extension ownership check. Without it both passed on an empty set.
 * - `ejected.json` — which version froze what, and when.
 *
 * And outside it: every declared gate in `.ai/gates.toml` becomes the exact
 * command `node .rungs/run-gate.mjs <id>`, and `.ai/rungs.mjs` — the launcher
 * every local instruction and generated workflow already calls — becomes a
 * local forwarder that runs the bundle with `process.execPath`. The old
 * launcher kept invoking the pinned npm package, so `check` in CI still needed
 * the thing the repo had just left (F-045).
 *
 * Every byte is computed and every destination validated before the first
 * write, and a repeat produces identical bytes: the ejected registry is
 * recognised, not re-converted, so nothing is appended twice.
 */
export function eject(
  repoRoot: string,
  mods: Manifest[],
  dryRun = false,
  stamp = new Date().toISOString().slice(0, 10),
): EjectResult {
  const registryPath = resolveEmittedPath(repoRoot, 'rungs', '.ai/gates.toml').absolute;
  if (!existsSync(registryPath)) throw new EjectRefusal('no .ai/gates.toml here — nothing to eject');
  const original = readFileSync(registryPath, 'utf8');
  const { gates } = loadRegistry(repoRoot);

  // Every gate with an engine and a table is frozen; the ones the runner
  // executes are also converted. A hook keeps `kind = "declared"`: the runner
  // skips it by its trigger, and its frozen table stays available for dispatch.
  const frozen = gates.filter((g) => g.engine && g.table);
  const convertible = frozen.filter((g) => !g.trigger && (g.kind === 'declared' || isEjectedCommand(g.id, g.command)));
  if (!frozen.length) throw new EjectRefusal('no declared gates in .ai/gates.toml — nothing to eject');

  const bundlePath = join(SRC, '..', 'dist', 'ejected-runner.mjs');
  if (!existsSync(bundlePath)) {
    throw new EjectRefusal(
      `the bundled runner is missing at ${bundlePath}; build the package first (npm run build). ` +
        'Eject never copies loose sources: a runner with imports left to resolve cannot load (F-042)',
    );
  }
  const outputs = new Map<string, Buffer | string>();
  outputs.set(EJECTED_RUNNER, readFileSync(bundlePath));

  const record = readRecord(repoRoot);
  const params = resolveParams(mods, record ? paramsFrom(record) : {}, repoRoot);
  const version = String(params.rungs?.version ?? '');
  const modulesDir = join(SRC, '..', 'modules');

  const tableRefs = [...new Set(frozen.map((g) => g.table!))].sort();
  for (const ref of tableRefs) {
    const [mod, file] = ref.split('/');
    const src = join(modulesDir, mod, 'gates', file);
    if (!existsSync(src)) {
      throw new EjectRefusal(`gate table '${ref}' is not in this Rungs version's module set, so its gates cannot be frozen`);
    }
    let parsed: unknown;
    try {
      parsed = parse(substitute(readFileSync(src, 'utf8'), mod, params));
    } catch (error: any) {
      throw new EjectRefusal(`gate table '${ref}' does not parse after substitution: ${error?.message ?? error}`);
    }
    outputs.set(`.rungs/tables/${frozenTableName(ref)}`, `${JSON.stringify(parsed, null, 2)}\n`);
  }

  // Raw metadata for every installed module plus the owner of each frozen table
  // (a repo may register a module's gates by hand without installing it).
  const moduleNames = [...new Set([...Object.keys(record?.modules ?? {}), ...tableRefs.map((r) => r.split('/')[0])])].sort();
  const materialized: string[] = [];
  for (const name of moduleNames) {
    const dir = join(modulesDir, name);
    if (!existsSync(join(dir, 'module.toml'))) continue;
    materialized.push(name);
    outputs.set(`.rungs/modules/${name}/module.toml`, readFileSync(join(dir, 'module.toml')));
    const gatesDir = join(dir, 'gates');
    if (!existsSync(gatesDir)) continue;
    for (const f of readdirSync(gatesDir).filter((x) => x.endsWith('.toml')).sort()) {
      outputs.set(`.rungs/modules/${name}/gates/${f}`, readFileSync(join(gatesDir, f)));
    }
  }

  // A prior ejection is ours to refresh; anything else under `.rungs/` is not.
  const rungsDir = join(repoRoot, '.rungs');
  let prior: any = null;
  const priorMeta = join(rungsDir, 'ejected.json');
  if (existsSync(priorMeta)) {
    try {
      prior = JSON.parse(readFileSync(priorMeta, 'utf8'));
    } catch {
      prior = null;
    }
    if (prior?.generator !== EJECT_GENERATOR) prior = null;
  }
  if (existsSync(rungsDir) && !prior) {
    throw new EjectRefusal('.rungs/ already exists and was not written by `rungs eject` (no readable .rungs/ejected.json) — move it aside first');
  }
  const ejectedOn = typeof prior?.ejectedOn === 'string' ? prior.ejectedOn : stamp;

  outputs.set(
    '.rungs/ejected.json',
    `${JSON.stringify(
      {
        generator: EJECT_GENERATOR,
        rungsVersion: version,
        ejectedOn,
        retained: EJECTED_RETAINED,
        gates: convertible.map((g) => g.id),
        frozenTables: tableRefs,
        modules: materialized,
      },
      null,
      2,
    )}\n`,
  );
  outputs.set('.rungs/README.md', ejectReadme(version));
  outputs.set('.ai/gates.toml', ejectRegistry(original, new Set(convertible.map((g) => g.id))));

  // The launcher is replaced only when it is still the one rungs wrote — the
  // same rule `upgrade` applies. An edited launcher is the consumer's, and a
  // consumer's file is never overwritten (ADR-0004).
  const launcherPath = resolveEmittedPath(repoRoot, 'instructions', '.ai/rungs.mjs').absolute;
  if (existsSync(launcherPath)) {
    const current = readFileSync(launcherPath, 'utf8');
    const recorded = record?.modules.instructions?.hashes?.['.ai/rungs.mjs'];
    const managed = recorded !== undefined && (contentHash(current) === recorded || ownershipHash(current) === recorded);
    if (!managed && !current.includes(EJECTED_LAUNCHER_MARKER)) {
      throw new EjectRefusal(
        '.ai/rungs.mjs has been edited since rungs wrote it (its hash no longer matches .ai/rungs.toml), so eject will not replace it — ' +
          'restore the managed launcher or remove the file, then retry',
      );
    }
  }
  outputs.set('.ai/rungs.mjs', ejectedLauncher());

  // WI-073: the whole operation is validated before the first write.
  const targets = [...outputs.keys()];
  const resolved = preflightEmittedPaths(
    repoRoot,
    targets.map((target) => ({ moduleName: 'rungs eject', target, writeExisting: true, shared: target === '.ai/gates.toml' })),
  );
  const normalise = (bytes: Buffer) => bytes.toString('utf8').replace(/\r\n|\r/g, '\n');
  const plan = targets.map((target, i) => {
    const next = outputs.get(target)!;
    const nextBytes = Buffer.isBuffer(next) ? next : Buffer.from(next);
    const absolute = resolved[i].absolute;
    const exists = existsSync(absolute);
    // Byte-identical after newline normalisation is unchanged: a CRLF checkout
    // must not be rewritten to LF on every repeat (WI-082's rule, kept here).
    const same = exists && normalise(readFileSync(absolute)) === normalise(nextBytes);
    return { target, absolute, nextBytes, action: same ? 'unchanged' : exists ? 'rewrite' : 'create' };
  });
  const actions = plan.map((p) => `${p.action.padEnd(9)} ${p.target}`);
  const unchanged = plan.every((p) => p.action === 'unchanged');
  if (dryRun) return { actions, gates: convertible.length, unchanged };

  for (const p of plan) {
    if (p.action === 'unchanged') continue;
    mkdirSync(dirname(p.absolute), { recursive: true });
    writeFileSync(p.absolute, p.nextBytes);
  }
  return { actions, gates: convertible.length, unchanged };
}

/**
 * Rewrite the registry so each converted gate is the exact ejected command,
 * preserving every other byte and the file's own line endings. Block-wise,
 * because the first version matched lazily from `id = …` to the next
 * `kind = "declared"` — which, on a block already converted, ran into the
 * following block and converted the wrong gate.
 */
export function ejectRegistry(text: string, convert: ReadonlySet<string>): string {
  const newline = text.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  const lines = text.split(/\r\n|\r|\n/);
  const out: string[] = [];
  let block: string[] | null = null;

  const flush = () => {
    if (!block) return;
    const id = block.map((l) => /^\s*id\s*=\s*"([^"]+)"/.exec(l)?.[1]).find(Boolean);
    if (id && convert.has(id)) {
      const converted: string[] = [];
      for (const line of block) {
        if (/^\s*kind\s*=\s*"declared"\s*$/.test(line)) {
          converted.push(line.replace(/kind\s*=\s*"declared"/, 'kind   = "command"'));
          converted.push(`command = "${ejectedCommandFor(id)}"`);
        } else {
          converted.push(line);
        }
      }
      out.push(...converted);
    } else {
      out.push(...block);
    }
    block = null;
  };

  for (const line of lines) {
    if (/^\s*\[\[gates\]\]\s*$/.test(line)) {
      flush();
      block = [line];
      continue;
    }
    // Any other table header ends the gate entry; a comment or blank line does not.
    if (block && /^\s*\[/.test(line)) flush();
    if (block) block.push(line);
    else out.push(line);
  }
  flush();

  let result = out.join(newline);
  if (!result.includes(EJECT_TRAILER)) {
    result = `${result.replace(/(\r\n|\r|\n)+$/, '')}${newline}${EJECT_TRAILER}${newline}`;
  }
  return result;
}

function ejectedLauncher(): string {
  const retained = EJECTED_RETAINED.map((cmd) => `'${cmd}'`).join(', ');
  return [
    `// ${EJECTED_LAUNCHER_MARKER} — written by \`rungs eject\`. This repository no longer depends on the`,
    '// package rungs was installed from. The retained commands run .rungs/run-gate.mjs with this Node',
    '// (process.execPath): no package manager, no PATH lookup, no package. Everything else Rungs did is',
    '// gone until you re-adopt it — see .rungs/README.md.',
    "import { spawnSync } from 'node:child_process';",
    "import { dirname, join } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    'const here = dirname(fileURLToPath(import.meta.url));',
    `const runner = join(here, '..', '.rungs', 'run-gate.mjs');`,
    `const retained = [${retained}];`,
    'const [command, ...rest] = process.argv.slice(2);',
    '',
    'if (!command || !retained.includes(command)) {',
    '  console.error(',
    "    `rungs launcher (ejected): '${command ?? ''}' is not available here. This repository ejected from Rungs; ` +",
    "      `what remains is ${retained.join(' and ')}, running from .rungs/. To re-adopt Rungs, follow .rungs/README.md.`,",
    '  );',
    '  process.exit(1);',
    '}',
    '',
    "const child = spawnSync(process.execPath, [runner, command, ...rest], { stdio: 'inherit', windowsHide: true });",
    'if (child.error) {',
    '  console.error(`rungs launcher (ejected): ${child.error.message}`);',
    '  process.exit(1);',
    '}',
    'process.exit(child.status ?? 1);',
    '',
  ].join('\n');
}

function ejectReadme(version: string): string {
  return `# .rungs — ejected from @rungs/cli ${version}

The gate engines, their frozen tables and the module metadata they read, materialised into this
repository by \`rungs eject\`. Every declared gate in \`.ai/gates.toml\` is now a \`command\` gate
pointing at \`run-gate.mjs\`, and \`.ai/rungs.mjs\` runs that file with your own Node — so **this
repository no longer needs the rungs package, npm access, or a rungs checkout to run its checks**.

## What still works

- \`node .ai/rungs.mjs check [tier]\` — every registered gate, with the same tiers, output, ledger
  and exit code as before ejection. Local instructions and the generated CI workflow already call
  this, so neither changes.
- \`node .rungs/run-gate.mjs <gate-id>\` — one converted gate on its own; findings on stderr, exit 1
  when it fires.
- \`node .ai/rungs.mjs hook <gate-id>\` — a lifecycle hook, evaluated from its frozen table, so the
  harness configuration that names this launcher keeps working after ejection.
- Your own \`command\` gates run exactly as they did. They never depended on rungs.

## What is gone

\`add\`, \`upgrade\`, \`render\`, \`doctor\`, \`backlog archive\`, \`setup git\` and the concurrency
commands. Rendered rules and generated blocks are no longer regenerated, the registry no longer
receives module updates, and engine fixes stop arriving with a version bump. These files are yours
now, including their bugs.

## What is here

| Path | Contents |
| --- | --- |
| \`run-gate.mjs\` | The runner, bundled with every engine and every dependency it needs |
| \`tables/*.json\` | Each gate table, substituted with the parameters this repo had installed, then frozen |
| \`modules/<name>/\` | Raw \`module.toml\` and gate tables the self-test meta-gate and skill-extension check read |
| \`ejected.json\` | Which version froze what, and when |

## To re-adopt rungs

1. Delete \`.rungs/\` and \`.ai/rungs.mjs\`.
2. Run the exact version you want: \`npx @rungs/cli@<version> upgrade --apply\`. It restores the pinned
   launcher and re-registers every installed module's gate block as declared gates.
3. A gate you registered by hand outside a module block keeps its \`command\` form: set its \`kind\`
   back to \`"declared"\` and delete its \`command\` line.
`;
}

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
