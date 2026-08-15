---
description: >-
  How to put explicit iteration, cost, time, context, and retry bounds around an agentic invocation,
  and how to name the terminal artifact and status for each bound. Loads when planning work that
  invokes an agent, tool loop, evaluator, or other potentially open-ended procedure.
paths:
  - "{{plan_path}}/**/*.md"
  - "{{path}}/**/*.md"
enforcement: review-only
---

# Bound the invocation

“Until done” is not a procedure. Before implementation, declare the limits that actually apply:
iterations or turns, cost or token budget, wall time, context size, and retries. A bound that is
only documented in a provider default is not a repository contract.

For every limit, name the terminal artifact and status it produces: completed output, partial
output with a resumable point, a refusal, or an explicit failure. Record what the caller can inspect
after the bound fires and who owns the next continuation. Empty, truncated, and error results are
part of the agent-facing interface, not exceptional prose to be invented at the end.
