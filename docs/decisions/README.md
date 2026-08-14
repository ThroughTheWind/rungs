# Decisions

Architecture decision records for ai-cli itself.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](ADR-0001-multi-harness-rendering.md) | Multi-harness rendering: render only what is fragmented | accepted | 2026-08-14 |
| [0005](ADR-0005-self-instrumentation.md) | Self-instrumentation: the runner records what it observes, and nothing else | accepted | 2026-08-14 |

> 0002–0004 are reserved and open (stack · module definition format · adoption detection). 0005 was
> decided out of order because it changes the gate-shipping module contract and blocked Phase 4.

## Admission rule

Before creating an ADR, all of the following must be true (pattern `adr-admission-rule`,
extracted from `axiom-mesh`):

1. The decision constrains future work rather than describing current work.
2. A reasonable alternative existed and was rejected for a stated reason.
3. Reversing it later would cost meaningfully more than making it now.
4. It is not already owned by a specification or module doc.
5. It is not an implementation detail that the code states more precisely than prose can.

If any is false, the content belongs in a design doc or a module spec — not here.
