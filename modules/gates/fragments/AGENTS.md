<!-- rungs:begin gates@1.0.0 -->
## Gates

`rungs check` runs every gate declared in [`.ai/gates.toml`](.ai/gates.toml). Run the fast tier
constantly; run the full tier at a boundary, not as a ritual before every commit.

- **A gate is not advice.** If a gate refuses your change, the change is wrong or the gate is —
  decide which and fix that one. Do not route around it.
- **Never weaken a gate to make a change pass.** If a gate is genuinely wrong that is its own
  work, with its own reasoning written down.
- **Adding a rule?** Declare `enforcement: gated` or `review-only`. There is no third option, and
  `rungs check` reports a rule that claims MANDATORY with nothing behind it.
- **Broke a rule that already existed?** Do not restate it — make it mechanical. `/harden-rule`
  walks the ladder from a sentence to a gate.
<!-- rungs:end gates -->
