import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Manifest } from './types.ts';
import { matchAny, walk } from './glob.ts';
import { markers, mergeBlock, substitute, type Params } from './substitute.ts';
import { preflightEmittedPaths, resolveEmittedPath, type EmittedPathCandidate } from './emitted-path.ts';

export interface AddAction {
  disposition: 'create' | 'skip-exists' | 'rule' | 'skill' | 'merge' | 'gate' | 'hook';
  target: string;
  note?: string;
}

/** Where a fragment file merges to. The name is the target, not a path. */
const FRAGMENT_TARGET: Record<string, string> = {
  'AGENTS.md': 'AGENTS.md',
  gitignore: '.gitignore',
  gitattributes: '.gitattributes',
};

const RESERVED_SHARED_SINKS = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  '.gitignore',
  '.gitattributes',
  '.ai/gates.toml',
]);

/**
 * Whole-file sources that establish a shared sink before other phases merge
 * managed blocks into it.  The source role is deliberately checked before
 * substitution: a parameterised ordinary file does not become a co-owner just
 * because its chosen value happens to spell `AGENTS.md` or `.ai/gates.toml`.
 */
const SHARED_FILE_OWNERS = new Map<string, ReadonlySet<string>>([
  ['instructions', new Set(['AGENTS.md', 'CLAUDE.md'])],
  ['gates', new Set(['.ai/gates.toml'])],
]);

interface FileEmission {
  target: string;
  content: string;
  disposition: AddAction['disposition'];
  shared: boolean;
}

function ownsSharedFile(mod: Manifest, sourceTarget: string, target: string): boolean {
  return sourceTarget === target && (SHARED_FILE_OWNERS.get(mod.name)?.has(sourceTarget) ?? false);
}

function reservedSharedSinkCandidates(): EmittedPathCandidate[] {
  return [...RESERVED_SHARED_SINKS].map((target) => ({
    moduleName: 'rungs reserved shared sink',
    target,
    shared: true,
  }));
}

/** One source of truth for the files, rules and skills both add and upgrade emit. */
function fileEmissions(mod: Manifest, params: Params, skillsDir = '.claude/skills'): FileEmission[] {
  const out: FileEmission[] = [];
  const sub = (text: string) => substitute(text, mod.name, params);
  for (const [dir, prefix, disposition] of [
    ['files', '', 'create'],
    ['rules', '.ai/rules/', 'rule'],
    ['skills', `${skillsDir}/`, 'skill'],
  ] as const) {
    const base = join(mod.dir, dir);
    if (!existsSync(base)) continue;
    for (const rel of walk(base)) {
      const sourceTarget = (prefix + rel).replace(/\\/g, '/');
      const target = sub(sourceTarget).replace(/\\/g, '/');
      let content = sub(readFileSync(join(base, rel), 'utf8'));
      if (dir === 'skills') content = withOptedInExtensions(mod, rel, content);
      out.push({ target, content, disposition, shared: ownsSharedFile(mod, sourceTarget, target) });
    }
  }
  return out;
}

function fragmentTargets(mod: Manifest): string[] {
  const base = join(mod.dir, 'fragments');
  if (!existsSync(base)) return [];
  return walk(base).map((rel) => FRAGMENT_TARGET[rel]).filter((target): target is string => Boolean(target));
}

function moduleTargets(
  mod: Manifest,
  params: Params,
  skillsDir: string,
  files = fileEmissions(mod, params, skillsDir),
): EmittedPathCandidate[] {
  return [
    ...files.map((file) => ({ moduleName: mod.name, target: file.target, shared: file.shared })),
    ...fragmentTargets(mod).map((target) => ({ moduleName: mod.name, target, shared: true, writeExisting: true })),
    ...(mod.gates.length
      ? [{ moduleName: mod.name, target: '.ai/gates.toml', shared: true, writeExisting: true }]
      : []),
  ];
}

/** Validate a whole install set before the first module is allowed to write. */
export function moduleEmissionCandidates(
  mods: Manifest[],
  params: Params,
  skillsDir = '.claude/skills',
): EmittedPathCandidate[] {
  return [
    ...reservedSharedSinkCandidates(),
    ...mods.flatMap((mod) => moduleTargets(mod, params, skillsDir)),
  ];
}

export function preflightModuleEmissions(
  mods: Manifest[],
  repoRoot: string,
  params: Params,
  skillsDir = '.claude/skills',
): void {
  preflightEmittedPaths(repoRoot, moduleEmissionCandidates(mods, params, skillsDir));
}

export interface ProspectiveRuleEmission {
  moduleName: string;
  target: string;
  content: string;
}

/** Rule sources an install would create, in installation order. */
export function prospectiveRuleEmissions(
  mods: Manifest[],
  params: Params,
  skillsDir = '.claude/skills',
): ProspectiveRuleEmission[] {
  return mods.flatMap((mod) =>
    fileEmissions(mod, params, skillsDir)
      .filter((file) => file.disposition === 'rule')
      .map((file) => ({ moduleName: mod.name, target: file.target, content: file.content })),
  );
}

/**
 * Install one module. Disposition is decided by which subdirectory a file is
 * in — never by per-file configuration (ADR-0003), which is why this function
 * is a switch over five directory names and nothing else.
 *
 * Never overwrites an existing file. ADR-0004: `add` on existing structure
 * reports the delta; the dangerous operation is removed rather than guarded.
 */
export function addModule(
  mod: Manifest,
  repoRoot: string,
  params: Params,
  opts: { dryRun?: boolean; skillsDir?: string } = {},
): AddAction[] {
  const actions: AddAction[] = [];
  const skillsDir = opts.skillsDir ?? '.claude/skills';
  const files = fileEmissions(mod, params, skillsDir);
  const targets = moduleTargets(mod, params, skillsDir, files);
  const reservations = reservedSharedSinkCandidates();
  const resolved = preflightEmittedPaths(repoRoot, [...reservations, ...targets]).slice(reservations.length);
  const destinations = new Map(targets.map((candidate, index) => [candidate.target, resolved[index].absolute]));
  const write = (rel: string, content: string, disposition: AddAction['disposition']) => {
    const full = destinations.get(rel)!;
    if (existsSync(full)) {
      actions.push({ disposition: 'skip-exists', target: rel, note: 'already present — left alone' });
      return;
    }
    actions.push({ disposition, target: rel });
    if (opts.dryRun) return;
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  };

  const sub = (text: string) => substitute(text, mod.name, params);
  const has = (d: string) => existsSync(join(mod.dir, d));

  for (const file of files) write(file.target, file.content, file.disposition);

  if (has('fragments')) {
    const base = join(mod.dir, 'fragments');
    for (const rel of walk(base)) {
      const target = FRAGMENT_TARGET[rel];
      if (!target) {
        actions.push({ disposition: 'merge', target: rel, note: 'unknown fragment target — skipped' });
        continue;
      }
      const full = destinations.get(target)!;
      const existing = existsSync(full) ? readFileSync(full, 'utf8') : '';
      const fragment = sub(readFileSync(join(base, rel), 'utf8'));
      const merged = mergeBlock(existing, fragment, mod.name);
      actions.push({
        disposition: 'merge',
        target,
        note: existing.includes(`rungs:begin ${mod.name}`) ? 'block replaced' : 'block appended',
      });
      if (!opts.dryRun) {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, merged);
      }
    }
  }

  return actions;
}

/**
 * Gate registration is a **second phase**, run after every module's files exist.
 *
 * Done inside `addModule` it raced the `gates` module's own registry file:
 * whichever module merged an entry first created `.ai/gates.toml`, and the
 * owner then hit the never-overwrite rule and was skipped — leaving a registry
 * with entries and no `[runner]` block. Reordering the install did not fix it,
 * because `gates` depends on `instructions`, which itself ships gates. The
 * ordering was never the problem: **the owner of a shared file must create it
 * before anything merges into it, which is a phase, not a position.**
 */
export function registerGates(mods: Manifest[], repoRoot: string, dryRun = false, adopted: AdoptedGate[] = []): AddAction[] {
  const actions: AddAction[] = [];
  const owners = [...(adopted.length ? ['adopted'] : []), ...mods.filter((mod) => mod.gates.length).map((mod) => mod.name)];
  const destinations = preflightEmittedPaths(
    repoRoot,
    owners.map((moduleName) => ({ moduleName, target: '.ai/gates.toml', shared: true, writeExisting: true })),
  );
  const registry = destinations[0]?.absolute ?? join(repoRoot, '.ai', 'gates.toml');

  // Adoption, in the only form ADR-0004 permits: the repo's existing validators
  // are registered as `command` gates so they gain the runner, the ledger and
  // attribution — **without a line of them being rewritten**. This is the claim
  // the whole product rests on, and it was missing: `add` created a registry of
  // rungs' own gates and left the repo's sixteen where they were.
  if (adopted.length) {
    const existing = existsSync(registry) ? readFileSync(registry, 'utf8') : '';
    const { begin, end } = markers('gates.toml', 'adopted', '1.0.0');
    const body = [
      begin,
      '# Registered from validators this repo already had. Their scripts are untouched and',
      '# stay yours; rungs only runs them and records what it observes.',
      ...adopted.map(
        (a) => `\n[[gates]]\nid      = "${a.id}"\nkind    = "command"\nmodule  = "adopted"\ntier    = "${a.tier}"\ncommand = "${a.command}"\nwhy     = """Adopted from ${a.source}. Predates rungs and is owned by this repo."""`,
      ),
      end,
    ].join('\n');
    actions.push({ disposition: 'gate', target: '.ai/gates.toml', note: `adopted: ${adopted.length} entries` });
    if (!dryRun) {
      mkdirSync(dirname(registry), { recursive: true });
      writeFileSync(registry, mergeBlock(existing, body, 'adopted'));
    }
  }

  for (const mod of mods) {
    if (!mod.gates.length) continue;
    const existing = existsSync(registry) ? readFileSync(registry, 'utf8') : '';
    const { begin, end } = markers('gates.toml', mod.name, mod.version);
    const body = [begin, ...mod.gates.map(gateEntry(mod)), end].join('\n');
    actions.push({ disposition: 'gate', target: '.ai/gates.toml', note: `${mod.name}: ${mod.gates.length} entries` });
    if (dryRun) continue;
    mkdirSync(dirname(registry), { recursive: true });
    writeFileSync(registry, mergeBlock(existing, body, mod.name));
  }
  return actions;
}

const gateEntry = (mod: Manifest) => (g: Manifest['gates'][number]) => {
  const lines = ['', '[[gates]]', `id     = "${g.id}"`, `kind   = "${g.kind}"`, `module = "${mod.name}"`];
  if (g.engine) lines.push(`engine = "${g.engine}"`);
  if (g.table) lines.push(`table  = "${mod.name}/${g.table.replace(/^gates\//, '')}"`);
  if (g.command) lines.push(`command = "${g.command}"`);
  if (g.tier) lines.push(`tier   = "${g.tier}"`);
  if (g.trigger) lines.push(`trigger = "${g.trigger}"`);
  if (g.matcher) lines.push(`matcher = "${g.matcher}"`);
  // `why` is carried into the repo because ADR-0005 tier B quotes it back when
  // a gate has never fired. A gate whose reason lives only in this CLI cannot
  // be asked about by a repo that has it installed.
  if (g.why) lines.push(`why    = """${g.why.trim()}"""`);
  return lines.join('\n');
};

/** Dependency order, refusing anything unmet — naming the incident (ADR-0003). */
/**
 * Every module in `order` that cannot be installed because one of the modules
 * it needs — or itself — is a different paradigm.
 *
 * A refusal has to travel *up* the dependency edges, not just stop at the
 * module that matched. `add audit` pulls `findings` which pulls `backlog`; if
 * the repo's work lives in an issue tracker, refusing `backlog` and installing
 * `audit` anyway would ship an audit procedure whose findings have nowhere to
 * close — which is the exact incident (268 audit documents, no register) that
 * made `audit → findings → backlog` a declared dependency in the first place.
 */
export function blockedByParadigm(order: Manifest[], paradigms: ReadonlySet<string>): Map<string, string> {
  const blocked = new Map<string, string>();
  // `order` is already dependency-first, so one forward pass settles it.
  for (const mod of order) {
    if (paradigms.has(mod.name)) {
      blocked.set(mod.name, mod.name);
      continue;
    }
    const dep = mod.requires.find((d) => blocked.has(d));
    if (dep) blocked.set(mod.name, blocked.get(dep)!);
  }
  return blocked;
}

/** Why one module could not be installed: which conflict, and whose. */
export interface ConflictBlock {
  /** The module in `order` whose own conflict caused this — itself, if direct. */
  cause: string;
  /** The module it conflicts with. */
  with: string;
}

/**
 * Every module in `order` that cannot be installed because it conflicts with a
 * module the repo already has, with another module in the same install set, or
 * because something it depends on does.
 *
 * `[conflicts]` was parsed into the manifest and read by nothing (F-038), so a
 * module declaring an incompatibility got silence — the same family as the
 * skill extensions of F-019 and the paradigm state of F-014, and the third time
 * a manifest field was documented to contributors and enforced nowhere.
 *
 * **The relation is symmetric even though the declaration is not.** Only one
 * side can realistically know: a module authored outside this package can name
 * `backlog`, and `backlog` will never name it. Requiring both to declare would
 * make the field useless for exactly the case it exists for.
 *
 * Blocking travels up the dependency edges for the reason `blockedByParadigm`
 * does — a dependency is only ever pulled in *for* something, and installing
 * the dependent of a refused module ships half a system.
 */
export function blockedByConflict(
  order: Manifest[],
  present: ReadonlySet<string>,
  all: Manifest[],
): Map<string, ConflictBlock> {
  const byName = new Map(all.map((m) => [m.name, m]));
  const blocked = new Map<string, ConflictBlock>();

  const partner = (mod: Manifest): string | undefined => {
    const declared = mod.conflicts.find((other) => other !== mod.name && present.has(other));
    if (declared) return declared;
    for (const other of present) {
      if (other === mod.name) continue;
      if (byName.get(other)?.conflicts.includes(mod.name)) return other;
    }
    return undefined;
  };

  // `order` is already dependency-first, so one forward pass settles it.
  for (const mod of order) {
    const against = partner(mod);
    if (against) {
      blocked.set(mod.name, { cause: mod.name, with: against });
      continue;
    }
    const dep = mod.requires.find((d) => blocked.has(d));
    if (dep) blocked.set(mod.name, blocked.get(dep)!);
  }
  return blocked;
}

export function resolveInstallOrder(requested: string[], all: Manifest[]): { order: Manifest[]; missing: string[] } {
  const byName = new Map(all.map((m) => [m.name, m]));
  const order: Manifest[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    const mod = byName.get(name);
    if (!mod) {
      missing.push(name);
      return;
    }
    seen.add(name);
    for (const dep of mod.requires) visit(dep);
    order.push(mod);
  };
  // A module's gates are inert without the runner that executes them. Installing
  // `backlog` alone produced a `.ai/gates.toml` holding three entries and no
  // `[runner]` block — a registry nothing reads. Rather than making every
  // gate-shipping module declare the dependency (and `instructions`, which ships
  // gates and is what `gates` itself requires, could not), the runner is pulled
  // in whenever anything registers with it.
  //
  // It is visited **first**, not appended: installed last it arrived after other
  // modules had already merged entries into the registry, so its own file — the
  // one carrying `[runner]` — hit the never-overwrite rule and was skipped. The
  // owner of a shared file has to create it before anyone merges into it.
  const closure = new Set<string>();
  const collect = (n: string) => {
    if (closure.has(n)) return;
    const m = byName.get(n);
    if (!m) return;
    closure.add(n);
    m.requires.forEach(collect);
  };
  requested.forEach(collect);
  if ([...closure].some((n) => byName.get(n)!.gates.length) && byName.has('gates')) {
    visit('gates');
  }

  for (const r of requested) visit(r);
  return { order, missing };
}

/**
 * Content hash of what a module emitted, recorded at install.
 *
 * Without it `upgrade` cannot tell a file the user edited from one an older
 * module version wrote — and those want opposite treatment: the first is a
 * decision to respect, the second is the thing upgrade exists to replace.
 * It is also what makes ADR-0004's `ours-current` and `ours-diverged` states
 * decidable at all.
 */
export const contentHash = (s: string) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

/**
 * Files a module owns **outright** — not the shared ones it merges into.
 *
 * `AGENTS.md` and `.ai/gates.toml` are co-owned: a module creates them and then
 * every other module merges a block in, so their content differs from what any
 * single module emitted the moment the second module installs. Hashing them
 * reported both as diverged on a completely untouched repo. A file carrying
 * managed blocks is never whole-file upgraded — its **blocks** are, through the
 * merge path.
 */
/**
 * Add the harness extensions a module opted this skill into.
 *
 * F-019. `[skills.work-item] extensions = { disable-model-invocation = true }`
 * was declared in the `backlog` manifest, documented in `modules/README.md`, and
 * **implemented at no layer**: `grep -n extensions src/*.ts` returned nothing, so
 * the key never reached the emitted `SKILL.md`, and the gate that is supposed to
 * police it could not see the opt-in either. `work-item` creates branches and
 * merges, and the manifest's stated reason for opting it out of model invocation
 * had been inert since it was written.
 *
 * Injected here rather than written into the source skill because that is the
 * point of the opt-in: the file stays spec-pure and portable
 * ([ADR-0001](../docs/decisions/ADR-0001-multi-harness-rendering.md)), and the
 * extension — with its portability cost — stays attached to the module's
 * decision to take it.
 */
function withOptedInExtensions(mod: Manifest, rel: string, content: string): string {
  const name = rel.split(/[\\/]/)[0];
  const extensions = mod.skills?.[name]?.extensions;
  if (!extensions || !Object.keys(extensions).length) return content;

  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return content; // no frontmatter to extend; `skills-spec-pure` reports it
  const added = Object.entries(extensions)
    .filter(([k]) => !new RegExp(`^${k}:`, 'm').test(m[1]))
    .map(([k, v]) => `${k}: ${v}`);
  if (!added.length) return content;
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${m[1]}\n${added.join('\n')}\n---`);
}

export function emittedFiles(mod: Manifest, params: Params, skillsDir = '.claude/skills'): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of fileEmissions(mod, params, skillsDir)) {
    if (!file.shared) out.set(file.target, file.content);
  }
  return out;
}

export function writeInstallRecord(
  repoRoot: string,
  mods: Manifest[],
  params: Params,
  harnesses: string[],
  stamp: string,
  skillsDir = '.claude/skills',
  /** Per module, the files rungs actually created — as opposed to kept. */
  wroteByModule?: Map<string, Set<string>>,
) {
  const lines = [
    '# Installed by `rungs`. This is a record of what was written, not a control panel:',
    '# editing a parameter here does not rewrite a file that already exists. `rungs render`',
    '# re-emits path-scoped rules from `.ai/rules/`, and `rungs upgrade --apply` replaces',
    '# module files you have not edited — neither re-substitutes parameters. AGENTS.md,',
    '# CLAUDE.md, .gitignore, .gitattributes and .ai/gates.toml are shared between modules,',
    '# so only their `rungs:begin`/`rungs:end` blocks are ever updated; anything outside a',
    '# block, including the entry document\'s title, is yours to edit directly.',
    '#',
    '# Hashes are what rungs emitted; a file whose hash no longer matches is a',
    '# divergence rungs reports and never overwrites.',
    '',
    '[repo]',
    `harnesses = ${JSON.stringify(harnesses)}`,
    `installed = "${stamp}"`,
    '',
  ];
  for (const m of mods) {
    lines.push(`[modules.${m.name}]`, `version = "${m.version}"`, 'state   = "managed"');
    const p = params[m.name] ?? {};
    if (Object.keys(p).length) {
      lines.push(`params  = { ${Object.entries(p).map(([k, v]) => `${k} = ${JSON.stringify(v ?? '')}`).join(', ')} }`);
    }
    // Only files rungs actually **wrote** get a hash. A file that already
    // existed was kept, and hashing it with our content would later read as a
    // divergence the user caused — implying they broke something they never
    // touched. Kept files are listed separately and stay theirs forever.
    const emitted = emittedFiles(m, params, skillsDir);
    const exists = (rel: string) => existsSync(resolveEmittedPath(repoRoot, m.name, rel).absolute);
    const created = [...emitted].filter(([rel]) => (wroteByModule?.get(m.name)?.has(rel) ?? exists(rel)));
    const kept = [...emitted].filter(([rel]) => !created.some(([c]) => c === rel) && exists(rel));
    if (created.length) {
      lines.push(`[modules.${m.name}.hashes]`);
      for (const [rel, content] of created) lines.push(`"${rel}" = "${contentHash(content)}"`);
    }
    if (kept.length) {
      lines.push('', `[modules.${m.name}]`.replace(']', '.kept]'));
      lines.push(`files = ${JSON.stringify(kept.map(([rel]) => rel))}`);
    }
    lines.push('');
  }
  const record = preflightEmittedPaths(repoRoot, [
    { moduleName: 'rungs', target: '.ai/rungs.toml', writeExisting: true },
  ])[0];
  writeFileSync(record.absolute, lines.join('\n'));
}

export interface AdoptedGate {
  id: string;
  command: string;
  tier: string;
  source: string;
}

/**
 * Turn detected `adopt_as` matches into `command` gate entries.
 *
 * The interpreter is chosen from the extension, and an unknown one is skipped
 * rather than guessed at — a registry entry that cannot run is worse than one
 * that is absent, because it reports as a failure the owner did not cause.
 */
export function adoptableGates(files: string[], patterns: string[], repoRoot: string): AdoptedGate[] {
  const runner: Record<string, string> = { '.mjs': 'node', '.js': 'node', '.ps1': 'pwsh -File', '.sh': 'bash' };
  const out: AdoptedGate[] = [];
  for (const pattern of patterns) {
    for (const rel of matchAny(files, pattern)) {
      const ext = rel.slice(rel.lastIndexOf('.'));
      const exec = runner[ext];
      if (!exec) continue;
      out.push({
        id: `adopted-${rel.split('/').pop()!.replace(/\.[^.]+$/, '')}`,
        command: `${exec} ${rel}`,
        tier: 'fast',
        source: rel,
      });
    }
  }
  return out;
}
