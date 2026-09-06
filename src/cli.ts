#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { auditModules, loadAllModules } from './manifest.ts';
import { detect, scanRepo } from './detect.ts';
import { addModule, adoptableGates, blockedByConflict, blockedByParadigm, moduleEmissionCandidates, preflightModuleEmissions, prospectiveRuleEmissions, type ConflictBlock, registerGates, resolveInstallOrder, writeInstallRecord } from './add.ts';
import { preflightRender, render, writeReport, type Harness } from './render.ts';
import { resolveParams } from './substitute.ts';
import { checkCommand, type GateRun, ledgerBudget, ledgerQuestions, loadRegistry, runGates } from './check.ts';
import { applyUpgrade, eject, EjectRefusal, planUpgrade, PROFILES, readRecord, setupGit } from './lifecycle.ts';
import { c } from './ansi.ts';
import { explain, IN_SCOPE as EXPLAINABLE } from './explain.ts';
import { applyArchive, planArchive, resolveArchiveTree } from './backlog.ts';
import { land, preflight, sessionStart, worktrees } from './concurrency.ts';
import { hookRenderEntries, HookRefusal, hookVerdict, preflightHooks, registerHooks } from './hooks.ts';
import { existsSync, readFileSync } from 'node:fs';
import type { DetectResult, Manifest } from './types.ts';
import { UnsafeEmittedPathError } from './emitted-path.ts';
import { COMMANDS, FLAGS } from './help.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULES = join(HERE, '..', 'modules');

function pathRefusal(error: unknown): number {
  if (!(error instanceof UnsafeEmittedPathError)) throw error;
  console.log(c.red(`\n  refused: ${error.message}\n`) + c.dim('  Nothing was written. Fix the named path or repository alias and retry.\n'));
  return 1;
}

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
    // A `designed` module is marked wherever a module is named, because a
    // distinction the manifest declares and no surface prints is the field
    // being unread all over again (F-038, and F-037 nearly repeated it). The
    // extracted case is unmarked: it is what every bundled module is, and a
    // badge on all fifteen would carry no information.
    const designed = m.provenance.kind === 'designed' ? c.yellow('  designed') : '';
    console.log(`  ${c.bold(m.name.padEnd(14))} rung ${m.rung}${deps}${designed}`);
    console.log(`  ${' '.repeat(14)} ${c.dim(m.summary)}`);
    if (designed) {
      console.log(`  ${' '.repeat(14)} ${c.dim(`not extracted — ${firstSentence(m.provenance.rationale ?? '')}`)}`);
    }
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
  let record;
  try {
    record = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  console.log(
    c.dim(`  scanned ${files.length} files`) +
      (record ? c.dim(` · installed ${Object.keys(record.modules).length} module(s)`) : c.dim(' · not a rungs repo')) +
      '\n',
  );

  const params = resolveParams(mods, Object.fromEntries(
    Object.entries(record?.modules ?? {}).flatMap(([n, e]) => (e.params ? [[n, e.params]] : [])),
  ), root);
  const skillsDir = record?.harnesses.includes('claude') === false ? '.agents/skills' : '.claude/skills';
  let results;
  try {
    results = mods.map((m) => {
      const installed = record?.modules[m.name];
      return detect(m, root, files, installed ? { ...installed, skillsDir, params_all: params } : undefined);
    });
  } catch (error) {
    return pathRefusal(error);
  }
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

  reportLedger(root, record !== null);

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

  // …and an unknown *name* is refused for the same reason a malformed key is.
  // The comment above says a dropped `--set` "proceeded with the default and
  // looked successful"; a mistyped module or parameter did exactly that, and the
  // echo below then printed `set nosuch.param = 1` as though it had applied
  // (F-028). The whole module set is loaded here, so the names are checkable —
  // there was never a reason to trust them.
  for (const [modName, vals] of Object.entries(overrides)) {
    const mod = mods.find((m) => m.name === modName);
    if (!mod) {
      console.log(
        c.red(`\n  --set names a module that does not exist: ${modName}`) +
          c.dim(`\n  Known: ${mods.map((m) => m.name).join(', ')}\n`),
      );
      return 1;
    }
    for (const k of Object.keys(vals)) {
      if (!(k in mod.params)) {
        const known = Object.keys(mod.params);
        console.log(
          c.red(`\n  --set names a parameter ${modName} does not have: ${k}`) +
            c.dim(`\n  ${known.length ? `${modName} takes: ${known.join(', ')}` : `${modName} takes no parameters`}`) +
            c.dim('\n  `rungs modules --params` lists every parameter and its default.\n'),
        );
        return 1;
      }
    }
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

  // F-038: a module's `[conflicts]` was parsed and read by nothing, so a
  // declared incompatibility installed in silence. It refuses the same way a
  // paradigm does — state it and stop — but it is computed separately, because
  // a paradigm is *inferred from files* and a conflict is *declared by an
  // author*, and a refusal should say which of the two it is.
  //
  // What counts as present: what the repo already has, plus everything else in
  // this install set. Two modules that cannot coexist cannot arrive together
  // either.
  let record;
  try {
    record = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  const present = new Set([...Object.keys(record?.modules ?? {}), ...order.map((m) => m.name)]);
  const declared = blockedByConflict(order, present, mods);
  const conflictOverride = flags.has('--confirm-conflict');

  // Computed even when overridden, and printed — for the reason the paradigm
  // override just above says: an override that prints nothing is
  // indistinguishable from finding nothing, and the two want opposite
  // follow-ups.
  if (conflictOverride && declared.size) {
    for (const [name, clash] of declared) {
      if (clash.cause !== name) continue;
      console.log(
        c.yellow(`  ${name}: installing alongside ${clash.with}, which it declares a conflict with`) +
          c.dim(' — --confirm-conflict'),
      );
    }
    console.log(c.dim('      The author said these two do not coexist. You are overruling them, not merging them.\n'));
  }
  const conflicts = conflictOverride ? new Map<string, ConflictBlock>() : declared;

  // Re-resolve from what survives rather than filtering `order` in place. A
  // dependency is only ever pulled in *for* something; `add backlog` on an
  // issue-tracker repo was still writing `instructions` and `gates`, which
  // nobody asked for and which were pulled in solely for the module being
  // refused. Recomputing the closure drops them, and keeps anything a *surviving*
  // request still needs.
  let toInstall = order;
  if (blocked.size || conflicts.size) {
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
    for (const mod of order) {
      const clash = conflicts.get(mod.name);
      // A module refused by both is reported once, under the paradigm, which
      // carries the more specific evidence — a matched path.
      if (!clash || blocked.has(mod.name)) continue;
      if (clash.cause === mod.name) {
        const declarer = mod.conflicts.includes(clash.with) ? mod.name : clash.with;
        console.log(c.yellow(`  ${mod.name}: conflicts with ${clash.with}`));
        console.log(
          c.dim(`      declared by ${declarer}`) +
            c.dim(present.has(clash.with) && !order.some((m) => m.name === clash.with) ? ', which this repo already has' : ', and both were requested'),
        );
      } else {
        console.log(c.yellow(`  ${mod.name}: not installed — it requires ${clash.cause}.`));
      }
    }
    const refused = new Set([...blocked.keys(), ...conflicts.keys()]);
    toInstall = resolveInstallOrder(names.filter((n) => !refused.has(n)), mods).order;
    const dropped = order.filter((m) => !toInstall.includes(m) && !refused.has(m.name));
    if (dropped.length) {
      console.log(c.dim(`      ${dropped.map((m) => m.name).join(', ')} not written — pulled in only for the above`));
    }
    const escapes = [blocked.size ? '--confirm-paradigm' : '', conflicts.size ? '--confirm-conflict' : ''].filter(Boolean);
    console.log(
      c.dim(`\n  Pass ${escapes.join(' / ')} to install anyway.`) +
        (toInstall.length ? c.dim(' Continuing with the rest.\n') : c.dim(' Nothing was written.\n')),
    );
    if (!toInstall.length) return 1;
  }

  // A module nobody paid for is a different thing to install than one extracted
  // from a repo that did, and the person typing `add` is who should be told
  // (F-037). One line, at the only moment it changes a decision.
  for (const mod of toInstall.filter((m) => m.provenance.kind === 'designed')) {
    console.log(
      c.yellow(`  ${mod.name}: designed, not extracted`) +
        c.dim(` — ${firstSentence(mod.provenance.rationale ?? '')}`),
    );
  }

  // This is one operation, even though files, gates, the install record and
  // harness renderings are applied in phases.  Validate every selected module
  // and every post-phase output before the first module can write.
  const actualInstall = toInstall.filter(
    (mod) => !(mod.threshold?.confirm && !dryRun && !flags.has('--confirm-threshold')),
  );
  try {
    preflightModuleEmissions(actualInstall, root, params, skillsDir);
    preflightRender(
      root,
      harnesses,
      prospectiveRuleEmissions(actualInstall, params, skillsDir),
      [
        ...moduleEmissionCandidates(actualInstall, params, skillsDir),
        { moduleName: 'rungs', target: '.ai/gates.toml', shared: true, writeExisting: true },
        { moduleName: 'rungs', target: '.ai/rungs.toml', writeExisting: true },
      ],
    );
    // A harness configuration that cannot be merged into refuses the whole
    // install here, before any module writes (ADR-0010).
    preflightHooks(actualInstall, root, harnesses);
  } catch (error) {
    if (error instanceof HookRefusal) {
      console.log(c.red(`\n  refused: ${error.message}\n`) + c.dim('  Nothing was written.\n'));
      return 1;
    }
    return pathRefusal(error);
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

  // Phase three: hooks. A declared hook is dispatched through the pinned
  // launcher into the harness that runs hooks, and reported as degraded for the
  // harnesses that do not (ADR-0010). Nothing is written when there is none.
  const hookActions = registerHooks(installed, root, harnesses, dryRun);
  for (const a of hookActions) {
    console.log(`  ${c.bold('hook'.padEnd(14))} ${a.target} ${c.dim(`— ${a.note}`)}`);
  }

  if (!dryRun) {
    writeInstallRecord(root, installed, params, harnesses, stamp, skillsDir, wrote);
    const entries = [...render(root, harnesses), ...hookRenderEntries(root, harnesses)];
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
  try {
    preflightRender(root, harnesses);
  } catch (error) {
    return pathRefusal(error);
  }
  const entries = [...render(root, harnesses), ...hookRenderEntries(root, harnesses)];
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

/** The loop commands return lines and a verdict; printing them is the CLI's job. */
function report(r: { ok: boolean; lines: string[] }): number {
  console.log();
  for (const l of r.lines) console.log(`  ${r.ok ? l : c.yellow(l)}`);
  console.log();
  return r.ok ? 0 : 1;
}

/**
 * `land` verifies the *merged* tree, so it needs the gate runner pointed at a
 * directory that exists only inside the command. This is the reason the loop is
 * CLI commands rather than scripts the module writes (ADR-0009).
 */
function landRunner(dir: string, only?: ReadonlySet<string>) {
  const runs = runGates(dir, undefined, undefined, only);
  const failing = runs.filter((r) => r.status === 'fail' || r.status === 'error');
  return {
    pass: runs.filter((r) => r.status === 'pass').length,
    // Keep a stable comparison identity separate from the operator-facing
    // diagnostic. `file: identity` makes the same broken link in the same file
    // the same finding across runs, while command diagnostics can stay complete.
    failing: failing.map((r) => ({
      id: r.id,
      findings: r.findings.map((f) => {
        const prefix = f.file ? `${f.file}: ` : '';
        return {
          identity: `${prefix}${f.identity ?? f.message}`,
          diagnostic: `${prefix}${f.message}`,
        };
      }),
    })),
  };
}

/**
 * ADR-0010. The harness runs `node .ai/rungs.mjs hook <gate-id>` with its
 * payload on stdin; exit 2 blocks, 0 permits, 1 says the hook itself could not
 * run and never blocks — a guard that fails closed on its own misconfiguration
 * is disabled within the hour.
 */
function cmdHook(root: string, gateId: string | undefined) {
  if (!gateId) {
    console.error('rungs hook: a gate id is required — `rungs hook <gate-id>`, with the harness payload on stdin');
    return 1;
  }
  const verdict = hookVerdict(root, gateId, () => readFileSync(0, 'utf8'));
  if (verdict.message) console.error(verdict.message);
  return verdict.exit;
}

function cmdWorktrees(root: string) {
  const { rows, integration } = worktrees(root);
  console.log(c.bold(`\nrungs worktrees — merged into ${integration}?\n`));
  if (!rows.length) {
    console.log(c.dim('  no linked worktrees. `rungs session start <branch>` creates one.\n'));
    return 0;
  }
  for (const w of rows) {
    // An unknown state is printed as unknown, never as prunable: a tree whose
    // status could not be read is exactly the tree this command must not call
    // safe to remove (F-057, WI-089).
    const label = w.state === 'unknown'
      ? c.yellow(`${w.merged ? 'merged' : 'in flight'} · status UNKNOWN`)
      : w.merged && w.state === 'dirty'
        ? c.red('merged · DIRTY')
        : w.merged
          ? c.green('merged · prunable')
          : c.dim('in flight');
    console.log(`  ${label.padEnd(28)} ${w.branch.padEnd(30)} ${c.dim(w.path)}`);
    if (w.state === 'unknown' && w.reason) console.log(c.dim(`      could not read its status: ${w.reason}`));
  }
  const risky = rows.filter((w) => w.merged && w.state === 'dirty');
  const prunable = rows.filter((w) => w.merged && w.state === 'clean');
  const unknown = rows.filter((w) => w.state === 'unknown');
  console.log();
  if (risky.length) {
    console.log(c.red(`  ${risky.length} worktree(s) hold uncommitted work on a branch that already landed.`));
    console.log(c.dim('  That is where work actually gets lost. Commit it somewhere or decide to drop it.'));
  }
  if (unknown.length) {
    console.log(c.yellow(`  ${unknown.length} worktree(s) could not be inspected.`));
    console.log(c.dim('  Unknown is not clean. Read them by hand before removing anything.'));
  }
  if (prunable.length) console.log(c.dim(`  ${prunable.length} prunable. Removing a worktree is your call, not this command's.`));
  console.log();
  return 0;
}

/**
 * The body lives in `check.ts` as `checkCommand`, shared with the ejected
 * runner so both print the same lines and exit the same way for the same
 * registry (WI-077).
 */
function cmdCheck(root: string, tier: string | undefined, stamp: string) {
  return checkCommand(root, tier, stamp);
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
function reportLedger(root: string, installed = false) {
  const { gates } = loadRegistry(root);
  const q = ledgerQuestions(root, gates);
  if (q.neverFired.length || q.alwaysFires.length) {
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
  if (installed) reportBudget(root);
}

/**
 * ADR-0005 Tier A's first consumer, and F-055's repair (WI-088): `fast_budget_ms`
 * was documented as "compared against the ledger's observed values" and nothing
 * read it. Printed from `doctor` — pull, never push — as a measurement of this
 * machine's recorded runs. It never becomes a verdict, a score, or an input to
 * which gates run (ADR-0008).
 */
function reportBudget(root: string) {
  const b = ledgerBudget(root);
  const ms = (n: number) => `${n.toLocaleString('en-US')} ms`;
  switch (b.state) {
    case 'disabled':
      console.log(c.dim('  Ledger off (runner.ledger = false): no observed durations to compare with fast_budget_ms.\n'));
      return;
    case 'absent':
      console.log(c.dim('  No ledger yet. Run `rungs check` a few times and the fast-tier budget comparison appears here.\n'));
      return;
    case 'no-budget':
      return;
    case 'too-short':
      console.log(c.bold('  Fast tier budget'));
      console.log(c.dim(`    only ${b.usable} recorded run(s) of the first tier carry run and tier fields; ${b.needed} needed before a comparison is worth printing.`));
      if (b.unreadable) console.log(c.dim(`    ${b.unreadable} ledger row(s) predate those fields or do not parse, and are not counted.`));
      console.log();
      return;
    case 'report':
      console.log(c.bold(`  Fast tier budget ${c.dim(`(declared fast_budget_ms = ${b.budgetMs.toLocaleString('en-US')})`)}`));
      console.log(
        `    last ${b.runs} run(s) of the ${c.cyan(b.tier)} tier: median ${ms(b.medianMs)} · max ${ms(b.maxMs)} · ` +
          (b.over ? c.yellow(`${b.over} over budget`) : c.green('0 over budget')),
      );
      console.log(c.dim('    Serial wall-clock of that tier\'s gates per recorded run, on this machine. A measurement,'));
      console.log(c.dim('    not a verdict: the runner never selects or fails on it (ADR-0005, ADR-0008).'));
      if (b.unreadable) console.log(c.dim(`    ${b.unreadable} ledger row(s) predate the run/tier fields or do not parse, and are not counted.`));
      console.log();
  }
}

function cmdBacklogArchive(root: string, dryRun: boolean) {
  let record;
  try {
    record = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  const configured = record?.modules['backlog']?.params?.root;
  const backlogRoot = `docs/${configured ?? 'backlog'}`;

  let tree;
  let plan;
  try {
    tree = resolveArchiveTree(root, backlogRoot);
    plan = planArchive(root, backlogRoot);
  } catch (error) {
    return pathRefusal(error);
  }

  if (!tree.itemsExists) {
    console.log(c.red(`\n  no backlog at ${backlogRoot}/items\n`));
    return 1;
  }

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

  try {
    applyArchive(root, plan);
  } catch (error) {
    return pathRefusal(error);
  }
  console.log(c.green(`\n  archived ${plan.moves.length} item(s)`) + c.dim(' — ids stay spent and every citation still resolves.'));
  console.log(c.dim('  Run `rungs check` to confirm.\n'));
  return 0;
}

function cmdInit(root: string, profile: string, dryRun: boolean, harnesses: Harness[], stamp: string) {
  let existing;
  try {
    existing = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  if (existing) {
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
  let record;
  try {
    record = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  if (!record) {
    console.log(c.yellow('\n  not a rungs repo — nothing to upgrade.\n'));
    return 1;
  }
  const mods = loadAllModules(MODULES);
  let plan;
  try {
    plan = planUpgrade(root, mods, record);
  } catch (error) {
    return pathRefusal(error);
  }
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
    let result;
    try {
      result = applyUpgrade(root, mods, record, plan);
    } catch (error) {
      return pathRefusal(error);
    }
    const { written, gates, recorded } = result;
    // Hooks ride the same phase as gates: a module version that adds one must
    // reach the harness configuration on upgrade, and a repeat adds nothing.
    let hooks: ReturnType<typeof registerHooks> = [];
    try {
      hooks = registerHooks(mods.filter((m) => record.modules[m.name]), root, record.harnesses as Harness[], false);
    } catch (error) {
      if (!(error instanceof HookRefusal)) throw error;
      console.log(c.yellow(`\n  hooks not registered: ${error.message}`));
    }
    const registeredHooks = hooks.filter((a) => a.note?.endsWith(' registered')).length;
    const parts = [
      written ? `${written} file(s)` : '',
      gates ? `${gates} gate registration(s)` : '',
      registeredHooks ? `${registeredHooks} hook registration(s)` : '',
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

function cmdEject(root: string, dryRun: boolean, stamp: string) {
  let record;
  try {
    record = readRecord(root);
  } catch (error) {
    return pathRefusal(error);
  }
  if (!record) {
    console.log(c.yellow('\n  not a rungs repo — nothing to eject.\n'));
    return 1;
  }
  let result;
  try {
    result = eject(root, loadAllModules(MODULES), dryRun, stamp);
  } catch (error) {
    // Nothing is written on a refusal: every destination is validated and every
    // byte computed before the first write, so a refused eject leaves the repo
    // exactly as it found it (WI-077).
    if (error instanceof EjectRefusal) {
      console.log(c.red(`\n  refused: ${error.message}\n`) + c.dim('  Nothing was written.\n'));
      return 1;
    }
    return pathRefusal(error);
  }
  console.log(c.bold(`\nrungs eject — ${root}${dryRun ? c.yellow('  (dry run)') : ''}\n`));
  for (const a of result.actions.slice(0, 8)) console.log(c.dim(`  ${a}`));
  if (result.actions.length > 8) console.log(c.dim(`  …and ${result.actions.length - 8} more`));
  console.log(
    `\n  ${result.gates} declared gate(s) rewritten as commands` +
      (result.unchanged ? c.dim(' — already ejected; nothing changed.') : '.') +
      c.dim(`\n  \`node .ai/rungs.mjs check\` now runs from .rungs/ with this Node alone: no npm, no package.`) +
      c.dim('\n  Only `check` survives ejection; add, upgrade, render and the rest are gone until you re-adopt.') +
      c.dim('\n  Engine fixes stop arriving with a version bump — these files are yours now. See .rungs/README.md.\n'),
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
  case 'hook':
    // The harness runs hooks with the repository as the working directory.
    process.exit(cmdHook(process.cwd(), args[0]));
  case 'eject':
    process.exit(cmdEject(resolve(args[0] ?? process.cwd()), flags.has('--dry-run'), STAMP));
  case 'setup': {
    // The path is `args[1]`, *after* the subcommand — so an omitted `git` put the
    // path into the subcommand slot, where it was discarded, and `setup` then
    // wrote git config into the current directory while reporting success about
    // the repo you named (F-027). `backlog` had refused an unknown subcommand
    // since it shipped; this one accepted anything and exited 0. The asymmetry
    // between the two subcommand-taking commands was the whole bug.
    if (args[0] !== 'git') {
      console.log(
        c.red(`\n  unknown: rungs setup ${args[0] ?? ''}`.trimEnd()) +
          c.dim('\n  The only subcommand is `git`, and the path comes after it: `rungs setup git [path]`.\n'),
      );
      process.exit(1);
    }
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
  case 'session': {
    if (args[0] !== 'start') {
      console.log(c.red(`\n  unknown: rungs session ${args[0] ?? ''}`.trimEnd()) + c.dim('\n  The only subcommand is `start`: `rungs session start <branch> [path]`.\n'));
      process.exit(1);
    }
    process.exit(report(sessionStart(process.cwd(), args[1], args[2], flags.has('--dry-run'))));
  }
  case 'preflight':
    process.exit(report(preflight(resolve(args[0] ?? process.cwd()))));
  case 'land':
    process.exit(report(land(process.cwd(), args[0], landRunner, flags.has('--dry-run'))));
  case 'worktrees':
    process.exit(cmdWorktrees(resolve(args[0] ?? process.cwd())));
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
