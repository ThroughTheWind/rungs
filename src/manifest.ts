import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import type { Manifest, ParamSpec } from './types.ts';
import { walk } from './glob.ts';

/** Reads one module directory into a validated manifest. Throws on anything malformed. */
export function loadManifest(dir: string): Manifest {
  const raw = parse(readFileSync(join(dir, 'module.toml'), 'utf8')) as Record<string, any>;
  const m = raw.module ?? {};
  const name = m.name;
  if (!name) throw new Error(`${dir}: [module].name is required`);

  const manifest: Manifest = {
    name,
    version: m.version ?? '0.0.0',
    rung: m.rung ?? 0,
    summary: m.summary ?? '',
    requires: raw.requires?.modules ?? [],
    conflicts: raw.conflicts?.modules ?? [],
    params: (raw.params ?? {}) as Record<string, ParamSpec>,
    gates: raw.gates ?? [],
    detect: raw.detect ?? {},
    provenance: raw.provenance,
    threshold: raw.threshold,
    dir,
  };

  // `[provenance]` is required and validated (ADR-0003). A module with no
  // traceable source is one somebody invented, and `doctor` cannot ask its
  // questions without the incident.
  const p = manifest.provenance;
  if (!p?.sources?.length) throw new Error(`${name}: [provenance].sources is required`);
  if (!p?.patterns?.length) throw new Error(`${name}: [provenance].patterns is required`);
  if (!p?.incident?.trim()) throw new Error(`${name}: [provenance].incident is required`);

  return manifest;
}

export function loadAllModules(modulesRoot: string): Manifest[] {
  return readdirSync(modulesRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && statSync(join(modulesRoot, e.name, 'module.toml'), { throwIfNoEntry: false }))
    .map((e) => loadManifest(join(modulesRoot, e.name)))
    .sort((a, b) => a.rung - b.rung || a.name.localeCompare(b.name));
}

/** Every `{{param}}` appearing in a module's files and path names. */
export function usedParams(dir: string): Set<string> {
  const used = new Set<string>();
  const add = (text: string) => {
    // `${{ … }}` is never a substitution: GitHub Actions expressions share the
    // delimiter, and without this the ci module corrupts its own workflow file.
    for (const match of text.matchAll(/(^|[^$])\{\{([a-z_.]+)\}\}/g)) used.add(match[2]);
  };
  for (const rel of walk(dir)) {
    add(rel);
    add(readFileSync(join(dir, rel), 'utf8'));
  }
  return used;
}

export interface ManifestIssue {
  module: string;
  kind: 'dead-param' | 'undeclared-param' | 'dep-missing' | 'gate-no-table' | 'gate-no-why' | 'gate-no-applicability';
  detail: string;
}

/** The cross-module audit. Several findings were only visible with every module in hand. */
export function auditModules(mods: Manifest[]): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  const names = new Set(mods.map((m) => m.name));

  for (const mod of mods) {
    for (const dep of mod.requires) {
      if (!names.has(dep)) {
        issues.push({ module: mod.name, kind: 'dep-missing', detail: `requires unknown module '${dep}'` });
      }
    }

    const used = usedParams(mod.dir);
    for (const [param, spec] of Object.entries(mod.params)) {
      if (used.has(param) || spec.consumed_by) continue;
      issues.push({
        module: mod.name,
        kind: 'dead-param',
        detail: `'${param}' is declared, never substituted, and not marked consumed_by`,
      });
    }
    for (const u of used) {
      if (u.includes('.')) continue; // cross-module reference, e.g. backlog.root
      if (!(u in mod.params)) {
        issues.push({ module: mod.name, kind: 'undeclared-param', detail: `uses {{${u}}} but does not declare it` });
      }
    }

    for (const g of mod.gates) {
      if (g.kind === 'declared' && !g.table) {
        issues.push({ module: mod.name, kind: 'gate-no-table', detail: `gate '${g.id}' is declared with no table` });
      }
      // `doctor` quotes `why` back when a gate has never fired (ADR-0005 tier B),
      // so a gate without one cannot be asked about.
      if (!g.why?.trim()) {
        issues.push({ module: mod.name, kind: 'gate-no-why', detail: `gate '${g.id}' has no 'why'` });
      }
      // WI-052. `doctor --explain` will not run an undeclared gate against a repo
      // that is not ours, so an author who forgets this silently loses their gate
      // on exactly the repos the analysis exists for. Caught here, where the
      // module is written, rather than as a skip line nobody reads.
      if (g.kind === 'declared' && !g.applicability) {
        issues.push({
          module: mod.name,
          kind: 'gate-no-applicability',
          detail: `gate '${g.id}' does not declare applicability (repo-content | our-artifacts | our-schema)`,
        });
      }
    }
  }
  return issues;
}
