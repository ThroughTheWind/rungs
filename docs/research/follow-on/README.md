# Follow-on public-agent research

The follow-on corpus approved in
[WI-018](../../backlog/items/WI-018-follow-on-public-agent-research.md) tests boundaries that the
fixed six-framework corpus did not centre: durable agent-managed memory, repeatable evaluation and
optimization, git-native/local product operation, and interoperability across process or ownership
boundaries.

This is one corpus with three evidence tracks, not a ranking and not an expansion of
[`frameworks/`](../frameworks/README.md). Every extraction uses the same
[comparison spine](SHARED-SPINE.md) and one track template. Synthesis compares like subjects within
a track before it makes any cross-track claim.

## Corpus question

**Which practices survive product, evaluation, and interoperability boundaries; which claims are
specific to one kind of evidence; and what does each result confirm, contradict, add to, or keep
separate from the rungs pattern catalogue?**

The names and questions below are selection hypotheses. They become findings only when their work
item records pinned evidence.

## Index

| Work | Track | Selection question | State |
| --- | --- | --- | --- |
| [Shared spine](SHARED-SPINE.md) · [product template](PRODUCT-TEMPLATE.md) · [evaluation template](EVALUATION-TEMPLATE.md) · [protocol template](PROTOCOL-TEMPLATE.md) · [WI-019](../../backlog/items/WI-019-follow-on-research-method.md) | Method | Which fields are genuinely comparable, and which evidence rules vary by track? | Ready for extraction |
| [Letta Code](products/letta-code.md) · [WI-020](../../backlog/items/WI-020-extract-letta-code.md) | Durable/local product | Where do identity, memory writes, archival retrieval, and continual learning live and survive? | In progress · pinned `ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0` |
| [Inspect AI](evaluations/inspect-ai.md) · [WI-021](../../backlog/items/WI-021-extract-inspect-ai.md) | Evaluation/optimization | What makes an agent evaluation reproducible, isolated, inspectable, and aggregatable? | Done · pinned `d482209d573cdde116cc0f28abfb01712e91e80c` |
| [Aider](products/aider.md) · [WI-022](../../backlog/items/WI-022-extract-aider.md) | Durable/local product | How do repository context, editing, validation, and Git history constrain one coding loop? | Done · pinned `5dc9490bb35f9729ef2c95d00a19ccd30c26339c` |
| [goose](products/goose.md) · [WI-023](../../backlog/items/WI-023-extract-goose.md) | Durable/local product | How do local execution, extensions, MCP/ACP, and session isolation meet at the product boundary? | Done · pinned `3810898a7447ec3299be72e223d3570a7aabf0ab` |
| [Google ADK](products/google-adk.md) · [WI-024](../../backlog/items/WI-024-extract-google-adk.md) | Durable/local product | How do delegation, sessions, evaluation, and multi-language public contracts evolve together? | In progress · pinned `1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf` + Java `2b87d65d9704a61ff4668b8c9482a79fef9fe0d4` |
| [MCP](protocols/mcp.md) · [WI-025](../../backlog/items/WI-025-extract-mcp.md) | Interoperability protocol | Which tool/context lifecycle, capabilities, errors, and trust responsibilities cross the client-server boundary? | In progress · pinned `4df2d6b6e3588efb46e7542d98498e5c630a0a86` · normative `2025-11-25` |
| [A2A](protocols/a2a.md) · [WI-026](../../backlog/items/WI-026-extract-a2a.md) | Interoperability protocol | Which discovery, task, artifact, streaming, and identity semantics cross independently operated agents? | In progress · pinned `1eb4aa03b07589d3a00ce7deab0dde679120ed30` · protocol `1.0.0` |
| DSPy · [WI-027](../../backlog/items/WI-027-extract-dspy.md) | Evaluation/optimization | How do metrics, traces, examples, and optimizers turn an agent program into an improvement loop? | Queued |
| Follow-on synthesis · [WI-028](../../backlog/items/WI-028-follow-on-research-synthesis.md) | All three | Which results reconcile within a track and which are not commensurable across tracks? | Queued |

## Evidence labels

Every material claim begins with or is unambiguously governed by one of these labels. A link alone
does not identify what kind of claim the link supports.

| Label | Admitted evidence | What it can establish | Boundary it cannot cross |
| --- | --- | --- | --- |
| **Normative** | Versioned specification text pinned to a full source commit | What a conforming implementation is required, recommended, or permitted to do | That any implementation conforms, or that application policy is safe |
| **Implemented** | Pinned source path and symbol, preferably paired with its executable test | What the pinned code path does | That an optional path is the default, or that hosted/current behaviour matches the pin |
| **Executed** | Named command against the pinned checkout, with date, inputs, environment, and result | What that bounded run demonstrated | General performance, portability, or absence outside the run boundary |
| **Measured** | Reproducible command, result, date, and exact path/ref scope | A count or property the command computes | Quality, importance, or another adjacent interpretation |
| **Documented** | Documentation pinned with the same source snapshot | What the project claims or instructs | That implementation or conformance was verified |
| **Opinion** | Explicit synthesis of cited premises | A judgement useful to rungs | A factual implementation or normative claim |

For protocol work, **Normative** outranks a reference implementation when the question is what the
protocol requires. For product and evaluation work, implementation or executable tests are needed
for behavioural claims. Documentation remains useful evidence of a public contract, but must stay
labelled as documentation.

## Method

1. **Choose the track before reading.** Copy the shared spine and the named track addendum into the
   extraction. Do not change tracks merely because an awkward result does not fit the hypothesis.
2. **Freeze every authority.** Record a full commit SHA, read date, licence file, and read boundary
   before extracting claims. If a subject spans multiple repositories or specification and
   implementation sources, snapshot each separately.
3. **Trace one mechanism end to end.** The item plan names the mechanism. Follow it through state,
   external effects, evidence artifacts, failure, and recovery rather than inventorying features.
4. **Try to disprove the selection question.** Every extraction ends its analysis with the
   strongest counter-evidence found. An absence claim names the directories, symbols, tests, and
   search terms inspected.
5. **Separate authority from operation.** A normative requirement, optional negotiated capability,
   reference implementation, and application policy are four different claims. So are a documented
   benchmark, a locally executed evaluation, and a general performance conclusion.
6. **Reconcile once.** Subject items may propose existing or candidate pattern ids but do not edit
   [`pattern-catalog.md`](../pattern-catalog.md). WI-028 adjudicates them with all eight subjects in
   view.

## Cross-track synthesis rule

Shared-spine fields may be compared across all eight subjects. Track-addendum fields are compared
within their track first. A cross-track row must choose one of four outcomes:

- **commensurable** — the claims share an authority type and boundary;
- **analogy only** — the mechanism is useful vocabulary but not evidence for the other track;
- **contradiction** — equivalent claims under equivalent boundaries disagree; or
- **not commensurable** — authority, subject, or guarantee differs enough that one verdict would be
  misleading.

“Not commensurable” is a result, not a missing cell. The synthesis must state which boundary blocks
comparison.

## Template fit checks

These checks exercise the method without making source findings:

- **Product:** Letta Code's proposed memory question maps to the continuity-layer matrix, which
  prevents conversation history, recovery state, documentary intent, repository state, and
  agent-managed long-term memory from collapsing into “memory”.
- **Evaluation:** Inspect AI's proposed reproducibility question maps to the evaluation contract,
  which separates task definition, execution environment, evidence log, scoring, aggregation, and
  optimizer feedback.
- **Protocol:** MCP's proposed boundary question maps to the protocol authority table, which keeps
  normative requirements, optional capabilities, reference behaviour, and application policy
  separate.

No source was read to perform these fit checks; the examples come from the accepted work-item
questions and test template coverage only.

## Licence and quotation

Record the licence from a file at the pinned commit; if it cannot be established, write “not
established”. Quote sparingly and cite the exact pinned artifact. The corpus extracts mechanisms and
warnings, not source code or specification prose for reuse in rungs modules.
