import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the engines find their module set and gate tables, and how an ejected
 * gate is spelled in the registry.
 *
 * Kept dependency-free so the ejected runner can set the roots before any
 * engine runs, and so `gate-meta` can recognise a converted gate without
 * importing the lifecycle. Before WI-077 the module root was a constant derived
 * from `import.meta.url` in three files; inside a bundle copied to `.rungs/`
 * that constant pointed at the consumer's own `modules/` directory, which does
 * not exist — so every gate that read the module set passed on an empty one.
 */
const DEFAULT_MODULES = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules');

export interface EjectedRoots {
  /** Raw `module.toml` and `gates/*.toml` copies the meta-gates read. */
  modulesRoot: string;
  /** Parameter-substituted JSON tables the frozen engines execute. */
  frozenTables: string;
  /** The Rungs version that produced the bundle; `{{rungs.version}}` after ejection. */
  rungsVersion: string;
}

let ejected: EjectedRoots | null = null;
let modulesOverride: string | null = null;

/** Point the engines at materialized metadata. `null` restores the package's own module set. */
export function setEjectedRoots(roots: EjectedRoots | null): void {
  ejected = roots;
}

/**
 * Point only the module set somewhere else, without freezing tables. The
 * self-test runner uses it so the meta-gate's own fixtures can execute against a
 * module directory the fixture built; a test resets it in `finally`.
 */
export function setModulesRootOverride(dir: string | null): void {
  modulesOverride = dir;
}

export function modulesRoot(): string {
  return modulesOverride ?? ejected?.modulesRoot ?? DEFAULT_MODULES;
}

export function frozenTablesDir(): string | null {
  return ejected?.frozenTables ?? null;
}

export function ejectedRungsVersion(): string | null {
  return ejected?.rungsVersion ?? null;
}

/** The runner an ejected repository commits, relative to its root. */
export const EJECTED_RUNNER = '.rungs/run-gate.mjs';

/**
 * The one command form `eject` writes for a converted declared gate. Only this
 * exact spelling is recognised as frozen: an arbitrary repository command that
 * happens to carry `engine` metadata stays a repository command and runs as
 * one, so a consumer cannot be made to run an engine by editing a string.
 */
export function ejectedCommandFor(gateId: string): string {
  return `node ${EJECTED_RUNNER} ${gateId}`;
}

export function isEjectedCommand(gateId: string, command: string | undefined): boolean {
  return typeof command === 'string' && command.trim() === ejectedCommandFor(gateId);
}

/** The frozen JSON table for a registry `table` reference such as `gates/structural.toml`. */
export function frozenTableName(tableRef: string): string {
  const [mod, file] = tableRef.split('/');
  return `${mod}-${file.replace(/\.toml$/, '.json')}`;
}
