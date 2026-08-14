import type { Manifest } from './types.ts';

export type Params = Record<string, Record<string, unknown>>;

/**
 * `{{param}}` substitution, in file contents and in path segments. No
 * conditionals, no loops — ADR-0003. A module that needs a conditional is two
 * modules, or reaches file content through a managed block.
 *
 * `${{ … }}` is never substituted: GitHub Actions expressions share the
 * delimiter, and without the passthrough the `ci` module corrupts its own
 * workflow file at install — a broken file rather than an error.
 */
export function substitute(text: string, module: string, params: Params): string {
  return text.replace(/(^|[^$])\{\{([a-z_.]+)\}\}/g, (whole, lead: string, ref: string) => {
    const [a, b] = ref.includes('.') ? ref.split('.') : [module, ref];
    const value = params[a]?.[b];
    if (value === undefined) return whole; // leave it visible rather than emitting an empty string
    return lead + format(value);
  });
}

function format(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  return String(v);
}

/** Defaults from every manifest, with explicit overrides applied on top. */
export function resolveParams(mods: Manifest[], overrides: Params = {}): Params {
  const out: Params = {};
  for (const m of mods) {
    out[m.name] = {};
    for (const [k, spec] of Object.entries(m.params)) out[m.name][k] = spec.default;
  }

  // **Overrides go on before cross-module references resolve.** They were
  // applied last, which meant a default referencing another module's parameter
  // had already baked in that module's *default* — so installing into hexguard
  // with `--set backlog.root=.ai/backlog` put the findings register at
  // `docs/.ai/backlog/FINDINGS.md` and left every link to it pointing at
  // `docs/backlog/FINDINGS.md`. The gate caught it on the first real install;
  // nothing in a scratch repo could have, because nothing there overrides.
  for (const [mod, vals] of Object.entries(overrides)) {
    out[mod] = { ...(out[mod] ?? {}), ...vals };
  }

  // A default may reference another module's parameter, e.g. findings' register
  // living at `docs/{{backlog.root}}/FINDINGS.md`. One level only — a chain
  // would be a template language arriving through the back door.
  for (const m of mods) {
    for (const [k, v] of Object.entries(out[m.name])) {
      if (typeof v === 'string' && v.includes('{{')) out[m.name][k] = substitute(v, m.name, out);
    }
  }
  return out;
}

/** Comment syntax for a managed block, chosen by the target file. */
export function markers(targetPath: string, module: string, version: string) {
  const hash = /\.(toml|ya?ml|gitignore|gitattributes|sh|ps1|conf|properties)$|(^|\/)\.(gitignore|gitattributes)$/.test(
    targetPath,
  );
  return hash
    ? { begin: `# rungs:begin ${module}@${version}`, end: `# rungs:end ${module}` }
    : { begin: `<!-- rungs:begin ${module}@${version} -->`, end: `<!-- rungs:end ${module} -->` };
}

/**
 * Replace an existing managed block, or append one. Content outside every block
 * is the user's and is never touched — that is what makes the upgrade story
 * mechanical and divergence a decision rather than an error.
 */
export function mergeBlock(existing: string, fragment: string, module: string): string {
  const beginRe = new RegExp(`^[ \\t]*(?:<!--|#)\\s*rungs:begin ${module}(?:@[\\w.\\-]+)?\\s*(?:-->)?[ \\t]*$`, 'm');
  const endRe = new RegExp(`^[ \\t]*(?:<!--|#)\\s*rungs:end ${module}\\s*(?:-->)?[ \\t]*$`, 'm');
  const b = existing.match(beginRe);
  const e = existing.match(endRe);
  if (b && e && b.index !== undefined && e.index !== undefined && e.index > b.index) {
    const before = existing.slice(0, b.index);
    const after = existing.slice(e.index + e[0].length);
    return `${before}${fragment.trim()}${after}`;
  }
  const sep = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
  return `${existing}${sep}${fragment.trim()}\n`;
}
