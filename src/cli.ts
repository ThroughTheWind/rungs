#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { auditModules, loadAllModules } from './manifest.ts';
import { detect, scanRepo } from './detect.ts';
import { addModule, registerGates, resolveInstallOrder, writeInstallRecord } from './add.ts';
import { render, writeReport, type Harness } from './render.ts';
import { resolveParams } from './substitute.ts';
import type { DetectResult, Manifest } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULES = join(HERE, '..', 'modules');

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const STATE_LABEL: Record<DetectResult['state'], string> = {
  absent: c.dim('absent'),
  'ours-current': c.green('ours'),
  'ours-diverged': c.yellow('diverged'),
  theirs: c.cyan('theirs'),
  paradigm: c.yellow('paradigm'),
  unknown: c.red('unknown'),
};

function cmdModules() {
  const mods = loadAllModules(MODULES);
  console.log(c.bold(`\n${mods.length} modules\n`));
  for (const m of mods) {
    const deps = m.requires.length ? c.dim(` ← ${m.requires.join(', ')}`) : '';
    console.log(`  ${c.bold(m.name.padEnd(14))} rung ${m.rung}${deps}`);
    console.log(`  ${' '.repeat(14)} ${c.dim(m.summary)}`);
  }

  const issues = auditModules(mods);
  console.log();
  if (issues.length === 0) {
    console.log(c.green('  audit clean') + c.dim(' — every parameter accounted for, every gate has a table and a why'));
  } else {
    console.log(c.red(`  ${issues.length} issue(s):`));
    for (const i of issues) console.log(`    ${c.yellow(i.module)} ${c.dim(i.kind)} — ${i.detail}`);
  }
  console.log();
  return issues.length === 0 ? 0 : 1;
}

function cmdDoctor(target: string) {
  const root = resolve(target);
  const mods = loadAllModules(MODULES);
  console.log(c.bold(`\nrungs doctor — ${root}\n`));

  const files = scanRepo(root);
  console.log(c.dim(`  scanned ${files.length} files\n`));

  const results = mods.map((m) => detect(m, root, files));
  const byState = (s: DetectResult['state']) => results.filter((r) => r.state === s);

  for (const r of results) {
    const mod = mods.find((m) => m.name === r.module)!;
    const line = `  ${r.module.padEnd(14)} ${STATE_LABEL[r.state]}`;
    if (r.state === 'absent') {
      console.log(c.dim(line));
      continue;
    }
    console.log(line);
    for (const p of r.matchedPaths.slice(0, 2)) {
      console.log(c.dim(`      ${p.count}× ${p.pattern}  e.g. ${p.sample[0]}`));
    }
    if (r.matchedMarkers.length) console.log(c.dim(`      markers: ${r.matchedMarkers.join(', ')}`));
    for (const prop of r.proposals) {
      console.log(`      ${c.cyan('proposes')} ${prop.param} = ${c.bold(prop.value)} ${c.dim(`(${prop.evidence})`)}`);
    }
    for (const a of r.adoptable) {
      console.log(`      ${c.cyan('adoptable')} ${a.count} as ${a.kind} ${c.dim(`e.g. ${a.sample[0]}`)}`);
    }
    if (r.paradigm) {
      console.log(`      ${c.yellow('different paradigm')}: ${r.paradigm.id} ${c.dim(`(${r.paradigm.matched[0]})`)}`);
      if (r.paradigm.note) console.log(c.dim(`      ${firstSentence(r.paradigm.note)}`));
    }
    if (mod.threshold?.confirm) {
      console.log(c.yellow(`      threshold: ${mod.threshold.minimum}+ ${mod.threshold.metric} — add requires confirmation`));
    }
  }

  console.log(
    `\n  ${byState('theirs').length} present · ${byState('paradigm').length} different paradigm · ${byState('absent').length} absent\n`,
  );

  // ADR-0005: state what this does not cover, every time. A green read is not
  // a verified one, and a low count may mean a narrow signature rather than a
  // clean repo.
  console.log(c.dim('  This reports presence, never quality. It cannot tell whether an adopted'));
  console.log(c.dim('  system is good, complete, or working — only that files are where a'));
  console.log(c.dim("  module's files would be. Signatures under-detect on purpose.\n"));
  return 0;
}

function firstSentence(s: string): string {
  return s.trim().replace(/\s+/g, ' ').split(/(?<=\.)\s/)[0];
}

function cmdAdd(names: string[], root: string, dryRun: boolean, harnesses: Harness[], stamp: string) {
  const mods = loadAllModules(MODULES);
  const { order, missing } = resolveInstallOrder(names, mods);
  if (missing.length) {
    console.log(c.red(`\n  unknown module(s): ${missing.join(', ')}\n`));
    return 1;
  }
  const pulled = order.filter((m) => !names.includes(m.name));
  const params = resolveParams(mods);
  const skillsDir = harnesses.includes('claude') ? '.claude/skills' : '.agents/skills';

  console.log(c.bold(`\nrungs add ${names.join(' ')} → ${root}${dryRun ? c.yellow('  (dry run)') : ''}\n`));
  if (pulled.length) console.log(c.dim(`  pulled in by dependency: ${pulled.map((m) => m.name).join(', ')}\n`));

  const installed: Manifest[] = [];
  for (const mod of order) {
    if (mod.threshold?.confirm && !dryRun) {
      console.log(
        c.yellow(`  ${mod.name}: requires ${mod.threshold.minimum}+ ${mod.threshold.metric}.`) +
          c.dim(' Skipped — pass --confirm-threshold to install it.\n'),
      );
      continue;
    }
    const actions = addModule(mod, root, params, { dryRun, skillsDir });
    installed.push(mod);
    const counts = new Map<string, number>();
    for (const a of actions) counts.set(a.disposition, (counts.get(a.disposition) ?? 0) + 1);
    console.log(`  ${c.bold(mod.name.padEnd(14))} ${[...counts].map(([k, v]) => `${v} ${k}`).join(' · ')}`);
    for (const a of actions.filter((x) => x.disposition === 'skip-exists')) {
      console.log(c.dim(`      kept ${a.target}`));
    }
  }

  // Phase two: the registry's owner has created it by now.
  const gateActions = registerGates(installed, root, dryRun);
  if (gateActions.length) {
    console.log(c.dim(`\n  registered ${gateActions.reduce((n, a) => n + Number(a.note!.split(': ')[1].split(' ')[0]), 0)} gates from ${gateActions.length} module(s)`));
  }

  if (!dryRun) {
    writeInstallRecord(root, order, params, harnesses, stamp);
    const entries = render(root, harnesses);
    writeReport(root, entries, harnesses, stamp);
    console.log(
      `\n  rendered ${entries.filter((e) => e.target).length} file(s) · ` +
        `${entries.filter((e) => e.degraded).length} degraded ` +
        c.dim('→ .ai/render-report.md'),
    );
  }
  console.log();
  return 0;
}

function cmdRender(root: string, harnesses: Harness[], stamp: string) {
  const entries = render(root, harnesses);
  writeReport(root, entries, harnesses, stamp);
  console.log(c.bold(`\nrungs render — ${root}\n`));
  for (const e of entries) {
    const lost = e.degraded ?? (e.dropped?.length ? c.dim(` (dropped ${e.dropped.join(', ')})`) : '');
    console.log(`  ${e.rule.padEnd(24)} ${e.harness.padEnd(10)} ${e.target ?? c.yellow('not emitted')}${lost}`);
  }
  console.log(c.dim(`\n  ${entries.length} rendering(s) → .ai/render-report.md\n`));
  return 0;
}

const [, , cmd, ...rest] = process.argv;
const flags = new Set(rest.filter((r) => r.startsWith('--')));
const args = rest.filter((r) => !r.startsWith('--'));
// Dates come from the caller, never from inside a render: a timestamp baked
// into generated output makes every run a diff.
const STAMP = process.env.RUNGS_DATE ?? new Date().toISOString().slice(0, 10);
const HARNESSES: Harness[] = flags.has('--copilot')
  ? ['claude', 'copilot', 'agents-md']
  : (['claude', 'agents-md'] as Harness[]);

switch (cmd) {
  case 'modules':
    process.exit(cmdModules());
  case 'doctor':
    process.exit(cmdDoctor(args[0] ?? process.cwd()));
  case 'render':
    process.exit(cmdRender(resolve(args[0] ?? process.cwd()), HARNESSES, STAMP));
  case 'add': {
    const target = flags.has('--into') ? args[args.length - 1] : process.cwd();
    const names = flags.has('--into') ? args.slice(0, -1) : args;
    process.exit(cmdAdd(names, resolve(target), flags.has('--dry-run'), HARNESSES, STAMP));
  }
  default:
    console.log(`
${c.bold('rungs')} — installs and maintains a repository's agentic development system

  ${c.bold('rungs modules')}                    list the module set and audit the manifests
  ${c.bold('rungs doctor')} [path]              detect what a repo already has
  ${c.bold('rungs add')} <module…> [--into p]   install modules, resolving dependencies
  ${c.bold('rungs render')} [path]              re-emit path-scoped rules per harness

  ${c.dim('--dry-run   report what would happen, write nothing')}
  ${c.dim('--copilot   also emit Copilot instruction files')}

${c.dim('  Not yet implemented: check, init, upgrade, eject.')}
`);
    process.exit(cmd ? 1 : 0);
}
