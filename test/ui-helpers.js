import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

export function fixture(t, files = {}) {
  const parent = realpathSync.native(tmpdir());
  const root = realpathSync.native(mkdtempSync(join(parent, 'rungs-ui-')));
  const cleanup = [];
  t.after(async () => {
    for (const dispose of cleanup.reverse()) await dispose();
    const actual = realpathSync.native(root);
    if (dirname(actual) !== parent || !basename(actual).startsWith('rungs-ui-'))
      throw new Error('Refusing cleanup outside the named UI fixture directory.');
    rmSync(actual, { recursive: true, force: true });
  });
  const write = (path, value) => {
    const target = resolve(root, path);
    const from = relative(root, target);
    if (!from || from.startsWith(`..${sep}`) || from === '..') throw new Error('Fixture target escapes root.');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  for (const [path, value] of Object.entries(files)) write(path, value);
  return {
    root,
    write,
    read: (path) => readFileSync(join(root, path), 'utf8'),
    beforeCleanup: (dispose) => cleanup.push(dispose),
  };
}

export const item = (id, title, status = 'proposed', extra = '', body = '') =>
  `---\nid: ${id}\ntitle: ${JSON.stringify(title)}\nstatus: ${status}\ntype: feature\n${extra}\n---\n\n## Proposal\n\n${body}\n`;
export const registry = (command = 'node check.cjs', tiers = true) =>
  `${tiers ? '[runner]\ntiers = ["fast", "full"]\nledger = true\n' : ''}\n[[gates]]\nid = "fixture-command"\nkind = "command"\ncommand = ${JSON.stringify(command)}\ntier = "fast"\nwhy = "Exercise explicit local execution."\n`;

export async function request(ui, path, body, headers = {}) {
  const response = await fetch(`${ui.origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${ui.token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  return { status: response.status, value, headers: response.headers };
}
export async function finished(ui, id, limit = 15000) {
  const until = Date.now() + limit;
  while (Date.now() < until) {
    const { value } = await request(ui, `/api/jobs/${id}`);
    if (value.status !== 'running') return value;
    await new Promise((done) => setTimeout(done, 80));
  }
  throw new Error('UI job did not finish within the test timeout.');
}
export async function until(check, limit = 15000) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 50));
  }
  throw new Error('Fixture condition did not arrive.');
}
