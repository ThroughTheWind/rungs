#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { auditModules, loadAllModules } from './manifest.ts';
import { detect, scanRepo } from './detect.ts';
import { addModule, adoptableGates, registerGates, resolveInstallOrder, writeInstallRecord } from './add.ts';
import { render, writeReport, type Harness } from './render.ts';
import { resolveParams } from './substitute.ts';
import { appendLedger, ledgerQuestions, loadRegistry, runGates } from './check.ts';
import { applyUpgrade, eject, planUpgrade, PROFILES, readRecord } from './lifecycle.ts';
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

  // Detect what the repo already has and register it alongside (ADR-0004).
  const repoFiles = scanRepo(root);
  const adopted = installed.flatMap((m) =>
    (m.detect.adopt_as ?? [])
      .filter((a) => a.kind === 'command')
      .flatMap((a) => adoptableGates(repoFiles, a.paths ?? [], root)),
  );
  if (adopted.length) {
    console.log(
      '\n  ' + c.cyan(`adopting ${adopted.length} existing validator(s)`) +
        ' as command gates' + c.dim(' — their scripts are untouched'),
    );
    for (const a of adopted.slice(0, 3)) console.log(c.dim(`      ${a.command}`));
    if (adopted.length > 3) console.log(c.dim(`      …and ${adopted.length - 3} more`));
  }

  // Phase two: the registry's owner has created it by now.
  const gateActions = registerGates(installed, root, dryRun, adopted);
  if (gateActions.length) {
    console.log(c.dim(`\n  registered ${gateActions.reduce((n, a) => n + Number(a.note!.split(': ')[1].split(' ')[0]), 0)} gates from ${gateActions.length} module(s)`));
  }

  if (!dryRun) {
    writeInstallRecord(root, order, params, harnesses, stamp, skillsDir);
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

function cmdCheck(root: string, tier: string | undefined, stamp: string) {
  const runs = runGates(root, tier);
  if (!runs.length) {
    console.log(c.yellow('\n  no gates registered — is this a rungs repo?\n'));
    return 1;
  }
  appendLedger(root, runs, stamp);

  console.log(c.bold(`\nrungs check — ${root}${tier ? ` (${tier} tier)` : ''}\n`));
  const mark = { pass: c.green('pass'), fail: c.red('FAIL'), unimplemented: c.yellow('unimpl'), error: c.red('error') };
  for (const r of runs) {
    console.log(
      `  ${mark[r.status]} ${r.id.padEnd(34)} ${c.dim(`${r.ms}ms`)}` +
        (r.examined ? c.dim(`  ${r.examined} examined`) : ''),
    );
    for (const f of r.findings.slice(0, 4)) {
      console.log(`         ${c.dim(f.file ? `${f.file}: ` : '')}${f.message}`);
    }
    if (r.findings.length > 4) console.log(c.dim(`         …and ${r.findings.length - 4} more`));
  }

  const n = (s: string) => runs.filter((r) => r.status === s).length;
  console.log(
    `\n  ${c.green(`${n('pass')} pass`)} · ${c.red(`${n('fail')} fail`)} · ` +
      `${c.yellow(`${n('unimplemented')} unimplemented`)} · ${n('error')} error` +
      c.dim(`  (${runs.reduce((t, r) => t + r.ms, 0)}ms total)`),
  );

  if (n('unimplemented')) {
    console.log(
      c.yellow('\n  Unimplemented gates are not passes.') +
        c.dim(' A registry reporting green because most of its\n  gates do nothing is the worst failure this tool could have, so they block.'),
    );
  }

  const { gates } = loadRegistry(root);
  const q = ledgerQuestions(root, gates);
  if (q.neverFired.length || q.alwaysFires.length) {
    console.log(c.bold(`\n  Ledger questions ${c.dim(`(${q.runs} recorded runs)`)}`));
    for (const g of q.neverFired.slice(0, 3)) {
      console.log(`    ${c.cyan(g.id)} has never fired. ${c.dim(firstSentence(g.why ?? ''))}`);
      console.log(c.dim('      Is that still a risk here, or is the gate scoped too narrowly?'));
    }
    for (const g of q.alwaysFires.slice(0, 3)) {
      console.log(`    ${c.cyan(g.id)} fails ${g.rate}. ${c.dim('Red by default is a gate people learn to bypass.')}`);
    }
    console.log(
      c.dim('\n    These are questions, not verdicts. The ledger records whether a gate ran'),
    );
    console.log(c.dim('    and whether it fired — never whether it is valuable. Gates invoked'));
    console.log(c.dim('    directly, and CI runs, are not counted.'));
  }
  console.log();
  return n('fail') + n('unimplemented') + n('error') > 0 ? 1 : 0;
}

function cmdInit(root: string, profile: string, dryRun: boolean, harnesses: Harness[], stamp: string) {
  if (readRecord(root)) {
    console.log(
      c.yellow('\n  this repo is already initialised.') +
        c.dim(' Use `rungs add <module>` to install more, or `rungs upgrade`.\n'),
    );
    return 1;
  }
  const names = PROFILES[profile];
  if (!names) {
    console.log(c.red(`\n  unknown profile '${profile}'.`) + c.dim(` Known: ${Object.keys(PROFILES).join(', ')}\n`));
    return 1;
  }
  console.log(c.dim(`\n  profile '${profile}' — ${names.length} modules`));
  return cmdAdd(names, root, dryRun, harnesses, stamp);
}

function cmdUpgrade(root: string, apply: boolean) {
  const record = readRecord(root);
  if (!record) {
    console.log(c.yellow('\n  not a rungs repo — nothing to upgrade.\n'));
    return 1;
  }
  const mods = loadAllModules(MODULES);
  const plan = planUpgrade(root, mods, record);
  console.log(c.bold(`\nrungs upgrade — ${root}${apply ? '' : c.yellow('  (preview)')}\n`));

  let stale = 0;
  let diverged = 0;
  for (const item of plan) {
    const counts = item.files.reduce<Record<string, number>>((a, f) => ({ ...a, [f.state]: (a[f.state] ?? 0) + 1 }), {});
    stale += (counts.stale ?? 0) + (counts.missing ?? 0);
    diverged += counts.diverged ?? 0;
    const moved = item.from === item.to ? c.dim(item.to) : `${item.from} → ${c.bold(item.to)}`;
    console.log(`  ${item.module.padEnd(14)} ${moved}  ${c.dim(Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · '))}`);
    for (const f of item.files.filter((x) => x.state === 'diverged')) {
      console.log(`      ${c.yellow('diverged')} ${f.rel} ${c.dim('— yours, left alone')}`);
    }
  }

  if (apply && stale) {
    const written = applyUpgrade(root, mods, record, plan);
    console.log(c.green(`\n  updated ${written} file(s)`));
  }
  console.log(
    `\n  ${stale} to update · ${diverged} diverged\n` +
      c.dim('  Divergence is a decision, not an error: a file you edited is never overwritten.\n') +
      (apply ? '' : c.dim('  Run with --apply to write.\n')),
  );
  return 0;
}

function cmdEject(root: string, dryRun: boolean) {
  if (!readRecord(root)) {
    console.log(c.yellow('\n  not a rungs repo — nothing to eject.\n'));
    return 1;
  }
  const result = eject(root, loadAllModules(MODULES), dryRun);
  console.log(c.bold(`\nrungs eject — ${root}${dryRun ? c.yellow('  (dry run)') : ''}\n`));
  for (const a of result.actions.slice(0, 6)) console.log(c.dim(`  ${a}`));
  if (result.actions.length > 6) console.log(c.dim(`  …and ${result.actions.length - 6} more`));
  console.log(
    `\n  ${result.gates} declared gate(s) rewritten as commands.` +
      c.dim('\n  This repo no longer needs rungs installed to run its checks.\n') +
      c.dim('  Engine fixes stop arriving with a version bump — these files are yours now.\n'),
  );
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
  case 'check': {
    const tier = args[1] ?? (flags.has('--full') ? 'full' : flags.has('--fast') ? 'fast' : undefined);
    process.exit(cmdCheck(resolve(args[0] ?? process.cwd()), tier, STAMP));
  }
  case 'init': {
    const profile = args[1] ?? 'tracked';
    process.exit(cmdInit(resolve(args[0] ?? process.cwd()), profile, flags.has('--dry-run'), HARNESSES, STAMP));
  }
  case 'upgrade':
    process.exit(cmdUpgrade(resolve(args[0] ?? process.cwd()), flags.has('--apply')));
  case 'eject':
    process.exit(cmdEject(resolve(args[0] ?? process.cwd()), flags.has('--dry-run')));
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

  ${c.bold('rungs init')} [path] [profile]      scaffold a repo — minimal · tracked · disciplined · hardened · fleet
  ${c.bold('rungs doctor')} [path]              detect what a repo already has, installed or not
  ${c.bold('rungs add')} <module…> [--into p]   install modules, resolving dependencies and adopting what exists
  ${c.bold('rungs check')} [path] [tier]        run the registered gates and record the ledger
  ${c.bold('rungs render')} [path]              re-emit path-scoped rules per harness
  ${c.bold('rungs upgrade')} [path]             move to newer module versions, never touching what you edited
  ${c.bold('rungs eject')} [path]               materialise the engines; stop depending on rungs
  ${c.bold('rungs modules')}                    list the module set and audit the manifests

  ${c.dim('--dry-run   report what would happen, write nothing')}
  ${c.dim('--apply     upgrade only: write the changes')}
  ${c.dim('--copilot   also emit Copilot instruction files')}
`);
    process.exit(cmd ? 1 : 0);
}
