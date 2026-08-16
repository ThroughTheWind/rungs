import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { matchAny } from './glob.ts';
import type { Engine, Finding } from './engines.ts';

const read = (root: string, rel: string) => {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch {
    return '';
  }
};
const expand = (files: string[], p: string[] | undefined, f: string[] = []) =>
  [...new Set((p ?? f).flatMap((x) => matchAny(files, x)))];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** An exemption marker is ignored unless it states a reason. */
const exempted = (text: string, marker?: string) =>
  !!marker && new RegExp(`${escapeRe(marker)}\\s*\\S`).test(text);

/** Rows of the first markdown table under a heading containing `near`. */
function tableRows(text: string, near?: string): Record<string, string>[] {
  const lines = text.split('\n');
  const rows: Record<string, string>[] = [];
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) heading = lines[i];
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|/.test(lines[i + 1] ?? '')) continue;
    if (near && !heading.toLowerCase().includes(near.toLowerCase())) continue;
    const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const headers = cells(lines[i]);
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const c = cells(lines[j]);
      rows.push(Object.fromEntries(headers.map((h, k) => [h, c[k] ?? ''])));
    }
    i = lines.length;
  }
  return rows;
}

const clean = (v = '') => v.replace(/[`*\[\]]/g, '').trim();

/** Words distinctive enough to indicate a topic is being restated, not mentioned. */
function terms(topic: string): string[] {
  const stop = new Set(['the', 'and', 'for', 'with', 'per', 'its', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'are']);
  return clean(topic)
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

/**
 * One owner per topic, checked by vocabulary.
 *
 * The registry's third column — where a topic must NOT appear — is what turns
 * "one source of truth" from a principle into a lookup. Approximate by
 * construction: it catches a section that restates a topic, not one that
 * restates it in different words. That ceiling is pinned in the message rather
 * than hidden, so a green run never reads as "verified".
 */
export const termOwnership: Engine = (t, root, files) => {
  const registry = read(root, t.registry ?? 'docs/doc-ownership.md');
  if (!registry) return { findings: [{ message: `ownership registry '${t.registry}' not found` }], examined: 0 };

  const cols = t.columns ?? {};
  const findings: Finding[] = [];
  let examined = 0;

  for (const row of tableRows(registry)) {
    const topic = clean(row[cols.topic ?? 'Topic']);
    const owner = clean(row[cols.owner ?? 'Owner']);
    const forbidden = clean(row[cols.forbidden ?? 'Must NOT appear in']);
    if (!topic || !forbidden || forbidden === '—' || topic.startsWith('(example)')) continue;

    const want = terms(topic);
    if (want.length < 2) continue; // too vague to test without guessing
    const patterns = forbidden.split(/[,·]/).map((s) => s.trim()).filter(Boolean);

    for (const rel of expand(files, patterns)) {
      if (rel === owner) continue;
      const text = read(root, rel);
      if (exempted(text, t.exempt_marker)) continue;
      examined++;
      // Per section, not per file: a passing mention is a cross-reference, a
      // section carrying several of the topic's terms is a restatement.
      for (const section of text.split(/^#{1,6}\s+/m)) {
        const lower = section.toLowerCase();
        const hits = want.filter((w) => lower.includes(w));
        if (hits.length >= (t.engage_min_terms ?? 3)) {
          findings.push({ file: rel, message: `restates "${topic}", owned by ${owner} (${hits.length} terms)` });
          break;
        }
      }
    }
  }
  return { findings, examined };
};

/**
 * A working rule lives in more surfaces than its authority, and fixing the
 * authority does not reach them. Each declared rule names the surfaces that
 * restate it; a surface carrying the retired wording is reported.
 *
 * `forbids` is matched against a preceding-context negation window, because a
 * retired phrase inside "do NOT <retired>" is the fix, not the violation — and
 * a guard that refuses its own fix is one people disable.
 */
export const rulePropagation: Engine = (t, root, files) => {
  const registry = read(root, t.registry ?? 'docs/working-rules.md');
  if (!registry) return { findings: [{ message: `rules registry '${t.registry}' not found` }], examined: 0 };

  const cols = t.columns ?? {};
  const findings: Finding[] = [];
  let examined = 0;
  const window = t.negation_window ?? 60;

  for (const row of tableRows(registry)) {
    const rule = clean(row[cols.rule ?? 'Rule']);
    const retired = clean(row[cols.retired ?? 'Retired wording']);
    const surfaces = clean(row[cols.surfaces ?? 'Surfaces that restate it']);
    if (!rule || !retired || retired === '—' || rule.startsWith('(example)')) continue;

    for (const rel of expand(files, surfaces.split(/[,·]/).map((s) => s.trim()).filter(Boolean))) {
      const text = read(root, rel);
      if (exempted(text, t.exempt_marker)) continue;
      examined++;
      const re = new RegExp(`(.{0,${window}})${escapeRe(retired)}`, 'gis');
      for (const m of text.matchAll(re)) {
        const lead = m[1].toLowerCase();
        if (/\bnot\b|\bnever\b|\bno longer\b|\bused to\b|\bformerly\b|\bretired\b/.test(lead)) continue;
        findings.push({ file: rel, message: `carries the retired wording for "${rule}"` });
        break;
      }
    }
  }
  return { findings, examined };
};

/**
 * The integration branch must be checked out nowhere.
 *
 * Recorded as a correction rather than a preference: holding it checked out
 * blocked every other session *and* did not prevent concurrent landing anyway,
 * because switching to the scratch ref releases it mid-run.
 */
export const gitState: Engine = (t, root) => {
  let out: string;
  try {
    out = execSync('git worktree list --porcelain', { cwd: root, stdio: 'pipe' }).toString();
  } catch {
    // Not a git repo, or git unavailable. An unattributable result blocks:
    // we do not land on an unknown.
    return { findings: [{ message: 'cannot read git worktrees; checkout state unknown' }], examined: 0 };
  }
  const findings: Finding[] = [];
  const blocks = out.split('\n\n').filter(Boolean);
  for (const b of blocks) {
    const dir = b.match(/^worktree (.+)$/m)?.[1];
    const branch = b.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (branch && (t.refuse_checked_out ?? []).includes(branch)) {
      findings.push({ message: `'${branch}' is checked out in ${dir} — nothing should hold it` });
    }
  }
  return { findings, examined: blocks.length };
};

/**
 * Merge drivers named in `.gitattributes` are **inert until installed**, so a
 * fresh clone silently falls back to git's default merge on files that must
 * never be text-merged. Declaring them is not the same as having them.
 */
export const mergeDriverCheck: Engine = (t, root) => {
  const attrs = read(root, t.attributes_file ?? '.gitattributes');
  if (!attrs) return { findings: [], examined: 0 };

  const declared = [...new Set([...attrs.matchAll(/merge=([\w-]+)/g)].map((m) => m[1]))];
  const required = (t.required_drivers ?? []).filter((d: string) => declared.includes(d));
  if (!required.length) return { findings: [], examined: declared.length };

  const findings: Finding[] = [];
  for (const driver of required) {
    let configured = '';
    try {
      configured = execSync(`git config --get merge.${driver}.driver`, { cwd: root, stdio: 'pipe' }).toString().trim();
    } catch {
      /* absent config exits non-zero, which is the finding */
    }
    if (!configured) {
      findings.push({ message: `driver '${driver}' is declared but not installed — run \`${t.install_command}\`` });
    }
  }
  return { findings, examined: declared.length };
};

/**
 * The board's grouping must agree with each item's own `status` field.
 *
 * `git-status-reconcile` already reconciles a **branch** against that field, and
 * this repo cites it constantly as proof that typed bookkeeping decays. Nothing
 * reconciled the **board** — so on 2026-08-16 `BACKLOG.md` filed fourteen items
 * under `Proposed` and `Planned` whose files all read `status: done`, nine of
 * them linking into `archive/`. The board said *proposed* about a document in
 * the directory for work that can no longer change.
 *
 * It was found by an outside reviewer asserting the framework research was done.
 * They were right; the board would have told them otherwise. That is the same
 * failure the whole module exists to prevent, one layer up, in the file every
 * session opens first.
 *
 * Only table rows are read. The board's prose deliberately discusses finished
 * work, and a paragraph is not a claim about status.
 */
export const boardReconcile: Engine = (t, root, _files) => {
  const rel = t.file as string;
  const text = read(root, rel);
  if (!text) return { findings: [{ message: `board not found at ${rel}` }], examined: 0 };
  if (exempted(text, t.exempt_marker)) return { findings: [], examined: 0 };

  const groups: Record<string, string[]> = t.groups ?? {};
  const dir = rel.split('/').slice(0, -1).join('/');
  const findings: Finding[] = [];
  let heading = '';
  let examined = 0;

  for (const line of text.split('\n')) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      heading = h[1];
      continue;
    }
    if (!line.startsWith('|')) continue;

    const link = /^\|\s*\[[^\]]+\]\(([^)]+)\)/.exec(line);
    if (!link) continue; // separator, header, or an empty `| — |` placeholder

    // An undeclared heading is narrative, not a status group. The board's later
    // sections are prose with their own tables — "The first-user path", closed
    // 2026-08-15, tabulates seven finished items and says so in the heading.
    //
    // Reporting those was this gate's first behaviour and it was wrong: measured
    // 2026-08-16, it produced seven findings against a document that is correct.
    // The plan's requirement that every undeclared heading be reported was aimed
    // at a *typo* hiding rows from the check, and it caught legitimate prose
    // instead. That case is covered exactly, below, by requiring each declared
    // group to appear — a misspelled `Propsed` makes `Proposed` go missing.
    if (!Object.hasOwn(groups, heading)) continue;

    examined++;
    const target = `${dir}/${link[1]}`.replace(/[^/]+\/\.\.\//g, '');
    const item = read(root, target);
    if (!item) {
      findings.push({ file: rel, message: `row under '${heading}' links to a missing file: ${link[1]}` });
      continue;
    }
    const status = /^status:\s*(\S+)/m.exec(item)?.[1] ?? '';
    if (!groups[heading].includes(status)) {
      findings.push({
        file: rel,
        message: `${link[1]} is under '${heading}' but its status is '${status}' (expected ${groups[heading].join(' | ')})`,
      });
    }
  }

  // Every declared group must actually appear. This is the typo check: a board
  // whose `Proposed` heading is misspelled would otherwise drop those rows
  // silently, which is exactly what the group map exists to prevent.
  const seen = new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]));
  for (const g of Object.keys(groups)) {
    if (!seen.has(g)) findings.push({ file: rel, message: `declared group '${g}' has no heading in the board` });
  }

  return { findings, examined };
};
