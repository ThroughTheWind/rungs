import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parse as parseToml } from 'smol-toml';

/** A version location declared by a gate table. Pattern matching stays with the caller. */
export interface VersionSource {
  file?: string;
  path?: string;
  xpath?: string;
}

/**
 * A matched source either contributes one comparable value or explains why it cannot.
 * There is deliberately no "not found" result: callers own globs and only call this
 * reader after a concrete file matched.
 */
export type VersionSourceResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

const invalidScalar = (where: string): VersionSourceResult => ({
  ok: false,
  reason: `${where} is not a non-empty string or finite number`,
});

function scalar(value: unknown, where: string): VersionSourceResult {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { ok: true, value: trimmed } : invalidScalar(where);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { ok: true, value: String(value) };
  }
  return invalidScalar(where);
}

function dottedValue(parsed: unknown, path: string): { found: true; value: unknown } | { found: false } {
  if (!path.trim()) return { found: false };
  let value: unknown = parsed;
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return { found: false };
    value = (value as Record<string, unknown>)[key];
  }
  return { found: true, value };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Read one already-matched version source.
 *
 * `path` means dotted JSON/TOML lookup, selected from the concrete filename.
 * `xpath` intentionally supports only the release module's narrow `//Element`
 * shape; pretending to implement general XPath would make a green result false.
 */
export function readVersionSource(root: string, rel: string, source: VersionSource): VersionSourceResult {
  let text: string;
  try {
    text = readFileSync(join(root, rel), 'utf8');
  } catch (error) {
    return { ok: false, reason: `could not read version source: ${errorMessage(error)}` };
  }

  if (source.path && source.xpath) {
    return { ok: false, reason: 'declares both `path` and `xpath`; choose one version lookup' };
  }

  if (source.path) {
    const extension = extname(rel).toLowerCase();
    let parsed: unknown;
    try {
      if (extension === '.json') parsed = JSON.parse(text);
      else if (extension === '.toml') parsed = parseToml(text);
      else {
        return {
          ok: false,
          reason: `cannot read dotted path '${source.path}' from '${extension || '(no extension)'}'; use JSON or TOML`,
        };
      }
    } catch (error) {
      const format = extension === '.toml' ? 'TOML' : 'JSON';
      return { ok: false, reason: `contains invalid ${format}: ${errorMessage(error)}` };
    }

    const found = dottedValue(parsed, source.path);
    if (!found.found) return { ok: false, reason: `does not contain configured path '${source.path}'` };
    return scalar(found.value, `configured path '${source.path}'`);
  }

  if (source.xpath) {
    const match = /^\/\/([A-Za-z_][A-Za-z0-9_.:-]*)$/.exec(source.xpath);
    if (!match) {
      return { ok: false, reason: `unsupported XML xpath '${source.xpath}'; expected //Element` };
    }
    const element = match[1];
    const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
    const elementPattern = new RegExp(
      `<${element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^>]*>([\\s\\S]*?)<\\/${element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*>`,
      'g',
    );
    const matches = [...withoutComments.matchAll(elementPattern)];
    if (!matches.length) return { ok: false, reason: `does not contain configured element '${source.xpath}'` };
    if (matches.length > 1) {
      return { ok: false, reason: `configured element '${source.xpath}' matched ${matches.length} values; expected one` };
    }
    if (matches[0][1].includes('<')) return invalidScalar(`configured element '${source.xpath}'`);
    return scalar(matches[0][1], `configured element '${source.xpath}'`);
  }

  return { ok: false, reason: 'declares neither `path` nor `xpath` for its version value' };
}
