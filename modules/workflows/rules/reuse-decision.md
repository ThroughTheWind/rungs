---
description: >-
  How to decide, per technical concern, whether to use what exists, extend it locally, extend it
  upstream, or hand-roll. Loads when planning work or writing a plan document.
paths:
  - "{{plan_path}}/**/*.md"
  - "{{path}}/**/*.md"
enforcement: review-only
---

# The reuse decision

Run this **per concern, not per story.** A piece of work with four distinct technical concerns runs
the loop four times before anything is sequenced. The most common decomposition failure is
resolving a story against one existing capability and calling it planned.

## The four branches

| Branch | When | Where the work lands |
| --- | --- | --- |
| **Use as-is** | The existing API fully covers the concern, there is no repo-specific gap, and an existing consumer already demonstrates the same usage shape | Wiring only, in the consuming surface |
| **Extend — locally** | The primitive exists, but the composition around it does not | Here |
| **Extend — upstream** | The capability is genuinely missing from `{{upstream_repo}}`, not merely unconsumed here, **and** it is general-purpose rather than specific to one consumer | Upstream first, consumed here after |
| **Hand-roll** | Nothing exists anywhere, and the need is not general enough to justify a shared primitive yet | Here, local only |

*(With no `upstream_repo` configured, the third branch does not apply and the table has three.)*

## The second-consumer threshold

**Hand-roll once. On the second consumer, stop and extract.**

The first hand-roll is cheap and correct — you do not yet know the shape. The second is the
decision point, and the negative form matters as much as the positive one: **do not build a second
local copy.** Two copies is where the divergence starts, and by the third nobody can tell which is
canonical.

This cuts both ways. Extracting on the *first* consumer produces a shared primitive designed
against one use case, which is the other way to get an abstraction nobody can use.

## When a concern spans a batch

If several pieces of work are being planned together, run the decision across **all** of them
first and produce **one combined concern table**. A concern shared by two stories should be caught
once, not solved twice — and the second solution is usually a worse version of the first written
by someone who did not know the first existed.

## What this does not decide

Sequencing, ownership, and whether the work is worth doing. Those come after, and a reuse decision
that has quietly answered them is one that skipped a conversation.
