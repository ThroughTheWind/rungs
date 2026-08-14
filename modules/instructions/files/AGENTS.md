# AGENTS.md — {{project_name}}

Canonical agent policy for this repository. Read in full before making changes.

This is the **always-on** document: facts every session needs. Anything that applies to one part of
the tree belongs in [`.ai/rules/`](.ai/rules/README.md) instead, and anything that is a multi-step
procedure belongs in a skill. Both load only when relevant, and this file has a line budget that
`rungs check` enforces.

## What this is

<!-- One paragraph: what the project does, for whom, and the one property that must not break. -->

## Repo map

<!-- rungs:begin repo-map -->
<!-- Generated. Run `rungs render` after moving directories. -->
<!-- rungs:end repo-map -->

## Validation matrix

**Run the narrowest validation that covers what you touched**, then the standard gates. Running
everything is slow enough to get skipped; running the wrong subset proves nothing.

| Change surface | Run |
| --- | --- |
| *(fill in per surface)* | |
| anything | `rungs check` |

## Task loop

1. **Start from the narrowest concrete anchor** — a file, a symbol, a failing test, a route.
2. Read the scoped rule for that surface before editing broadly.
3. Make the smallest change that proves or disproves the current hypothesis.
4. Run the narrowest validation above.
5. Update docs when public behaviour or developer workflow changed.

Choosing the anchor **before** reading instructions is the point: which instructions apply is then a
consequence of scope rather than a guess.

## Non-negotiables

### When you get something wrong, harden the instruction — without being asked

**A mistake an instruction could have prevented is a defect in the instruction**, and repairing it
is part of repairing the mistake. Do it in the same change, unprompted: a reviewer reads the fix,
not the counterfactual in which you had been told the right thing first, so the repair that does not
happen here does not happen at all.

Pick the cheapest rung that actually holds:

1. **A sentence at the point of use** — where the mistake is made, not in a preamble.
2. **A line in the relevant skill**, where an agent meets the rule during execution.
3. **A path-scoped rule**, when it applies to a surface rather than a task.
4. **A gate or a hook**, when the rule has already been broken *after* being written down.

**If the rule already existed and you broke it anyway, do not restate it — make it mechanical.** A
louder sentence in a file you have already read changes nothing. `/harden-rule` walks the ladder.

### Editing files from the shell

**Never pipe a multi-line edit through `node -e "…"`, `python -c "…"`, or a shell-expanded
heredoc.** Write the script to a file and run it. Inside a double-quoted shell string backticks are
command substitution, so a `node -e` that writes documentation deletes the backticked words and
leaves grammatical text behind — and exits 0.

**Chain with `&&`, never `;`**, when a later step consumes an earlier one. A failed producer
followed by `;` yields an empty variable, and an empty variable written into a file is not a crash;
it is a wrong value that passes review.

### Claims and numbers

- **A number a machine can compute is never typed by a human.** If it can be derived, generate it
  and gate it.
- **A control that cannot fail loudly is not a control.** Filtering a command's output through
  `| tail` or `| grep` reports *that* command's exit status, not the one you care about.
- **Check the artifact, not the bookkeeping about it.** A status field, a board row, or a triage is
  a claim about the work; the branch, the test, and the file are the work.

<!--
Optional — uncomment if you want it. Not shipped active because it is a preference, not a universal:

### Communication style

- Never tell me what I want to hear; prioritise truth over comfort.
- Contradict me when you disagree, and challenge assumptions.
- Be direct and concise. Skip validation and praise.
- If there is a better approach, recommend it even if I did not ask.
-->

## Conventions

<!-- Positive and negative both. A prohibition should state the evidence that would reverse it,
     e.g. "no dedicated X package until two real consumers prove a stable API". -->

- Commit messages: conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`…).

## Routing

| If you need… | Go to |
| --- | --- |
| Rules for one part of the tree | [`.ai/rules/`](.ai/rules/README.md) |
| A multi-step procedure | the skills in this repo — invoke by name |
| Why a decision was made | *(add when `adr` is installed)* |
