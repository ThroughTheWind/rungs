import { lstatSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';

/**
 * A module path is repository-relative data, not a host-native path.  Treating
 * both separators as structural is what makes the same parameter safe when a
 * record written on Windows is later upgraded on POSIX (or the reverse).
 */
export class UnsafeEmittedPathError extends Error {
  readonly moduleName: string;
  readonly target: string;
  readonly reason: string;

  constructor(
    moduleName: string,
    target: string,
    reason: string,
  ) {
    super(`module '${moduleName}' emitted unsafe target ${JSON.stringify(target)}: ${reason}`);
    this.name = 'UnsafeEmittedPathError';
    this.moduleName = moduleName;
    this.target = target;
    this.reason = reason;
  }
}

export interface ResolvedEmittedPath {
  /** Portable, slash-separated form used in actions and install records. */
  target: string;
  /** Canonical absolute destination proven to be below the canonical repo root. */
  absolute: string;
  /** The final path entry itself is an alias; writes must not follow it. */
  leafAlias: boolean;
}

export interface EmittedPathCandidate {
  moduleName: string;
  target: string;
  /** Managed block/shared-registry destinations may intentionally coincide. */
  shared?: boolean;
  /** This phase replaces or merges an existing file rather than keeping it. */
  writeExisting?: boolean;
}

const missingEntry = (error: unknown) =>
  error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR');

/**
 * Realpath the deepest existing ancestor, then append the still-missing suffix.
 * `resolve()` alone cannot see an in-repository symlink or junction that points
 * out of the repository.  A dangling alias fails closed because realpath cannot
 * establish where a subsequent write would land.
 */
function canonicalWithMissing(path: string, moduleName: string, target: string): string {
  let cursor = resolve(path);
  const suffix: string[] = [];

  for (;;) {
    try {
      lstatSync(cursor);
    } catch (error) {
      if (!missingEntry(error)) {
        throw new UnsafeEmittedPathError(moduleName, target, 'its existing ancestor cannot be inspected');
      }
      const parent = dirname(cursor);
      if (parent === cursor) {
        throw new UnsafeEmittedPathError(moduleName, target, 'no canonical existing ancestor can be established');
      }
      suffix.unshift(basename(cursor));
      cursor = parent;
      continue;
    }

    let canonical: string;
    try {
      canonical = realpathSync.native(cursor);
    } catch {
      throw new UnsafeEmittedPathError(moduleName, target, 'its existing ancestor cannot be resolved canonically');
    }
    if (suffix.length) {
      try {
        if (!statSync(canonical).isDirectory()) {
          throw new UnsafeEmittedPathError(moduleName, target, 'its deepest existing ancestor is not a directory');
        }
      } catch (error) {
        if (error instanceof UnsafeEmittedPathError) throw error;
        throw new UnsafeEmittedPathError(moduleName, target, 'its existing ancestor cannot be inspected');
      }
    }
    return resolve(canonical, ...suffix);
  }
}

/**
 * Resolve one module-emitted destination and prove it remains in `repoRoot`.
 * Unsafe syntax is refused before host path resolution so `C:relative`, `\\rooted`
 * and mixed-separator traversal cannot change meaning between operating systems.
 */
export function resolveEmittedPath(repoRoot: string, moduleName: string, target: string): ResolvedEmittedPath {
  if (!target || target.includes('\0')) {
    throw new UnsafeEmittedPathError(moduleName, target, 'a non-empty portable relative file path is required');
  }

  const portable = target.replace(/\\/g, '/');
  if (portable.startsWith('/') || win32.isAbsolute(target) || /^[A-Za-z]:/.test(portable)) {
    throw new UnsafeEmittedPathError(moduleName, target, 'absolute, rooted, and drive-relative paths are not allowed');
  }

  const segments = portable.split('/');
  if (segments.includes('..')) {
    throw new UnsafeEmittedPathError(moduleName, target, "parent traversal ('..') is not allowed");
  }
  if (segments.some((segment) => segment === '' || segment === '.')) {
    throw new UnsafeEmittedPathError(moduleName, target, "empty and current-directory ('.') path segments are not allowed");
  }
  if (segments.some((segment) => /[\u0000-\u001f<>:"|?*]/.test(segment) || /[ .]$/.test(segment))) {
    throw new UnsafeEmittedPathError(
      moduleName,
      target,
      'it contains a character or trailing suffix that is not a portable filename',
    );
  }
  const windowsDevice = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (segments.some((segment) => windowsDevice.test(segment))) {
    throw new UnsafeEmittedPathError(moduleName, target, 'Windows device-name path segments are not allowed');
  }

  const canonicalRoot = canonicalWithMissing(repoRoot, moduleName, target);
  const lexicalDestination = resolve(repoRoot, ...segments);
  const canonicalDestination = canonicalWithMissing(lexicalDestination, moduleName, target);
  const fromRoot = relative(canonicalRoot, canonicalDestination);

  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new UnsafeEmittedPathError(moduleName, target, 'it resolves outside the canonical consumer repository');
  }

  let leafAlias = false;
  try {
    leafAlias = lstatSync(lexicalDestination).isSymbolicLink();
  } catch (error) {
    if (!missingEntry(error)) {
      throw new UnsafeEmittedPathError(moduleName, target, 'its destination cannot be inspected');
    }
  }

  return { target: portable, absolute: canonicalDestination, leafAlias };
}

/** Resolve a complete operation and reject two exclusive names for one destination. */
export function preflightEmittedPaths(
  repoRoot: string,
  candidates: EmittedPathCandidate[],
): ResolvedEmittedPath[] {
  const resolved = candidates.map((candidate) => {
    const destination = resolveEmittedPath(repoRoot, candidate.moduleName, candidate.target);
    if (candidate.writeExisting) {
      if (destination.leafAlias) {
        throw new UnsafeEmittedPathError(
          candidate.moduleName,
          candidate.target,
          'the destination is a symlink or junction leaf and this operation will not write through it',
        );
      }

      // Every overwrite/merge sink ultimately uses writeFileSync.  Prove an
      // existing leaf is a regular file now, during the complete-operation
      // preflight, so a later directory/FIFO/socket cannot fail after an
      // earlier candidate has already been written.
      try {
        if (!lstatSync(destination.absolute).isFile()) {
          throw new UnsafeEmittedPathError(
            candidate.moduleName,
            candidate.target,
            'the existing destination is not a regular file',
          );
        }
      } catch (error) {
        if (error instanceof UnsafeEmittedPathError) throw error;
        if (!missingEntry(error)) {
          throw new UnsafeEmittedPathError(
            candidate.moduleName,
            candidate.target,
            'the destination cannot be inspected before writing',
          );
        }
      }
    }
    return destination;
  });
  const seen = new Map<string, { candidate: EmittedPathCandidate; resolved: ResolvedEmittedPath }>();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const destination = resolved[i];
    // A module plan is portable: names that coexist only on a case-sensitive
    // checkout are still one destination when that record reaches Windows or a
    // default case-insensitive macOS volume.
    const key = destination.absolute.normalize('NFC').toLowerCase();
    const prior = seen.get(key);
    if (!prior) {
      const structural = [...seen].find(([priorKey]) =>
        key.startsWith(`${priorKey}${sep}`) || priorKey.startsWith(`${key}${sep}`),
      );
      if (!structural) {
        seen.set(key, { candidate, resolved: destination });
        continue;
      }
      const [, conflict] = structural;
      throw new UnsafeEmittedPathError(
        candidate.moduleName,
        candidate.target,
        `it has a file/descendant collision with module '${conflict.candidate.moduleName}' target '${conflict.candidate.target}' after canonical resolution`,
      );
    }
    if (candidate.shared && prior.candidate.shared && destination.target === prior.resolved.target) continue;
    throw new UnsafeEmittedPathError(
      candidate.moduleName,
      candidate.target,
      `it collides with module '${prior.candidate.moduleName}' target '${prior.candidate.target}' after canonical resolution`,
    );
  }

  return resolved;
}
