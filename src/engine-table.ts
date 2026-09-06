/**
 * One table-section authority for every declared engine dispatch path.
 *
 * F-041 existed because the production runner, module self-test runner and
 * ejected runner each kept a different map and then fell back to the whole
 * table. A missing entry therefore looked exactly like a green gate that had
 * nothing to examine. Keep this file dependency-free so eject can copy the
 * selector without pulling the CLI into the consumer.
 */

export const WHOLE_TABLE = '__whole__';

export const ENGINE_TABLE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  'file-budget': 'file_budget',
  sections: 'sections',
  'frontmatter-schema': 'frontmatter_schema',
  'link-integrity': 'link_integrity',
  'file-population': 'file_population',
  'gate-meta': 'gate_meta',
  'id-integrity': WHOLE_TABLE,
  'render-freshness': 'render_freshness',
  'register-schema': 'register_schema',
  'self-declared-closure': 'self_declared_closure',
  'filename-schema': 'filename_schema',
  'cross-reference': 'cross_reference',
  'git-status-reconcile': 'merged_status',
  'computed-claim': 'computed_claim',
  'term-ownership': 'term_ownership',
  'rule-propagation': 'rule_propagation',
  'git-state': 'git_state',
  'merge-driver-check': 'merge_driver_check',
  'board-reconcile': 'board_reconcile',
  'changelog-freshness': 'changelog_freshness',
  'change-requires-file': 'change_requires_file',
  'shell-safety': 'shell_safety',
  'imperative-census': 'imperative_census',
  'command-reference': 'command_reference',
});

const entryMatches = (entry: any, gateId: string) =>
  !!entry?.id && gateId.includes(String(entry.id));

/** Select exactly the section an engine declared, or refuse an unknown shape. */
export function selectEngineTable(raw: any, engine: string, gateId: string): any {
  if (!Object.prototype.hasOwnProperty.call(ENGINE_TABLE_KEYS, engine)) {
    throw new Error(`engine '${engine}' has no table-section mapping`);
  }

  const key = ENGINE_TABLE_KEYS[engine];
  if (key === WHOLE_TABLE) return raw;
  if (!raw || typeof raw !== 'object' || !(key in raw)) {
    throw new Error(`gate '${gateId}' requires table section '${key}' for engine '${engine}'`);
  }

  const section = raw[key];
  if (!Array.isArray(section)) return section;

  const identified = section.filter((entry: any) => entry?.id);
  if (!identified.length) return section;
  const matched = identified.filter((entry: any) => entryMatches(entry, gateId));
  // Some sections intentionally share one subject-named spec across sibling
  // gates (`id = "rules"`). A matching id narrows an array; no match keeps the
  // already-selected section. The dangerous fallback was from a missing
  // *section* to the whole document, and that remains forbidden above.
  return matched.length
    ? section.filter((entry: any) => !entry?.id || entryMatches(entry, gateId))
    : section;
}
