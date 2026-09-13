// Reproducible manual-review fixture; not an installed service or a consumer module.
// Creates only a named temporary directory and prints its path. Run the CLI there explicitly.
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { item } from '../test/ui-helpers.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(join(tmpdir(), 'rungs-ui-walkthrough-'));
execFileSync(process.execPath, [join(repo, 'dist/cli.js'), 'init', root, 'tracked'], {
  encoding: 'utf8',
  windowsHide: true,
  stdio: 'pipe',
});
const write = (path, value) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
};
for (let n = 1; n <= 1000; n++) {
  const id = `WI-${String(n).padStart(4, '0')}`;
  write(
    `docs/backlog/items/${id}.md`,
    item(
      id,
      `Operator fixture ${n}`,
      n % 3 === 0 ? 'accepted' : 'proposed',
      'related: [ADR-0001]',
      `Inspect [the source evidence](../../../evidence.md) and [F-1](../FINDINGS.md).\n\n## Decision\n\nFixture awaiting operator decision.`,
    ),
  );
}
write(
  'docs/backlog/FINDINGS.md',
  '# Findings\n\n## Open\n\n| Id | Sev | Pri | What | Evidence |\n| --- | --- | --- | --- | --- |\n' +
    Array.from(
      { length: 5000 },
      (_, n) => `| F-${n + 1} | low | next | Fixture observation ${n + 1} | [WI-0001](items/WI-0001.md) has evidence |`,
    ).join('\n'),
);
write(
  'docs/decisions/ADR-0001.md',
  item('ADR-0001', 'Keep files authoritative', 'accepted', '', 'A fixture decision for the walkthrough.'),
);
write(
  'evidence.md',
  '# Evidence\n\nFixture source, deliberately explicit. <img src="https://example.invalid/leak" onerror="alert(1)">\n\n[Unsafe command](javascript:alert(1))',
);
appendFileSync(
  join(root, 'AGENTS.md'),
  '\n## Operator fixture additions\n\n' +
    Array.from({ length: 60 }, (_, n) => `You must run \`npm run missing${n}\` before committing.`).join('\n') +
    '\n',
);
write('package.json', '{"private":true,"scripts":{"test":"node check.cjs"}}\n');
write(
  'check.cjs',
  'require("fs").writeFileSync("ran-explicitly.txt","Operator requested checks");console.log("Fixture command executed");\n',
);
write(
  '.ai/gates.toml',
  '[runner]\ntiers=["fast","full"]\nledger=true\nfast_budget_ms=30000\n\n[[gates]]\nid="fixture-command"\nkind="command"\ncommand="node check.cjs"\ntier="fast"\nwhy="Runs only after the operator selects Run checks."\n\n[[gates]]\nid="instructions-stale-commands"\nkind="declared"\nmodule="instructions"\nengine="command-reference"\ntable="instructions/core.toml"\ntier="full"\nwhy="Explain missing commands, retaining every finding."\n',
);
console.log(root);
