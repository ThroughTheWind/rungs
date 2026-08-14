# Decisions

Architecture decision records for ai-cli itself.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](ADR-0001-multi-harness-rendering.md) | Multi-harness rendering: render only what is fragmented | accepted | 2026-08-14 |
| [0002](ADR-0002-stack-and-runtime-footprint.md) | Implementation stack, and the runtime footprint of a scaffolded repo | accepted | 2026-08-14 |
| [0003](ADR-0003-module-definition-format.md) | Module definition format: a directory that looks like what it emits | accepted | 2026-08-14 |
| 0004 | Adoption detection — how `add` adopts a hand-built equivalent instead of overwriting it | **open** | — |
| [0005](ADR-0005-self-instrumentation.md) | Self-instrumentation: the runner records what it observes, and nothing else | accepted | 2026-08-14 |

> Decided out of numeric order, each because it blocked the next: 0005 set the gate-shipping
> contract, 0002 set what a scaffolded repo may depend on, 0003 is largely 0002's consequence.
> 0004 is the only Phase 3 decision still open, and Phase 4 does not block on it.

## Admission rule

Before creating an ADR, all of the following must be true (pattern `adr-admission-rule`,
extracted from `axiom-mesh`):

1. The decision constrains future work rather than describing current work.
2. A reasonable alternative existed and was rejected for a stated reason.
3. Reversing it later would cost meaningfully more than making it now.
4. It is not already owned by a specification or module doc.
5. It is not an implementation detail that the code states more precisely than prose can.

If any is false, the content belongs in a design doc or a module spec — not here.
