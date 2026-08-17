#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { auditModules, loadAllModules } from './manifest.ts';
import { detect, scanRepo } from './detect.ts';
import { addModule, adoptableGates, blockedByParadigm, registerGates, resolveInstallOrder, writeInstallRecord } from './add.ts';
import { render, writeReport, type Harness } from './render.ts';
import { resolveParams } from './substitute.ts';
import { appendLedger, type GateRun, ledgerQuestions, loadRegistry, runGates, UnknownTierError } from './check.ts';
import { applyUpgrade, eject, planUpgrade, PROFILES, readRecord, setupGit } from './lifecycle.ts';
import { explain, IN_SCOPE as EXPLAINABLE } from './explain.ts';
import { applyArchive, planArchive } from './backlog.ts';
import { existsSync } from 'node:fs';
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

function cmdModules(showParams = false) {
  const mods = loadAllModules(MODULES);
  console.log(c.bold(`\n${mods.length} modules\n`));
  for (const m of mods) {
    const deps = m.requires.length ? c.dim(` ← ${m.requires.join(', ')}`) : '';
    console.log(`  ${c.bold(m.name.padEnd(14))} rung ${m.rung}${deps}`);
    console.log(`  ${' '.repeat(14)} ${c.dim(m.summary)}`);
    // Rendered from the manifest at the moment it is asked for, never written down. A committed
    // parameter table would be correct the day it was generated and silently wrong the day a
    // default moved — which is the failure this flag exists to answer (WI-006).
    if (!showParams) continue;
    for (const [name, spec] of Object.entries(m.params)) {
      const shown = spec.default === undefined ? c.dim('(none)') : JSON.stringify(spec.default);
      const notes = [
        spec.allowed ? `one of ${spec.allowed.map(String).join(' · ')}` : '',
        // Behavioural parameters never appear as {{token}}, so a reader hunting for one in a
        // template would conclude the parameter was dead. Say so where they meet it.
        spec.consumed_by ? `behavioural — changes what \`${spec.consumed_by}\` does, not a template` : '',
        spec.required ? 'required' : '',
      ].filter(Boolean);
      console.log(`  ${' '.repeat(14)} ${c.cyan(`${m.name}.${name}`.padEnd(30))} ${c.dim('=')} ${shown}`);
      if (spec.description) console.log(`  ${' '.repeat(16)} ${c.dim(firstSentence(spec.description))}`);
      for (const n of notes) console.log(`  ${' '.repeat(16)} ${c.dim(n)}`);
    }
    if (Object.keys(m.params).length) console.log();
  }
  if (showParams) {
    console.log(c.dim('  Set one with `--set module.param=value` on `add` or `init`; either spelling works.'));
    console.log(c.dim('  Resolved values are recorded in `.ai/rungs.toml`. See docs/design/parameters.md.\n'));
  }

  const issues = auditModules(mods);
  console.log();
  if (issues.length === 0) {
    console.log(c.green('  audit clean') + c.dim(' — every parameter accounted for; every gate has a table, a why, and a declared applicability'));
  } else {
    console.log(c.red(`  ${issues.length} issue(s):`));
    for (const i of issues) console.log(`    ${c.yellow(i.module)} ${c.dim(i.kind)} — ${i.detail}`);
  }
  console.log();
  return issues.length === 0 ? 0 : 1;
}

function cmdDoctor(target: string, doExplain = false) {
  const root = resolve(target);
  const mods = loadAllModules(MODULES);
  console.log(c.bold(`\nrungs doctor — ${root}\n`));

  const files = scanRepo(root);
  const record = readRecord(root);
  console.log(
    c.dim(`  scanned ${files.length} files`) +
      (record ? c.dim(` · installed ${Object.keys(record.modules).length} module(s)`) : c.dim(' · not a rungs repo')) +
      '\n',
  );

  const params = resolveParams(mods, Object.fromEntries(
    Object.entries(record?.modules ?? {}).flatMap(([n, e]) => (e.params ? [[n, e.params]] : [])),
  ), root);
  const skillsDir = record?.harnesses.includes('claude') === false ? '.agents/skills' : '.claude/skills';
  const results = mods.map((m) => {
    const installed = record?.modules[m.name];
    return detect(m, root, files, installed ? { ...installed, skillsDir, params_all: params } : undefined);
  });
  const byState = (s: DetectResult['state']) => results.filter((r) => r.state === s);

  for (const r of results) {
    const mod = mods.find((m) => m.name === r.module)!;
    const line = `  ${r.module.padEnd(14)} ${STATE_LABEL[r.state]}`;
    if (r.state === 'absent') {
      console.log(c.dim(line));
      continue;
    }
    console.log(line);
    if (r.ours) {
      const parts = [`v${r.ours.version}`, `${r.ours.current.length} current`];
      if (r.ours.stale.length) parts.push(c.cyan(`${r.ours.stale.length} stale`));
      if (r.ours.missing.length) parts.push(c.yellow(`${r.ours.missing.length} missing`));
      if (r.ours.kept.length) parts.push(c.dim(`${r.ours.kept.length} kept (yours from the start)`));
      console.log(c.dim(`      ${parts.join(' · ')}`));
      for (const f of r.ours.diverged.slice(0, 3)) {
        console.log(`      ${c.yellow('diverged')} ${f} ${c.dim('— yours, never overwritten')}`);
      }
      if (r.ours.diverged.length > 3) console.log(c.dim(`      …and ${r.ours.diverged.length - 3} more`));
      if (r.ours.stale.length || r.ours.missing.length) {
        console.log(c.dim('      run `rungs upgrade --apply`'));
      }
      continue;
    }
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

  const ours = byState('ours-current').length + byState('ours-diverged').length;
  console.log(
    `\n  ${ours ? `${ours} installed (${byState('ours-diverged').length} diverged) · ` : ''}` +
      `${byState('theirs').length} present · ${byState('paradigm').length} different paradigm · ` +
      `${byState('absent').length} absent\n`,
  );

  // ADR-0005: state what this does not cover, every time. A green read is not
  // a verified one, and a low count may mean a narrow signature rather than a
  // clean repo.
  console.log(c.dim('  This reports presence, never quality. It cannot tell whether an adopted'));
  console.log(c.dim('  system is good, complete, or working — only that files are where a'));
  console.log(c.dim("  module's files would be. Signatures under-detect on purpose.\n"));

  reportLedger(root);

  if (doExplain) reportExplain(mods, results, root, files);
  else advertiseAnalysis(results);

  // `doctor` is the command the README makes the entry point, and it used to stop on the sentence
  // above — fifteen `absent` lines and nothing to do next. The recommendation is deliberately a
  // **single** command, and never the maximal one: the brief names selling rung 5 to a rung-1 repo
  // as the most likely way this tool does harm, so a repo with nothing is pointed at `tracked`
  // rather than at the fifteen things it could install (WI-005).
  const theirs = byState('theirs');
  console.log(c.bold('  Next\n'));
  if (ours) {
    const behind = results.some((r) => r.ours?.stale.length || r.ours?.missing.length);
    console.log(
      behind
        ? `  ${c.cyan('rungs upgrade --apply')}  ${c.dim('— bring the stale and missing files up to date')}`
        : `  ${c.cyan('rungs check')}           ${c.dim('— run the gates this repo already registered')}`,
    );
    console.log(c.dim(`  Add more with \`rungs add <module>\`; \`rungs modules\` lists the set.\n`));
  } else if (theirs.length) {
    const names = theirs.map((r) => r.module).slice(0, 3).join(' ');
    console.log(`  ${c.cyan(`rungs add ${names}`)}  ${c.dim('— adopt what you already built, in place')}`);
    console.log(c.dim('  Nothing is overwritten. Files you already have are kept and reported as'));
    console.log(c.dim('  yours; only what is missing gets written.\n'));
  } else {
    console.log(`  ${c.cyan('rungs init . tracked')}   ${c.dim('— instructions · gates · backlog · findings · adr · session')}`);
    console.log(c.dim('  `tracked` is the rung for more than one thing in flight. `minimal` is just'));
    console.log(c.dim('  the entry document; higher profiles cost more than they return until the'));
    console.log(c.dim('  problem they answer actually exists. `rungs modules` lists all fifteen.\n'));
  }
  return 0;
}

function firstSentence(s: string): string {
  return s.trim().replace(/\s+/g, ' ').split(/(?<=\.)\s/)[0];
}

/**
 * Say that the analysis exists, and how much of it there is. Never what it
 * found (WI-049).
 *
 * `--explain` is the capability both external reviews called the strongest
 * thing here, and plain `doctor` printed no occurrence of the string `explain`
 * — it was reachable only from `--help`. WI-038 put the *findings* behind a flag
 * for a measured reason: 114 on `hexguard` would bury the `Next` line that
 * WI-005 exists to protect. The flag was never the problem; the silence was.
 *
 * **It reports scope, not findings, and it runs no engine.** The first version
 * printed a finding count, which meant running the detectors on the plain path.
 * Measured on `rift-forge` 2026-08-16: plain `doctor` went from **1.6s to
 * 16.8s** warm — a 10× tax on the entry point to advertise a flag. WI-049's
 * plan named this outcome in advance and named this fallback.
 *
 * So the number is the one detection already computed. It claims what it can
 * prove: these are things the repo has, and our checks can read them. It does
 * not claim anything was found, because finding out costs the 15 seconds.
 */
function advertiseAnalysis(results: DetectResult[]) {
  const inScope = results.filter((r) => EXPLAINABLE.has(r.state)).length;
  if (!inScope) return;

  console.log(c.bold('  Analysis\n'));
  console.log(`  ${inScope} of these are things this repo already has, and can be checked against it.`);
  console.log(`  ${c.cyan('rungs doctor --explain')}   ${c.dim('— evidenced findings, and the incident behind each check')}\n`);
}

/**
 * The defect half of `doctor` (WI-038). Every line carries a path and a count
 * or a quote; there is no score, grade, bar, or maturity label anywhere, and
 * there is not going to be — ADR-0005 tier C refuses composites permanently,
 * and a single word over incommensurable signals is the purest form of the
 * probe-encoding-a-guess the corpus warns about.
 *
 * The incident is attached to each detector rather than to each finding: it is
 * why the check exists, not what was found, and repeating it per row would bury
 * the evidence under the provenance.
 */
function reportExplain(mods: Manifest[], results: DetectResult[], root: string, files: string[]) {
  const { reported, skipped, scope } = explain(mods, results, root, files);

  console.log(c.bold('  What it also checked\n'));

  if (!scope.length) {
    console.log(c.dim('  Nothing — detectors run only over what this repo already has, and'));
    console.log(c.dim('  detection found no equivalent of any module. There is nothing here to'));
    console.log(c.dim('  check that would not be checking our conventions against your repo.\n'));
    return;
  }

  const total = reported.reduce((n, r) => n + r.findings.length, 0);
  console.log(
    c.dim(`  ran the detectors for ${scope.length} module(s) this repo already has: `) + c.dim(scope.join(' ')) + '\n',
  );

  for (const r of reported) {
    const n = r.findings.length;
    console.log(`  ${c.yellow(r.gate.padEnd(34))} ${c.bold(String(n))} ${n === 1 ? 'finding' : 'findings'}`);
    for (const f of r.findings.slice(0, 4)) {
      console.log(c.dim(`      ${f.file ? `${f.file}: ` : ''}${f.message}`));
    }
    if (n > 4) console.log(c.dim(`      …and ${n - 4} more`));
    if (r.why) console.log(c.dim(`      why: ${firstSentence(r.why)}`));
    console.log();
  }

  if (!total) {
    console.log(c.dim('  No detector fired. That is not a clean bill of health — see below.\n'));
  }

  // Pins. ADR-0005's rule that green must never read as verified applies with
  // more force here than in the ledger: this pass runs our checks over content
  // written to somebody else's conventions, and the honest failure mode is a
  // sound finding in a frame the repo never adopted.
  console.log(c.dim('  This is not an audit, and it is deliberately incomplete:'));
  console.log(c.dim('  · Detectors ran only for modules this repo already has an equivalent of.'));
  console.log(c.dim("  · They read rungs-shaped inputs. A finding may be true and framed against"));
  console.log(c.dim('    a convention you never adopted — that is our defect, not yours.'));
  if (skipped.command) {
    console.log(c.dim(`  · ${skipped.command} command gate(s) not run. rungs does not execute commands in a repo it is only reading.`));
  }
  if (skipped.undeclared.length) {
    console.log(c.dim(`  · ${skipped.undeclared.length} gate(s) never said whether they can read a repo like yours, so they did not: ${skipped.undeclared.join(' ')}`));
  }
  if (skipped.unimplemented.length) {
    console.log(c.dim(`  · ${skipped.unimplemented.length} declared gate(s) have no engine and were skipped, never passed: ${skipped.unimplemented.join(' ')}`));
  }
  for (const e of skipped.errored) {
    console.log(c.dim(`  · ${e.gate} could not run here (${e.message}) — a fact about this pass, not about your repo.`));
  }
  console.log();
}

function cmdAdd(names: string[], root: string, dryRun: boolean, harnesses: Harness[], stamp: string) {
  const mods = loadAllModules(MODULES);
  const { order, missing } = resolveInstallOrder(names, mods);
  if (missing.length) {
    console.log(c.red(`\n  unknown module(s): ${missing.join(', ')}\n`));
    return 1;
  }
  const pulled = order.filter((m) => !names.includes(m.name));

  // `--set module.param=value`. Without it the first real install into a repo
  // that already had a backlog would have created a second one beside it —
  // `docs/backlog/` next to `docs/.ai/backlog/` — which is the "two places to
  // look" failure this whole tool is against, arriving through the installer.
  //
  // Values arrive already split from their flag, in either spelling. A malformed
  // key is refused rather than skipped: `--set root=x` used to be dropped in
  // silence, so the install proceeded with the default and looked successful.
  const overrides: Record<string, Record<string, unknown>> = {};
  for (const raw of flagValues['--set'] ?? []) {
    const [key, ...rhs] = raw.split('=');
    const [modName, param] = key.split('.');
    if (!modName || !param || !rhs.length) {
      console.log(c.red(`\n  --set expects module.param=value, got: ${raw}\n`));
      return 1;
    }
    (overrides[modName] ??= {})[param] = rhs.join('=');
  }
  const params = resolveParams(mods, overrides, root);
  for (const [m, vals] of Object.entries(overrides)) {
    for (const [k, v] of Object.entries(vals)) console.log(c.dim(`  set ${m}.${k} = ${v}`));
  }
  const skillsDir = harnesses.includes('claude') ? '.claude/skills' : '.agents/skills';

  console.log(c.bold(`\nrungs add ${names.join(' ')} → ${root}${dryRun ? c.yellow('  (dry run)') : ''}\n`));
  if (pulled.length) console.log(c.dim(`  pulled in by dependency: ${pulled.map((m) => m.name).join(', ')}\n`));

  // ADR-0004 state 5: a repo that solves this module's problem a different way
  // gets the comparison and a stop, not an install beside what it already runs.
  //
  // The state existed in the ADR and in `doctor` and nowhere else, so `add`
  // wrote straight over it — for every paradigm, since the CLI shipped
  // (WI-043, from F-014). Measured 2026-08-16: a repo with `.github/ISSUE_TEMPLATE/`
  // reported `backlog paradigm · external-tracker`, and `add backlog` then wrote
  // `docs/`, `AGENTS.md`, `.ai/` and 12 gates without mentioning it once.
  //
  // Unlike `--confirm-threshold` above, this refusal **also applies under
  // `--dry-run`**. A preview that installs what the real run refuses is a
  // preview of a different command.
  const scanned = scanRepo(root);
  const paradigms = new Set(
    order.map((m) => detect(m, root, scanned)).filter((r) => r.state === 'paradigm').map((r) => r.module),
  );
  const overridden = flags.has('--confirm-paradigm');
  const blocked = overridden ? new Map<string, string>() : blockedByParadigm(order, paradigms);

  // An override that prints nothing is indistinguishable from a detection that
  // found nothing, and the two want opposite follow-ups.
  if (overridden && paradigms.size) {
    for (const name of paradigms) {
      const p = detect(order.find((m) => m.name === name)!, root, scanned).paradigm!;
      console.log(
        c.yellow(`  ${name}: installing over an existing ${p.id}`) +
          c.dim(` (${p.matched[0]}) — --confirm-paradigm`),
      );
    }
    console.log(c.dim('      You will have two systems for one job. That is a choice, not a merge.\n'));
  }

  // Re-resolve from what survives rather than filtering `order` in place. A
  // dependency is only ever pulled in *for* something; `add backlog` on an
  // issue-tracker repo was still writing `instructions` and `gates`, which
  // nobody asked for and which were pulled in solely for the module being
  // refused. Recomputing the closure drops them, and keeps anything a *surviving*
  // request still needs.
  let toInstall = order;
  if (blocked.size) {
    for (const mod of order) {
      const cause = blocked.get(mod.name);
      if (!cause) continue;
      if (cause === mod.name) {
        const p = detect(mod, root, scanned).paradigm!;
        console.log(c.yellow(`  ${mod.name}: this repo already does this another way — ${p.id}`));
        console.log(c.dim(`      matched ${p.matched[0]}`));
        for (const line of (p.note ?? '').trim().split('\n')) console.log(c.dim(`      ${line || ''}`));
        if (p.compare) console.log(c.dim(`      compare: ${p.compare}`));
      } else {
        console.log(c.yellow(`  ${mod.name}: not installed — it requires ${cause}.`));
      }
    }
    toInstall = resolveInstallOrder(names.filter((n) => !blocked.has(n)), mods).order;
    const dropped = order.filter((m) => !toInstall.includes(m) && !blocked.has(m.name));
    if (dropped.length) {
      console.log(c.dim(`      ${dropped.map((m) => m.name).join(', ')} not written — pulled in only for the above`));
    }
    console.log(
      c.dim(`\n  Pass --confirm-paradigm to install anyway.`) +
        (toInstall.length ? c.dim(' Continuing with the rest.\n') : c.dim(' Nothing was written.\n')),
    );
    if (!toInstall.length) return 1;
  }

  const installed: Manifest[] = [];
  const wrote = new Map<string, Set<string>>();
  for (const mod of toInstall) {
    if (mod.threshold?.confirm && !dryRun && !flags.has('--confirm-threshold')) {
      console.log(
        c.yellow(`  ${mod.name}: requires ${mod.threshold.minimum}+ ${mod.threshold.metric}.`) +
          c.dim(' Skipped — pass --confirm-threshold to install it.\n'),
      );
      continue;
    }
    const actions = addModule(mod, root, params, { dryRun, skillsDir });
    installed.push(mod);
    wrote.set(mod.name, new Set(actions.filter((a) => a.disposition !== 'skip-exists' && a.disposition !== 'merge' && a.disposition !== 'gate').map((a) => a.target)));
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
    writeInstallRecord(root, order, params, harnesses, stamp, skillsDir, wrote);
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
  // A bare `0 rendering(s)` reads as a completed edit. It is the answer a user gets after editing a
  // parameter in `.ai/rungs.toml` and running this — the thing the record's header used to tell
  // them to do — so the zero case has to say what it did not do, not just how much of it (WI-003).
  if (entries.length === 0) {
    console.log(c.yellow('  Nothing to render.') + c.dim(' This command re-emits path-scoped rules from `.ai/rules/`.'));
    console.log(c.dim('  It does not re-substitute parameters — a changed value in `.ai/rungs.toml`'));
    console.log(c.dim('  does not rewrite a file that already exists.\n'));
  }
  return 0;
}

function cmdCheck(root: string, tier: string | undefined, stamp: string) {
  let runs: GateRun[];
  try {
    runs = runGates(root, tier);
  } catch (e) {
    // ADR-0008. A tier nobody declared used to select nothing and exit as though
    // the gates had passed — the one failure mode a release step cannot have.
    if (!(e instanceof UnknownTierError)) throw e;
    console.log(c.yellow(`\n  unknown tier "${e.requested}"`) + c.dim(` — this repo declares ${e.declared.join(', ')}.`));
    console.log(c.dim('  Nothing ran. Use `rungs check` to run every registered gate.\n'));
    return 1;
  }
  if (!runs.length) {
    // Two situations printed the same sentence, and it was the wrong one for the case that
    // actually happens: a registry full of `fast` gates filtered by `--full` asked "is this a
    // rungs repo?" about a repo holding 25 of them, and `cut-release` told every consumer to
    // gate a release on exactly that command (F-020). Blame the filter when there is one.
    //
    // Hooks are excluded because a hook fires on a tool call rather than in the runner: it is
    // registered, and no tier value could ever have selected it. Counting it here would offer
    // the reader a gate that changing the tier cannot reach.
    const runnable = loadRegistry(root).gates.filter((g) => !g.trigger);
    if (runnable.length && tier) {
      const tiers = [...new Set(runnable.map((g) => g.tier).filter(Boolean))];
      console.log(c.yellow(`\n  no gates in the ${tier} tier — ${runnable.length} are registered`) +
        c.dim(` (${tiers.length ? tiers.join(', ') : 'none tiered'}).`));
      console.log(c.dim('  Nothing ran. Use `rungs check` to run every registered gate.\n'));
    } else {
      console.log(c.yellow('\n  no gates registered — is this a rungs repo?\n'));
    }
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

  console.log();
  return n('fail') + n('unimplemented') + n('error') > 0 ? 1 : 0;
}

/**
 * ADR-0005 tier B: the two questions the ledger can ask without judgement.
 *
 * This printed from `check` and belonged in `doctor`, which is what both the
 * ADR and the README say (F-012). The ADR does not merely name the command, it
 * gives the reason: *"They must be pull (`doctor`), never push; no output
 * during normal runs."* `check` is the normal run — it is what CI and every
 * pre-merge habit invoke — so printing there was the push the tier was written
 * to forbid, arriving inside the feature that forbade it.
 */
function reportLedger(root: string) {
  const { gates } = loadRegistry(root);
  const q = ledgerQuestions(root, gates);
  if (!q.neverFired.length && !q.alwaysFires.length) return;

  console.log(c.bold(`  Ledger questions ${c.dim(`(${q.runs} recorded runs)`)}`));
  for (const g of q.neverFired.slice(0, 3)) {
    console.log(`    ${c.cyan(g.id)} has never fired. ${c.dim(firstSentence(g.why ?? ''))}`);
    console.log(c.dim('      Is that still a risk here, or is the gate scoped too narrowly?'));
  }
  for (const g of q.alwaysFires.slice(0, 3)) {
    console.log(`    ${c.cyan(g.id)} fails ${g.rate}. ${c.dim('Red by default is a gate people learn to bypass.')}`);
  }
  console.log(c.dim('\n    These are questions, not verdicts. The ledger records whether a gate ran'));
  console.log(c.dim('    and whether it fired — never whether it is valuable. Gates invoked'));
  console.log(c.dim('    directly, and CI runs, are not counted.\n'));
}

function cmdBacklogArchive(root: string, dryRun: boolean) {
  const record = readRecord(root);
  const configured = record?.modules['backlog']?.params?.root;
  const backlogRoot = `docs/${configured ?? 'backlog'}`;

  if (!existsSync(join(root, ...backlogRoot.split('/'), 'items'))) {
    console.log(c.red(`\n  no backlog at ${backlogRoot}/items\n`));
    return 1;
  }

  const plan = planArchive(root, backlogRoot);
  console.log(c.bold(`\nrungs backlog archive → ${root}${dryRun ? c.yellow('  (dry run)') : ''}\n`));

  for (const h of plan.held) console.log(c.yellow(`  held  ${h.file}`) + c.dim(` — ${h.reason}`));
  if (plan.held.length) console.log();

  if (!plan.moves.length) {
    console.log(c.dim('  nothing to archive — no item is done or rejected.\n'));
    return 0;
  }

  const byStatus = new Map<string, number>();
  for (const m of plan.moves) byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1);
  console.log(
    `  ${c.bold(String(plan.moves.length))} item(s) — ${[...byStatus].map(([s, n]) => `${n} ${s}`).join(' · ')}`,
  );
  for (const m of plan.moves.slice(0, 5)) console.log(c.dim(`      ${m.from} → ${m.to}`));
  if (plan.moves.length > 5) console.log(c.dim(`      …and ${plan.moves.length - 5} more`));

  const touched = plan.rewrites.filter((r) => r.links);
  const links = touched.reduce((n, r) => n + r.links, 0);
  console.log(`\n  ${c.bold(String(links))} link(s) repointed across ${touched.length} file(s)`);
  for (const r of touched.slice(0, 5)) console.log(c.dim(`      ${r.file} (${r.links})`));
  if (touched.length > 5) console.log(c.dim(`      …and ${touched.length - 5} more`));

  if (dryRun) {
    console.log(c.dim('\n  Nothing written. Drop --dry-run to apply.\n'));
    return 0;
  }

  applyArchive(root, plan);
  console.log(c.green(`\n  archived ${plan.moves.length} item(s)`) + c.dim(' — ids stay spent and every citation still resolves.'));
  console.log(c.dim('  Run `rungs check` to confirm.\n'));
  return 0;
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

  // Not `apply && stale`. A module version that only adds a gate has no stale
  // file, so the whole apply step was skipped and the registry silently kept the
  // old block — F-016, measured on a scratch consumer where `session` 1.1.0 →
  // 1.2.0 added a gate and `rungs check` went on running the previous twenty.
  if (apply) {
    const { written, gates, recorded } = applyUpgrade(root, mods, record, plan);
    const parts = [
      written ? `${written} file(s)` : '',
      gates ? `${gates} gate registration(s)` : '',
      recorded ? `${recorded} record line(s)` : '',
    ].filter(Boolean);
    console.log(c.green(`\n  updated ${parts.length ? parts.join(' · ') : 'nothing'}`));
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

/**
 * Flags that carry a value, and therefore consume the token after them unless it is attached with
 * `=`. Everything else is a bare switch.
 *
 * This exists because the split below used to be two filters — `startsWith('--')` into flags,
 * everything else into positionals — which has no concept of a value. `--set backlog.root=x` then
 * left `backlog.root=x` sitting in the positionals, `--into` took the last positional as its
 * target, and the user's actual path was reported back to them as an unknown module. Both
 * spellings now work, and the value never reaches `args` (WI-002).
 */
const VALUE_FLAGS = new Set(['--set']);

/**
 * The command surface, defined once and rendered into `--help`.
 *
 * It was a template literal listing eight of the nine commands — `setup git` was missing entirely —
 * beside a README table listing all nine, which is two hand-kept inventories of one fact. They had
 * already drifted, in both directions: help omitted a real command, and three real flags appeared
 * in neither. Keep this table beside the switch it describes, and add a row when you add a `case`.
 *
 * The README's table is still hand-kept and still a second inventory. That is a known cost, not an
 * oversight — see WI-004.
 */
const COMMANDS: [usage: string, blurb: string][] = [
  ['init [path] [profile]', 'scaffold a repo — minimal · tracked · disciplined · hardened · fleet'],
  ['doctor [path]', 'detect what a repo already has, installed or not'],
  ['add <module…> [--into p]', 'install modules, resolving dependencies and adopting what exists'],
  ['check [path] [tier]', 'run the registered gates and record the ledger'],
  ['render [path]', 're-emit path-scoped rules per harness'],
  ['upgrade [path]', 'move to newer module versions, never touching what you edited'],
  ['eject [path]', 'materialise the engines; stop depending on rungs'],
  ['setup git [path]', 'install the merge drivers .gitattributes names'],
  ['modules', 'list the module set and audit the manifests'],
  ['backlog archive [path]', 'move finished items to archive/, repointing every link'],
];

/** Every flag the parser honours. A flag absent here is a flag nobody can find. */
const FLAGS: [flag: string, blurb: string][] = [
  ['--dry-run', 'report what would happen, write nothing'],
  ['--explain', "doctor: also run the detectors over what this repo already has"],
  ['--confirm-paradigm', 'add: install a module this repo already solves another way'],
  ['--into <path>', 'add: install into this repo instead of the working directory'],
  ['--set m.param=value', 'add/init: override a module parameter. Repeatable'],
  ['--confirm-threshold', 'add: install a module whose rung is above this repo'],
  ['--apply', 'upgrade: write the changes, rather than preview them'],
  ['--fast, --full', 'check: pick the gate tier, as the positional also does'],
  ['--params', 'modules: show every module parameter, its default and its allowed values'],
  ['--copilot', 'also emit Copilot instruction files'],
];

function renderHelp(): string {
  const pad = Math.max(...COMMANDS.map(([u]) => u.length)) + 2;
  const fpad = Math.max(...FLAGS.map(([f]) => f.length)) + 2;
  return [
    ``,
    `${c.bold('rungs')} — installs and maintains a repository's agentic development system`,
    ``,
    ...COMMANDS.map(([u, b]) => `  ${c.bold(`rungs ${u.split(' ')[0]}`)}${u.slice(u.split(' ')[0].length).padEnd(pad - u.split(' ')[0].length)} ${c.dim(b)}`),
    ``,
    ...FLAGS.map(([f, b]) => `  ${c.dim(f.padEnd(fpad))} ${c.dim(b)}`),
    ``,
  ].join('\n');
}

const [, , cmd, ...rest] = process.argv;

const flags = new Set<string>();
const args: string[] = [];
const flagValues: Record<string, string[]> = {};
/** A value-flag left without a value. Reported by the command, so `--help` still works. */
let missingValue: string | null = null;

for (let i = 0; i < rest.length; i++) {
  const token = rest[i];
  if (!token.startsWith('--')) {
    args.push(token);
    continue;
  }
  const eq = token.indexOf('=');
  const name = eq === -1 ? token : token.slice(0, eq);
  if (!VALUE_FLAGS.has(name)) {
    // The bare name, not the raw token, so `--copilot=yes` still answers `flags.has('--copilot')`.
    flags.add(name);
    continue;
  }
  // Attached form first; otherwise the next token, unless that is itself a flag — `--set --dry-run`
  // is a missing value, not a value of `--dry-run`.
  const next = rest[i + 1];
  const value = eq === -1 ? (next === undefined || next.startsWith('--') ? undefined : rest[++i]) : token.slice(eq + 1);
  if (value === undefined) missingValue = name;
  else (flagValues[name] ??= []).push(value);
}

/**
 * A positional shaped like `module.param=value` was meant to be an override and was not claimed by
 * `--set`. No path, module, profile or tier has that shape, so it is unambiguously a mistake —
 * refuse it by name rather than letting a command interpret it as something else.
 */
const strayOverride = args.find((a) => /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_]*=/.test(a));

// Dates come from the caller, never from inside a render: a timestamp baked
// into generated output makes every run a diff.
const STAMP = process.env.RUNGS_DATE ?? new Date().toISOString().slice(0, 10);
const HARNESSES: Harness[] = flags.has('--copilot')
  ? ['claude', 'copilot', 'agents-md']
  : (['claude', 'agents-md'] as Harness[]);

// Both refusals run before dispatch, because either one means the argv the user typed is not the
// argv any command would act on. Silently proceeding is what made the original failure so opaque.
if (missingValue) {
  console.log(c.red(`\n  ${missingValue} expects a value — ${missingValue} module.param=value\n`));
  process.exit(1);
}
if (strayOverride) {
  console.log(
    c.red(`\n  stray override: ${strayOverride}`) +
      c.dim(`\n  Nothing claimed it, so it would be read as a path or a module name.`) +
      c.dim(`\n  Did you mean: --set ${strayOverride}\n`),
  );
  process.exit(1);
}

switch (cmd) {
  case 'modules':
    process.exit(cmdModules(flags.has('--params')));
  case 'doctor':
    process.exit(cmdDoctor(args[0] ?? process.cwd(), flags.has('--explain')));
  case 'backlog': {
    if (args[0] !== 'archive') {
      console.log(c.red(`\n  unknown: rungs backlog ${args[0] ?? ''}`) + c.dim('\n  The only subcommand is `archive`.\n'));
      process.exit(1);
    }
    process.exit(cmdBacklogArchive(resolve(args[1] ?? process.cwd()), flags.has('--dry-run')));
  }
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
  case 'setup': {
    const r = setupGit(resolve(args[1] ?? process.cwd()), flags.has('--dry-run'));
    console.log(
      r.drivers.length
        ? `\n  installed ${r.drivers.length} merge driver(s): ${r.drivers.join(', ')}` +
            (r.rerere ? c.dim(' · rerere on') : '') +
            c.dim('\n  Declared drivers were inert until now — a fresh clone needs this once.\n')
        : c.dim('\n  no rungs merge drivers declared in .gitattributes\n'),
    );
    process.exit(0);
  }
  case 'render':
    process.exit(cmdRender(resolve(args[0] ?? process.cwd()), HARNESSES, STAMP));
  case 'add': {
    const target = flags.has('--into') ? args[args.length - 1] : process.cwd();
    const names = flags.has('--into') ? args.slice(0, -1) : args;
    process.exit(cmdAdd(names, resolve(target), flags.has('--dry-run'), HARNESSES, STAMP));
  }
  default: {
    // Help is a success, and an unknown command is not. Both used to land here and exit on
    // `cmd ? 1 : 0`, which made `rungs --help` — a command that did exactly what was asked —
    // report failure to anything checking the status (WI-004).
    const wantedHelp = cmd === undefined || cmd === 'help' || cmd === '--help' || cmd === '-h';
    if (!wantedHelp) console.log(c.red(`\n  unknown command: ${cmd}`));
    console.log(renderHelp());
    process.exit(wantedHelp ? 0 : 1);
  }
}
