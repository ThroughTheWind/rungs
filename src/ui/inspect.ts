import { basename, join } from 'node:path';
import { statSync } from 'node:fs';
import { parse } from 'smol-toml';
import { detect } from '../detect.ts';
import { loadAllModules } from '../manifest.ts';
import { modulesRoot } from '../ejected.ts';
import { resolveParams, type Params } from '../substitute.ts';
import { ledgerBudget, loadRegistry, runnerGate, tierSelects, type RegistryGate } from '../check.ts';
import { isImplemented } from '../engines.ts';
import { planUpgrade, type InstallRecord } from '../lifecycle.ts';
import { planArchive } from '../backlog.ts';
import { INSTALL_JOURNAL } from '../add.ts';
import { explain } from '../explain.ts';
import { resolveEmittedPath } from '../emitted-path.ts';
import {
  commandHandoff,
  errorText,
  fingerprint,
  frontmatter,
  gitRead,
  markdownRows,
  problem,
  readSection,
  scanTree,
  section,
  sourceLinks,
  sourceText,
  type Issue,
  type Section,
  type SourceLink,
} from './read.ts';

const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');
const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
export const uiVersion = () => String(resolveParams([], {}).rungs.version);

export function inspectRecord(root: string): Section<InstallRecord & { raw: any }> {
  return readSection(root, '.ai/rungs.toml', (text) => {
    const raw = parse(text) as any;
    if (raw.repo !== undefined && !object(raw.repo)) throw new Error('Install record [repo] must be a table.');
    const harnesses = raw.repo?.harnesses ?? [],
      modules = raw.modules ?? {};
    if (!strings(harnesses) || !object(modules))
      throw new Error('Unsupported install-record harnesses or module shape.');
    for (const [name, entry] of Object.entries<any>(modules)) {
      if (
        !object(entry) ||
        typeof entry.version !== 'string' ||
        (entry.params !== undefined && !object(entry.params)) ||
        (entry.hashes !== undefined &&
          (!object(entry.hashes) || !Object.values(entry.hashes).every((v) => typeof v === 'string'))) ||
        (entry.kept !== undefined && (!object(entry.kept) || !strings(entry.kept.files)))
      ) {
        throw new Error(`Unsupported install record for module '${name}'.`);
      }
    }
    return { harnesses, modules, raw };
  });
}

export function inspectRegistry(root: string) {
  return readSection(root, '.ai/gates.toml', (text) => {
    const raw = parse(text) as any;
    if (raw.runner !== undefined && !object(raw.runner)) throw new Error('[runner] must be a table.');
    if (
      raw.runner?.tiers !== undefined &&
      (!strings(raw.runner.tiers) || new Set(raw.runner.tiers).size !== raw.runner.tiers.length)
    ) {
      throw new Error('Runner tiers must be a unique array of strings.');
    }
    if (raw.gates !== undefined && !Array.isArray(raw.gates)) throw new Error('Gates must be an array of tables.');
    const seen = new Set<string>();
    for (const gate of raw.gates ?? []) {
      if (!object(gate) || typeof gate.id !== 'string' || !gate.id.trim() || typeof gate.kind !== 'string')
        throw new Error('Unsupported gate shape.');
      if (seen.has(gate.id)) throw new Error(`Duplicate gate id '${gate.id}'. Inspect the registry source.`);
      seen.add(gate.id);
      for (const key of ['module', 'engine', 'table', 'command', 'tier', 'trigger', 'matcher', 'surface', 'why']) {
        if (gate[key] !== undefined && typeof gate[key] !== 'string')
          throw new Error(`Gate '${gate.id}' has a non-string ${key}.`);
      }
      if (gate.table && !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.toml$/.test(gate.table))
        throw new Error(`Gate '${gate.id}' has an unsupported table path.`);
    }
    // Use the shared registry API after verifying that inspection can represent its shape.
    const registry = loadRegistry(root);
    return {
      ...registry,
      gates: registry.gates.map((gate) => ({
        ...gate,
        executionSurface: gate.trigger ? 'hook' : gate.surface === 'explain' ? 'explain' : 'runner',
        implementation:
          gate.kind === 'command' && gate.command
            ? 'command'
            : gate.engine && isImplemented(gate.engine)
              ? 'engine'
              : 'unimplemented',
        source: '.ai/gates.toml',
      })),
    };
  });
}

export function inspectPin(root: string, version = uiVersion()) {
  try {
    const launcher = sourceText(root, '.ai/rungs.mjs');
    let ejected = false;
    try {
      ejected = statSync(resolveEmittedPath(root, 'ui', '.rungs/run-gate.mjs').absolute).isFile();
    } catch {
      /* absent */
    }
    if (ejected || /from\s+['"]\.\.\/\.rungs\//.test(launcher.text))
      return {
        state: 'ejected',
        compatible: false,
        version: null,
        reason: 'Ejected repository. Use the retained local check launcher.',
        launcher: true,
      };
    if (launcher.state === 'absent')
      return {
        state: 'unpinned',
        compatible: true,
        version: null,
        reason: `No repository launcher. Checks use this explicitly invoked CLI (${version}).`,
        launcher: false,
      };
    if (launcher.state !== 'ok') throw new Error('The launcher cannot be fully read.');
    const pins = [
      ...launcher.text.matchAll(
        /^const pinnedPackageSpec = ['"]@rungs\/cli@(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)['"];\s*$/gm,
      ),
    ];
    if (pins.length !== 1) throw new Error('The repository launcher has no recognized exact pin.');
    const pinned = pins[0][1];
    return {
      state: pinned === version ? 'compatible' : 'different',
      compatible: pinned === version,
      version: pinned,
      reason:
        pinned === version
          ? 'The declared launcher pin matches this CLI.'
          : `Repository pin ${pinned} differs from this CLI ${version}.`,
      launcher: true,
    };
  } catch (error) {
    return { state: 'unknown', compatible: false, version: null, reason: errorText(error), launcher: true };
  }
}

export interface WorkDocument {
  path: string;
  id: string;
  title: string;
  status: string;
  type: string;
  archived: boolean;
  state: 'ok' | 'unsupported' | 'error';
  issues: string[];
  fields: Record<string, string | string[]>;
  body: string;
  links: SourceLink[];
  references: { id: string; kind: string; paths: string[] }[];
  branchFact?: { state: string; message: string };
}

function documents(
  root: string,
  directory: string,
  prefix: string,
  kind: string,
  archived = false,
  directOnly = false,
) {
  const result: WorkDocument[] = [],
    issues: Issue[] = [];
  try {
    const resolved = resolveEmittedPath(root, 'ui work', directory);
    let info;
    try {
      info = statSync(resolved.absolute);
    } catch (error: any) {
      if (error.code === 'ENOENT') return { result, issues };
      throw error;
    }
    if (!info.isDirectory()) throw new Error('Expected a record directory.');
    const scan = scanTree(resolved.absolute);
    issues.push(...scan.issues.map((i) => ({ path: `${directory}/${i.path}`, message: i.message })));
    for (const file of scan.files.filter(
      (file) =>
        (!directOnly || !file.includes('/')) &&
        file.endsWith('.md') &&
        !/^(README|TEMPLATE|AGENTS|CLAUDE)\.md$/i.test(basename(file)),
    )) {
      const path = `${directory}/${file}`;
      const doc: WorkDocument = {
        path,
        id: '',
        title: basename(file),
        status: 'unknown',
        type: kind,
        archived,
        state: 'ok',
        issues: [],
        fields: {},
        body: '',
        links: [],
        references: [],
      };
      try {
        const source = sourceText(root, path);
        if (source.state !== 'ok') throw new Error('Record is absent, changed or exceeds the source limit.');
        const parsed = frontmatter(source.text);
        doc.fields = parsed.fields;
        doc.id = asString(parsed.fields.id);
        doc.title = asString(parsed.fields.title, doc.title);
        doc.status = asString(parsed.fields.status, 'unknown') || 'unknown';
        doc.type = asString(parsed.fields.type, kind) || kind;
        doc.body = parsed.body;
        doc.issues = parsed.issues;
        if (!doc.id) doc.issues.push('No declared id; source retained.');
        if (doc.id && !doc.id.startsWith(`${prefix}-`))
          doc.issues.push(`Id does not use configured prefix '${prefix}'.`);
        if (doc.issues.length) doc.state = 'unsupported';
        doc.links = sourceLinks(root, path, source.text);
      } catch (error) {
        doc.state = 'error';
        doc.issues.push(errorText(error));
      }
      result.push(doc);
    }
  } catch (error) {
    issues.push({ path: directory, message: errorText(error) });
  }
  return { result, issues };
}

function workState(root: string, params: Params, files: string[]) {
  const backlogRoot = `docs/${asString(params.backlog?.root, 'backlog')}`;
  const findingsPath = asString(params.findings?.path, `${backlogRoot}/FINDINGS.md`);
  const adrRoot = asString(params.adr?.path, 'docs/decisions');
  const live = documents(root, `${backlogRoot}/items`, asString(params.backlog?.id_prefix, 'WI'), 'work');
  const archived = documents(root, `${backlogRoot}/archive`, asString(params.backlog?.id_prefix, 'WI'), 'work', true);
  // Flat adopted work items remain inspectable without pretending to migrate them into items/.
  const flat = documents(root, backlogRoot, asString(params.backlog?.id_prefix, 'WI'), 'work', false, true);
  const items = [...live.result, ...archived.result];
  for (const doc of flat.result) {
    if (items.some((item) => item.path === doc.path) || doc.path === findingsPath || !doc.id) continue;
    items.push(doc);
  }
  const decisions = documents(root, adrRoot, asString(params.adr?.id_prefix, 'ADR'), 'decision');
  const findingRows = readSection(root, findingsPath, (text) =>
    markdownRows(text).map((row) => ({
      ...row,
      path: findingsPath,
      links: sourceLinks(root, findingsPath, Object.values(row.cells).join(' ')),
      id: asString(row.cells.Id ?? row.cells.ID ?? row.cells.id)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`/g, ''),
    })),
  );
  const records = [...items, ...decisions.result];
  const byId = new Map<string, string[]>();
  for (const doc of records) if (doc.id) byId.set(doc.id, [...(byId.get(doc.id) ?? []), doc.path]);
  for (const row of findingRows.value ?? [])
    if (row.id) byId.set(row.id, [...(byId.get(row.id) ?? []), `${row.path}:${row.line}`]);
  let branches: Set<string> | null = null;
  try {
    branches = new Set(gitRead(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/']).trim().split('\n'));
  } catch {
    /* no Git */
  }
  for (const doc of records) {
    if (doc.id && (byId.get(doc.id)?.length ?? 0) > 1)
      doc.issues.push(`Duplicate id '${doc.id}' has multiple source records.`);
    for (const key of ['epic', 'children', 'related']) {
      const field = doc.fields[key];
      const ids = Array.isArray(field) ? field : field ? [field] : [];
      for (const id of ids) doc.references.push({ id, kind: key, paths: byId.get(id) ?? [] });
    }
    // References in a source are navigation only; no dependency inference.
    const mentioned = new Set(doc.body.match(/\b[A-Z][A-Z0-9]{0,11}-\d+\b/g) ?? []);
    for (const id of mentioned)
      if (id !== doc.id && !doc.references.some((r) => r.id === id) && byId.has(id)) {
        doc.references.push({ id, kind: 'cited', paths: byId.get(id)! });
      }
    const branch = asString(doc.fields.branch);
    if (branch)
      doc.branchFact = {
        state: branches === null ? 'unknown' : branches.has(branch) ? 'present' : 'absent',
        message:
          branches === null
            ? 'Local branch facts unavailable.'
            : branches.has(branch)
              ? 'Local branch exists; merge state is not inferred.'
              : 'No local branch with this name; remote state is not inferred.',
      };
  }
  const issues = [...live.issues, ...archived.issues, ...flat.issues, ...decisions.issues];
  return {
    state: issues.length ? 'partial' : items.length ? 'ok' : 'absent',
    backlogRoot,
    findingsPath,
    adrRoot,
    items,
    findings: findingRows,
    decisions: decisions.result,
    issues,
    board: files.includes(`${backlogRoot}/BACKLOG.md`) ? `${backlogRoot}/BACKLOG.md` : null,
    session: asString(params.session?.path, '.ai/session.md'),
  };
}

function ledgerState(root: string) {
  const rows = readSection(root, '.ai/.gate-ledger.jsonl', (text) => {
    const records: { line: number; value: any }[] = [],
      issues: Issue[] = [];
    text.split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      try {
        const row = JSON.parse(line);
        records.push({ line: i + 1, value: row });
        if (!object(row) || typeof row.id !== 'string' || typeof row.status !== 'string')
          issues.push({ path: `.ai/.gate-ledger.jsonl:${i + 1}`, message: 'Unrecognized historical row shape.' });
      } catch {
        issues.push({ path: `.ai/.gate-ledger.jsonl:${i + 1}`, message: 'Malformed JSON row; inspect the source.' });
      }
    });
    return { records, issues };
  });
  if (rows.value?.issues.length) {
    rows.state = 'partial';
    rows.issues.push(...rows.value.issues);
  }
  return rows;
}

export function inspectSnapshot(root: string) {
  const moduleRoot = modulesRoot(),
    mods = loadAllModules(moduleRoot),
    version = uiVersion();
  let result: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = fingerprint(root, moduleRoot);
    const record = inspectRecord(root),
      registry = inspectRegistry(root),
      pin = inspectPin(root, version);
    const usableRecord = record.state === 'ok' || record.state === 'absent';
    let params: Params = {};
    const issues: Issue[] = [];
    if (usableRecord) {
      try {
        params = resolveParams(
          mods,
          Object.fromEntries(
            Object.entries(record.value?.modules ?? {}).map(([name, entry]) => [name, entry.params ?? {}]),
          ),
          root,
        );
      } catch (error) {
        issues.push({ path: '.ai/rungs.toml', message: errorText(error) });
      }
    }
    const sources = new Set([
      '.ai/rungs.toml',
      '.ai/gates.toml',
      INSTALL_JOURNAL,
      '.ai/rungs.mjs',
      '.ai/render-report.md',
      '.ai/.gate-ledger.jsonl',
      'AGENTS.md',
      'CLAUDE.md',
    ]);
    const modules = mods.map((mod) => {
      let detection: any;
      try {
        if (!usableRecord || issues.length)
          throw new Error('Install parameters unavailable; inspect the install record.');
        const installed = record.value?.modules[mod.name];
        detection = detect(
          mod,
          root,
          before.files,
          installed
            ? {
                ...installed,
                params_all: params,
                skillsDir: record.value?.harnesses.includes('claude') === false ? '.agents/skills' : '.claude/skills',
              }
            : undefined,
        );
        for (const list of Object.values(detection.ours ?? {}))
          if (Array.isArray(list)) for (const path of list) sources.add(path as string);
        for (const match of detection.matchedPaths) for (const path of match.sample) sources.add(path);
        for (const match of detection.adoptable) for (const path of match.sample) sources.add(path);
        for (const path of detection.paradigm?.matched ?? []) sources.add(path);
      } catch (error) {
        detection = {
          module: mod.name,
          state: 'unknown',
          error: errorText(error),
          matchedPaths: [],
          matchedMarkers: [],
          proposals: [],
          adoptable: [],
        };
      }
      return {
        name: mod.name,
        version: mod.version,
        rung: mod.rung,
        summary: mod.summary,
        requires: mod.requires,
        provenance: mod.provenance,
        threshold: mod.threshold,
        params: params[mod.name],
        installed: record.value?.raw.modules?.[mod.name],
        detection,
      };
    });
    for (const [name, installed] of Object.entries(record.value?.modules ?? {}))
      if (!mods.some((mod) => mod.name === name)) {
        modules.push({
          name,
          installed,
          detection: { state: 'unknown', error: 'This module is not present in the executing CLI bundle.' },
        } as any);
      }
    const work =
      usableRecord && !issues.length
        ? workState(root, params, before.files)
        : {
            state: 'error',
            issues: [...record.issues, ...issues],
            items: [],
            decisions: [],
            findings: problem('', 'Install paths unavailable.'),
            session: null,
            board: null,
            backlogRoot: null,
          };
    for (const doc of [...work.items, ...work.decisions]) {
      sources.add(doc.path);
      for (const link of doc.links) if (link.path && link.exists) sources.add(link.path);
    }
    for (const row of work.findings.value ?? [])
      for (const link of row.links) if (link.path && link.exists) sources.add(link.path);
    for (const path of [work.session, work.board, work.findings.source]) if (path) sources.add(path);
    const journal = readSection(root, INSTALL_JOURNAL, (text) => {
      const value = JSON.parse(text);
      if (!object(value) || !strings(value.modules) || !object(value.files))
        throw new Error('Unrecognized install-journal shape.');
      return value;
    });
    const report = readSection(root, '.ai/render-report.md', (text) => ({
      text,
      links: sourceLinks(root, '.ai/render-report.md', text),
    }));
    const ledger = ledgerState(root);
    let budget: Section<any>;
    try {
      budget =
        (registry.state === 'ok' || registry.state === 'absent') &&
        (ledger.state === 'ok' || ledger.state === 'absent' || (ledger.state === 'partial' && ledger.value))
          ? section(ledgerBudget(root), '.ai/.gate-ledger.jsonl')
          : problem(
              '.ai/.gate-ledger.jsonl',
              'Budget unavailable until the registry and bounded ledger source can be read.',
            );
    } catch (error) {
      budget = problem('.ai/.gate-ledger.jsonl', error);
    }
    const after = fingerprint(root, moduleRoot);
    result = {
      schemaVersion: 1,
      toolVersion: version,
      root,
      name: basename(root),
      capturedAt: new Date().toISOString(),
      generation: after.generation,
      consistent: before.generation === after.generation && before.complete && after.complete,
      scan: {
        files: before.files.length,
        bytes: after.bytes,
        issues: [...before.issues, ...after.issues],
        scope:
          'Repository content excluding dependency/build trees and the ledger. Alias targets and external command inputs are not certified.',
      },
      git: after.git,
      install: { record, pin, modules, journal, report, issues },
      work,
      gates: { registry, ledger, budget },
      sources: [...sources].sort(),
    };
    if (result.consistent || before.generation === after.generation) break;
  }
  return result;
}

export function inspectDiagnostics(root: string) {
  const snapshot = inspectSnapshot(root);
  if (!snapshot.consistent || !['ok', 'absent'].includes(snapshot.install.record.state))
    throw new Error('Refresh a consistent, readable installation before running diagnostics.');
  const before = snapshot.generation;
  const results = explain(
    loadAllModules(modulesRoot()),
    snapshot.install.modules.map((m: any) => m.detection),
    root,
    fingerprint(root, modulesRoot()).files,
  );
  const after = fingerprint(root, modulesRoot());
  return {
    ...results,
    capturedAt: new Date().toISOString(),
    generation: before,
    changed: before !== after.generation || !after.complete,
    endGeneration: after.generation,
  };
}

export function inspectPreview(root: string, operation: string) {
  const snapshot = inspectSnapshot(root);
  if (!snapshot.consistent) throw new Error('Repository changed or the scan is incomplete. Refresh before previewing.');
  let value: unknown, coverage: string;
  if (operation === 'upgrade') {
    if (snapshot.install.pin.state === 'ejected') throw new Error('Ejected repositories do not retain upgrade.');
    if (snapshot.install.record.state !== 'ok') throw new Error('Upgrade preview needs a readable install record.');
    value = planUpgrade(root, loadAllModules(modulesRoot()), snapshot.install.record.value);
    coverage =
      'Module-file comparison only. Gate registration, hook registration and install-record updates are not previewed. No file changes does not mean a whole-upgrade no-op.';
  } else if (operation === 'archive') {
    if (!snapshot.work.backlogRoot) throw new Error('Backlog configuration cannot be resolved.');
    value = planArchive(root, snapshot.work.backlogRoot);
    coverage = 'Eligible file moves, link rewrites and held items. Source changes invalidate this preview.';
  } else throw new Error('Unsupported preview operation.');
  const after = fingerprint(root, modulesRoot());
  return {
    operation,
    value,
    coverage,
    capturedAt: new Date().toISOString(),
    generation: snapshot.generation,
    changed: snapshot.generation !== after.generation || !after.complete,
    handoff: commandHandoff(
      root,
      operation === 'upgrade' ? ['upgrade', '--apply'] : ['backlog', 'archive'],
      snapshot.install.pin.launcher,
    ),
  };
}

export function inspectCheckPlan(root: string, tier?: string) {
  const snapshot = inspectSnapshot(root);
  const registry = snapshot.gates.registry;
  const reasons: string[] = [];
  if (!snapshot.consistent) reasons.push('The content scan is incomplete or changed while reading. Refresh first.');
  if (!['ok', 'absent'].includes(snapshot.install.record.state))
    reasons.push('The install record cannot be interpreted.');
  if (!snapshot.install.pin.compatible) reasons.push(snapshot.install.pin.reason);
  if (registry.state !== 'ok') reasons.push('No readable gate registry.');
  const tiers: string[] = registry.value?.runner.tiers ?? [];
  if (tier !== undefined && (!tier || !tiers.includes(tier)))
    throw new Error(`Select the default operation or a declared tier: ${tiers.join(', ') || '(none)'}.`);
  const gates = (registry.value?.gates ?? []).filter(
    (g: RegistryGate) => runnerGate(g) && (!tier || tierSelects(tiers, tier, g.tier)),
  );
  if (!gates.length) reasons.push('No runner gates selected.');
  return {
    schemaVersion: 1,
    root,
    tier: tier ?? null,
    generation: snapshot.generation,
    toolVersion: snapshot.toolVersion,
    pin: snapshot.install.pin,
    gates,
    allowed: reasons.length === 0,
    reasons,
    capturedAt: new Date().toISOString(),
    authority:
      'Registered command gates inherit this process environment, filesystem, credentials and network access. They can write files. There is no sandbox or rollback.',
    handoff: commandHandoff(root, ['check', ...(tier ? [tier] : [])], snapshot.install.pin.launcher),
  };
}
