#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { auditModules, loadAllModules } from './manifest.ts';
import { detect, scanRepo } from './detect.ts';
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

const [, , cmd, ...rest] = process.argv;
switch (cmd) {
  case 'modules':
    process.exit(cmdModules());
  case 'doctor':
    process.exit(cmdDoctor(rest[0] ?? process.cwd()));
  default:
    console.log(`
${c.bold('rungs')} — installs and maintains a repository's agentic development system

  ${c.bold('rungs modules')}            list the module set and audit the manifests
  ${c.bold('rungs doctor')} [path]      detect what a repo already has

${c.dim('  Not yet implemented: add, render, check, init, upgrade, eject.')}
`);
    process.exit(cmd ? 1 : 0);
}
