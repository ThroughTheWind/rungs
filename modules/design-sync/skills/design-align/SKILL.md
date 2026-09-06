---
name: design-align
description: >-
  Reconcile the pulled design mirror against what is actually implemented, routing every difference
  to a work item, a deferred item, or an upstream change request. Use when a design pull has just
  landed, or when asked to "align with the design", "does this match the mock", "triage the design deltas", or
  "what does the new design mean for us". Pulling the mirror down is /design-pull; this decides
  what the pull means.
---

# Align with the design

**Every delta is routed. There is no fourth option.**

A difference that is noticed and not routed is how a design system and its implementation drift
apart while both sides believe they are aligned — and the drift is discovered by a user, or by
someone rebuilding a screen and finding two sources of truth.

## Precedence, before anything

The design authority owns **layout, visual language, spacing, colour, motion intent**. It does not
own this repo's technical constraints, accessibility floor, or component boundaries. A design that
requires breaking one of those is a **disagreement to send upstream**, not an instruction.

State which side owns a contested decision *before* deciding the delta — most arguments here are
really arguments about ownership.

## For each delta, choose exactly one

| Route | When | What you write |
| --- | --- | --- |
| **Implement now** | It is in scope, and the current phase covers it | A work item, with the delta as its rationale |
| **Defer** | Real, agreed, but belongs to a later phase | A work item marked deferred, **with the revisit trigger** — not a vague "later" |
| **Send upstream** | The design conflicts with a constraint it does not know about, or is internally inconsistent | A draft in `{{request_path}}`, stating the constraint and what we need |
| **Accept as-is** | The implementation is right and the mirror is stale | Nothing local — but say so in the pull's record, or the same delta reappears next pull |

## What makes this fail

- **Batching deltas into one "design alignment" item.** They have different owners, different
  phases, and different answers. One item hides all of that and gets deferred as a lump.
- **Implementing ahead of the roadmap** because the design shows it. A design is not a schedule.
- **Silently adjusting the mirror** to match what is built. The mirror is generated; the next pull
  destroys the edit, and until then it is a fact about the design that the designer does not know.
- **Treating a stale mirror as authoritative.** Check when the pull happened before trusting a
  delta.

## Finish

Report the counts per route, and **how many deltas were examined**. A pass that found nothing and a
pass that compared nothing produce the same output, and only one of them means the design is
implemented.
