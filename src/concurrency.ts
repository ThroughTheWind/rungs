/**
 * The concurrency loop: `session start`, `preflight`, `land`, `worktrees`.
 *
 * These are the four commands the `concurrency` module documented for weeks
 * without any of them existing (F-026). The module is the specification —
 * `modules/concurrency/files/docs/concurrent-sessions.md` — and the rules they
 * obey are [ADR-0009](../docs/decisions/ADR-0009-rungs-drives-git.md):
 *
 *   1. Verify before you advance. `land` merges onto a scratch ref, gates *that*
 *      tree, and only then moves the branch, with a compare-and-swap.
 *   2. Never destroy, only refuse. Nothing here deletes a branch, a worktree or
 *      a commit; a refusal parks its work rather than discarding it.
 *   3. Never hold the integration branch. Everything runs from a throwaway
 *      worktree, which the module already gates for.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { hostname } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { installedParams } from './check.ts';

export interface LoopParams {
  integration: string;
  greenRef: string;
  integPrefix: string;
}

export function loopParams(root: string): LoopParams {
  const p = (installedParams(root).concurrency ?? {}) as Record<string, unknown>;
  const integration = String(p.integration_branch ?? 'main');
  const greenPrefix = String(p.green_prefix ?? 'green/');
  return {
    integration,
    // The green ref marks the last *verified* merge of the integration branch,
    // so it is prefix + that branch — not prefix + whatever you are cutting.
    greenRef: `${greenPrefix}${integration}`,
    integPrefix: String(p.integ_prefix ?? 'integ/'),
  };
}

/** `git`, never through a shell: branch names are user input and contain slashes. */
export function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
}

function gitOk(root: string, args: string[]): boolean {
  try {
    git(root, args);
    return true;
  } catch {
    return false;
  }
}

function revParse(root: string, ref: string): string | null {
  try {
    return git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    return null;
  }
}

interface GitWorktree {
  path: string;
  branch?: string;
}

interface GitBranchRef {
  ref: string;
  oid: string;
  symref?: string;
}

/**
 * Read worktree paths without line parsing.
 *
 * A worktree path may contain whitespace or a newline. `--porcelain -z` makes
 * NUL the only record delimiter, while branch refs cannot contain NUL, so the
 * two fields can be associated without quoting or shell interpretation.
 */
function gitWorktrees(root: string): GitWorktree[] {
  const out = execFileSync('git', ['worktree', 'list', '--porcelain', '-z'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const rows: GitWorktree[] = [];
  let row: GitWorktree | undefined;

  for (const field of out.split('\0')) {
    if (!field) {
      if (row) rows.push(row);
      row = undefined;
    } else if (field.startsWith('worktree ')) {
      // Be defensive about malformed output missing its blank record separator.
      if (row) rows.push(row);
      row = { path: field.slice('worktree '.length) };
    } else if (row && field.startsWith('branch ')) {
      row.branch = field.slice('branch '.length);
    }
  }
  if (row) rows.push(row);
  return rows;
}

/**
 * Enumerate the branch names Git actually stores instead of asking its ref
 * resolver whether a constructed spelling happens to work on this filesystem.
 *
 * Windows can resolve `refs/heads/MAIN` through a loose `refs/heads/main`, and
 * `update-ref` follows a symbolic branch ref by default. Either would make the
 * worktree-holder check and the ref update talk about different branches. Ref
 * names cannot contain tabs or newlines, so this argv-only format is unambiguous.
 */
function gitLocalBranchRefs(root: string): GitBranchRef[] {
  const out = git(root, ['for-each-ref', '--format=%(refname)%09%(objectname)%09%(symref)', 'refs/heads/']);
  const refs = new Map<string, GitBranchRef>();
  if (out) {
    for (const line of out.split('\n')) {
      const [ref, oid, symref] = line.split('\t');
      refs.set(ref, { ref, oid, ...(symref ? { symref } : {}) });
    }
  }

  // `for-each-ref` deliberately omits a symbolic ref whose target does not
  // exist. It is still operator-visible state and `update-ref --no-deref
  // create` would replace it, so include every valid loose branch-ref file.
  // Loose refs override packed refs with the same exact spelling, just as Git
  // resolves them. Directory entries are read without following OS aliases.
  const common = resolve(root, git(root, ['rev-parse', '--git-common-dir']));
  const heads = join(common, 'refs', 'heads');
  const visit = (directory: string, prefix: string): void => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const shortName = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path, shortName);
        continue;
      }
      const ref = `refs/heads/${shortName}`;
      // A lock is Git's coordination artifact, not a stored ref. Other entries
      // are inspected conservatively; no per-ref subprocess is needed even in
      // repositories with hundreds of branches.
      if (entry.name.endsWith('.lock')) continue;
      if (!entry.isFile()) throw new Error(`branch ref '${ref}' is not a regular loose-ref file`);
      const value = readFileSync(path, 'utf8').replace(/[\r\n]+$/, '');
      if (value.startsWith('ref: ')) {
        refs.set(ref, { ref, oid: '', symref: value.slice('ref: '.length) });
      } else {
        // Git already enumerated every usable direct loose ref. The raw walk
        // exists only to surface omitted symrefs; synthesizing an OID from an
        // unenumerated file could report a malformed/unresolvable ref as safe.
        const enumerated = refs.get(ref);
        if (
          !enumerated ||
          enumerated.symref ||
          !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value) ||
          enumerated.oid.toLowerCase() !== value.toLowerCase()
        ) throw new Error(`branch ref '${ref}' has an unreadable or unresolved loose-ref value`);
      }
    }
  };
  let refFormat = 'files';
  try {
    refFormat = git(root, ['rev-parse', '--show-ref-format']);
  } catch {
    // `--show-ref-format` predates reftable support. A Git without the query
    // only has the files backend this scanner was written for.
  }
  if (refFormat === 'files') visit(heads, '');
  else if (refFormat !== 'reftable') throw new Error(`unsupported Git ref format '${refFormat}'`);
  return [...refs.values()];
}

interface DirectRef {
  ref: string;
  oid: string | null;
}

function symbolicRefTarget(root: string, ref: string): string | null {
  try {
    return git(root, ['symbolic-ref', '--quiet', ref]);
  } catch {
    return null;
  }
}

type DirectRefResolution =
  | { value: DirectRef; error?: never }
  | { value?: never; error: string };

function canonicalCaselessKey(value: string): string {
  // APFS's default case-insensitive storage aliases compatibility and full
  // case forms that Unicode simple folding misses: ß/ss and ﬁ/fi are measured
  // examples. The built-in default conversions are locale-independent; the
  // final NFKD catches decompositions introduced by case conversion itself.
  return value.normalize('NFKD').toLowerCase().toUpperCase().normalize('NFKD');
}

function canonicalCaselessEqual(left: string, right: string): boolean {
  return canonicalCaselessKey(left) === canonicalCaselessKey(right);
}

function refStorageCollides(left: string, right: string): boolean {
  const leftSegments = left.split('/');
  const rightSegments = right.split('/');
  const shared = Math.min(leftSegments.length, rightSegments.length);
  for (let index = 0; index < shared; index++) {
    if (!canonicalCaselessEqual(leftSegments[index], rightSegments[index])) return false;
    // A spelling difference in a directory shared by two otherwise different
    // refs is itself a Windows/APFS alias. The later leaf difference does not
    // make the filesystem path unambiguous.
    if (
      leftSegments[index] !== rightSegments[index] &&
      index < leftSegments.length - 1 &&
      index < rightSegments.length - 1
    ) return true;
  }
  // Every segment of the shorter ref matched: the names are aliases, or one is
  // a directory/file prefix of the other.
  return true;
}

/** Resolve one configured spelling against stored refs without filesystem aliasing or symref dereferencing. */
function exactDirectRef(
  root: string,
  stored: GitBranchRef[],
  shortName: string,
  role: 'integration' | 'green',
  required: boolean,
): DirectRefResolution {
  const wanted = `refs/heads/${shortName}`;
  const label = role === 'integration'
    ? `configured integration branch '${shortName}'`
    : `configured green ref '${shortName}'`;
  if (!gitOk(root, ['check-ref-format', wanted])) {
    return { error: `${label} is not a valid direct local branch ref; land is refused.` };
  }

  // The files and reftable backends both omit dangling symrefs from
  // `for-each-ref`; query the exact logical key before calling it creatable.
  const exactSymbolicTarget = symbolicRefTarget(root, wanted);
  if (exactSymbolicTarget) {
    return { error: `${label} is symbolic (${wanted} -> ${exactSymbolicTarget}); land requires a direct local branch ref and is refused.` };
  }

  const alias = stored.find((entry) => entry.ref !== wanted && refStorageCollides(entry.ref, wanted));
  if (alias) {
    return { error: `${label} collides with case-aliased or directory/file-conflicting stored ref '${alias.ref}'; remove the ambiguity and retry.` };
  }
  const exact = stored.find((entry) => entry.ref === wanted);
  if (!exact) {
    if (required) return { error: `${label} has no exact stored local ref '${wanted}'; land is refused.` };
    return { value: { ref: wanted, oid: null } };
  }
  if (exact.symref) {
    return {
      error: `${label} is symbolic (${exact.ref} -> ${exact.symref}); land requires a direct local branch ref and is refused.`,
    };
  }
  return { value: { ref: exact.ref, oid: exact.oid } };
}

interface ManagedRef extends DirectRef {
  holders: string[];
}

interface ManagedRefs {
  integration: ManagedRef;
  green: ManagedRef;
}

type ManagedRefsResolution =
  | { value: ManagedRefs; error?: never }
  | { value?: never; error: string };

/** Prove canonical/direct identity and checkout state for both refs the final transaction mutates. */
function managedRefsState(root: string, integration: string, green: string): ManagedRefsResolution {
  try {
    const stored = gitLocalBranchRefs(root);
    const worktrees = gitWorktrees(root);
    const integrationRef = exactDirectRef(root, stored, integration, 'integration', true);
    if (!integrationRef.value) return integrationRef;
    const greenRef = exactDirectRef(root, stored, green, 'green', false);
    if (!greenRef.value) return greenRef;
    const withHolders = (ref: DirectRef): ManagedRef => ({
      ...ref,
      holders: worktrees.filter((worktree) => worktree.branch === ref.ref).map((worktree) => worktree.path),
    });
    return {
      value: {
        integration: withHolders(integrationRef.value),
        green: withHolders(greenRef.value),
      },
    };
  } catch {
    return {
      error: 'cannot enumerate local branch refs and worktrees; managed-ref identity or checkout state is unknown, so land is refused.',
    };
  }
}

interface RecoveryRefResult {
  name?: string;
  error?: string;
}

/**
 * Preserve a verified merge without overwriting, dereferencing or deleting operator state.
 *
 * The merge-derived candidate makes retries deterministic. A numeric suffix is needed only
 * when that exact candidate is occupied by distinct work or held by a worktree.
 */
function createDirectRef(root: string, ref: string, oid: string): void {
  // `create` is the strongest public Git precondition for an absent ref and
  // `no-deref` protects a symbolic target. Git still treats a dangling symref
  // created after our last identity check as absent and replaces its *name*;
  // that uncooperative raw-Git micro-race is documented as a residual boundary.
  const input = `option no-deref\0create ${ref}\0${oid}\0`;
  execFileSync('git', ['update-ref', '--stdin', '-z', '-m', 'rungs park verified merge'], {
    cwd: root,
    stdio: 'pipe',
    input: Buffer.from(input, 'utf8'),
  });
}

function parkVerifiedMerge(
  root: string,
  preferred: string,
  merged: string,
  reserved: ReadonlySet<string>,
): RecoveryRefResult {
  const derived = `${preferred}-${merged}`;
  const flat = `rungs-park-${merged}`;

  for (let index = 0; index < 1000; index++) {
    const candidate = index === 0
      ? preferred
      : index === 1
        ? derived
        : index === 2
          ? flat
          : `${flat}-${index - 2}`;
    const wanted = `refs/heads/${candidate}`;
    const reservedCollision = [...reserved]
      .some((name) => refStorageCollides(wanted, `refs/heads/${name}`));
    if (reservedCollision || !gitOk(root, ['check-ref-format', wanted])) continue;

    // Inspect again after a failed create-only CAS so a concurrent creator of
    // this same merge is reused while distinct work sends us to the next name.
    for (let inspection = 0; inspection < 2; inspection++) {
      let stored: GitBranchRef[];
      let worktrees: GitWorktree[];
      try {
        stored = gitLocalBranchRefs(root);
        worktrees = gitWorktrees(root);
      } catch {
        return { error: 'cannot enumerate refs and worktrees, so no recovery ref can be created safely.' };
      }

      const exact = stored.find((entry) => entry.ref === wanted);
      const alias = stored.find((entry) => entry.ref !== wanted && refStorageCollides(entry.ref, wanted));
      const exactSymbolicTarget = symbolicRefTarget(root, wanted);
      const held = worktrees.some((worktree) => worktree.branch === wanted);
      if (alias || exact?.symref || exactSymbolicTarget || held) break;
      if (exact) {
        if (exact.oid === merged) return { name: candidate };
        break;
      }

      try {
        createDirectRef(root, wanted, merged);
        return { name: candidate };
      } catch {
        // One re-inspection distinguishes a benign same-merge race from a
        // collision. Never turn the retry into an overwrite.
      }
    }
  }
  return { error: `could not allocate an unheld collision-free recovery ref below '${preferred}'.` };
}

/** Advance both markers as one no-dereference, expected-old Git ref transaction. */
function advanceVerifiedRefs(
  root: string,
  integration: DirectRef,
  green: DirectRef,
  merged: string,
): void {
  const input = [
    'option no-deref\0',
    `update ${integration.ref}\0${merged}\0${integration.oid}\0`,
    'option no-deref\0',
    green.oid === null
      ? `create ${green.ref}\0${merged}\0`
      : `update ${green.ref}\0${merged}\0${green.oid}\0`,
  ].join('');
  execFileSync('git', ['update-ref', '--stdin', '-z', '-m', 'rungs land verified merge'], {
    cwd: root,
    stdio: 'pipe',
    input: Buffer.from(input, 'utf8'),
  });
}

export interface Result {
  ok: boolean;
  lines: string[];
}

// ── session start ─────────────────────────────────────────────────────────────

/**
 * Cut a branch and a worktree from the last **verified** merge.
 *
 * Falling back to the tip is allowed and is always **stated**. A silent fallback
 * would put the session on top of an unverified merge, which is the one thing
 * the green ref exists to prevent — and the operator would never know.
 */
export function sessionStart(root: string, branch: string, at?: string, dryRun = false): Result {
  const { integration, greenRef } = loopParams(root);
  const lines: string[] = [];

  if (!branch) return { ok: false, lines: ['a branch name is required: `rungs session start <branch> [path]`'] };
  if (revParse(root, `refs/heads/${branch}`)) {
    return { ok: false, lines: [`branch '${branch}' already exists — pick another name, or check out the worktree that holds it`] };
  }

  const green = revParse(root, `refs/heads/${greenRef}`);
  const base = green ? greenRef : integration;
  const baseSha = green ?? revParse(root, integration);
  if (!baseSha) return { ok: false, lines: [`neither '${greenRef}' nor '${integration}' resolves — is this the right repo?`] };

  if (green) {
    lines.push(`base ${greenRef} (${baseSha.slice(0, 8)}) — the last verified merge`);
  } else {
    // Stated, never silent. See the doc comment above.
    lines.push(`no ${greenRef} ref yet — cutting from the tip of ${integration} (${baseSha.slice(0, 8)}) instead.`);
    lines.push(`That tip has not been verified by a land. The first successful \`rungs land\` creates ${greenRef}.`);
  }

  const path = resolve(at ?? join(dirname(root), `${basename(root)}-${branch.replace(/[^\w.-]+/g, '-')}`));
  if (existsSync(path)) return { ok: false, lines: [`${path} already exists — rungs never writes over a directory it did not create`] };

  lines.push(`worktree ${path}`);
  lines.push(`branch   ${branch}`);
  if (dryRun) return { ok: true, lines };

  try {
    git(root, ['worktree', 'add', '-b', branch, path, baseSha]);
  } catch (e: any) {
    return { ok: false, lines: [...lines, `git refused: ${String(e.stderr ?? e.message).trim().split('\n').slice(-2).join(' ')}`] };
  }
  return { ok: true, lines };
}

// ── preflight ─────────────────────────────────────────────────────────────────

/**
 * Did the integration branch change files *you* changed?
 *
 * The commit count is the number everyone looks at and it predicts nothing: a
 * hundred commits nowhere near your files are irrelevant, and one commit in the
 * file you are rewriting is the whole story.
 */
export function preflight(root: string): Result {
  const { integration } = loopParams(root);
  if (!revParse(root, integration)) return { ok: false, lines: [`'${integration}' does not resolve — is this the right repo?`] };

  let base: string;
  try {
    base = git(root, ['merge-base', 'HEAD', integration]);
  } catch {
    return { ok: false, lines: [`no merge base between HEAD and ${integration}; nothing to compare`] };
  }

  const names = (args: string[]) => new Set(git(root, args).split('\n').map((s) => s.trim()).filter(Boolean));
  const theirs = names(['diff', '--name-only', base, integration]);
  // Committed *and* uncommitted: work you have not committed still collides.
  const mine = new Set([
    ...names(['diff', '--name-only', base, 'HEAD']),
    ...names(['diff', '--name-only', 'HEAD']),
    ...names(['diff', '--name-only', '--cached']),
  ]);

  const ahead = Number(git(root, ['rev-list', '--count', `${base}..${integration}`]));
  const overlap = [...mine].filter((f) => theirs.has(f)).sort();

  const lines = [
    `${integration} is ${ahead} commit(s) ahead of your base, touching ${theirs.size} file(s).`,
    `You have touched ${mine.size} file(s).`,
  ];
  if (!overlap.length) {
    lines.push('No overlap. The commit count is not the signal — these two sets not intersecting is.');
    return { ok: true, lines };
  }
  lines.push(`${overlap.length} file(s) changed on both sides:`);
  for (const f of overlap.slice(0, 20)) lines.push(`  ${f}`);
  if (overlap.length > 20) lines.push(`  …and ${overlap.length - 20} more`);
  lines.push('Merge sooner rather than later. Shared code is a scheduling problem, not a tooling one.');
  return { ok: true, lines };
}

// ── land ──────────────────────────────────────────────────────────────────────

interface Lock {
  pid: number;
  host: string;
  started: string;
  branch: string;
}

function lockPath(root: string): string {
  return join(git(root, ['rev-parse', '--git-common-dir']).replace(/^\.git$/, join(root, '.git')), 'rungs-land.lock');
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e?.code === 'EPERM';
  }
}

/**
 * Merge → verify the merged tree → advance with a compare-and-swap.
 *
 * The order is the guarantee. Merging into the branch and testing afterwards has
 * already moved the branch, so a red result is something you now have to undo;
 * here a refusal leaves the integration branch bit-for-bit unchanged and parks
 * the merged tree on a scratch ref for you to fix.
 */
export interface GateOutcome {
  pass: number;
  /**
   * Findings per failing gate, not just the gate id.
   *
   * Attributing by **gate** was the first implementation and it was wrong in a
   * way that mattered: `gates-links-resolve` red at the base made that gate a
   * blind spot, so a branch could add its own broken links and land them as
   * "inherited". Measured — a branch adding `./also-missing.md` on top of an
   * already-red link gate landed clean. Attribution is per finding.
   */
  failing: { id: string; findings: string[] }[];
}

export type LandRunner = (dir: string, only?: ReadonlySet<string>) => GateOutcome;

export function land(root: string, branch: string, runner: LandRunner, dryRun = false): Result {
  const { integration, greenRef, integPrefix } = loopParams(root);
  const lines: string[] = [];

  if (!branch) return { ok: false, lines: ['a branch name is required: `rungs land <branch>`'] };
  const head = revParse(root, `refs/heads/${branch}`);
  if (!head) return { ok: false, lines: [`branch '${branch}' does not exist`] };
  const preferredParked = `${integPrefix}${branch}`;
  const initialManaged = managedRefsState(root, integration, greenRef);
  if (!initialManaged.value) return { ok: false, lines: [initialManaged.error] };
  const { integration: initialIntegration, green: initialGreen } = initialManaged.value;
  if (initialIntegration.ref === initialGreen.ref) {
    return {
      ok: false,
      lines: [`configured integration branch '${integration}' and green ref '${greenRef}' resolve to the same direct ref; land requires two distinct managed refs.`],
    };
  }
  const before = initialIntegration.oid;
  if (!before) return { ok: false, lines: [`'${integration}' does not resolve`] };

  // ADR-0009 rule 3 is a mutation precondition, not merely a gate installed in
  // some consumers. Keep this before even inspecting the coordination lock: a
  // known-invalid land must not replace a stale lock or create any artifact.
  const heldManagedRef = [initialIntegration, initialGreen].find((ref) => ref.holders.length);
  if (heldManagedRef) {
    const name = heldManagedRef.ref.slice('refs/heads/'.length);
    return {
      ok: false,
      lines: [
        `'${name}' is checked out in ${heldManagedRef.holders.length} worktree(s), so land is refused:`,
        ...heldManagedRef.holders.map((path) => `  ${path}`),
        'Switch each listed worktree to another branch or detach it (`git switch --detach`), then retry.',
      ],
    };
  }

  // A real lock: it names its holder and start time, and is taken over if that
  // holder is gone. A lock nobody can break is a lock somebody deletes.
  const lp = lockPath(root);
  if (existsSync(lp)) {
    try {
      const held = JSON.parse(readFileSync(lp, 'utf8')) as Lock;
      if (held.host === hostname() && alive(held.pid)) {
        return {
          ok: false,
          lines: [`another land is in progress: pid ${held.pid} on ${held.host}, landing '${held.branch}' since ${held.started}.`,
            'Concurrent landing is refused, not silently merged.'],
        };
      }
      lines.push(`taking over a stale lock from pid ${held.pid} (${held.started}) — that process is gone.`);
    } catch {
      lines.push('an unreadable lock file was replaced.');
    }
  }
  if (dryRun) {
    lines.push(`would merge ${branch} (${head.slice(0, 8)}) onto ${integration} (${before.slice(0, 8)}) via ${preferredParked}, verify, then atomically advance ${integration} and ${greenRef}.`);
    return { ok: true, lines };
  }

  const lock: Lock = { pid: process.pid, host: hostname(), started: new Date().toISOString(), branch };
  writeFileSync(lp, JSON.stringify(lock));
  const scratch = mkdtempSync(join(tmpdir(), 'rungs-land-'));
  let preserveScratch = false;

  try {
    // Rule 3: a throwaway worktree, detached. The integration branch is never
    // checked out — holding it blocks every other session and does not prevent
    // concurrent landing anyway.
    git(root, ['worktree', 'add', '--detach', scratch, before]);

    try {
      git(scratch, ['-c', 'user.email=rungs@localhost', '-c', 'user.name=rungs', 'merge', '--no-ff', '-m', `land ${branch}`, head]);
    } catch (e: any) {
      const conflicts = (() => {
        try {
          return git(scratch, ['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
        } catch {
          return [];
        }
      })();
      lines.push(`merge conflict — ${integration} is unchanged.`);
      for (const f of conflicts.slice(0, 15)) lines.push(`  ${f}`);
      lines.push('Reconcile generated artifacts by regenerating, never by merging text.');
      return { ok: false, lines };
    }

    const merged = git(scratch, ['rev-parse', 'HEAD']);
    const res = runner(scratch);
    lines.push(`merged tree ${merged.slice(0, 8)} — ${res.pass} pass · ${res.failing.length} fail`);

    const refuseWithRecovery = (details: string[], guidance: string): Result => {
      const recovery = parkVerifiedMerge(
        root,
        preferredParked,
        merged,
        new Set([integration, greenRef, branch]),
      );
      if (!recovery.name) {
        // Last-resort preservation: an unenumerable or completely blocked ref
        // namespace must not turn refusal into data loss. The detached scratch
        // stays registered until the operator resolves the condition.
        git(scratch, ['reset', '--hard', merged]);
        preserveScratch = true;
        return {
          ok: false,
          lines: [...lines, ...details,
            `The verified merge ${merged} could not be parked safely: ${recovery.error}`,
            `Its detached scratch worktree is retained at ${scratch}. Resolve the ref/worktree state, create a recovery branch at that exact commit, then remove the scratch explicitly.`],
        };
      }
      return {
        ok: false,
        lines: [...lines, ...details,
          `Your verified merge is parked on '${recovery.name}'. ${guidance}`],
      };
    };

    if (res.failing.length) {
      // **Attribution.** A gate that is red for reasons you did not cause and
      // cannot fix is a gate you learn to bypass, and a bypassed gate reports
      // nothing. So each failure is re-run against the merge base — the same
      // scratch worktree, reset back — and only the ones *this branch* caused
      // block the land.
      //
      // The trade this makes is real and the module states it: a survivable red
      // gate also removes the pressure to fix it. What is supposed to catch that
      // is the ledger's ageing signal, not this command.
      const ids = new Set(res.failing.map((f) => f.id));
      let base: GateOutcome | null = null;
      try {
        git(scratch, ['reset', '--hard', before]);
        base = runner(scratch, ids);
      } catch {
        base = null;
      }

      // A gate that did not run at the base cannot be attributed at all. We do
      // not land on an unknown, so that blocks.
      const attributable = base !== null && base.failing.length + base.pass >= ids.size;
      const baseFindings = new Map((base?.failing ?? []).map((f) => [f.id, new Set(f.findings)]));

      const introduced: { id: string; findings: string[] }[] = [];
      const inherited: { id: string; findings: string[] }[] = [];
      for (const f of res.failing) {
        const seen = attributable ? baseFindings.get(f.id) ?? new Set<string>() : null;
        // Per finding: a gate already red at the base does not excuse the new
        // violations of it that this branch brought.
        const fresh = seen ? f.findings.filter((x) => !seen.has(x)) : f.findings;
        if (fresh.length) introduced.push({ id: f.id, findings: fresh });
        else inherited.push(f);
      }

      for (const f of inherited) {
        lines.push(`  inherited  ${f.id}${f.findings[0] ? ` — ${f.findings[0]}` : ''}`);
      }
      for (const f of introduced) {
        lines.push(`  INTRODUCED ${f.id}${f.findings[0] ? ` — ${f.findings[0]}` : ''}`);
        for (const extra of f.findings.slice(1, 4)) lines.push(`             ${extra}`);
      }
      if (base === null) {
        lines.push('  The merge base could not be gated, so nothing here is attributable and all of it blocks.');
      } else if (!attributable) {
        lines.push('  Some gates could not be attributed against the merge base, so they block. We do not land on an unknown.');
      }

      if (introduced.length) {
        // Rule 2: park it, do not discard it. The merge is the expensive part
        // and throwing it away means doing it again to see the same failure.
        return refuseWithRecovery(
          [`${introduced.length} introduced by this branch. ${integration} and ${greenRef} were not advanced.`],
          'Fix it there and land again; recovery-ref cleanup remains operator-owned.',
        );
      }

      lines.push(
        `${inherited.length} failure(s), all already red on ${integration} before this branch. Landing anyway — they are not this branch's to fix, and blocking on them is how a gate gets bypassed.`,
      );
      // The scratch worktree is back at the base, so re-point it at the merged
      // commit before the advance reads it.
      git(scratch, ['reset', '--hard', merged]);
    }

    // The runner is arbitrary repository code. Re-establish every managed-ref
    // identity and holder fact at the mutation boundary, not just integration.
    const lateManaged = managedRefsState(root, integration, greenRef);
    if (!lateManaged.value) {
      return refuseWithRecovery(
        [
          'managed-ref identity and checkout state could not be revalidated after verification, so the atomic advance is refused.',
          `  ${lateManaged.error}`,
        ],
        `Re-run \`rungs land ${branch}\` after ref identity and checkout state can be verified.`,
      );
    }
    const { integration: lateIntegration, green: lateGreen } = lateManaged.value;
    const lateHolder = [lateIntegration, lateGreen].find((ref) => ref.holders.length);
    if (lateHolder) {
      const name = lateHolder.ref.slice('refs/heads/'.length);
      return refuseWithRecovery(
        [
          `'${name}' became checked out in ${lateHolder.holders.length} worktree(s) while this land was verifying, so the atomic ref advance is refused:`,
          ...lateHolder.holders.map((path) => `  ${path}`),
          'Switch each listed worktree to another branch or detach it (`git switch --detach`), then retry.',
        ],
        `Re-run \`rungs land ${branch}\` to rebuild the merge after releasing the branch.`,
      );
    }
    if (lateIntegration.oid !== initialIntegration.oid || lateGreen.oid !== initialGreen.oid) {
      const moved = [
        ...(lateIntegration.oid !== initialIntegration.oid ? [integration] : []),
        ...(lateGreen.oid !== initialGreen.oid ? [greenRef] : []),
      ];
      return refuseWithRecovery(
        [`${moved.join(' and ')} moved while this land was verifying, so the atomic advance was refused rather than overwriting concurrent work.`],
        `Re-run \`rungs land ${branch}\` to rebuild the merge on the new managed-ref state.`,
      );
    }

    // Rule 1: one compare-and-swap transaction. If either expected-old OID
    // loses, Git commits neither update. `--no-deref` prevents a last-instant
    // symref swap from redirecting a write into its target; Git cannot CAS the
    // direct-vs-symbolic type itself, so that raw-Git micro-race is the explicit
    // residual boundary documented by the module and WI-079.
    try {
      advanceVerifiedRefs(root, initialIntegration, initialGreen, merged);
    } catch {
      return refuseWithRecovery(
        [`${integration} or ${greenRef} moved, became symbolic, or could not be locked while this land was verifying. The atomic managed-ref transaction was refused, so Rungs did not partially update either ref.`],
        `Re-run \`rungs land ${branch}\` to rebuild the merge after inspecting the competing ref state.`,
      );
    }
    lines.push(`${integration} and ${greenRef} → ${merged.slice(0, 8)} in one atomic verified-ref transaction.`);
    lines.push('Existing recovery refs are retained; cleanup remains an explicit operator decision.');
    return { ok: true, lines };
  } finally {
    // The scratch worktree is ours and only ours, so removing it is not rule 2's
    // "never destroy" — that is about the operator's branches and worktrees.
    if (!preserveScratch) {
      try {
        git(root, ['worktree', 'remove', '--force', scratch]);
      } catch {
        rmSync(scratch, { recursive: true, force: true });
        try {
          git(root, ['worktree', 'prune']);
        } catch {
          /* leaving a stale worktree record is not worth failing a successful land */
        }
      }
    }
    try {
      unlinkSync(lp);
    } catch {
      /* already gone */
    }
  }
}

// ── worktrees ─────────────────────────────────────────────────────────────────

export interface WorktreeRow {
  path: string;
  branch: string;
  merged: boolean;
  dirty: boolean;
}

/**
 * What is finished and prunable — **reports only**.
 *
 * Removing someone else's worktree is not a script's call (ADR-0009 rule 2), and
 * the interesting row is not the clean one. A worktree that is merged *and*
 * dirty holds uncommitted work in a branch that has already landed, which is the
 * shape work actually gets lost in.
 */
export function worktrees(root: string): { rows: WorktreeRow[]; integration: string } {
  const { integration } = loopParams(root);
  const out = git(root, ['worktree', 'list', '--porcelain']);
  const rows: WorktreeRow[] = [];

  for (const block of out.split('\n\n').filter((b) => b.trim())) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (!path || !branch || branch === integration) continue;
    const merged = gitOk(root, ['merge-base', '--is-ancestor', branch, integration]);
    let dirty = false;
    try {
      dirty = git(path, ['status', '--porcelain']).length > 0;
    } catch {
      dirty = false;
    }
    rows.push({ path, branch, merged, dirty });
  }
  return { rows, integration };
}
