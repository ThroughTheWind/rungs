---
id: ADR-0002
title: "Implementation stack, and the runtime footprint of a scaffolded repo"
status: accepted
date: 2026-08-14
---

# ADR-0002 — Implementation stack, and the runtime footprint of a scaffolded repo

- **Status:** accepted
- **Date:** 2026-08-14
- **Phase:** 3 (product definition)

---

## Context

Two questions get conflated and must not be:

- **(a) What is the CLI written in?** Affects whoever installs it. Low stakes — it is one tool on
  one machine, and it can be replaced.
- **(b) What does a scaffolded repo have to be able to run, forever?** Affects every repo the CLI
  ever touches, and is close to irreversible once modules ship.

(b) is the consequential one, and the corpus constrains it. **`axiom-mesh` has no root
`package.json`** — it is .NET 10 with 8 PowerShell validators and a single `frontend/package.json`
three levels down. `rift-forge` and both HexGuard repos are pnpm workspaces with `.mjs` gates. So
the CLI's own convenience must not be paid for by a .NET repo acquiring a root Node manifest and a
folder of `.mjs` scripts it did not ask for.

## Decision

### (a) The CLI is TypeScript on Node, distributed via npm

Run as `npx rungs`. Reasons, in order of weight:

1. **Lowest first-run friction.** `npx rungs add backlog` needs no install step and no
   platform-specific download.
2. **The ecosystem is here.** Agent Skills tooling, the harness vendors' own CLIs, and three of the
   four source repos are npm-based.
3. **The work is text manipulation** — manifests, markdown, frontmatter, glob matching, git. Node
   is entirely adequate and nothing about the domain argues for a systems language.

### (b) A scaffolded repo acquires **no new language runtime**

This is the binding constraint on everything downstream, and
[ADR-0003](ADR-0003-module-definition-format.md) is largely its consequence.

- **The CLI does not emit gate scripts.** Generic gates are declarations executed by engines the
  CLI provides; a repo gets data files, not a script zoo. Fixing an engine bug is a CLI version
  bump, not a re-render across every repo that installed it.
- **Anything the CLI cannot express generically is a `command` gate** — an arbitrary shell string
  the repo owns, in whatever language it likes. `pwsh ./scripts/validate-doc-links.ps1` and
  `dotnet build` are first-class registry entries, not workarounds.
- **CI invokes `npx rungs check`**, which is a tool invocation, not a project dependency.

So `axiom-mesh` could install `backlog`, `findings`, and structural gates and gain: markdown under
`docs/`, declarations under `.ai/`, and registry entries pointing at the PowerShell validators it
already has. No root `package.json`, no `.mjs`.

### The lock-in escape hatch

`rungs eject` materializes the engines as scripts in the repo and rewrites the registry to
`command` gates. A repo can leave and keep everything working. **This is a stated obligation, not
a maybe** — a tool that makes a repo's checks disappear on uninstall is one nobody should adopt,
and promising the exit is what makes the default acceptable.

## Consequences

- **Good:** engines are versioned and fixed centrally; scaffolded repos stay clean; polyglot repos
  are first-class; the gate runner ([ADR-0005](ADR-0005-self-instrumentation.md)) records exit
  status and duration identically whatever the gate is written in.
- **Cost:** running gates requires the CLI present, including in CI. Accepted — it is one `npx`
  line, and it pins gate behaviour to a CLI version, which is correct rather than unfortunate.
- **Cost:** the CLI carries the engines, so it grows with the module set. Bounded by ADR-0003's
  rule that domain-specific measurement is never an engine.

## Alternatives considered

**Go, shipped as a static binary** — genuinely credible, and better on (b) in isolation: no runtime
anywhere. Rejected because (b) is already solved by not emitting scripts, so Go would buy little
while costing first-run friction (platform downloads) and contributor familiarity. **The strongest
alternative here**; see revisit trigger 1.

**.NET** — natural for `axiom-mesh` alone, wrong for the other three and for the wider agent
ecosystem.

**Python** — no advantage in this domain and a worse install story on Windows, which is the primary
operator's platform.

**Emit `.mjs` gate scripts into every repo** (what `rift-forge` does by hand) — rejected: it forces
Node on non-Node repos and scatters engine code across every scaffolded repo, so a fix has to be
re-rendered everywhere. This is the decision that makes ADR-0003 declarative.

## Revisit triggers

1. **`npx` startup or Node availability becomes a real adoption blocker** → revisit Go, which is a
   rewrite of the CLI only; the module format and repo footprint are unaffected by design.
2. **A module genuinely requires an engine the CLI cannot host** → that is ADR-0003's `command`
   gate, not a stack problem. Only reopen this ADR if it happens for the *whole* module system.

## Admission check

Against [the rule](README.md): (1) constrains every module and every scaffolded repo ✅ · (2) Go was
a real alternative, rejected with a reason ✅ · (3) reversing (b) after modules ship means
rewriting every repo's gate layout ✅ · (4) not owned elsewhere ✅ · (5) not an implementation
detail — (b) is a promise to users ✅.
