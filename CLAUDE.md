# CLAUDE.md — ai-cli

Canonical agent policy for this repository. Read in full before making changes.

## What this is

A CLI that scaffolds repositories with a working agentic development system, composed from
modules. Its content is **extracted** from four existing repos (see [README](README.md)), not
designed from first principles. That constraint is the product: anyone can invent a backlog
convention, and most inventions are untested.

Current phase and the full sequence: [README §The sequence](README.md#the-sequence).

## The evidence rule (MANDATORY)

**Every claim in `docs/research/` is either evidenced or marked as opinion.** Evidence is a
file path, a commit, a measured count, or a quoted rule from the source repo. Opinion is
written as opinion, in the first person, and is allowed — but it must be *visibly* opinion,
because the next reader will treat an unmarked claim as measured.

This exists because the whole repo is a claim about what works, and a starter CLI that ships
an unevidenced practice propagates it into every repo it scaffolds. A wrong default here is
not one wrong repo; it is every repo that trusted the default.

Corollary: **counts and inventories go stale.** When you write "69 gates" or "401 branches",
name the date and the command that produced it. `rift-forge` learned this the expensive way —
seven of eleven population claims in a document its press kit quoted were false, because every
change that moved the number left the sentence alone.

## Extraction discipline

1. **Read the source before summarizing it.** A source repo's own summary of its practice is
   a claim about the practice, not the practice. Where a repo's docs and its scripts disagree,
   the scripts are what ran.
2. **A practice that was abandoned is a finding, not an omission.** The most valuable content
   here is what was tried and dropped, and why. Record retirements with their reason.
3. **Cost is part of the extraction.** Every practice has a running cost — CI minutes, session
   time, doc maintenance. A pattern recorded without its cost will be recommended in repos that
   cannot afford it. That is what the maturity ladder in
   [synthesis.md](docs/research/synthesis.md) is for.
4. **Attribute to a repo.** "Four repos converge on X" is a much stronger claim than "X is good
   practice", and it is only checkable if each pattern names its sources.

## Repo conventions

- **Spec-first for the CLI itself**, once Phase 3 opens: behavior is specified in
  `docs/design/` before implementation; significant decisions get an ADR in `docs/decisions/`.
- **One definition per concept.** A pattern is defined once in
  [pattern-catalog.md](docs/research/pattern-catalog.md); everything else links to it. Do not
  restate a pattern's definition in a per-repo file — cite it.
- **Dates are absolute.** Never "recently", "last month", "the current phase".
- Commit messages: conventional prefixes (`docs:`, `feat:`, `chore:`, `research:`).

## Editing files from the shell (MANDATORY)

**Never pipe a multi-line edit through `node -e "…"`, `python -c "…"`, or a shell-expanded
heredoc.** Write the script to a file in the scratchpad and run it.

Inside a double-quoted shell string, backticks are command substitution. The docs in this repo
are dense with `code spans` — every file path, every command, every module name — so a
`node -e "…"` that writes documentation *deletes* the backticked words and leaves grammatical,
plausible text behind. It exits 0.

Two rules from the same root:

1. **Script files, not `-e` strings**, for anything longer than one expression.
2. **Chain with `&&`, never `;`**, when a later step consumes an earlier one. A failed producer
   followed by `;` yields an empty variable, and an empty variable written into a file is not a
   crash — it is a wrong value that passes review.

Inherited verbatim from `rift-forge`, which measured six occurrences and six repair passes in a
single session, then had to add a `PreToolUse` hook because the documentation was not enough.
Prose has already been tried; it is here for the record, and it is a Phase-5 candidate to ship
the hook as a module.

## When you get something wrong, harden the instruction — without being asked

**A mistake an instruction could have prevented is a defect in the instruction**, and repairing
it belongs in the same change, unprompted. Nobody will ask: a reviewer reads the fix, not the
counterfactual in which you had been told the right thing first.

If the rule already existed and you broke it anyway, **do not restate it — make it mechanical.**
A louder sentence in a file you have already read changes nothing.

This is itself an extracted pattern
([`instruction-hardening`](docs/research/pattern-catalog.md)), and applying it here is the
cheapest available test of whether it generalizes beyond the repo that invented it.
