# Evaluation/optimization track template

Use with [the shared spine](SHARED-SPINE.md) for Inspect AI and DSPy. This track admits
**Implemented**, **Executed**, **Measured**, **Documented**, and **Opinion** claims. A published score
is **Documented** until the pinned task, environment, evidence, scorer, and aggregation path has been
reconstructed or executed.

## E1. Evaluation contract

Trace one attempt end to end and complete every row:

| Element | Definition and owner | Pinned/executable evidence | Versioned input | Failure or missing-data rule |
| --- | --- | --- | --- | --- |
| Task definition and sample | | | | |
| Execution environment and tools | | | | |
| Evidence log or transcript | | | | |
| Scoring function or judge | | | | |
| Aggregation and uncertainty | | | | |
| Optimizer feedback or selection | | | | |

Use “not applicable” for optimizer feedback when the subject evaluates but does not optimize. Never
let the presence of a score imply that all six elements are owned by the same system.

## E2. Reproducibility and provenance

Record task/sample version, model/provider/configuration, prompt or agent version, tool/sandbox
image, seed where meaningful, dependency lock, retry policy, timestamps, and produced artifacts.
State which inputs are sufficient to replay, which can only reconstruct, and which external state
remains uncontrolled.

## E3. Scoring validity and aggregation

Trace raw evidence into one score and scores into the reported aggregate. Identify deterministic
checks, model judges, human labels, partial credit, error treatment, filtering, weighting,
confidence/variance, and sample-size reporting. Label any judgement about metric validity as
**Opinion** with its premises.

## E4. Optimization feedback

If the subject optimizes, trace metric/result → candidate generation → selection → updated program,
prompt, examples, or parameters → held-out assessment. Separate training, validation, and test
evidence, and search for leakage or reuse that makes improvement circular. If it does not optimize,
state who consumes the evaluation output instead.

## E5. Cost and capacity

Record model/tool calls per sample, retries, parallelism, token/compute accounting, sandbox start-up,
cache reuse, storage, and failed-sample treatment. A synthetic concurrency test establishes only
the resources and path it actually exercised.

## Evaluation counter-evidence prompt

Look for a score that cannot be reconstructed from retained evidence, an aggregate that hides
errors or variance, a sandbox claim that leaves an external surface uncontrolled, or an optimizer
that evaluates on evidence it used to select the candidate.
