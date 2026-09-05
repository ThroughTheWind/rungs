import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  preflightEmittedPaths,
  resolveEmittedPath,
  UnsafeEmittedPathError,
  type ResolvedEmittedPath,
} from './emitted-path.ts';
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

export interface ResolvedArchiveTree {
  /** Normalized portable path recorded in the archive plan. */
  root: string;
  items: ResolvedEmittedPath;
  archive: ResolvedEmittedPath;
  itemsExists: boolean;
  archiveExists: boolean;
}

interface PreparedArchiveMove {
  move: ArchiveMove;
  from: ResolvedEmittedPath;
  to: ResolvedEmittedPath;
}

interface PreparedArchiveRewrite {
  file: string;
  path: ResolvedEmittedPath;
  original: string;
  updated: string;
  links: number;
}

interface PreparedArchive {
  moves: PreparedArchiveMove[];
  rewrites: PreparedArchiveRewrite[];
}

const ARCHIVE_OPERATION = 'backlog archive';

const missingEntry = (error: unknown) =>
  error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR');

function existingDirectory(path: ResolvedEmittedPath): boolean {
  try {
    if (!statSync(path.absolute).isDirectory()) {
      throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, 'the existing archive tree entry is not a directory');
    }
    return true;
  } catch (error) {
    if (error instanceof UnsafeEmittedPathError) throw error;
    if (missingEntry(error)) return false;
    throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, 'the archive tree entry cannot be inspected');
  }
}

/**
 * Resolve the two archive-tree directories before callers inspect either one.
 * Appending the fixed names also validates the configured root as portable
 * repository-relative data without treating the root and its children as
 * conflicting file emissions.
 */
export function resolveArchiveTree(repoRoot: string, backlogRoot = 'docs/backlog'): ResolvedArchiveTree {
  const [items, archive] = preflightEmittedPaths(repoRoot, [
    { moduleName: ARCHIVE_OPERATION, target: `${backlogRoot}/items` },
    { moduleName: ARCHIVE_OPERATION, target: `${backlogRoot}/archive` },
  ]);
  const suffix = '/items';
  const root = items.target.slice(0, -suffix.length);
  return {
    root,
    items,
    archive,
    itemsExists: existingDirectory(items),
    archiveExists: existingDirectory(archive),
  };
}

/** Statuses whose work can no longer change. Mirrors backlog README §8. */
const FINISHED = new Set(['done', 'rejected']);

const field = (text: string, name: string) => text.match(new RegExp(`^${name}:\\s*(\\S+)`, 'm'))?.[1] ?? '';

const posix = (p: string) => p.split(sep).join('/');

/** A relative markdown link that could point at a repo file. */
const LINK = /\]\((?!https?:|#|mailto:)([^)\s#]+)((?:#[^)\s]*)?)\)/g;

export function planArchive(repoRoot: string, backlogRoot = 'docs/backlog'): ArchivePlan {
  const tree = resolveArchiveTree(repoRoot, backlogRoot);
  const moves: ArchiveMove[] = [];
  const held: ArchivePlan['held'] = [];

  if (!tree.itemsExists) return { root: tree.root, moves, rewrites: [], held };

  // Walk the canonical contained directories directly. The repository-wide
  // walker intentionally does not follow directory aliases; an inward alias
  // is nevertheless a valid archive tree and must retain normal behavior.
  const beneath = (directory: ResolvedEmittedPath) =>
    walk(directory.absolute)
      .filter((file) => file.endsWith('.md'))
      .map((file) => `${directory.target}/${posix(file)}`)
      .sort();
  const items = beneath(tree.items);
  const archived = tree.archiveExists ? beneath(tree.archive) : [];

  for (const rel of items) {
    // The **basename**, exactly — not a suffix of the path. `/TEMPLATE\.md$/i`
    // also matches any item whose filename ends in `-template.md`, and it did:
    // `WI-010-framework-extraction-template.md` was skipped on every run since
    // this command shipped, so a `done` item stayed in `items/` while the
    // command reported "nothing to archive". An anchored regex that is anchored
    // to the wrong end reads as careful and is not.
    const base = posix(rel).split('/').pop()!;
    if (/^(README|TEMPLATE)\.md$/i.test(base)) continue;
    const source = resolveEmittedPath(repoRoot, ARCHIVE_OPERATION, rel);
    const text = readFileSync(source.absolute, 'utf8');
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
      const unfinished = children.filter((c) => {
        const f = items.find((i) => i.includes(`${c}-`)) ?? archived.find((i) => i.includes(`${c}-`));
        // Still `!f` → genuinely unknown, and an unknown holds. A child nobody
        // can find is not evidence that it finished.
        return (
          !f ||
          !FINISHED.has(field(readFileSync(resolveEmittedPath(repoRoot, ARCHIVE_OPERATION, f).absolute, 'utf8'), 'status'))
        );
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
      to: `${tree.archive.target}/${posix(rel).split('/').pop()!}`,
    });
  }

  const provisional = { root: tree.root, moves, rewrites: [], held };
  const prepared = prepareArchive(repoRoot, provisional);
  return {
    ...provisional,
    rewrites: prepared.rewrites.map(({ file, links }) => ({ file, links })),
  };
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
function retargets(
  repoRoot: string,
  rel: string,
  moved: Map<string, string>,
  source = readFileSync(join(repoRoot, ...rel.split('/')), 'utf8'),
): { href: string; to: string }[] {
  const oldDir = dirname(resolve(repoRoot, rel));
  const movedDestination = (path: string) => {
    const lexical = moved.get(path);
    if (lexical) return lexical;
    try {
      return moved.get(realpathSync.native(path));
    } catch {
      return undefined;
    }
  };
  const selfMoved = movedDestination(resolve(repoRoot, rel));
  const newDir = dirname(resolve(repoRoot, selfMoved ?? rel));
  const out: { href: string; to: string }[] = [];

  for (const m of source.matchAll(LINK)) {
    const href = m[1];
    if (href.includes('{{')) continue; // a template link, resolved at install
    const target = resolve(oldDir, decodeURIComponent(href));
    const targetMoved = movedDestination(target);
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

function requireRegularFile(path: ResolvedEmittedPath, purpose: string): void {
  if (path.leafAlias) {
    throw new UnsafeEmittedPathError(
      ARCHIVE_OPERATION,
      path.target,
      `the ${purpose} is a symlink or junction leaf`,
    );
  }
  try {
    if (!lstatSync(path.absolute).isFile()) {
      throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, `the ${purpose} is not a regular file`);
    }
  } catch (error) {
    if (error instanceof UnsafeEmittedPathError) throw error;
    if (missingEntry(error)) {
      throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, `the ${purpose} no longer exists`);
    }
    throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, `the ${purpose} cannot be inspected`);
  }
}

function requireMissingDestination(path: ResolvedEmittedPath): void {
  if (path.leafAlias) {
    throw new UnsafeEmittedPathError(
      ARCHIVE_OPERATION,
      path.target,
      'the archive destination is an existing symlink or junction leaf',
    );
  }
  try {
    lstatSync(path.absolute);
    throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, 'the archive destination already exists');
  } catch (error) {
    if (error instanceof UnsafeEmittedPathError) throw error;
    if (!missingEntry(error)) {
      throw new UnsafeEmittedPathError(ARCHIVE_OPERATION, path.target, 'the archive destination cannot be inspected');
    }
  }
}

function requireCanonicalDescendant(
  directory: ResolvedEmittedPath,
  path: ResolvedEmittedPath,
  purpose: string,
): void {
  const fromDirectory = relative(directory.absolute, path.absolute);
  if (
    !fromDirectory ||
    fromDirectory === '..' ||
    fromDirectory.startsWith(`..${sep}`) ||
    isAbsolute(fromDirectory)
  ) {
    throw new UnsafeEmittedPathError(
      ARCHIVE_OPERATION,
      path.target,
      `the ${purpose} resolves outside the canonical '${directory.target}' tree`,
    );
  }
}

function prepareMoves(repoRoot: string, plan: ArchivePlan, tree: ResolvedArchiveTree): PreparedArchiveMove[] {
  if (plan.root !== tree.root) {
    throw new UnsafeEmittedPathError(
      ARCHIVE_OPERATION,
      plan.root,
      `the plan root does not match its normalized archive root '${tree.root}'`,
    );
  }

  const itemsPrefix = `${tree.items.target}/`;
  const archivePrefix = `${tree.archive.target}/`;
  for (const move of plan.moves) {
    if (!move.from.startsWith(itemsPrefix)) {
      throw new UnsafeEmittedPathError(
        ARCHIVE_OPERATION,
        move.from,
        `an archive source must be below '${tree.items.target}'`,
      );
    }
    const expected = `${archivePrefix}${move.from.split('/').pop()!}`;
    if (move.to !== expected) {
      throw new UnsafeEmittedPathError(
        ARCHIVE_OPERATION,
        move.to,
        `the archive destination for '${move.from}' must be '${expected}'`,
      );
    }
  }

  const resolved = preflightEmittedPaths(
    repoRoot,
    plan.moves.flatMap((move) => [
      { moduleName: ARCHIVE_OPERATION, target: move.from },
      { moduleName: ARCHIVE_OPERATION, target: move.to },
    ]),
  );

  return plan.moves.map((move, index) => {
    const from = resolved[index * 2];
    const to = resolved[index * 2 + 1];
    requireCanonicalDescendant(tree.items, from, 'archive source');
    requireCanonicalDescendant(tree.archive, to, 'archive destination');
    requireRegularFile(from, 'archive source');
    requireMissingDestination(to);

    const source = readFileSync(from.absolute, 'utf8');
    if (field(source, 'id') !== move.id || field(source, 'status') !== move.status || !FINISHED.has(move.status)) {
      throw new UnsafeEmittedPathError(
        ARCHIVE_OPERATION,
        move.from,
        'the archive plan is stale or does not match the source item frontmatter',
      );
    }
    return { move, from, to };
  });
}

function preparedText(source: string, edits: { href: string; to: string }[]): string {
  // Replace through the same matcher that found the links, so an href appearing
  // in prose as well as in a link cannot be hit by a bare string replace.
  return source.replace(LINK, (whole, href: string, anchor: string) => {
    const edit = edits.find((candidate) => candidate.href === href);
    return edit ? `](${edit.to}${anchor})` : whole;
  });
}

function rewriteSummary(rewrites: PreparedArchiveRewrite[]): ArchivePlan['rewrites'] {
  return rewrites
    .map(({ file, links }) => ({ file, links }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function prepareArchive(repoRoot: string, plan: ArchivePlan, verifyRecordedRewrites = false): PreparedArchive {
  const tree = resolveArchiveTree(repoRoot, plan.root);
  const moves = prepareMoves(repoRoot, plan, tree);

  if (verifyRecordedRewrites) {
    const recorded = preflightEmittedPaths(
      repoRoot,
      plan.rewrites.map((rewrite) => ({
        moduleName: ARCHIVE_OPERATION,
        target: rewrite.file,
        writeExisting: true,
      })),
    );
    recorded.forEach((path) => requireRegularFile(path, 'recorded rewrite target'));
  }

  // Where each moved file ends up, keyed by its lexical old path, so a link is
  // selected by what its written spelling resolves to. Actual I/O below uses
  // the canonical paths that were validated for this operation.
  const moved = new Map<string, string>();
  for (const { move, from } of moves) {
    moved.set(resolve(repoRoot, ...move.from.split('/')), move.to);
    moved.set(from.absolute, move.to);
  }

  // Prefer the archive plan's lexical spelling for a moved source, then the
  // previously recorded rewrite spelling. The general walker can also see the
  // canonical side of an inward directory alias; deduplicating by canonical
  // identity prevents one physical file from being prepared twice.
  const candidatePaths: { file: string; path: ResolvedEmittedPath }[] = [];
  const seenCanonical = new Set<string>();
  const addCandidate = (file: string) => {
    if (!isRewritable(file)) return;
    const path = resolveEmittedPath(repoRoot, ARCHIVE_OPERATION, file);
    if (seenCanonical.has(path.absolute)) return;
    seenCanonical.add(path.absolute);
    candidatePaths.push({ file, path });
  };
  moves.forEach(({ move }) => addCandidate(move.from));
  if (verifyRecordedRewrites) plan.rewrites.forEach(({ file }) => addCandidate(file));
  walk(repoRoot).sort().forEach(addCandidate);

  const drafts = candidatePaths
    .flatMap(({ file, path }) => {
      const original = readFileSync(path.absolute, 'utf8');
      const edits = retargets(repoRoot, file, moved, original);
      if (!edits.length) return [];
      return [{ file, original, updated: preparedText(original, edits), links: edits.length }];
    });

  const paths = preflightEmittedPaths(
    repoRoot,
    drafts.map((rewrite) => ({
      moduleName: ARCHIVE_OPERATION,
      target: rewrite.file,
      writeExisting: true,
    })),
  );
  const rewrites = drafts.map((rewrite, index) => ({ ...rewrite, path: paths[index] }));
  rewrites.forEach(({ path }) => requireRegularFile(path, 'rewrite target'));

  if (verifyRecordedRewrites) {
    const expected = [...plan.rewrites].sort((left, right) => left.file.localeCompare(right.file));
    const actual = rewriteSummary(rewrites);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new UnsafeEmittedPathError(
        ARCHIVE_OPERATION,
        plan.root,
        'the archive plan is stale: its complete rewrite set no longer matches the repository',
      );
    }
  }

  return { moves, rewrites };
}

export function applyArchive(repoRoot: string, plan: ArchivePlan): void {
  const prepared = prepareArchive(repoRoot, plan, true);

  // Check every captured source again before the first mutation. This catches
  // ordinary stale-plan edits without allowing an earlier rewrite to land.
  for (const rewrite of prepared.rewrites) {
    if (readFileSync(rewrite.path.absolute, 'utf8') !== rewrite.original) {
      throw new UnsafeEmittedPathError(
        ARCHIVE_OPERATION,
        rewrite.file,
        'the rewrite target changed after archive preflight',
      );
    }
  }

  // Rewrite before moving. Every mutation uses the canonical paths carried by
  // the validated operation, so an inward alias works and an outward alias can
  // never be followed during application.
  for (const move of prepared.moves) mkdirSync(dirname(move.to.absolute), { recursive: true });
  for (const rewrite of prepared.rewrites) writeFileSync(rewrite.path.absolute, rewrite.updated);
  for (const move of prepared.moves) renameSync(move.from.absolute, move.to.absolute);
}
