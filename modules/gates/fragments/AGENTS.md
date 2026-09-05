<!-- rungs:begin gates@1.1.0 -->
## Gates

`node .ai/rungs.mjs check` runs everything in [`.ai/gates.toml`](.ai/gates.toml) — fast tier
constantly, full tier at a boundary. **Never weaken a gate to make a change pass**; if a gate is
wrong that is its own work. Every rule you add declares `gated` or `review-only` — there is no third
option. Broke a rule that already existed? Do not restate it, make it mechanical:
**`/harden-rule`**.
<!-- rungs:end gates -->
