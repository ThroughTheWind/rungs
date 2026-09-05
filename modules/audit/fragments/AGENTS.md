<!-- rungs:begin audit@1.1.0 -->
## Assessments

**`/assess`** checks one {{subject}} against [`{{criteria_path}}`]({{criteria_path}}) and writes
each failure as a **row in the findings register**. Never a document per subject — that shape
reached 268 files in one repo with no way to say which findings were open, and `node .ai/rungs.mjs check`
refuses it re-forming.
<!-- rungs:end audit -->
