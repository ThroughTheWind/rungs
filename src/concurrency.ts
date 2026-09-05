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
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
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
  const out = git(root, ['for-each-ref', '--format=%(refname)%09%(symref)', 'refs/heads/']);
  if (!out) return [];
  return out.split('\n').map((line) => {
    const [ref, symref] = line.split('\t');
    return { ref, ...(symref ? { symref } : {}) };
  });
}

type IntegrationRefResolution =
  | { ref: string; error?: never }
  | { ref?: never; error: string };

function exactIntegrationRef(root: string, integration: string): IntegrationRefResolution {
  const wanted = `refs/heads/${integration}`;
  let stored: GitBranchRef[];
  try {
    stored = gitLocalBranchRefs(root);
  } catch {
    return {
      error: `cannot enumerate local branch refs for '${integration}'; ref identity is unknown, so land is refused.`,
    };
  }

  const exact = stored.find((entry) => entry.ref === wanted);
  if (!exact) {
    const asciiCaseKey = (value: string) => value.replace(/[A-Z]/g, (character) => character.toLowerCase());
    const alias = stored.find((entry) => asciiCaseKey(entry.ref) === asciiCaseKey(wanted));
    return {
      error: alias
        ? `configured integration branch '${integration}' does not exactly match stored ref '${alias.ref}'; use the stored spelling and retry.`
        : `configured integration branch '${integration}' has no exact stored local ref '${wanted}'; land is refused.`,
    };
  }
  if (exact.symref) {
    return {
      error: `configured integration branch '${integration}' is symbolic (${exact.ref} -> ${exact.symref}); land requires a direct local branch ref and is refused.`,
    };
  }
  return { ref: exact.ref };
}

function findIntegrationHolders(root: string, integrationRef: string): string[] {
  return gitWorktrees(root)
    .filter((worktree) => worktree.branch === integrationRef)
    .map((worktree) => worktree.path);
}

type IntegrationState =
  | { ref: string; holders: string[]; error?: never }
  | { ref?: never; holders?: never; error: string };

/** Prove ref identity and checkout state together wherever land may mutate. */
function integrationState(root: string, integration: string): IntegrationState {
  const resolved = exactIntegrationRef(root, integration);
  if (!resolved.ref) return resolved;
  try {
    return { ref: resolved.ref, holders: findIntegrationHolders(root, resolved.ref) };
  } catch {
    return {
      error: `cannot read git worktrees for '${integration}'; checkout state is unknown, so land is refused.`,
    };
  }
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
  const initialIntegration = integrationState(root, integration);
  if (!initialIntegration.ref) return { ok: false, lines: [initialIntegration.error] };
  const integrationRef = initialIntegration.ref;
  const before = revParse(root, integrationRef);
  if (!before) return { ok: false, lines: [`'${integration}' does not resolve`] };

  // ADR-0009 rule 3 is a mutation precondition, not merely a gate installed in
  // some consumers. Keep this before even inspecting the coordination lock: a
  // known-invalid land must not replace a stale lock or create any artifact.
  const integrationHolders = initialIntegration.holders;
  if (integrationHolders.length) {
    return {
      ok: false,
      lines: [
        `'${integration}' is checked out in ${integrationHolders.length} worktree(s), so land is refused:`,
        ...integrationHolders.map((path) => `  ${path}`),
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
    lines.push(`would merge ${branch} (${head.slice(0, 8)}) onto ${integration} (${before.slice(0, 8)}) via ${integPrefix}${branch}, verify, then advance.`);
    return { ok: true, lines };
  }

  const lock: Lock = { pid: process.pid, host: hostname(), started: new Date().toISOString(), branch };
  writeFileSync(lp, JSON.stringify(lock));
  const scratch = mkdtempSync(join(tmpdir(), 'rungs-land-'));
  const parked = `${integPrefix}${branch}`;

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
        git(root, ['update-ref', `refs/heads/${parked}`, merged]);
        lines.push(
          `${introduced.length} introduced by this branch. ${integration} is unchanged, and the merged tree is parked on '${parked}' — fix it there and land again.`,
        );
        return { ok: false, lines };
      }

      lines.push(
        `${inherited.length} failure(s), all already red on ${integration} before this branch. Landing anyway — they are not this branch's to fix, and blocking on them is how a gate gets bypassed.`,
      );
      // The scratch worktree is back at the base, so re-point it at the merged
      // commit before the advance reads it.
      git(scratch, ['reset', '--hard', merged]);
    }

    // The runner is arbitrary repository code. It can create a worktree while
    // gates execute, after the early precondition was proved. Re-establish the
    // same fact at the mutation boundary; otherwise advancing the ref leaves
    // that new holder's index and files at the old commit (F-048 again).
    const lateIntegration = integrationState(root, integration);
    if (!lateIntegration.ref || lateIntegration.ref !== integrationRef) {
      git(root, ['update-ref', `refs/heads/${parked}`, merged]);
      return {
        ok: false,
        lines: [...lines,
          `integration ref identity and checkout state could not be revalidated after verification, so the ref advance is refused.`,
          `  ${lateIntegration.error ?? `'${integration}' no longer names the original direct ref '${integrationRef}'.`}`,
          `Your verified merge is parked on '${parked}'. Re-run \`rungs land ${branch}\` after checkout state can be verified.`],
      };
    }
    const lateHolders = lateIntegration.holders;
    if (lateHolders.length) {
      git(root, ['update-ref', `refs/heads/${parked}`, merged]);
      return {
        ok: false,
        lines: [...lines,
          `'${integration}' became checked out in ${lateHolders.length} worktree(s) while this land was verifying, so the ref advance is refused:`,
          ...lateHolders.map((path) => `  ${path}`),
          'Switch each listed worktree to another branch or detach it (`git switch --detach`), then retry.',
          `Your verified merge is parked on '${parked}'. Re-run \`rungs land ${branch}\` to rebuild it after releasing the branch.`],
      };
    }

    // Rule 1: compare-and-swap. If someone else advanced the branch while we
    // verified, this fails and nothing is lost — their merge is not overwritten.
    // `--no-deref` also makes a symbolic-ref swap after the revalidation unable
    // to redirect this write into the branch another worktree actually holds.
    try {
      git(root, ['update-ref', '--no-deref', integrationRef, merged, before]);
    } catch {
      git(root, ['update-ref', `refs/heads/${parked}`, merged]);
      return {
        ok: false,
        lines: [...lines,
          `${integration} moved while this land was verifying, so the advance was refused rather than overwriting it.`,
          `Your verified merge is parked on '${parked}'. Re-run \`rungs land ${branch}\` to rebuild it on the new tip.`],
      };
    }
    git(root, ['update-ref', `refs/heads/${greenRef}`, merged]);
    lines.push(`${integration} → ${merged.slice(0, 8)}, and ${greenRef} now marks it verified.`);
    if (revParse(root, `refs/heads/${parked}`)) git(root, ['update-ref', '-d', `refs/heads/${parked}`]);
    return { ok: true, lines };
  } finally {
    // The scratch worktree is ours and only ours, so removing it is not rule 2's
    // "never destroy" — that is about the operator's branches and worktrees.
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
