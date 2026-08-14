---
description: >-
  How much planning a piece of work earns — tier 0 (none), tier 1 (light plan), tier 2 (heavy
  proposal) — and the triggers that move work up a tier. Loads when writing or reviewing a plan.
paths:
  - "{{plan_path}}/**/*.md"
enforcement: gated
---

# How much planning

**Use this table instead of judgement.**

| Tier | When | Artifact |
| --- | --- | --- |
| **0 — no document** | One piece of work, every concern resolves to use-as-is or one trivial hand-roll, one consumer, no cross-repo change | Implement directly. A task list is enough |
| **1 — light plan** | Several concerns, or one extend/hand-roll branch, but bounded to one surface | `{{plan_path}}/plan-*.md` with frontmatter `tier: 1` and: **Why · Decisions · Phases · Validation · Follow-up** |
| **2 — heavy proposal** | An upstream change is taken, or a genuinely new shared primitive is proposed | `{{plan_path}}/plan-*.md` with `tier: 2` and, additionally: **Boundary decision · Per-concern reuse table · Proof-of-reuse gate · Verification gate · Explicitly out of scope** |

## Tier 0 has to exist

A process that always demands a document is one people route around, and the routing is invisible —
the work still happens, just with no record. **Tier 0 is what makes tiers 1 and 2 credible**,
because choosing them then means something.

## Triggers that move work up

Any one of these is enough:

- a cross-repo change (at least tier 1, usually tier 2)
- more than about two distinct concerns
- more than one consumer affected
- a hand-roll that looks likely to cross the second-consumer threshold soon — **write it down now
  rather than rediscovering it later**

## Tier is declared, not inferred

Every plan carries `tier:` in its frontmatter. `rungs check` reads it and checks that tier's
required sections are present and non-empty. A plan with no tier cannot be checked, and tiering
degrades back into "write whatever felt right" — which is the judgement call this table replaces.

## Plans are not specs and not work items

A plan says *how we intend to do this*. It does not define behaviour, and it does not track state.
When a plan and a spec disagree the spec wins; when a plan and a work item's status disagree, the
work item wins. A plan that has started carrying status is one that should have been closed.
