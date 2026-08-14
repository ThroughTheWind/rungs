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
  const targets = t.file ? [t.file] : expand(files, t.scan);
  for (const rel of targets) {
    const text = read(root, rel);
    if (!text) continue;
    for (const table of parseTables(text)) {
      if (t.table && !sectionOf(text, table.headerLine).toLowerCase().includes(String(t.table).toLowerCase())) continue;
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
  return { findings, examined };
};

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
export const gitStatusReconcile: Engine = (t, root, files) => {
  const findings: Finding[] = [];
  let merged: Set<string>;
  try {
    merged = new Set(
      execSync(`git branch --merged ${t.integration_branch ?? 'main'} --format=%(refname:short)`, {
        cwd: root,
        stdio: 'pipe',
      })
        .toString()
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
    if (merged.has(branch) && (t.pre_review_statuses ?? []).includes(status)) {
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
    for (const src of spec.sources ?? []) {
      for (const rel of matchAny(files, src.file)) {
        const text = read(root, rel);
        let v: string | undefined;
        if (src.path && rel.endsWith('.json')) {
          try {
            v = src.path.split('.').reduce((o: any, k: string) => o?.[k], JSON.parse(text));
          } catch {
            /* unparseable is not a disagreement */
          }
        } else if (src.xpath) {
          v = text.match(new RegExp(`<${src.xpath.split('//')[1]}>(.*?)<`))?.[1];
        }
        if (v) {
          examined++;
          values.set(rel, String(v));
        }
      }
    }
    const distinct = new Set(values.values());
    if (spec.rule === 'all-agree' && distinct.size > 1) {
      findings.push({
        message: `${spec.id} disagrees across ${values.size} locations: ${[...distinct].join(', ')} — run \`${spec.autofix}\``,
      });
    }
  }
  return { findings, examined };
};
