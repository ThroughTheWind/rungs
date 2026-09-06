import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Manifest } from './types.ts';
import type { AddAction } from './add.ts';
import type { Harness, RenderEntry } from './render.ts';
import { preflightEmittedPaths } from './emitted-path.ts';
import { loadRegistry, loadTable, type RegistryGate } from './check.ts';
import { selectEngineTable } from './engine-table.ts';
import { HOOK_EVALUATORS } from './hook-engine.ts';

/**
 * How a declared hook reaches the harness that runs it — ADR-0010.
 *
 * A hook is a gate with a lifecycle trigger. The engine stays in the CLI, the
 * table stays in the module, and the harness configuration names only the
 * consumer's pinned launcher and the gate id: `node .ai/rungs.mjs hook <id>`.
 * Claude Code is the one harness with a hook mechanism (ADR-0001); every other
 * harness in the matrix gets a degradation row in the render report instead of
 * silence.
 */

/** The harness event a trigger maps to. Only Claude Code's vocabulary exists today. */
export const HOOK_EVENTS: Readonly<Record<string, string>> = Object.freeze({
  'pre-tool-use': 'PreToolUse',
});

export const HOOK_HARNESS: Harness = 'claude';
export const CLAUDE_SETTINGS = '.claude/settings.json';

export function hookCommandFor(gateId: string): string {
  return `node .ai/rungs.mjs hook ${gateId}`;
}

/** Hook gates declared by a set of manifests. */
export function declaredHooks(mods: Manifest[]): { module: string; gate: Manifest['gates'][number] }[] {
  return mods.flatMap((mod) => mod.gates.filter((g) => g.trigger).map((gate) => ({ module: mod.name, gate })));
}

export class HookRefusal extends Error {}

interface SettingsFile {
  path: string;
  exists: boolean;
  settings: Record<string, any>;
  indent: string;
  newline: string;
  trailingNewline: boolean;
}

function readSettings(repoRoot: string): SettingsFile {
  const path = preflightEmittedPaths(repoRoot, [
    { moduleName: 'instructions', target: CLAUDE_SETTINGS, writeExisting: true },
  ])[0].absolute;
  if (!existsSync(path)) {
    return { path, exists: false, settings: {}, indent: '  ', newline: '\n', trailingNewline: true };
  }
  const raw = readFileSync(path, 'utf8');
  let settings: unknown;
  try {
    settings = JSON.parse(raw);
  } catch (error: any) {
    throw new HookRefusal(`${CLAUDE_SETTINGS} is not valid JSON (${error?.message ?? error}); fix it before installing a hook — it is yours and will not be overwritten`);
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new HookRefusal(`${CLAUDE_SETTINGS} must hold a JSON object for a hook to be merged into it`);
  }
  const indent = raw.match(/\n([ \t]+)"/)?.[1] ?? '  ';
  const newline = raw.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  return { path, exists: true, settings: settings as Record<string, any>, indent, newline, trailingNewline: /\r?\n$/.test(raw) };
}

/**
 * Refuse before any write when the hook target cannot be merged into. Called
 * from the installer's preflight so a malformed settings file stops the whole
 * operation rather than leaving a half-installed module behind.
 */
export function preflightHooks(mods: Manifest[], repoRoot: string, harnesses: Harness[]): void {
  if (!declaredHooks(mods).length || !harnesses.includes(HOOK_HARNESS)) return;
  readSettings(repoRoot);
}

function hasCommand(settings: Record<string, any>, event: string, command: string): boolean {
  const entries = settings.hooks?.[event];
  if (!Array.isArray(entries)) return false;
  return entries.some((entry: any) =>
    Array.isArray(entry?.hooks) && entry.hooks.some((h: any) => h?.type === 'command' && h?.command === command),
  );
}

/**
 * Merge one entry per declared hook into the harness configuration, keyed by
 * the exact command string. Everything the consumer already has is preserved;
 * a repeat adds nothing. JSON has no room for a managed-block marker, so the
 * command string is the ownership claim, stated in ADR-0010 as the weaker one.
 */
export function registerHooks(mods: Manifest[], repoRoot: string, harnesses: Harness[], dryRun = false): AddAction[] {
  const hooks = declaredHooks(mods);
  if (!hooks.length) return [];
  const actions: AddAction[] = [];
  if (!harnesses.includes(HOOK_HARNESS)) {
    for (const { gate } of hooks) {
      actions.push({ disposition: 'hook', target: gate.id, note: `not emitted — no harness in [${harnesses.join(', ')}] runs hooks; reported in .ai/render-report.md` });
    }
    return actions;
  }

  const file = readSettings(repoRoot);
  let changed = false;
  for (const { gate } of hooks) {
    const event = HOOK_EVENTS[gate.trigger!];
    if (!event) {
      actions.push({ disposition: 'hook', target: gate.id, note: `trigger '${gate.trigger}' has no harness event — not emitted` });
      continue;
    }
    const command = hookCommandFor(gate.id);
    if (hasCommand(file.settings, event, command)) {
      actions.push({ disposition: 'hook', target: `${CLAUDE_SETTINGS} → ${event}`, note: `${gate.id} already present` });
      continue;
    }
    file.settings.hooks ??= {};
    if (!Array.isArray(file.settings.hooks[event])) file.settings.hooks[event] = [];
    file.settings.hooks[event].push({
      ...(gate.matcher ? { matcher: gate.matcher } : {}),
      hooks: [{ type: 'command', command }],
    });
    changed = true;
    actions.push({ disposition: 'hook', target: `${CLAUDE_SETTINGS} → ${event}`, note: `${gate.id} registered` });
  }

  if (changed && !dryRun) {
    const body = JSON.stringify(file.settings, null, file.indent).replace(/\n/g, file.newline);
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.trailingNewline ? `${body}${file.newline}` : body);
  }
  return actions;
}

/**
 * One render-report row per hook per harness: emitted where the harness runs
 * hooks, degraded everywhere else. ADR-0001's table says "warn once per harness
 * that this repo's enforcement is Claude-only"; the report is where every other
 * degradation already lands, so it lands here too.
 */
export function hookRenderEntries(repoRoot: string, harnesses: Harness[]): RenderEntry[] {
  const hooks = loadRegistry(repoRoot).gates.filter((g) => g.trigger);
  if (!hooks.length) return [];
  // The row says "emitted" only when the entry is actually in the file. A repo
  // that registered the gate before hooks were delivered, and has not upgraded,
  // must read as not yet emitted rather than as protected.
  let settings: Record<string, any> | null = null;
  let unreadable: string | null = null;
  if (harnesses.includes(HOOK_HARNESS)) {
    try {
      settings = readSettings(repoRoot).settings;
    } catch (error: any) {
      unreadable = error?.message ?? String(error);
    }
  }
  const entries: RenderEntry[] = [];
  for (const gate of hooks) {
    for (const harness of harnesses) {
      const event = HOOK_EVENTS[gate.trigger!];
      if (harness === HOOK_HARNESS && event) {
        if (unreadable) {
          entries.push({ rule: `hook ${gate.id}`, harness, degraded: `hook not emitted: ${unreadable}` });
        } else if (settings && hasCommand(settings, event, hookCommandFor(gate.id))) {
          entries.push({ rule: `hook ${gate.id}`, harness, target: CLAUDE_SETTINGS, dropped: [] });
        } else {
          entries.push({ rule: `hook ${gate.id}`, harness, degraded: `hook not emitted: no entry in ${CLAUDE_SETTINGS} yet — run \`node .ai/rungs.mjs upgrade --apply\`` });
        }
      } else {
        entries.push({
          rule: `hook ${gate.id}`,
          harness,
          degraded: `hook not emitted: ${harness} has no hook mechanism, so this protection is Claude-only (ADR-0001)`,
        });
      }
    }
  }
  return entries;
}

export interface HookVerdict {
  /** 2 blocks the tool call, 0 permits it, 1 means the hook itself could not run and never blocks. */
  exit: 0 | 1 | 2;
  message?: string;
}

/**
 * `rungs hook <gate-id>`: evaluate the harness payload on stdin against the
 * named hook gate. The payload is read only after the gate is known to be a
 * runnable hook, so a misconfiguration answers immediately with exit 1 rather
 * than waiting on input that may never come.
 */
export function hookVerdict(repoRoot: string, gateId: string, readPayload: () => string): HookVerdict {
  const gate: RegistryGate | undefined = loadRegistry(repoRoot).gates.find((g) => g.id === gateId);
  if (!gate) return { exit: 1, message: `rungs hook: no gate '${gateId}' in .ai/gates.toml` };
  if (!gate.trigger) return { exit: 1, message: `rungs hook: gate '${gateId}' has no trigger — it is a runner gate, not a hook` };
  const evaluate = gate.engine ? HOOK_EVALUATORS[gate.engine] : undefined;
  if (!evaluate) return { exit: 1, message: `rungs hook: engine '${gate.engine ?? '(none)'}' is not a hook engine` };
  const table = loadTable(gate.table, repoRoot);
  if (!table) return { exit: 1, message: `rungs hook: table '${gate.table ?? '(none)'}' not found` };
  let section: any;
  try {
    section = selectEngineTable(table, gate.engine!, gate.id);
  } catch (error: any) {
    return { exit: 1, message: `rungs hook: ${error?.message ?? error}` };
  }

  let payload: any;
  try {
    payload = JSON.parse(readPayload());
  } catch {
    // A hook that cannot read its input must not block the session: the harness
    // changed its payload shape, or nothing was piped. Exit 0, not 2.
    return { exit: 0 };
  }
  const tool = typeof payload?.tool_name === 'string' ? payload.tool_name : '';
  if (gate.matcher) {
    let matcher: RegExp;
    try {
      matcher = new RegExp(`^(?:${gate.matcher})$`);
    } catch {
      return { exit: 1, message: `rungs hook: matcher '${gate.matcher}' is not a valid regular expression` };
    }
    if (!matcher.test(tool)) return { exit: 0 };
  }
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') return { exit: 0 };

  const findings = evaluate(section, command);
  if (!findings.length) return { exit: 0 };
  const why = gate.why ? `\n\nWhy this gate exists: ${gate.why.trim().replace(/\s+/g, ' ')}` : '';
  return {
    exit: 2,
    message: `Blocked by ${gateId}:\n${findings.map((f) => `  ${f.message}`).join('\n')}${why}`,
  };
}
