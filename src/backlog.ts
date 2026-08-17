import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { walk } from './glob.ts';

/**
 * `rungs backlog archive` — move finished items out of `items/` and repoint
 * every link in the repo at their new home.
 *
 * F-015. Three files shipped into **every** consumer repo named this command,
 * two of them saying "never by hand", and it did not exist: `rungs backlog`
 * answered *"unknown command"*. So the instruction was unfollowable everywhere
 * rungs had ever been installed, and the reason it says *never by hand* is
 * exactly why it could not be worked around — moving 39 files and rewriting
 * every citation of them is the kind of repo-wide edit that fails silently.
 *
 * The link rewrite is the whole substance of the command. It resolves each
 * link from the citing file's **own** directory rather than pattern-matching
 * text, because the same target is written `items/WI-001-x.md`,
 * `../items/WI-001-x.md` and `WI-001-x.md` depending on who is citing it, and a
 * regex over any one of those spellings silently misses the others.
 */

export interface ArchiveMove {
  id: string;
  status: string;
  from: string;
  to: string;
}

export interface ArchivePlan {
  root: string;
  moves: ArchiveMove[];
  /** Files whose links change, with how many links move in each. */
  rewrites: { file: string; links: number }[];
  /** Items that look finished but are not eligible, with the reason. */
  held: { file: string; reason: string }[];
}

/** Statuses whose work can no longer change. Mirrors backlog README §8. */
const FINISHED = new Set(['done', 'rejected']);

const field = (text: string, name: string) => text.match(new RegExp(`^${name}:\\s*(\\S+)`, 'm'))?.[1] ?? '';

const posix = (p: string) => p.split(sep).join('/');

/** A relative markdown link that could point at a repo file. */
const LINK = /\]\((?!https?:|#|mailto:)([^)\s#]+)((?:#[^)\s]*)?)\)/g;

export function planArchive(repoRoot: string, backlogRoot = 'docs/backlog'): ArchivePlan {
  const itemsDir = join(repoRoot, ...backlogRoot.split('/'), 'items');
  const archiveDir = join(repoRoot, ...backlogRoot.split('/'), 'archive');
  const moves: ArchiveMove[] = [];
  const held: ArchivePlan['held'] = [];

  const files = walk(repoRoot);
  const items = files.filter((f) => posix(f).startsWith(posix(relative(repoRoot, itemsDir)) + '/') && f.endsWith('.md'));

  for (const rel of items) {
    // The **basename**, exactly — not a suffix of the path. `/TEMPLATE\.md$/i`
    // also matches any item whose filename ends in `-template.md`, and it did:
    // `WI-010-framework-extraction-template.md` was skipped on every run since
    // this command shipped, so a `done` item stayed in `items/` while the
    // command reported "nothing to archive". An anchored regex that is anchored
    // to the wrong end reads as careful and is not.
    const base = posix(rel).split('/').pop()!;
    if (/^(README|TEMPLATE)\.md$/i.test(base)) continue;
    const text = readFileSync(join(repoRoot, rel), 'utf8');
    const status = field(text, 'status');
    const id = field(text, 'id');
    if (!FINISHED.has(status)) continue;

    // An epic whose children are not all finished is still live bookkeeping: it
    // is the thing that says what remains. Moving it would file the index of
    // open work under "cannot change any more".
    if (field(text, 'type') === 'epic') {
      const children = (text.match(/^children:\s*\[(.*)\]/m)?.[1] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // A child that is **already archived** is finished — that is what being in
      // `archive/` means. Searching only `items/` made every archived child read
      // as unfinished, so an epic whose children had all landed could never be
      // archived and the hold message named five done items as outstanding. The
      // more finished an epic got, the more stuck it became.
      const archived = files.filter((f) => posix(f).startsWith(posix(relative(repoRoot, archiveDir)) + '/') && f.endsWith('.md'));
      const unfinished = children.filter((c) => {
        const f = items.find((i) => i.includes(`${c}-`)) ?? archived.find((i) => i.includes(`${c}-`));
        // Still `!f` → genuinely unknown, and an unknown holds. A child nobody
        // can find is not evidence that it finished.
        return !f || !FINISHED.has(field(readFileSync(join(repoRoot, f), 'utf8'), 'status'));
      });
      if (unfinished.length) {
        held.push({ file: rel, reason: `epic with unfinished children: ${unfinished.join(', ')}` });
        continue;
      }
    }

    // `posix(rel)` first: `walk` yields `/`-separated paths, so splitting on the
    // platform `sep` on Windows never splits and the basename came back as the
    // whole path — producing `archive/docs/backlog/items/WI-001-….md`.
    moves.push({
      id,
      status,
      from: rel,
      to: posix(join(relative(repoRoot, archiveDir), posix(rel).split('/').pop()!)),
    });
  }

  // Where each moved file ends up, keyed by its absolute old path, so a link can
  // be looked up by what it resolves to rather than by how it was spelled.
  const moved = new Map(moves.map((m) => [resolve(repoRoot, m.from), m.to]));
  const rewrites: ArchivePlan['rewrites'] = [];

  for (const rel of files) {
    if (!isRewritable(rel)) continue;
    const links = retargets(repoRoot, rel, moved).length;
    if (links || moved.has(resolve(repoRoot, rel))) rewrites.push({ file: rel, links });
  }

  return { root: backlogRoot, moves, rewrites, held };
}

/**
 * A module's `files/` and `fragments/` are **templates**, not repo content.
 * Their links are relative to wherever the fragment merges into, they carry
 * `{{param}}` tokens, and resolving them here reports every one as broken —
 * which is why `link_integrity.exclude` already skips them. Rewriting them
 * would be worse than reporting them: it would bake this repo's paths into what
 * every consumer repo gets installed.
 */
function isRewritable(rel: string): boolean {
  const p = posix(rel);
  if (!p.endsWith('.md')) return false;
  return !/^modules\/[^/]+\/(files|fragments)\//.test(p) && !p.startsWith('node_modules/');
}

/**
 * The links in one file that this archive run has to change, and what to.
 *
 * Deliberately **only** links whose target moved, plus — when the citing file is
 * itself moving — links that would otherwise break from the new location. The
 * first version compared every link's written form against a freshly computed
 * relative path and counted a difference as a change, which claimed 334 links
 * across 58 files including `AGENTS.md`, `README.md` and module templates. Most
 * of those were equivalent spellings of an unmoved target. Rewriting them would
 * have been a repo-wide reflow disguised as an archive.
 */
function retargets(repoRoot: string, rel: string, moved: Map<string, string>): { href: string; to: string }[] {
  const oldDir = dirname(resolve(repoRoot, rel));
  const selfMoved = moved.get(resolve(repoRoot, rel));
  const newDir = dirname(resolve(repoRoot, selfMoved ?? rel));
  const out: { href: string; to: string }[] = [];

  for (const m of readFileSync(join(repoRoot, rel), 'utf8').matchAll(LINK)) {
    const href = m[1];
    if (href.includes('{{')) continue; // a template link, resolved at install
    const target = resolve(oldDir, decodeURIComponent(href));
    const targetMoved = moved.get(target);
    if (!targetMoved && !selfMoved) continue;
    if (!targetMoved && !existsSync(target)) continue; // already broken; not this command's to fix
    const targetNew = targetMoved ? resolve(repoRoot, targetMoved) : target;
    // No `./` prefix. It is never required for a relative markdown link, and
    // adding it rewrites the spelling of paths whose *target* is what changed —
    // turning a one-word diff into a whole-line one across 37 files.
    const to = posix(relative(newDir, targetNew));
    if (to !== posix(href)) out.push({ href, to });
  }
  return out;
}

export function applyArchive(repoRoot: string, plan: ArchivePlan): void {
  const moved = new Map(plan.moves.map((m) => [resolve(repoRoot, m.from), m.to]));

  // Rewrite before moving. Every path is computed from the plan rather than from
  // the filesystem, so the order is a choice — and this order means a crash
  // halfway leaves the files still where the links say they are.
  for (const rel of walk(repoRoot)) {
    if (!isRewritable(rel)) continue;
    const edits = retargets(repoRoot, rel, moved);
    if (!edits.length) continue;
    const path = join(repoRoot, rel);
    let text = readFileSync(path, 'utf8');
    // Replace through the same matcher that found them, so a href appearing in
    // prose as well as in a link cannot be hit by a bare string replace.
    text = text.replace(LINK, (whole, href: string, anchor: string) => {
      const edit = edits.find((e) => e.href === href);
      return edit ? `](${edit.to}${anchor})` : whole;
    });
    writeFileSync(path, text);
  }

  for (const m of plan.moves) {
    const to = join(repoRoot, ...m.to.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    renameSync(join(repoRoot, m.from), to);
  }
}
