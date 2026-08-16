#!/usr/bin/env node
/** Captures real output for every fixture. Run after anything that changes what a command prints. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { capture, OUT } from "./transcripts.mjs";

const t = capture();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(t, null, 2)}\n`);
for (const [cmd, v] of Object.entries(t)) console.log(`generate-transcripts: ${cmd} → ${v.output.length} lines`);
