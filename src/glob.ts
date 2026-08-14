import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * A small glob matcher: `**`, `*`, `?`, and `{a,b}` brace groups.
 *
 * Written rather than depended on so the semantics are ours. The only rule that
 * matters is the one ADR-0004 states: when a pattern is ambiguous it must fail
 * to match. A false negative creates something visible in git; a false positive
 * makes the CLI believe wrong things about a repo and act on them later.
 */
export function globToRegExp(pattern: string): RegExp {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**/` consumes any number of segments, including none.
        if (pattern[i + 2] === '/') {
          out += '(?:[^/]+/)*';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if (c === '{') {
      const end = pattern.indexOf('}', i);
      if (end === -1) {
        out += '\\{';
      } else {
        const alts = pattern.slice(i + 1, end).split(',');
        out += `(?:${alts.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
        i = end;
      }
    } else if ('.+^$()|[]\\'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`^${out}$`);
}

const SKIP = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'bin',
  'obj',
  '.vs',
  '.angular',
  '.next',
  'coverage',
  'TestResults',
  'BenchmarkDotNet.Artifacts',
]);

/** Walk a repo once; callers match the resulting relative paths. */
export function walk(root: string, maxEntries = 200_000): string[] {
  const files: string[] = [];
  const stack = [root];
  while (stack.length && files.length < maxEntries) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        files.push(relative(root, full).split(sep).join('/'));
      }
    }
  }
  return files;
}

export function matchAny(files: string[], pattern: string): string[] {
  const re = globToRegExp(pattern);
  return files.filter((f) => re.test(f));
}

export function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
