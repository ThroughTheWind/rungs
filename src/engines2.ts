import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { TextDecoder } from 'node:util';
import { resolveEmittedPath } from './emitted-path.ts';
import { matchAny } from './glob.ts';
import { readVersionSource } from './version-source.ts';
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

/** An exemption marker is ignored unless it states a reason. */
const exempted = (text: string, marker?: string) =>
  !!marker && new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\S`).test(text);

/**
 * Ids: uniqueness across the declared sources, citations that resolve, and the
 * stale-blocker rule — a document may not say it waits on work that has finished.
 */
export const idIntegrity: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  let examined = 0;
  const known = new Set<string>();

  for (const [, kind] of Object.entries<any>(t.kinds ?? {})) {
    const re = new RegExp(`^\\s*id:\\s*(${kind.format})`, 'm');
    const seen = new Map<string, string>();
    for (const rel of expand(files, kind.sources)) {
      examined++;
      const text = read(root, rel);
      const id = text.match(re)?.[1] ?? rel.match(new RegExp(kind.format))?.[0];
      if (!id) continue;
      known.add(id);
      const prior = seen.get(id);
      if (prior) findings.push({ file: rel, message: `id ${id} also claimed by ${prior}` });
      else seen.set(id, rel);
    }
    // The marker must not name an id that is already spent.
    if (kind.marker?.file) {
      const m = read(root, kind.marker.file).match(new RegExp(kind.marker.pattern));
      if (m?.[1] && seen.has(m[1])) {
        findings.push({ file: kind.marker.file, message: `NEXT marker points at ${m[1]}, already taken` });
      }
    }
  }

  // Stale blockers. Vocabulary is narrow on purpose: a first draft that matched
  // `until <id>` hit 29 lines of true history in one repo's own voice.
  const sb = t.stale_blocker;
  if (sb?.phrases?.length && known.size) {
    const scope = expand(files, ['docs/**/*.md', 'AGENTS.md', 'CLAUDE.md']).filter(
      (f) => !expand(files, sb.scope_exclude, []).includes(f),
    );
    const past = (sb.past_tense_ok ?? []).map((p: string) => p.toLowerCase());
    for (const rel of scope) {
      const text = read(root, rel);
      if (exempted(text, sb.exempt_marker)) continue;
      for (const phrase of sb.phrases) {
        const re = new RegExp(`(.{0,${sb.negation_window ?? 60}})\\b${phrase}\\b\\s+([A-Z]{1,6}-\\d{1,4})`, 'gi');
        for (const m of text.matchAll(re)) {
          const lead = m[1].toLowerCase();
          if (past.some((p: string) => lead.includes(p.split(' ')[0]) && lead.includes('was'))) continue;
          if (/\bnot\b|\bnever\b|\bno longer\b/.test(lead.slice(-30))) continue;
          if (isDone(root, m[2], files)) {
            findings.push({ file: rel, message: `claims to be ${phrase} ${m[2]}, which is done` });
          }
        }
      }
    }
  }
  return { findings, examined };
};

function isDone(root: string, id: string, files: string[]): boolean {
  const hit = files.find((f) => f.includes(id) && f.endsWith('.md'));
  if (!hit) return false;
  const s = read(root, hit).match(/^status:\s*(\S+)/m)?.[1];
  return s === 'done' || hit.includes('/archive/');
}

/** Generated output that no longer matches what its producer would emit now. */
export const renderFreshness: Engine = (t, root, files) => {
  const specs = Array.isArray(t) ? t : [t];
  const findings: Finding[] = [];
  let examined = 0;
  for (const spec of specs) {
    if (spec.block?.file) {
      examined++;
      const text = read(root, spec.block.file);
      const re = new RegExp(`rungs:begin ${spec.block.marker}[\\s\\S]*?rungs:end ${spec.block.marker}`);
      if (!re.test(text)) {
        findings.push({ file: spec.block.file, message: `no '${spec.block.marker}' block — run \`${spec.command}\`` });
      }
      continue;
    }
    const excluded = new Set(expand(files, spec.exclude, []));
    const sources = expand(files, spec.sources).filter((s) => !excluded.has(s));
    const targets = expand(files, spec.targets);
    // Only harnesses this repo actually emits for are checked; a missing
    // `.cursor/rules` in a repo that never asked for Cursor is not staleness.
    const live = new Set(targets.map((x) => x.split('/')[0]));
    for (const src of sources) {
      examined++;
      const stem = src.split('/').pop()!.replace(/\.md$/, '');
      for (const dir of live) {
        if (!targets.some((x) => x.startsWith(dir) && x.includes(stem))) {
          findings.push({ file: src, message: `no rendering under ${dir}/ — run \`${spec.command}\`` });
        }
      }
    }
  }
  return { findings, examined };
};

/** Markdown-table registers: required columns, enums, and conditional rules. */
export const registerSchema: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  let examined = 0;

  // A register file holds more than one table, and each gets its own spec —
  // `[register_schema]` for Closed and `[register_schema.open]` for Open. Only
  // the top-level one was ever read (F-018), so the Open table's rules —
  // `non_empty = ["Sev", "Pri", "What", "Evidence"]` and the Sev/Pri enums —
  // had never been enforced on any repo. Found because the fixture asserting
  // them could not fire, once fixtures started running.
  //
  // A sub-spec is any nested object naming a `table`; `enum` and `min_words` are
  // objects too and do not.
  const specs = [t, ...Object.values(t).filter((v: any) => v && typeof v === 'object' && !Array.isArray(v) && v.table)];
  for (const t of specs as any[]) {
  const targets = t.file ?? specs[0].file ? [t.file ?? (specs[0] as any).file] : expand(files, t.scan);
  for (const rel of targets) {
    const text = read(root, rel);
    if (!text) continue;
    for (const table of parseTables(text)) {
      // The heading must **start with** the table's name, not merely contain it.
      // A substring match sent every Closed row through the Open schema, because
      // `## Closed — 2026-08-16 by [WI-044](archive/WI-044-resolve-open-findings.md)`
      // contains "open" inside a filename. Latent until `[register_schema.open]`
      // was read for the first time (F-018) — a loose matcher is invisible while
      // only one spec exists to match.
      const heading = sectionOf(text, table.headerLine).replace(/^#+\s*/, '').trim().toLowerCase();
      if (t.table && !heading.startsWith(String(t.table).toLowerCase())) continue;
      const cols = t.required_cols ?? t.table_columns ?? [];
      const present = cols.filter((c: string) =>
        table.headers.some((h) => h.toLowerCase() === String(c).toLowerCase()),
      );
      // Recognition before validation: a file may hold several tables and only
      // some are registers. Demanding every one carry the columns reported a
      // spec index for not being a story table.
      if (cols.length && present.length < Math.max(2, Math.ceil(cols.length / 2))) continue;
      for (const c of cols) {
        if (!present.includes(c)) findings.push({ file: rel, message: `register table missing column '${c}'` });
      }
      for (const row of table.rows) {
        if (Object.values(row).every((v) => !v || v === '—')) continue;
        // An em dash in the identity column is an explicit no-record row. The
        // generated findings register uses it to keep an empty table legible:
        // `| — | | | *nothing open* | ... |`. Looking only for an entirely
        // blank row made that label turn the placeholder into a malformed real
        // finding on the first `rungs check` in a fresh tracked consumer.
        if (strip(Object.values(row)[0]) === '—') continue;
        examined++;
        for (const [key, values] of Object.entries<any>(t.enum ?? {})) {
          const v = strip(row[key]);
          if (v && !values.map(String).includes(v)) {
            findings.push({ file: rel, message: `${key}='${v}' not one of ${values.join(', ')}` });
          }
        }
        for (const c of t.non_empty ?? []) {
          if (!strip(row[c])) findings.push({ file: rel, message: `row ${firstCell(row)}: '${c}' is empty` });
        }
        for (const cond of t.conditional ?? []) {
          const matches = Object.entries<any>(cond.when ?? {}).every(([k, v]) => strip(row[k]) === String(v));
          if (!matches) continue;
          for (const c of cond.non_empty ?? []) {
            const v = strip(row[c]);
            if (!v) findings.push({ file: rel, message: `row ${firstCell(row)}: '${c}' required when ${JSON.stringify(cond.when)}` });
            else if (cond.min_words?.[c] && v.split(/\s+/).length < cond.min_words[c]) {
              findings.push({ file: rel, message: `row ${firstCell(row)}: '${c}' is too thin to be a reason` });
            }
          }
        }
      }
    }
  }
  }
  return { findings, examined };
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * An open finding must not declare itself fixed in its own detail section.
 *
 * This is deliberately a text-only contradiction check. It does not inspect
 * code or infer that a fix really shipped; those questions are repository-
 * specific and a guessed probe would be confidently wrong. A section may
 * contain a reasoned `closure-ok:` marker when only a part of the observation
 * was addressed. The table owns the headings, id shape, and verdict phrases so
 * the engine remains useful for registers that use a different prefix or
 * detail heading.
 */
export const selfDeclaredClosure: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  let examined = 0;
  const targets = t.file ? [t.file] : expand(files, t.scan ?? ['docs/**/FINDINGS.md']);
  const idPattern = t.id_pattern ?? '[A-Z]{1,6}-\\d{1,4}';
  const openRow = new RegExp(t.open_row_pattern ?? `^\\|\\s*\\[?(${idPattern})\\]`, 'gmu');
  const detailHeading = new RegExp(t.detail_heading_pattern ?? `^###\\s+(${idPattern})\\s+—\\s+`, 'gmu');
  const verdicts = (t.declares_fixed ?? [
    '\\*\\*Fixed[.,)*]',
    '\\*\\*Fixed\\s+(?:in|by|the\\s+same\\s+day|\\d{4}-\\d{2}-\\d{2})',
    '\\*\\*Implemented in this change\\.?\\*\\*',
    '\\*\\*fixed in the pass that found it\\*\\*',
  ]).map((p: string) => new RegExp(p, 'iu'));

  for (const rel of targets) {
    const text = read(root, rel);
    if (!text) continue;
    const openStart = headingIndex(text, t.open_heading ?? 'Open');
    const closedStart = headingIndex(text, t.closed_heading ?? 'Closed');
    const detailStart = headingIndex(text, t.detail_heading ?? 'Detail');
    if (openStart < 0 || closedStart < 0 || detailStart < 0 || closedStart <= openStart || detailStart < closedStart) continue;

    const open = new Set<string>();
    for (const match of text.slice(openStart, closedStart).matchAll(openRow)) open.add(match[1]);
    if (!open.size) continue;

    const detail = text.slice(detailStart);
    const headings = [...detail.matchAll(detailHeading)];
    for (let i = 0; i < headings.length; i++) {
      const id = headings[i][1];
      if (!open.has(id)) continue;
      examined++;
      const start = headings[i].index ?? 0;
      const end = headings[i + 1]?.index ?? detail.length;
      const section = detail.slice(start, end);
      const marker = t.exempt_marker ?? 'closure-ok:';
      if (new RegExp(`<!--\\s*${escapeRe(marker)}\\s*\\S`, 'u').test(section)) continue;
      const body = section.slice(section.indexOf('\n') + 1);
      for (const verdict of verdicts) {
        const match = verdict.exec(body);
        if (!match) continue;
        const before = body.slice(Math.max(0, match.index - (t.citation_window ?? 120)), match.index);
        const cited = [...before.matchAll(new RegExp(`(${idPattern})[^.]{0,${t.citation_window ?? 120}}$`, 'gu'))].at(-1)?.[1];
        if (cited && cited !== id) continue;
        findings.push({ file: rel, message: `${id} is open but its detail declares it fixed: ${body.slice(match.index, match.index + 60).split('\n')[0].trim()}` });
        break;
      }
    }
  }
  return { findings, examined };
};

function headingIndex(text: string, heading: string): number {
  const re = new RegExp(`^#{1,6}\\s+${escapeRe(heading)}\\s*$`, 'imu');
  return text.search(re);
}

const strip = (v?: string) => (v ?? '').replace(/[`*\[\]]/g, '').split('(')[0].trim();
const firstCell = (row: Record<string, string>) => strip(Object.values(row)[0]) || '?';

function parseTables(text: string) {
  const out: { headers: string[]; rows: Record<string, string>[]; headerLine: number }[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|/.test(lines[i + 1] ?? '')) continue;
    const headers = cells(lines[i]);
    const rows: Record<string, string>[] = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const c = cells(lines[j]);
      rows.push(Object.fromEntries(headers.map((h, k) => [h, c[k] ?? ''])));
    }
    out.push({ headers, rows, headerLine: i });
    i = j;
  }
  return out;
}
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
const sectionOf = (text: string, line: number) => {
  const before = text.split('\n').slice(0, line);
  for (let i = before.length - 1; i >= 0; i--) if (/^#{1,6}\s/.test(before[i])) return before[i];
  return '';
};

export const filenameSchema: Engine = (t, root, files) => {
  const re = new RegExp(t.pattern);
  const excluded = new Set(expand(files, t.exclude, []));
  const findings: Finding[] = [];
  let examined = 0;
  for (const rel of expand(files, t.scan)) {
    if (excluded.has(rel)) continue;
    examined++;
    const base = rel.split('/').pop()!;
    if (!re.test(base)) findings.push({ file: rel, message: 'filename does not say what closed and what came next' });
  }
  return { findings, examined };
};

/** Skills naming their neighbours — only past the threshold where it matters. */
export const crossReference: Engine = (t, root, files) => {
  const skills = expand(files, t.scan);
  if (skills.length < (t.min_skills ?? 6)) return { findings: [], examined: skills.length };
  const names = skills.map((s) => s.split('/').slice(-2)[0]);
  const findings: Finding[] = [];
  for (const rel of skills) {
    const text = read(root, rel);
    if (exempted(text, t.exempt_marker)) continue;
    const desc = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const self = rel.split('/').slice(-2)[0];
    if (!names.some((n) => n !== self && desc.includes(n))) {
      findings.push({ file: rel, message: `names no neighbouring skill (${skills.length} in this repo)` });
    }
  }
  return { findings, examined: skills.length };
};

/** A merged branch cannot still sit at a pre-review status. One-directional. */
/**
 * Did this branch actually land work, or is it a label pointing at a commit the
 * base already had?
 *
 * `git branch --merged` answers "is the tip an ancestor", which is true of a
 * branch cut five seconds ago and never committed to. F-001: reproduced
 * 2026-08-15 on WI-001 and hit three more times on 2026-08-16 — every item
 * worked through `/work-item` trips it in the window between `git switch -c`
 * and the first commit. A gate that cries wolf on the happy path is one people
 * learn to ignore, which is the failure it exists to prevent.
 *
 * The obvious fix — "has commits ahead of base" — is wrong, and measuring it
 * proved so: **after any merge the branch is zero commits ahead**, so the gate
 * would never fire again. That silently deletes the check while looking like a
 * fix, which is worse than the false positive.
 *
 * What actually distinguishes them is the merge commit. This repo merges
 * `--no-ff` (backlog README §4), so a branch that landed work leaves a commit in
 * the base whose *second* parent is that branch's tip. A branch that landed
 * nothing never appears as anyone's second parent.
 *
 * **Known gap, stated rather than hidden:** a fast-forward merge that keeps the
 * branch produces no merge commit and no second parent, so this reads it as
 * having landed nothing and stays quiet. That is a false negative on a workflow
 * this repo does not use — it deletes branches on merge — and it is the
 * direction to be wrong in, because the alternative is the daily false positive.
 */
/**
 * `git` as an argv array, never a shell string.
 *
 * `--format=%(refname:short)` is a **bash syntax error** — unquoted parentheses —
 * so `backlog-merged-status` threw on every Linux and macOS repo, hit its catch,
 * and reported "cannot read git branches; status not reconciled" as a finding.
 * The gate ships in four of five profiles and had never once worked off Windows,
 * where `execSync` goes through cmd.exe and parentheses are ordinary characters.
 * Found by the CI matrix on its first run (F-033).
 *
 * Branch names come out of work-item frontmatter, so this is also the difference
 * between reading a field and passing it to a shell.
 */
const gitArgs = (root: string, args: string[]) =>
  execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim();

export const parseGitPathList = (output: string): string[] =>
  output.split('\0').filter(Boolean);

const gitPaths = (root: string, args: string[]) =>
  parseGitPathList(execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString());

const gitRefExists = (root: string, ref: string): boolean => {
  try {
    gitArgs(root, ['show-ref', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
};

export type IntegrationRefResolution =
  | { ref: string; finding?: never }
  | { ref?: never; finding: string };

/**
 * Resolve a configured branch name without Git's short-name DWIM rules.
 *
 * CI checkouts commonly have `origin/main` but no local `main`. Conversely, a
 * developer checkout can carry both, temporarily at different commits. The
 * precedence here is deliberate and stable as more remotes appear: local,
 * exact `origin`, then a sole matching remote. More than one non-origin match
 * is unknown, not permission to choose whichever ref Git happens to prefer.
 */
export function resolveIntegrationRef(root: string, branch: string): IntegrationRefResolution {
  const local = `refs/heads/${branch}`;
  if (gitRefExists(root, local)) return { ref: local };

  const origin = `refs/remotes/origin/${branch}`;
  if (gitRefExists(root, origin)) return { ref: origin };

  const remotes = gitArgs(root, ['remote'])
    .split('\n')
    .map((remote) => remote.trim())
    .filter((remote) => remote && remote !== 'origin');
  const matches = remotes
    .map((remote) => `refs/remotes/${remote}/${branch}`)
    .filter((ref) => gitRefExists(root, ref))
    .sort();

  if (matches.length === 1) return { ref: matches[0] };
  if (matches.length > 1) {
    return {
      finding: `integration branch '${branch}' is ambiguous across ${matches.join(', ')}`,
    };
  }
  return {
    finding: `integration branch '${branch}' has no local or remote-tracking ref`,
  };
}

const matchesAny = (rel: string, patterns: string[] | undefined) =>
  (patterns ?? []).some((pattern) => matchAny([rel], pattern).length > 0);

const patternList = (value: unknown, allowEmpty = false): value is string[] =>
  Array.isArray(value) && (allowEmpty || value.length > 0) &&
  value.every((pattern) => typeof pattern === 'string' && pattern.trim().length > 0);

type ExemptionWrapper = { kind: 'plain' | 'line' | 'block' | 'html' | 'quote'; close?: string };

function wrapperCloseAt(reason: string, wrapper: ExemptionWrapper): number {
  if (!wrapper.close) return -1;
  if (wrapper.kind !== 'quote') return reason.indexOf(wrapper.close);
  for (let index = 0; index < reason.length; index++) {
    if (reason[index] === '\\') {
      index++;
    } else if (reason[index] === wrapper.close) {
      return index;
    }
  }
  return -1;
}

/**
 * Extract substantive same-line reasons while retaining wrapper state across
 * the whole document. A marker on the second line of a block, HTML comment or
 * quoted string must still stop at that wrapper's close token; otherwise an
 * adjacent code-only edit would be mistaken for a new reason.
 */
function exemptionEvidence(text: string, marker: string): string[] {
  const evidence: string[] = [];
  let wrapper: ExemptionWrapper = { kind: 'plain' };

  for (let index = 0; index < text.length; index++) {
    if (text.startsWith(marker, index)) {
      const reasonAt = index + marker.length;
      const cr = text.indexOf('\r', reasonAt);
      const lf = text.indexOf('\n', reasonAt);
      const lineEnd = cr < 0 ? (lf < 0 ? text.length : lf) :
        (lf < 0 ? cr : Math.min(cr, lf));
      const rawTail = text.slice(reasonAt, lineEnd);
      const leading = rawTail.match(/^[ \t]*/)?.[0].length ?? 0;
      if (/[\p{L}\p{N}]/u.test(rawTail[leading] ?? '')) {
        let reason = rawTail.slice(leading);
        const closeAt = wrapperCloseAt(reason, wrapper);
        if (closeAt >= 0) reason = reason.slice(0, closeAt);
        reason = reason.trimEnd();
        if (reason) evidence.push(reason);
      }
    }

    if (wrapper.kind === 'line') {
      if (text[index] === '\r' || text[index] === '\n') wrapper = { kind: 'plain' };
      continue;
    }
    if (wrapper.kind === 'block') {
      if (text.startsWith('*/', index)) {
        wrapper = { kind: 'plain' };
        index++;
      }
      continue;
    }
    if (wrapper.kind === 'html') {
      if (text.startsWith('-->', index)) {
        wrapper = { kind: 'plain' };
        index += 2;
      }
      continue;
    }
    if (wrapper.kind === 'quote') {
      if (text[index] === '\\') {
        index++;
      } else if (text[index] === wrapper.close) {
        wrapper = { kind: 'plain' };
      }
      continue;
    }

    if (text.startsWith('//', index)) {
      wrapper = { kind: 'line' };
      index++;
    } else if (text.startsWith('/*', index)) {
      wrapper = { kind: 'block', close: '*/' };
      index++;
    } else if (text.startsWith('<!--', index)) {
      wrapper = { kind: 'html', close: '-->' };
      index += 3;
    } else if (text[index] === '"' || text[index] === "'" || text[index] === '`') {
      wrapper = { kind: 'quote', close: text[index] };
    }
  }
  return evidence;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

type GitTreeEntry = { mode: string; type: string; oid: string };

function gitTreeEntry(root: string, treeish: string, rel: string): GitTreeEntry | undefined {
  const output = execFileSync(
    'git',
    ['--literal-pathspecs', 'ls-tree', '-z', treeish, '--', rel],
    { cwd: root, stdio: 'pipe' },
  );
  if (!output.length) return undefined;
  const records = output.toString('utf8').split('\0').filter(Boolean);
  if (records.length !== 1) throw new Error(`unexpected tree entry count for ${rel}`);
  const match = records[0].match(/^([0-7]{6}) ([a-z]+) ([0-9a-f]+)\t/);
  if (!match) throw new Error(`cannot parse tree entry for ${rel}`);
  return { mode: match[1], type: match[2], oid: match[3] };
}

function candidateGitModesAreRegular(root: string, rel: string): boolean {
  const output = execFileSync(
    'git',
    ['--literal-pathspecs', 'ls-files', '--stage', '-z', '--', rel],
    { cwd: root, stdio: 'pipe' },
  );
  const entries = output.toString('utf8').split('\0').filter(Boolean).map((record) => {
    const match = record.match(/^([0-7]{6}) [0-9a-f]+ ([0-3])\t/);
    if (!match) throw new Error(`cannot parse index entry for ${rel}`);
    return { mode: match[1], stage: match[2] };
  });

  // The index is the current proposed Git object when it has an entry. An
  // absent entry is an untracked path whose canonical filesystem leaf was
  // already proven regular above. HEAD is deliberately irrelevant here: its
  // historical mode must not veto a staged conversion to an ordinary blob.
  return entries.length === 0 ||
    (entries.length === 1 && entries[0].stage === '0' &&
      ['100644', '100755'].includes(entries[0].mode));
}

function candidateExemptionText(root: string, rel: string): string | undefined {
  let resolved;
  try {
    resolved = resolveEmittedPath(root, 'release exemption evidence', rel);
    if (resolved.leafAlias || !lstatSync(resolved.absolute).isFile()) return undefined;
  } catch {
    return undefined;
  }
  if (!candidateGitModesAreRegular(root, rel)) return undefined;

  const attributes = execFileSync(
    'git',
    ['check-attr', '-z', 'diff', 'text', 'binary', '--', rel],
    { cwd: root, stdio: 'pipe' },
  ).toString().split('\0');
  for (let index = 0; index + 2 < attributes.length; index += 3) {
    const attribute = attributes[index + 1];
    const value = attributes[index + 2];
    if ((attribute === 'diff' && value === 'unset') || (attribute === 'binary' && value === 'set')) {
      return undefined;
    }
  }

  try {
    const bytes = readFileSync(resolved.absolute);
    if (bytes.includes(0)) return undefined;
    return utf8.decode(bytes);
  } catch {
    return undefined;
  }
}

function inheritedExemptionEvidence(root: string, mergeBase: string, marker: string): Set<string> {
  let paths = Buffer.alloc(0);
  try {
    paths = execFileSync(
      'git',
      ['grep', '-I', '-l', '-z', '-F', '-e', marker, mergeBase, '--'],
      { cwd: root, stdio: 'pipe' },
    );
  } catch (error: any) {
    if (error?.status !== 1) throw error;
    paths = Buffer.isBuffer(error?.stdout) ? error.stdout : Buffer.from(error?.stdout ?? '');
  }

  const prefix = `${mergeBase}:`;
  const inherited = new Set<string>();
  for (const named of utf8.decode(paths).split('\0').filter(Boolean)) {
    if (!named.startsWith(prefix)) throw new Error('cannot parse historical exemption path');
    const rel = named.slice(prefix.length);
    const entry = gitTreeEntry(root, mergeBase, rel);
    if (!entry || entry.type !== 'blob') throw new Error(`cannot resolve historical exemption blob for ${rel}`);
    const bytes = execFileSync('git', ['cat-file', 'blob', entry.oid], { cwd: root, stdio: 'pipe' });
    if (bytes.includes(0)) throw new Error(`historical exemption blob is not text: ${rel}`);
    for (const reason of exemptionEvidence(utf8.decode(bytes), marker)) inherited.add(reason);
  }
  return inherited;
}

/**
 * Return only exemption evidence introduced by the complete current delta.
 *
 * Current files are read only through a canonical, regular-file, UTF-8 text
 * boundary. The caller's complete changed-path set already spans committed,
 * staged, unstaged and non-ignored untracked work, so staging does not select a
 * different evidence path.
 *
 * A reason must be novel relative to every marker/reason line in the merge-base
 * tree. That conservative rule makes the otherwise unknowable copy-vs-coincidence
 * case deterministic in every Git state: reuse or relocation requires rewording
 * the reason to explain why this branch is safe.
 */
function hasBranchLocalExemption(
  root: string,
  mergeBase: string,
  changed: string[],
  marker: string,
): boolean {
  const inherited = inheritedExemptionEvidence(root, mergeBase, marker);

  return changed.some((rel) => {
    const text = candidateExemptionText(root, rel);
    return text !== undefined && exemptionEvidence(text, marker)
      .some((reason) => !inherited.has(reason));
  });
}

/**
 * Require a changed companion file when a branch changes a configured path.
 *
 * A fragment that merely exists is not evidence for this branch: inherited and
 * deleted fragments must not discharge its release-note obligation. Git state
 * is read as four explicit sets so the verdict is the same before and after a
 * developer stages or commits the work.
 */
export const changeRequiresFile: Engine = (t, root) => {
  if (!patternList(t.require_when_changed) || !patternList(t.requires_one_of)) {
    return {
      findings: [{
        message: "change-requires-file requires non-empty 'require_when_changed' and 'requires_one_of' pattern arrays",
      }],
      examined: 0,
    };
  }
  if (t.ignore_when_only !== undefined && !patternList(t.ignore_when_only, true)) {
    return {
      findings: [{ message: "change-requires-file 'ignore_when_only' must be an array of non-empty patterns" }],
      examined: 0,
    };
  }
  if (t.exempt_marker !== undefined &&
      (typeof t.exempt_marker !== 'string' || !t.exempt_marker.trim())) {
    return {
      findings: [{ message: "change-requires-file 'exempt_marker' must be a non-empty string when configured" }],
      examined: 0,
    };
  }

  const baseName = String(t.base_branch ?? 'main');
  let changed: string[];
  let mergeBase: string;
  let untracked: string[];
  try {
    const resolved = resolveIntegrationRef(root, baseName);
    if (!resolved.ref) {
      return {
        findings: [{ message: `${resolved.finding}; required companion file not evaluated` }],
        examined: 0,
      };
    }
    mergeBase = gitArgs(root, ['merge-base', 'HEAD', resolved.ref]);
    untracked = gitPaths(root, ['ls-files', '--others', '--exclude-standard', '-z']);
    changed = [...new Set([
      ...gitPaths(root, ['diff', '--name-only', '--no-renames', '-z', mergeBase, 'HEAD']),
      ...gitPaths(root, ['diff', '--cached', '--name-only', '--no-renames', '-z']),
      ...gitPaths(root, ['diff', '--name-only', '--no-renames', '-z']),
      ...untracked,
    ])].sort();
  } catch {
    return {
      findings: [{ message: `cannot read git changes against '${baseName}'; required companion file not evaluated` }],
      examined: 0,
    };
  }

  const examined = changed.length;
  const ignore = t.ignore_when_only as string[] | undefined;
  if (ignore?.length && changed.length && changed.every((rel) => matchesAny(rel, ignore))) {
    return { findings: [], examined };
  }

  if (!changed.some((rel) => matchesAny(rel, t.require_when_changed))) {
    return { findings: [], examined };
  }

  const companion = changed.find(
    (rel) => matchesAny(rel, t.requires_one_of) && existsSync(join(root, rel)),
  );
  if (companion) return { findings: [], examined };

  if (t.exempt_marker) {
    try {
      if (hasBranchLocalExemption(root, mergeBase, changed, t.exempt_marker)) {
        return { findings: [], examined };
      }
    } catch {
      return {
        findings: [{ message: `cannot read git exemption provenance against '${baseName}'; required companion file not evaluated` }],
        examined: 0,
      };
    }
  }

  return {
    findings: [{ message: String(t.message ?? 'changed shipping code requires a companion file').trim() }],
    examined,
  };
};

function landedWork(root: string, branch: string, base: string): boolean {
  const git = (...args: string[]) => gitArgs(root, args);
  try {
    const tip = git('rev-parse', branch);
    if (tip === git('rev-parse', base)) return false;
    return git('log', base, '--merges', '--format=%P')
      .split('\n')
      .some((line) => line.trim().split(/\s+/).slice(1).includes(tip));
  } catch {
    // Unreadable is not provably empty. Report, which fails loudly rather than
    // silently — the same rule the runner applies to a missing engine.
    return true;
  }
}

export const gitStatusReconcile: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  let merged: Set<string>;
  let integrationRef: string;
  try {
    const integration = String(t.integration_branch ?? 'main');
    const resolved = resolveIntegrationRef(root, integration);
    if (!resolved.ref) return { findings: [{ message: `${resolved.finding}; status not reconciled` }], examined: 0 };
    integrationRef = resolved.ref;
    merged = new Set(
      gitArgs(root, ['branch', '--merged', integrationRef, '--format=%(refname:short)'])
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    // No git, or no such branch. Not a pass and not a failure — an unknown.
    return { findings: [{ message: 'cannot read git branches; status not reconciled' }], examined: 0 };
  }
  let examined = 0;
  for (const rel of expand(files, ['docs/**/items/**/*.md'])) {
    const text = read(root, rel);
    if (exempted(text, t.exempt_marker)) continue;
    const branch = text.match(new RegExp(`^${t.branch_field ?? 'branch'}:\\s*(\\S+)`, 'm'))?.[1];
    const status = text.match(new RegExp(`^${t.status_field ?? 'status'}:\\s*(\\S+)`, 'm'))?.[1];
    if (!branch || !status) continue;
    examined++;
    if (
      merged.has(branch) &&
      (t.pre_review_statuses ?? []).includes(status) &&
      landedWork(root, branch, integrationRef)
    ) {
      findings.push({ file: rel, message: `branch ${branch} is merged but status is '${status}'` });
    }
  }
  return { findings, examined };
};

/** A number a machine can compute is never typed by a human. */
export const computedClaim: Engine = (t, root, files) => {
  const specs = Array.isArray(t) ? t : [t];
  const findings: Finding[] = [];
  let examined = 0;
  for (const spec of specs) {
    const values = new Map<string, string>();
    let specExamined = 0;
    // Which files share a version is the repo's judgement, not something to infer
    // (F-023). The default sources glob `*/package.json`, which is right for a
    // monorepo released in lockstep and wrong for a sibling that is deliberately
    // versioned on its own — this repo's docs site sat at 0.0.1 beside a 0.2.0
    // package, correctly, and installing the gate would have failed a healthy
    // layout. So a repo states the exceptions rather than the engine guessing
    // them, and `all-agree` keeps needing no opinion about which file is right.
    const excludePatterns = (spec.exclude ?? []).filter((pattern: unknown): pattern is string =>
      typeof pattern === 'string' && pattern.trim().length > 0,
    );
    const excluded = (rel: string) => excludePatterns.some((pattern: string) => matchAny([rel], pattern).length > 0);
    for (const src of spec.sources ?? []) {
      for (const rel of matchAny(files, src.file)) {
        if (excluded(rel)) continue;
        examined++;
        specExamined++;
        const result = readVersionSource(root, rel, src);
        if (!result.ok) {
          findings.push({ file: rel, message: `${spec.id} version source ${result.reason}` });
          continue;
        }
        values.set(rel, result.value);
      }
    }
    if (specExamined === 0) {
      findings.push({
        message: `${spec.id} found no configured version sources; check the source globs and exclusions`,
      });
    }
    const distinct = new Set(values.values());
    if (spec.rule === 'all-agree' && distinct.size > 1) {
      // Name the file beside its value. The message used to list the distinct
      // values and then say "run `{autofix}`" — which pointed at
      // `rungs release sync-version`, a command that does not exist and never
      // has. Telling someone to run a missing command is worse than telling
      // them nothing, so the finding now carries what they actually need: which
      // file says what. The hint is appended only if a real one is declared.
      const where = [...values.entries()].map(([rel, v]) => `${rel}=${v}`).join(', ');
      findings.push({
        message:
          `${spec.id} disagrees across ${values.size} locations: ${where}` +
          (spec.autofix ? ` — run \`${spec.autofix}\`` : '') +
          (excludePatterns.length ? '' : '. If one of these is versioned independently, set `release.version_exclude`.'),
      });
    }
  }
  return { findings, examined };
};
