import type { Engine, Finding } from './engines.ts';

/**
 * Hook engines evaluate one **event** — a command a harness is about to run —
 * rather than a set of files. `instructions-shell-backticks` declared
 * `engine = "shell-safety"` with a table of refuse patterns and four fixtures
 * since the module shipped, and nothing implemented the name (F-054): the
 * registry entry reached every consumer and the protection reached none.
 *
 * Kept free of imports from the runner so the self-test runner and the ejected
 * runner can both reach the evaluator without a cycle through `check.ts`.
 */

export type HookEvaluator = (table: any, input: string) => Finding[];

/**
 * `[shell_safety]`: every `refuse` pattern is a regular expression over the
 * command text; a match is a finding carrying the pattern's `why` and the
 * table's message. `permit` is documentation of what the rule allows — it is
 * asserted by the pass fixtures, not consulted at run time, so a permitted form
 * cannot be added by editing prose.
 */
export const evaluateShellSafety: HookEvaluator = (table, command) => {
  const findings: Finding[] = [];
  const message = typeof table?.message === 'string' ? table.message.trim() : '';
  for (const rule of Array.isArray(table?.refuse) ? table.refuse : []) {
    if (!rule || typeof rule.pattern !== 'string') continue;
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern);
    } catch {
      // A pattern that does not compile is a defect in the table. It is reported
      // rather than skipped, because a rule that silently stopped matching is the
      // failure this whole module exists to catch.
      findings.push({ message: `shell-safety pattern is not a valid regular expression: ${rule.pattern}`, identity: `invalid:${rule.pattern}` });
      continue;
    }
    if (re.test(command)) {
      findings.push({
        message: `${typeof rule.why === 'string' && rule.why ? rule.why : 'refused pattern'}${message ? ` — ${message}` : ''}`,
        identity: `refuse:${rule.pattern}`,
      });
    }
  }
  return findings;
};

export const HOOK_EVALUATORS: Readonly<Record<string, HookEvaluator>> = Object.freeze({
  'shell-safety': evaluateShellSafety,
});

/**
 * The engine-map entry. A hook gate is skipped by the runner (it has a
 * trigger), so this is reached only when something asks a hook engine to scan
 * files — which is a misuse, and never green: the engine has no file
 * semantics, so it reports that fact as a finding instead of examining nothing
 * and passing.
 */
export const shellSafety: Engine = () => ({
  findings: [{ message: 'shell-safety is a hook engine: it evaluates a tool call through `rungs hook <gate-id>`, not a file scan' }],
  examined: 0,
});
