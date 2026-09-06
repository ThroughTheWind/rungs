/**
 * The command surface, defined once and rendered into `--help`.
 *
 * It was a template literal listing eight of the nine commands — `setup git` was missing entirely —
 * beside a README table listing all nine, which is two hand-kept inventories of one fact. They had
 * already drifted, in both directions: help omitted a real command, and three real flags appeared
 * in neither. Keep this dependency-free: the docs claim gate imports this exact authority in a
 * fresh land worktree where ignored package dependencies are deliberately absent.
 *
 * The README's table is still hand-kept and still a second inventory. That is a known cost, not an
 * oversight — see WI-004.
 */
export const COMMANDS: [usage: string, blurb: string][] = [
  ['init [path] [profile]', 'scaffold a repo — minimal · tracked · disciplined · hardened · fleet'],
  ['doctor [path]', 'detect what a repo already has, installed or not'],
  ['add <module…> [--into p]', 'install modules, resolving dependencies and adopting what exists'],
  ['check [path] [tier]', 'run the registered gates and record the ledger'],
  ['render [path]', 're-emit path-scoped rules per harness'],
  ['upgrade [path]', 'move to newer module versions, never touching what you edited'],
  ['eject [path]', 'materialise the engines and a local launcher; check keeps running without rungs'],
  ['setup git [path]', 'install the merge drivers .gitattributes names'],
  ['modules', 'list the module set and audit the manifests'],
  ['backlog archive [path]', 'move finished items to archive/, repointing every link'],
  ['session start <branch>', 'cut a branch and worktree from the last verified merge'],
  ['preflight [path]', 'did the integration branch change files you changed?'],
  ['land <branch>', 'merge → verify the merged tree → advance, or refuse and park it'],
  ['worktrees [path]', 'which worktrees are merged, prunable, or merged and still dirty'],
];

/** Every flag the parser honours. A flag absent here is a flag nobody can find. */
export const FLAGS: [flag: string, blurb: string][] = [
  ['--dry-run', 'report what would happen, write nothing'],
  ['--explain', "doctor: also run the detectors over what this repo already has"],
  ['--confirm-paradigm', 'add: install a module this repo already solves another way'],
  ['--confirm-conflict', 'add: install a module that declares a conflict with one already here'],
  ['--into <path>', 'add: install into this repo instead of the working directory'],
  ['--set m.param=value', 'add/init: override a module parameter. Repeatable'],
  ['--confirm-threshold', 'add: install a module whose rung is above this repo'],
  ['--apply', 'upgrade: write the changes, rather than preview them'],
  ['--fast, --full', 'check: pick the gate tier, as the positional also does'],
  ['--params', 'modules: show every module parameter, its default and its allowed values'],
  ['--copilot', 'also emit Copilot instruction files'],
];
