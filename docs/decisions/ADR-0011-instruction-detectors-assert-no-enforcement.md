---
id: ADR-0011
title: "An instruction detector reports what it read and asserts nothing about enforcement"
status: accepted
date: 2026-09-06
---

# ADR-0011 — An instruction detector reports what it read and asserts nothing about enforcement

- **Status:** accepted
- **Date:** 2026-09-06
- **Phase:** post-7, from [WI-061](../backlog/archive/WI-061-imperative-staleness-detection.md)
  requirement R7, executed under [WI-085](../backlog/items/WI-085-existing-promises-remediation.md)
- Extends [ADR-0005](ADR-0005-self-instrumentation.md) (record what is observed; refuse judgement)
  and [ADR-0007](ADR-0007-detector-applicability.md) (a detector declares what it may read).

---

## Context

Three readers assumed rungs reports "this rule says MANDATORY and has no gate". The sentence came
from a fabricated console block, deleted by WI-046; WI-061 accepted building the capability
carefully rather than continuing to imply it. Its requirement R2 said an imperative "may be reported
as having no gate" where a registry exists, and R7 asked for this decision: *what may a detector
assert about a repository whose enforcement surface it cannot see?*

Building it showed that the enforcement surface cannot be seen even where a registry exists. A gate
that scans `AGENTS.md` for line count does not enforce the rule on line 40 of `AGENTS.md`; a rule
that says "never push to main" is enforced, if at all, by a hook, a branch protection or a CI job
that never names the file the rule lives in. Whether a particular sentence is enforced is not a
property any scan of the sentence, or of the registry, can establish. The join R2 allowed would have
produced exactly the fabricated claim, with a registry for a fig leaf.

The hand-classified oracle ([`imperative-oracle-2026-09-06.md`](../design/imperative-oracle-2026-09-06.md))
added a second constraint: in the corpus's largest instruction file, 70% of the lines a modal-verb
grep finds are project history, not rules. A detector over prose is evidence, not verdict.

## Decision

**An instruction detector reports the evidence rows it read and asserts nothing about enforcement,
in either direction.**

1. **The imperative census is an evidence surface, not a gate that fails.** It is declared with
   `surface = "explain"`: registered like any gate, carrying its self-tests and its incident, but
   run only by `doctor --explain`. `rungs check` never executes it and never fails on it — a census
   that reddens every repository with a MUST in it is a gate people learn to bypass. The ejected
   runner does not retain it; ejection converts runner gates, and this is not one.
2. **Its findings name a file, a line and the modal that matched.** They never contain the word
   *unenforced* or any synonym, never a count presented as a grade, and never a statement about what
   checks the rule — on a repo with a registry or without one. The registry is not consulted.
3. **A stale command reference is a real gate**, because its surface can be read: `npm run x` is
   checked against `package.json` `scripts`, and a `rungs …` invocation against the commands the CLI
   dispatches. Absent surface means no finding. The finding names the surface it read.
4. **Both detectors declare `applicability = "repo-content"`** (ADR-0007) and run nothing the
   repository owns (ADR-0005 Tier A; WI-038's `isRunnable` rule is unchanged).
5. **Each ships with a per-repository false-positive rate measured against the oracle** before it
   is believed, and any class above roughly one in five on a single repository is narrowed or
   dropped — WI-053's threshold.

R2 is therefore narrowed by this record: an imperative is never "reported as having no gate".

## Consequences

**Good**

- The capability three readers assumed exists, in the only form that cannot re-commit the
  fabrication: rows a person can act on, with no verdict attached.
- The stale-command detector closes F-015's shape mechanically — an instruction file naming a
  command that does not exist is caught where the surface is readable.
- The census cannot become a red-by-default gate in any consumer.

**Costs and risks**

- **A census without a verdict may be true and useless** — the census's §5 question, arriving from
  the other side. Whether an owner acts on a row is not measurable here, and this record does not
  claim it.
- `surface = "explain"` is a fourth thing a registry entry can be (runner gate, command gate, hook,
  explain-only detector). The site's derived counts and the runner's "no gates in this tier"
  message must exclude it, and they do.
- The command detector reads two surfaces. Every other surface (`Makefile`, `dotnet` targets, a
  `pnpm x` shorthand) is unread and produces no finding; under-detection is the chosen bias.

## Alternatives considered

**Report "no gate scans this file" where a registry exists** (R2 as written). Rejected: a gate
scanning a file proves nothing about a rule in it, and a hook or CI job that enforces the rule never
names the file. The join is the fabricated claim with better paperwork.

**Make the census an ordinary gate that fails when imperatives exist.** Rejected: every consumer
instruction file contains imperatives by construction (the oracle: 103 rules across five repos),
so the gate is red everywhere and disabled in a week.

**Skip the census and ship only the command detector.** Considered seriously, because a verdict-free
census has unmeasured value. Rejected because the demand evidence was for the imperative surface
specifically, the rows are the input the `harden-rule` ladder needs, and refusing to ship it would
leave the landing page's deleted claim as the last word on the subject.

**Attach a confidence score to each row.** Rejected on ADR-0005 Tier C, as ADR-0007 already did for
applicability.

## Revisit triggers

1. **A mechanical enforcement declaration for prose rules exists** — a convention consumers adopt
   that binds a sentence to the check that enforces it — then an enforcement join becomes readable
   and R2's original wording can be reconsidered.
2. **Owners are observed acting on census rows**, or observed never acting on them, across several
   repositories: the first argues for keeping it, the second for dropping it (ADR-0005 revisit 2).
3. **A third command surface is read** (a build tool's targets, a task runner) → extend the
   detector; the rule that absent surface means no finding is unchanged.

## Admission check

Against [the rule](README.md): (1) constrains every future instruction detector ✅ · (2) the
enforcement join and the failing census were real alternatives, rejected for stated reasons ✅ ·
(3) reversing after consumers read "unenforced" from a tool that cannot know it is the fabrication
this repository already paid for once ✅ · (4) not owned by a module doc — it binds detectors across
modules ✅ · (5) not an implementation detail; it decides what the tool may claim ✅.
