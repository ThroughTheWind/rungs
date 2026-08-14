---
id: <PREFIX>
type: spec
scope: <what surface this covers>
status: draft          # draft | stable | superseded
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Surface> — specification

## Purpose

What this surface is for, in two or three sentences. The property that must not break.

## Scope

**In scope**

-

**Out of scope**

- **Required — answer, do not delete.** What this surface explicitly does *not* cover, and where
  that lives instead if it lives anywhere.
>
> This half is why the section is mandatory. Without it, "the spec did not say I could not" is a
> defensible reading, and surfaces grow sideways during unrelated work.

## Reference implementation

<!-- The directory that demonstrates the correct pattern. Cheaper than prose and it cannot drift
     from the code, because it *is* the code. -->

## Features

### <PREFIX>-F01 — <name>

**Status:** ⬜

<What it does. The mechanism, stated once — other specs reference this rather than restating it.>

#### Stories

| Id | Story | Status | Closed by |
| --- | --- | --- | --- |
| `<PREFIX>-US-001` | As a …, I can … | ⬜ | |

**Acceptance criteria**

- Checkable statements. "Given X, the endpoint returns 422 with a typed error", not "handles
  errors properly".

## Non-goals

Things a reader might reasonably expect here and will not find, **with the reason**. A non-goal
without a reason reads as an oversight and gets proposed again.

## Open questions

Unresolved, with who or what would resolve them. An empty section on a new spec is almost always
untrue — say "none known" deliberately if you mean it.
