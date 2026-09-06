import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectResult, Manifest } from './types.ts';
import { matchAny, walk } from './glob.ts';
import { contentHash, emittedFiles, ownershipHash, preflightModuleEmissions } from './add.ts';
import { resolveEmittedPath } from './emitted-path.ts';
import type { Params } from './substitute.ts';

const SAMPLE = 3;

/**
 * ADR-0004. Presence is decided by `paths` and `markers` only; `infer` merely
 * *proposes* parameters, and never concludes presence — hexguard-templates has
 * 207 well-formed `FOUND-US-###` matches and no backlog, because those are spec
 * story ids.
 *
 * Signatures are biased toward false negatives throughout: a false negative
 * creates something visible in git, while a false positive makes the CLI
 * believe wrong things about a repo and act on that belief later.
 */
export function detect(mod: Manifest, repoRoot: string, files: string[], installed?: InstalledModule): DetectResult {
  const result: DetectResult = {
    module: mod.name,
    state: 'absent',
    matchedPaths: [],
    matchedMarkers: [],
    proposals: [],
    adoptable: [],
  };

  // A module the repo installed is answered from the record, not from
  // signatures. Signatures exist to recognise somebody *else's* structure;
  // running them over our own would report a healthy install as "theirs" and
  // lose the one thing the record knows and detection cannot — which files we
  // wrote, and whether they still say what we wrote.
  if (installed) {
    result.ours = ownedState(mod, repoRoot, installed);
    result.state = result.ours.diverged.length ? 'ours-diverged' : 'ours-current';
    return result;
  }

  for (const pattern of mod.detect.paths ?? []) {
    const hits = matchAny(files, pattern);
    if (hits.length) {
      result.matchedPaths.push({ pattern, count: hits.length, sample: hits.slice(0, SAMPLE) });
    }
  }

  const markers = mod.detect.markers ?? [];
  if (markers.length) {
    // Only files a marker could plausibly live in, and only ones we already
    // have a reason to read. Scanning a whole repo for a marker string is both
    // slow and a way to match prose that mentions one.
    //
    // `marker_paths` exists for the case where a file's *existence* is not
    // discriminating but its *content* is: nearly every repo has a
    // `.gitattributes`, and only one of the four declares a custom merge
    // driver in it — 21 declarations against 0, 0, 0.
    const scanPatterns = mod.detect.marker_paths ?? result.matchedPaths.map((m) => m.pattern);
    const candidates = new Set(scanPatterns.flatMap((p) => matchAny(files, p)));
    for (const rel of candidates) {
      let text: string;
      try {
        text = readFileSync(join(repoRoot, rel), 'utf8');
      } catch {
        continue;
      }
      for (const marker of markers) {
        if (text.includes(marker) && !result.matchedMarkers.includes(marker)) {
          result.matchedMarkers.push(marker);
        }
      }
    }
  }

  for (const adopt of mod.detect.adopt_as ?? []) {
    const hits = (adopt.paths ?? []).flatMap((p) => matchAny(files, p));
    if (hits.length) {
      result.adoptable.push({ kind: adopt.kind, count: hits.length, sample: hits.slice(0, SAMPLE), note: adopt.note });
    }
  }

  // A paradigm is only consulted when nothing else matched. Checking it
  // unconditionally reported rift-forge's pulled design mirror as *both* an
  // external authority and an in-repo design system, on a theme.ts the pattern
  // was never meant to reach.
  if (result.matchedPaths.length === 0 && result.adoptable.length === 0) {
    for (const para of mod.detect.paradigm ?? []) {
      const matched = (para.paths ?? []).flatMap((p) => matchAny(files, p));
      if (matched.length) {
        result.paradigm = { id: para.id, note: para.note, compare: para.compare, matched: matched.slice(0, SAMPLE) };
        break;
      }
    }
  }

  // State. `ours-current` / `ours-diverged` require a rungs.toml recording a
  // prior install; a repo without one can only be absent, theirs, or paradigm.
  //
  // An `adopt_as` match is ADR-0004 state 4 — "theirs, equivalent": the
  // module's function exists in a shape we can map, even though our own
  // structure is absent. Treating it as absent hid the single highest-value
  // adoption in the catalogue, rift-forge's 82 registered gates.
  if (result.matchedPaths.length > 0 || result.adoptable.length > 0 || result.matchedMarkers.length > 0) {
    result.state = 'theirs';
  } else if (result.paradigm) {
    result.state = 'paradigm';
  } else {
    result.state = 'absent';
  }

  // Proposals run only once presence is established, and are reported as
  // proposals — never applied, never used to decide state.
  if (result.state === 'theirs') {
    result.proposals = infer(mod, repoRoot, files);
  }

  return result;
}

function infer(mod: Manifest, repoRoot: string, files: string[]) {
  const proposals: DetectResult['proposals'] = [];

  for (const rule of mod.detect.infer ?? []) {
    if (rule.paths) {
      // Directory-presence inference (e.g. which harnesses exist).
      const present = Object.entries(rule.paths)
        .filter(([, p]) => files.some((f) => f.startsWith(p.replace(/\/$/, '/'))))
        .map(([key]) => key);
      if (present.length) {
        proposals.push({ param: rule.param, value: present.join(', '), evidence: 'directory present' });
      }
      continue;
    }
    if (!rule.pattern) continue;

    const scope = (rule.scope ?? ['**/*.md']).flatMap((p) => matchAny(files, p));
    const excluded = new Set((rule.exclude ?? []).flatMap((p) => matchAny(files, p)));
    const counts = new Map<string, number>();

    for (const rel of scope) {
      if (excluded.has(rel)) continue;
      let text: string;
      try {
        text = readFileSync(join(repoRoot, rel), 'utf8');
      } catch {
        continue;
      }
      for (const m of text.matchAll(new RegExp(rule.pattern, 'gm'))) {
        const key = m[1];
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    // An anchor wins outright over frequency. Counting raw occurrences made
    // `findings` propose the *backlog's* prefix, because a findings register is
    // full of citations to work items — more of them than of its own ids.
    // The register's own NEXT-ID marker settles it without judgement.
    if (rule.anchor) {
      const anchored = new Map<string, number>();
      for (const rel of scope) {
        if (excluded.has(rel)) continue;
        let text: string;
        try {
          text = readFileSync(join(repoRoot, rel), 'utf8');
        } catch {
          continue;
        }
        for (const m of text.matchAll(new RegExp(rule.anchor, 'gm'))) {
          if (m[1]) anchored.set(m[1], (anchored.get(m[1]) ?? 0) + 1);
        }
      }
      const [best] = [...anchored].sort((a, b) => b[1] - a[1]);
      if (best) {
        proposals.push({ param: rule.param, value: best[0], evidence: `anchored on ${rule.anchor_name ?? 'marker'}` });
        continue;
      }
    }

    const banned = new Set(rule.exclude_values ?? []);
    const ranked = [...counts].filter(([k]) => !banned.has(k)).sort((a, b) => b[1] - a[1]);
    const [top] = ranked;
    if (top && top[1] >= (rule.min ?? 1)) {
      proposals.push({
        param: rule.param,
        value: top[0],
        evidence: `${top[1]} matches${ranked.length > 1 ? ` (next: ${ranked[1][0]} at ${ranked[1][1]})` : ''}`,
      });
    }
  }
  return proposals;
}

export function scanRepo(repoRoot: string): string[] {
  return walk(repoRoot);
}

export interface InstalledModule {
  version: string;
  params?: Record<string, unknown>;
  hashes?: Record<string, string>;
  kept?: { files: string[] };
  skillsDir?: string;
  params_all?: Params;
}

/**
 * The state of files this repo installed from a module.
 *
 * Three comparisons, and each answers a different question:
 *
 *   absent from disk            → missing, an upgrade restores it
 *   matches what we'd emit now  → current
 *   matches the recorded hash   → stale; ours to replace on upgrade
 *   matches neither             → diverged; theirs, and never touched
 */
export function ownedState(mod: Manifest, repoRoot: string, installed: InstalledModule) {
  const params = installed.params_all ?? {};
  const skillsDir = installed.skillsDir ?? '.claude/skills';
  preflightModuleEmissions([mod], repoRoot, params, skillsDir);
  const emitted = emittedFiles(mod, params, skillsDir);
  const kept = new Set(installed.kept?.files ?? []);
  const out = {
    version: installed.version,
    current: [] as string[],
    stale: [] as string[],
    diverged: [] as string[],
    missing: [] as string[],
    kept: [] as string[],
  };
  for (const [rel, wouldEmit] of emitted) {
    // A file that already existed at install was never ours. Calling it
    // "diverged" implies the user broke something they never touched.
    if (kept.has(rel)) {
      out.kept.push(rel);
      continue;
    }
    const resolved = resolveEmittedPath(repoRoot, mod.name, rel);
    const full = resolved.absolute;
    if (resolved.leafAlias) {
      out.diverged.push(rel);
      continue;
    }
    if (!existsSync(full)) {
      out.missing.push(rel);
      continue;
    }
    // Ownership ignores generated block bodies (WI-087); a recorded raw hash
    // from an older record still matches.
    const raw = readFileSync(full, 'utf8');
    const onDisk = ownershipHash(raw);
    const recorded = installed.hashes?.[rel];
    if (onDisk === ownershipHash(wouldEmit)) out.current.push(rel);
    else if (recorded && (onDisk === recorded || contentHash(raw) === recorded)) out.stale.push(rel);
    else out.diverged.push(rel);
  }
  return out;
}
