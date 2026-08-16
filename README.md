# rungs

**rungs CLI — repository infrastructure for coding agents.** It installs and
maintains a repository's agentic development system.

Your agent has instructions. Do they have gates? Is your backlog's status field
telling the truth about what actually merged? That thing you noticed last
Tuesday — where did it go?

rungs scaffolds the parts of a working setup — agent instructions, skills, work
tracking, findings, decision records, validation gates — as **modules you pick**,
then keeps checking that they still say what they said.

**Start read-only.** `doctor` writes nothing, works on repos that never installed
anything, and ends by naming one command:

```console
$ npx @rungs/cli doctor
  ci             theirs
      1× .github/workflows/*.yml  e.g. .github/workflows/ci.yml

  1 present · 0 different paradigm · 14 absent

  Next
  rungs add ci  — adopt what you already built, in place
```

Once you have run that:

```console
$ rungs init . tracked
  instructions   3 create
  gates          1 create · 1 skill · 2 merge
  backlog        5 create · 1 rule · 2 skill · 1 merge
  findings       1 create · 1 skill · 1 merge
  adr            2 create · 1 merge
  session        2 create · 1 skill · 1 merge

  registered 19 gates from 6 module(s)
  rendered 2 file(s) · 0 degraded → .ai/render-report.md

$ rungs check
  pass backlog-ids                        2ms   2 examined
  FAIL backlog-merged-status              68ms
         docs/backlog/items/WI-014-parser.md: branch feature/wi-014 is merged
         but status is 'in_progress'
  …
  17 pass · 1 fail · 0 unimplemented · 0 error
```

---

## Why this exists

Every rule in here was **paid for once already**.

The content is extracted from four repositories built over six months in
different stacks — a .NET ingestion platform, a 105-package Angular monorepo, a
set of reference apps, and a full-stack product whose refreshed candidate measured
3,585 commits across 433 branches on 2026-08-15. Each solved part of this by hand. Each also failed in ways the others
did too.

So rungs does not ship a good idea about how to work. It ships **what four repos
learned, with the incident attached**. Every module declares its provenance, and
`doctor` quotes that incident back when a gate it installed has never fired:

> `audit-output-is-rows` has run 340 times and never fired. It exists because
> one repo produced 268 audit reports with no register to close them into. Is
> that still a risk here — or is this gate scoped too narrowly?

The research is in [`docs/research/`](docs/research/README.md) and stands on its
own: four repo autopsies, the [eight failure modes all of them
hit](docs/research/synthesis.md), and a maturity ladder that prices each practice
so you don't install rung 5 at rung 1.

## Install

```bash
npx @rungs/cli doctor
```

It reports what your repo already has, installed or not, and ends by naming one
command to run next. Once you have run that:
**[your first hour](docs/getting-started.md)** — which of the new files matter,
what the installed skills are for, and what to do when a gate goes red.

New to the vocabulary? **[The nine words this page uses](docs/glossary.md)**,
defined once each.

Requires **Node 22.18+**. The published package ships a bundled JavaScript entry point; the source
checkout still runs the TypeScript sources directly with `node`.

Published as **`@rungs/cli`**, not `rungs`: the unscoped name is unpublishable,
being one edit from both `rung` and `runjs`, which npm's typosquat filter
refuses. The tool, the command, and everything it writes are still `rungs` —
only the package identifier differs. After a global install the command is
plain `rungs`.

From source:

```bash
git clone https://github.com/ThroughTheWind/rungs && cd rungs && npm install
node src/cli.ts --help
```

## What you get

`rungs init . tracked` writes:

```text
AGENTS.md              # what every session reads — with a line budget that is enforced
CLAUDE.md              # a one-line bridge: @AGENTS.md. Not a second copy
.ai/
  rules/               # path-scoped rules you author, rendered per harness
  gates.toml           # every gate this repo runs
  rungs.toml           # what is installed, and a hash of everything we wrote
.claude/skills/        # spec-compliant Agent Skills — portable to 45+ clients
docs/backlog/          # work items, a board, a findings register
docs/decisions/        # ADRs, with an admission rule that keeps the directory small
```

**Nothing is overwritten, ever.** `add` on a repo that already has a backlog
keeps yours and installs only what is missing. Files you edit afterwards are
reported as diverged and left alone.

## Commands

| Command | Description |
| --- | --- |
| `rungs init [path] [profile]` | Scaffold — `minimal` · `tracked` · `disciplined` · `hardened` · `fleet` |
| `rungs doctor [path]` | What does this repo already have? Works on repos that never installed anything |
| `rungs doctor --explain` | Also run the detectors over what it found — evidence rows, never a score |
| `rungs add <module…>` | Install one module, resolving dependencies and adopting what exists |
| `rungs check [path]` | Run the gates, record the ledger |
| `rungs render [path]` | Re-emit path-scoped rules for each harness |
| `rungs upgrade [path]` | Move to newer module versions, never touching what you edited |
| `rungs eject [path]` | Materialise the engines; stop depending on rungs |
| `rungs setup git [path]` | Install the merge drivers `.gitattributes` names |
| `rungs modules` | List the set and audit the manifests |

| Option | Effect |
| --- | --- |
| `--dry-run` | Report what would happen, write nothing. Any write command |
| `--explain` | `doctor`: run the detectors too. Read-only, and it runs no command your repo owns |
| `--into <path>` | `add`: install into this repo rather than the working directory |
| `--set <module>.<param>=<value>` | `add` / `init`: override a module parameter. Repeatable, and `--set m.p=v` works too |
| `--confirm-threshold` | `add`: install a module whose rung is above this repo |
| `--confirm-paradigm` | `add`: install a module this repo already solves another way |
| `--apply` | `upgrade`: write the changes rather than preview them |
| `--fast` / `--full` | `check`: pick the gate tier, as the positional also does |
| `--copilot` | Also emit Copilot instruction files |

`rungs --help` prints the same two tables. For module parameters run `rungs
modules --params`, which renders them from the manifests; what a parameter *is*
and how to set one is [`docs/design/parameters.md`](docs/design/parameters.md).

## Modules

Fifteen, each carrying a **rung** — how mature a practice is — so `add` can tell
you when you are installing above your level.

| Rung | Modules |
| --- | --- |
| **0** any repo with an agent | `instructions` |
| **1** more than one thing in flight | `gates` `backlog` `findings` `adr` `session` `ci` |
| **2** repeated work of the same shape | `specs` `workflows` `skills` `audit` |
| **3** shipping versions, external design | `release` `design-sync` |
| **4** docs that restate each other | `doc-authority` |
| **5** 5+ concurrent sessions | `concurrency` |

`concurrency` refuses to install without `--confirm-threshold`, because below
five simultaneous sessions every mechanism in it costs more than it returns.
Selling rung 5 to a rung-1 repo is the most likely way this tool does harm.

Full specification: [`docs/design/module-catalog.md`](docs/design/module-catalog.md).

## Which agents

**Bring your own.** rungs is not a methodology and not an orchestrator: it does
not decide how your agent plans, specifies, or executes. It checks that the
repository underneath stays coherent while it does — which is why it composes
with whatever harness or spec-driven process you already run rather than
replacing one. `AGENTS.md` is embraced, not competed with.

Skills are **spec-compliant Agent Skills**, portable to Claude Code, Codex,
Cursor, Copilot, Gemini CLI and 40+ others without translation.

Only *path-scoped rules* are genuinely fragmented across harnesses, so that is
the only thing rungs renders — into `.claude/rules/`, `.github/instructions/`
and `.cursor/rules/`. Anything a target cannot express is **reported, never
silently dropped**, in `.ai/render-report.md`.

Reasoning: [ADR-0001](docs/decisions/ADR-0001-multi-harness-rendering.md).

## Design commitments

Four promises that shape everything else:

- **Your repo gains no new language runtime.** rungs writes no gate scripts.
  Generic gates are declarations run by engines the CLI provides; anything else
  is a shell command you already own. A .NET repo with no `package.json` stays
  that way. ([ADR-0002](docs/decisions/ADR-0002-stack-and-runtime-footprint.md))
- **A gate with no engine blocks — it never reports green.** A registry passing
  because most of its gates do nothing is the worst failure this tool could have.
- **`eject` is a promise, not a courtesy.** It materialises the engines into your
  repo and rewrites the registry to plain commands. A tool whose checks vanish
  when you uninstall it is one nobody should adopt.
- **Nothing is measured that needs judgement.** The gate ledger records exit
  status and wall-clock. It never scores your workflow.
  ([ADR-0005](docs/decisions/ADR-0005-self-instrumentation.md))

## Status

**Next release, v0.1.3** — prepared locally as
[`@rungs/cli`](https://www.npmjs.com/package/@rungs/cli); the public `latest` tag is v0.1.2.
The release remains untagged until the release gates and publication step are run.

rungs is installed in its own repo and its gates run on every change — 20 pass,
0 fail (`rungs check`, 2026-08-15). A clean consumer has also installed the packed
artifact and completed the doctor → init → add → check → render → upgrade/eject
journey locally. Detection is [verified against all four source repos](docs/design/detection-verification.md).
Not yet done: an install from the public registry and a cross-platform release matrix.

Expect module *contents* to move. The command surface is settled.

## Contributing

Modules are the product, and **a module is a directory that looks like what it
emits** — markdown and TOML, no code. If you can read the repo it produces, you
can write one: [`modules/README.md`](modules/README.md).

Every module must declare `[provenance]` with a real incident behind it. A module
nobody paid for does not ship.

## Repository

| Location | Contents |
| --- | --- |
| [`docs/research/`](docs/research/README.md) | The four repo autopsies, the synthesis, the pattern catalogue |
| [`docs/design/`](docs/design/README.md) | Product brief, module catalogue, verification |
| [`docs/decisions/`](docs/decisions/README.md) | ADRs |
| [`modules/`](modules/README.md) | The fifteen modules |
| [`src/`](src/) | The CLI, ~2,800 lines |

## Licence

MIT.
