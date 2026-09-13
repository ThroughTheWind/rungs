import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveEmittedPath } from '../emitted-path.ts';
import { WALK_SKIPPED_DIRECTORIES } from '../glob.ts';

export const LIMITS = Object.freeze({
  files: 50_000,
  hashBytes: 256 * 1024 * 1024,
  sourceBytes: 8 * 1024 * 1024,
  resultBytes: 32 * 1024 * 1024,
  bodyBytes: 16 * 1024,
  outputBytes: 256 * 1024,
});
export type ReadState = 'ok' | 'absent' | 'partial' | 'error' | 'unsupported';
export interface Issue {
  path: string;
  message: string;
}
export interface Section<T> {
  state: ReadState;
  source?: string;
  value?: T;
  issues: Issue[];
}
export const section = <T>(value: T, source?: string): Section<T> => ({ state: 'ok', value, source, issues: [] });
export const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
export const problem = <T>(source: string, error: unknown, state: ReadState = 'error'): Section<T> => ({
  state,
  source,
  issues: [{ path: source, message: errorText(error) }],
});

/** Read a regular contained file, never a leaf alias, device, FIFO or directory. */
export function sourceText(root: string, path: string, maxBytes = LIMITS.sourceBytes) {
  const resolved = resolveEmittedPath(root, 'ui read', path);
  if (resolved.leafAlias) throw new Error(`Refusing a source alias: ${path}`);
  let fd: number;
  try {
    if (!lstatSync(resolved.absolute).isFile()) throw new Error(`Not a regular source file: ${path}`);
    // NONBLOCK also prevents a file replaced with a FIFO between lstat/open from hanging.
    fd = openSync(resolved.absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch (error: any) {
    if (error.code === 'ENOENT') return { state: 'absent' as const, path, text: '', truncated: false, bytes: 0 };
    throw error;
  }
  try {
    const info = fstatSync(fd);
    if (!info.isFile()) throw new Error(`Not a regular source file: ${path}`);
    const again = resolveEmittedPath(root, 'ui read', path);
    if (again.leafAlias || again.absolute !== resolved.absolute)
      throw new Error(`Source changed while opening: ${path}`);
    const current = statSync(again.absolute);
    if (current.dev !== info.dev || current.ino !== info.ino) throw new Error(`Source replaced while opening: ${path}`);
    const bytes = Buffer.alloc(Math.min(info.size, maxBytes));
    let used = 0;
    while (used < bytes.length) {
      const n = readSync(fd, bytes, used, bytes.length - used, used);
      if (!n) break;
      used += n;
    }
    const after = fstatSync(fd);
    const truncated = info.size > maxBytes;
    const changed = after.size !== info.size || after.mtimeMs !== info.mtimeMs || used < bytes.length;
    return {
      state: truncated || changed ? ('partial' as const) : ('ok' as const),
      path,
      text: bytes.subarray(0, used).toString('utf8'),
      truncated,
      bytes: info.size,
    };
  } finally {
    closeSync(fd);
  }
}

export function readSection<T>(root: string, path: string, parse: (text: string) => T): Section<T> {
  try {
    const read = sourceText(root, path);
    if (read.state === 'absent') return { state: 'absent', source: path, issues: [] };
    if (read.state !== 'ok')
      return problem(path, 'Source exceeds the read limit or changed during the read.', 'partial');
    return section(parse(read.text), path);
  } catch (error) {
    return problem(path, error);
  }
}

/** Same excluded directory set as the CLI walker, with explicit caps/read errors for the UI. */
export function scanTree(root: string) {
  const files: string[] = [],
    aliases: { path: string; target: string }[] = [],
    issues: Issue[] = [];
  const stack = [''];
  let examined = 0;
  while (stack.length) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch (error) {
      issues.push({ path: dir || '.', message: errorText(error) });
      continue;
    }
    for (const entry of entries) {
      if (WALK_SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (++examined > LIMITS.files) {
        issues.push({ path: '.', message: `Scan limit: ${LIMITS.files} entries. Narrow the selected repository.` });
        return { files: files.sort(), aliases, issues };
      }
      if (entry.isSymbolicLink()) {
        try {
          aliases.push({ path, target: readlinkSync(join(root, path)) });
        } catch (error) {
          issues.push({ path, message: errorText(error) });
        }
      } else if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile()) files.push(path);
      else issues.push({ path, message: 'Non-regular input was not scanned.' });
    }
  }
  return { files: files.sort(), aliases: aliases.sort((a, b) => a.path.localeCompare(b.path)), issues };
}

/** Read-only Git observations. Disable repository-configured fsmonitor execution and index writes. */
export function gitRead(root: string, args: string[]): string {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', root, ...args], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: LIMITS.sourceBytes,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
export function gitIdentity(root: string) {
  try {
    const top = gitRead(root, ['rev-parse', '--show-toplevel']).trim();
    let head: string | null = null,
      branch: string | null = null;
    try {
      head = gitRead(root, ['rev-parse', '--verify', 'HEAD']).trim();
    } catch {
      /* unborn */
    }
    try {
      branch = gitRead(root, ['symbolic-ref', '--short', '-q', 'HEAD']).trim();
    } catch {
      /* detached */
    }
    const status = gitRead(root, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']);
    const refs = gitRead(root, ['for-each-ref', '--sort=refname', '--format=%(refname)=%(objectname)', 'refs/heads/']);
    return { state: 'ok' as const, top, head, branch, refs, dirty: status.length > 0 };
  } catch (error) {
    return { state: 'unavailable' as const, reason: errorText(error) };
  }
}

/** Content correspondence for the scan, not a guarantee about a command's external/ignored inputs. */
export function fingerprint(root: string, moduleRoot: string) {
  const hash = createHash('sha256');
  const issues: Issue[] = [];
  let bytes = 0;
  const files: string[] = [];
  hash.update(realpathSync.native(root));
  for (const [prefix, base] of [
    ['repo', root],
    ['modules', moduleRoot],
  ]) {
    const scan = scanTree(base);
    issues.push(...scan.issues.map((i) => ({ ...i, path: prefix === 'repo' ? i.path : `@modules/${i.path}` })));
    if (prefix === 'repo') files.push(...scan.files);
    for (const alias of scan.aliases) hash.update(`${prefix}:alias:${alias.path}:${alias.target}\0`);
    for (const path of scan.files) {
      if (prefix === 'repo' && path === '.ai/.gate-ledger.jsonl') continue;
      hash.update(`${prefix}:${path}\0`);
      let fd: number | undefined;
      try {
        const target = resolveEmittedPath(base, 'ui fingerprint', path);
        if (target.leafAlias) throw new Error('Source became an alias while scanning.');
        if (!lstatSync(target.absolute).isFile()) throw new Error('Source is not a regular file.');
        fd = openSync(target.absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
        const info = fstatSync(fd);
        if (!info.isFile()) throw new Error('Source is not a regular file.');
        if (bytes + info.size > LIMITS.hashBytes) throw new Error(`Content scan exceeds ${LIMITS.hashBytes} bytes.`);
        const buffer = Buffer.alloc(64 * 1024);
        let n: number;
        while ((n = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
          bytes += n;
          if (bytes > LIMITS.hashBytes) throw new Error('Content grew beyond the scan limit.');
          hash.update(buffer.subarray(0, n));
        }
        const after = fstatSync(fd);
        if (info.size !== after.size || info.mtimeMs !== after.mtimeMs)
          throw new Error('Source changed while hashing.');
      } catch (error) {
        issues.push({ path: prefix === 'repo' ? path : `@modules/${path}`, message: errorText(error) });
      } finally {
        if (fd !== undefined) closeSync(fd);
      }
      hash.update('\0');
      if (bytes > LIMITS.hashBytes) break;
    }
  }
  const git = gitIdentity(root);
  hash.update(JSON.stringify(git));
  return { generation: hash.digest('hex'), complete: issues.length === 0, issues, files, git, bytes };
}

export interface SourceLink {
  label: string;
  target: string;
  path?: string;
  line?: number;
  exists?: boolean;
}
export function sourceLinks(root: string, from: string, text: string): SourceLink[] {
  const links: SourceLink[] = [];
  for (const match of text.matchAll(/(?<!!)\[([^\]\n]*)\]\((<[^>\n]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[2].replace(/^<|>$/g, '');
    const link: SourceLink = { label: match[1], target };
    if (!/^[a-z][a-z\d+.-]*:|^\/\/|^#|^\//i.test(target)) {
      try {
        const decoded = decodeURIComponent(target.split('#')[0]);
        const at = decoded.match(/:(\d+)$/);
        const path = posix.normalize(
          posix.join(posix.dirname(from), (at ? decoded.slice(0, at.index) : decoded).replaceAll('\\', '/')),
        );
        const resolved = resolveEmittedPath(root, 'ui link', path);
        if (!resolved.leafAlias) {
          link.path = path;
          link.line = at ? Number(at[1]) : undefined;
          try {
            link.exists = statSync(resolved.absolute).isFile();
          } catch {
            link.exists = false;
          }
        }
      } catch {
        /* External, unsafe or unresolvable links stay inert text. */
      }
    }
    links.push(link);
  }
  return links;
}

function withoutComment(value: string): string {
  let quote = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote === '"' && c === '\\') {
      i++;
      continue;
    }
    if (quote === "'" && c === "'" && value[i + 1] === "'") {
      i++;
      continue;
    }
    if (c === quote) quote = '';
    else if (!quote && (c === '"' || c === "'")) quote = c;
    else if (!quote && c === '#' && (i === 0 || /\s/.test(value[i - 1]))) return value.slice(0, i).trim();
  }
  if (quote) throw new Error('Unterminated quoted scalar.');
  return value.trim();
}
function scalar(value: string): string {
  const clean = withoutComment(value);
  if (clean.startsWith('"')) {
    const parsed = JSON.parse(clean);
    if (typeof parsed !== 'string') throw new Error('Expected a string scalar.');
    return parsed;
  }
  if (clean.startsWith("'")) {
    if (!clean.endsWith("'")) throw new Error('Unterminated quoted scalar.');
    return clean.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[>|!&*{\[]/.test(clean) || /:\s/.test(clean))
    throw new Error('Unsupported nested, tagged or multiline frontmatter value.');
  return clean;
}
function flatArray(text: string): string[] {
  const clean = withoutComment(text);
  if (!clean.endsWith(']')) throw new Error('Unterminated frontmatter array.');
  const body = clean.slice(1, -1);
  if (!body.trim()) return [];
  const values: string[] = [];
  let quote = '',
    start = 0;
  for (let i = 0; i <= body.length; i++) {
    const c = body[i];
    if (quote === '"' && c === '\\') {
      i++;
      continue;
    }
    if (quote === "'" && c === "'" && body[i + 1] === "'") {
      i++;
      continue;
    }
    if (c === quote) quote = '';
    else if (!quote && (c === '"' || c === "'")) quote = c;
    if ((!quote && c === ',') || i === body.length) {
      const part = body.slice(start, i).trim();
      if (part) values.push(scalar(part));
      else if (i !== body.length) throw new Error('Empty frontmatter array entry.');
      start = i + 1;
    }
  }
  if (quote) throw new Error('Unterminated array quote.');
  return values;
}

/** Deliberate frontmatter subset. Unsupported input remains a source record, never disappears. */
export function frontmatter(text: string) {
  const fields: Record<string, string | string[]> = Object.create(null);
  const issues: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  if (lines[0]?.trim() !== '---') return { fields, issues: ['No supported frontmatter block.'], body: text };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end < 0) return { fields, issues: ['Unterminated frontmatter block.'], body: text };
  let last = '';
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    try {
      const sequence = /^\s+-\s+(.*)$/.exec(line);
      if (sequence && last && (fields[last] === '' || Array.isArray(fields[last]))) {
        if (fields[last] === '') fields[last] = [];
        (fields[last] as string[]).push(scalar(sequence[1]));
        continue;
      }
      const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!match || match[1] === '__proto__' || match[1] === 'constructor' || match[1] === 'prototype') {
        throw new Error('Unsupported frontmatter key or nesting.');
      }
      last = match[1];
      if (Object.hasOwn(fields, last)) throw new Error(`Duplicate key '${last}'.`);
      fields[last] = match[2].trimStart().startsWith('[') ? flatArray(match[2]) : scalar(match[2]);
    } catch (error) {
      issues.push(`Line ${i + 1}: ${errorText(error)}`);
      last = '';
    }
  }
  return { fields, issues, body: lines.slice(end + 1).join('\n') };
}

export function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));
}
export function markdownRows(text: string) {
  const lines = text.split(/\r?\n/);
  const rows: { line: number; section: string; cells: Record<string, string> }[] = [];
  let heading = '',
    headers: string[] = [],
    fence = false,
    tables = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    if (/^#{1,6}\s/.test(line)) {
      heading = line.replace(/^#+\s*/, '');
      headers = [];
    }
    if (!line.trimStart().startsWith('|')) {
      headers = [];
      continue;
    }
    if (lines[i + 1] && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      headers = tableCells(line);
      tables++;
      i++;
      continue;
    }
    if (!headers.length) continue;
    const cells = tableCells(line);
    if (cells.every((cell) => !cell || /^[-—–]+$/.test(cell))) continue;
    if (cells.length !== headers.length)
      throw new Error(
        `Unsupported table row at line ${i + 1}: cell count does not match the header. Raw source remains available.`,
      );
    rows.push({
      line: i + 1,
      section: heading,
      cells: Object.fromEntries(headers.map((header, at) => [header, cells[at] ?? ''])),
    });
  }
  if (!tables)
    throw new Error(
      'No supported Markdown table found. This register is not an empty findings list; inspect its raw source.',
    );
  return rows;
}

/** Hand-off text is inert, but still quote correctly if the operator chooses to paste it. */
export function commandHandoff(root: string, args: string[], launcher = false) {
  const quote = (value: string) =>
    process.platform === 'win32' ? `'${value.replaceAll("'", "''")}'` : `'${value.replaceAll("'", "'\\''")}'`;
  const prefix = process.platform === 'win32' ? `Set-Location -LiteralPath ${quote(root)}` : `cd -- ${quote(root)}`;
  const cli = launcher
    ? '.ai/rungs.mjs'
    : fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? '../cli.ts' : './cli.js', import.meta.url));
  const invoke = `${process.platform === 'win32' ? '& ' : ''}${quote(process.execPath)} ${quote(cli)}`;
  return {
    shell: process.platform === 'win32' ? 'PowerShell 7' : 'POSIX shell',
    command: `${prefix} &&\n${invoke} ${args.map(quote).join(' ')}`,
  };
}
