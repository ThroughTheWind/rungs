/** Shapes read from a module's `module.toml`. See ADR-0003 for the format. */

export interface ParamSpec {
  description?: string;
  default?: unknown;
  allowed?: unknown[];
  pattern?: string;
  required?: boolean;
  /**
   * Marks a *behavioural* parameter: it changes what the CLI does rather than
   * being substituted into a template, so it never appears as `{{name}}`.
   * Without this the dead-parameter check reports it, and the obvious "fix"
   * deletes the parameter that decides which harnesses exist.
   */
  consumed_by?: string;
}

export interface GateSpec {
  id: string;
  kind: 'declared' | 'command';
  engine?: string;
  table?: string;
  command?: string;
  tier?: string;
  /** A hook is a gate with a lifecycle trigger rather than a runner trigger. */
  trigger?: string;
  matcher?: string;
  why?: string;
}

export interface ParadigmSpec {
  id: string;
  paths?: string[];
  compare?: string;
  note?: string;
}

export interface InferSpec {
  param: string;
  pattern?: string;
  min?: number;
  scope?: string[];
  exclude?: string[];
  paths?: Record<string, string>;
  /**
   * A regex that settles the value outright, ahead of frequency. Frequency
   * alone made `findings` propose the backlog's prefix, because a register
   * cites work items more often than it defines its own ids.
   */
  anchor?: string;
  anchor_name?: string;
  /** Values that share the id shape but are never ids — `UTF-8`, `SHA-256`. */
  exclude_values?: string[];
}

export interface DetectSpec {
  paths?: string[];
  markers?: string[];
  /** Files to scan for markers when path existence is not discriminating. */
  marker_paths?: string[];
  paradigm?: ParadigmSpec[];
  infer?: InferSpec[];
  adopt_as?: { kind: string; paths?: string[]; note?: string }[];
}

export interface Provenance {
  sources: string[];
  patterns: string[];
  incident: string;
}

export interface Manifest {
  name: string;
  version: string;
  rung: number;
  summary: string;
  requires: string[];
  conflicts: string[];
  params: Record<string, ParamSpec>;
  gates: GateSpec[];
  detect: DetectSpec;
  provenance: Provenance;
  threshold?: { metric: string; minimum: number; confirm?: boolean };
  /** Absolute path to the module directory. */
  dir: string;
}

/** One of ADR-0004's six states, for one module in one repo. */
export type DetectState =
  | 'absent'
  | 'ours-current'
  | 'ours-diverged'
  | 'theirs'
  | 'paradigm'
  | 'unknown';

export interface DetectResult {
  module: string;
  state: DetectState;
  /** Detect globs that matched, with a sample of what they hit. */
  matchedPaths: { pattern: string; count: number; sample: string[] }[];
  matchedMarkers: string[];
  paradigm?: { id: string; note?: string; compare?: string; matched: string[] };
  /** Parameters detection *proposes*. Never used to conclude presence. */
  proposals: { param: string; value: string; evidence: string }[];
  /** Set when the repo installed this module: what we wrote, and whether it still says so. */
  ours?: { version: string; current: string[]; stale: string[]; diverged: string[]; missing: string[]; kept: string[] };
  /** Existing artifacts that would adopt as `command` gates or similar. */
  adoptable: { kind: string; count: number; sample: string[]; note?: string }[];
}
