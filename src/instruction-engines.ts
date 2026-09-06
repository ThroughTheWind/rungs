import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Engine, Finding } from './engines.ts';
import { matchAny } from './glob.ts';
import { semanticText } from './text.ts';
import { COMMANDS } from './help.ts';

/**
 * The two instruction detectors WI-061 accepted, built the way ADR-0011 allows:
 * evidence rows that assert nothing about enforcement, and a command check
 * against surfaces that are actually read.
 *
 * Both were shaped by the hand-classified oracle
 * (docs/design/imperative-oracle-2026-09-06.md) **before** either matcher
 * existed. Its headline: in the corpus's largest instruction file, 70% of the
 * lines a modal-verb grep finds are project history, not rules. So the census
 * counts a modal only where the shape says "rule" — at the head of a clause, or
 * `must` — and never in the past-tense, noun-phrase and subject-led shapes the
 * oracle found to be narrative.
 */

const read = (root: string, rel: string) => {
  try {
    return semanticText(readFileSync(join(root, rel), 'utf8'));
  } catch {
    return '';
  }
};

const expand = (files: string[], patterns: string[] | undefined, fallback: string[] = []) =>
  [...new Set((patterns ?? fallback).flatMap((p) => matchAny(files, p)))];

const INSTRUCTION_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.ai/rules/**/*.md',
  '.claude/rules/**/*.md',
  '.github/instructions/**/*.md',
  '.github/copilot-instructions.md',
  '.cursor/rules/**/*.mdc',
];

/**
 * Prose lines of an instruction file: fenced blocks and headings removed, code
 * spans, link targets and HTML comments blanked in place so line numbers hold.
 * A quoted `MUST` in a code span is not a rule (WI-008's correction for links,
 * applied here as the item's approach required).
 */
function proseLines(text: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let fenced = false;
  let comment = false;
  text.split('\n').forEach((raw, i) => {
    let line = raw;
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (comment) {
      const end = line.indexOf('-->');
      if (end === -1) return;
      line = ' '.repeat(end + 3) + line.slice(end + 3);
      comment = false;
    }
    line = line.replace(/<!--[\s\S]*?-->/g, (s) => ' '.repeat(s.length));
    const open = line.indexOf('<!--');
    if (open !== -1) {
      line = line.slice(0, open);
      comment = true;
    }
    if (/^\s*#/.test(line)) return;
    line = line
      .replace(/`+[^`\n]*`+/g, (s) => ' '.repeat(s.length))
      .replace(/\]\([^)]*\)/g, (s) => ']' + ' '.repeat(s.length - 1));
    if (line.trim()) out.push({ line: i + 1, text: line });
  });
  return out;
}

/**
 * Where a clause may start: line start (past list, quote and emphasis markers),
 * or after sentence punctuation — which may be followed by closing emphasis
 * before the space (`**SSR is opt-in.** Never add …`). Conjunctions are
 * deliberately not clause heads: measured against the oracle, "and never the
 * recipient" and "but never bumps a marker" were narrative every time.
 */
const CLAUSE_HEAD = String.raw`(?:^[\s>*\-+]*(?:\d+[.)]\s*)?|[.;:?!—–][*_"”)]*\s+)[*_"“(]*`;

/**
 * Up to four words after a clause head — the subject a rule's `must` follows
 * ("Status must", "All UI must", "every shared motion surface must"). Measured
 * against the oracle: at six words the design narrative of the largest corpus
 * file ("a record on a multi-form slot must name …") came back in, and the
 * repository's false-positive rate sat above WI-053's one-in-five.
 */
const SHORT_SUBJECT = String.raw`(?:[\w'’,-]+[*_]*\s+){0,4}`;

const RULE_PATTERNS: { verb: string; re: RegExp }[] = [
  // `must` / `shall` near the head of a clause. Deep inside a sentence they
  // were design narrative in the oracle ("a record on a multi-form slot must
  // name …"), so that class is narrowed, as WI-053's threshold requires.
  { verb: 'must', re: new RegExp(`${CLAUSE_HEAD}${SHORT_SUBJECT}must(?:\\s+not)?\\b`, 'i') },
  { verb: 'shall', re: new RegExp(`${CLAUSE_HEAD}${SHORT_SUBJECT}shall(?:\\s+not)?\\b`, 'i') },
  // `never` / `always` only at the head of a clause, and not as a noun phrase
  // ("never a second table", "never a press") nor before a past participle
  // ("never measured in game", "never reached the FE union") — both history in
  // the oracle every time they appeared.
  { verb: 'never', re: new RegExp(`${CLAUSE_HEAD}never\\b(?!\\s+(?:a|an|the|been|had|was|were|\\w+ed)\\b)`, 'i') },
  { verb: 'always', re: new RegExp(`${CLAUSE_HEAD}always\\b`, 'i') },
  // `do not` / `don't` at the head of a clause. With a subject before it
  // ("they do not", "Codex and Claude do not") it is a fact.
  { verb: 'do not', re: new RegExp(`${CLAUSE_HEAD}(?:do\\s+not|don['’]t)\\b`, 'i') },
];

/**
 * `imperative-census` — every line of an instruction file that states a rule,
 * with its file, line and the modal that matched. Evidence rows (ADR-0005),
 * never a verdict on enforcement (ADR-0011). Surfaced through `doctor --explain`.
 */
export const imperativeCensus: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  const excluded = new Set(expand(files, t.exclude, []));
  const targets = expand(files, t.scan, INSTRUCTION_FILES).filter((f) => !excluded.has(f));
  let examined = 0;
  for (const rel of targets) {
    const text = read(root, rel);
    if (!text) continue;
    examined++;
    for (const { line, text: prose } of proseLines(text)) {
      const hit = RULE_PATTERNS.find((p) => p.re.test(prose));
      if (!hit) continue;
      const shown = prose.trim().replace(/\s+/g, ' ');
      findings.push({
        file: rel,
        message: `line ${line}: ${hit.verb} — ${shown.length > 110 ? `${shown.slice(0, 107)}…` : shown}`,
        identity: `imperative:${rel}:${line}`,
      });
    }
  }
  return { findings, examined };
};

const SUBCOMMANDS: Record<string, string> = { backlog: 'archive', setup: 'git', session: 'start' };

/** Code spans and fenced blocks of a markdown file, each with the line it starts on. */
function codeText(text: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const lines = text.split('\n');
  let fenceStart = -1;
  let fenceInfo = '';
  let buffer: string[] = [];
  lines.forEach((line, i) => {
    const fence = /^\s*(```|~~~)\s*([\w-]*)/.exec(line);
    if (fence) {
      if (fenceStart === -1) {
        fenceStart = i + 1;
        fenceInfo = fence[2].toLowerCase();
        buffer = [];
      } else {
        if (!fenceInfo || /^(bash|sh|shell|zsh|console|powershell|pwsh|cmd|bat)$/.test(fenceInfo)) {
          out.push({ line: fenceStart, text: buffer.join('\n') });
        }
        fenceStart = -1;
      }
      return;
    }
    if (fenceStart !== -1) {
      buffer.push(line);
      return;
    }
    for (const span of line.matchAll(/`+([^`\n]+)`+/g)) out.push({ line: i + 1, text: span[1] });
  });
  return out;
}

/**
 * `command-reference` — a command named in an instruction file whose surface
 * exists and does not contain it. Two surfaces are read: `package.json`
 * `scripts` for `npm|pnpm|yarn run <script>`, and the CLI's own dispatch table
 * for `rungs <command>` in any of its spellings. Absent surface, no finding:
 * F-015's incident was a command named in three shipped files that the CLI did
 * not dispatch, and that shape is exactly what can be disproved.
 */
export const commandReference: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  const excluded = new Set(expand(files, t.exclude, []));
  const targets = expand(files, t.scan, INSTRUCTION_FILES).filter((f) => !excluded.has(f));

  const packageRel = String(t.package_json ?? 'package.json');
  let scripts: Set<string> | null = null;
  if (existsSync(join(root, packageRel))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, packageRel), 'utf8'));
      if (pkg && typeof pkg === 'object' && pkg.scripts && typeof pkg.scripts === 'object') {
        scripts = new Set(Object.keys(pkg.scripts));
      }
    } catch {
      scripts = null; // unreadable manifest is no surface, not a finding
    }
  }
  const commands = new Set(COMMANDS.map(([usage]) => usage.split(' ')[0]));

  let examined = 0;
  for (const rel of targets) {
    const text = read(root, rel);
    if (!text) continue;
    examined++;
    const seen = new Set<string>();
    for (const { line, text: code } of codeText(text)) {
      if (/\{\{[a-z_.]+\}\}/.test(code)) continue; // a template, resolvable only once installed
      if (scripts) {
        for (const m of code.matchAll(/\b(npm|pnpm|yarn)\s+run\s+([A-Za-z0-9:_./-]+)/g)) {
          const key = `${rel}:${m[1]} run ${m[2]}`;
          if (seen.has(key) || scripts.has(m[2])) continue;
          seen.add(key);
          findings.push({
            file: rel,
            message: `line ${line}: \`${m[1]} run ${m[2]}\` — ${packageRel} has no script '${m[2]}'`,
            identity: `script:${rel}:${m[2]}`,
          });
        }
      }
      for (const m of code.matchAll(/(?:\bnpx\s+@rungs\/cli(?:@\S+)?|(?<![\w/.-])rungs|\bnode\s+\.ai\/rungs\.mjs)\s+([a-z][a-z-]*)(?:\s+([a-z][a-z-]*))?/g)) {
        const [, cmd, sub] = m;
        const key = `${rel}:rungs ${cmd} ${sub ?? ''}`;
        if (seen.has(key)) continue;
        if (!commands.has(cmd)) {
          seen.add(key);
          findings.push({
            file: rel,
            message: `line ${line}: \`rungs ${cmd}\` — not a command this CLI dispatches (${[...commands].sort().join(', ')})`,
            identity: `rungs:${rel}:${cmd}`,
          });
          continue;
        }
        const required = SUBCOMMANDS[cmd];
        if (required && sub && sub !== required) {
          seen.add(key);
          findings.push({
            file: rel,
            message: `line ${line}: \`rungs ${cmd} ${sub}\` — the only subcommand of \`${cmd}\` is \`${required}\``,
            identity: `rungs:${rel}:${cmd}:${sub}`,
          });
        }
      }
    }
  }
  return { findings, examined };
};
