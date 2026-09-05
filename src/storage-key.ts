/**
 * A conservative, locale-independent key for one already-separated storage
 * segment that may move between a case-sensitive checkout, Windows, and
 * default case-insensitive macOS APFS.
 *
 * NFKD exposes compatibility forms, while the lower/upper sequence expands
 * multi-code-point case forms such as sharp-S. The final normalization catches
 * decompositions introduced by case conversion itself.
 *
 * Do not pass a complete path or ref here. Compatibility decomposition can
 * turn U+FF3C or U+FF0F into a separator; callers must split first so folding
 * cannot manufacture path structure.
 */
export function canonicalCaselessSegmentKey(segment: string): string {
  return segment.normalize('NFKD').toLowerCase().toUpperCase().normalize('NFKD');
}

export function canonicalCaselessSegmentEqual(left: string, right: string): boolean {
  return canonicalCaselessSegmentKey(left) === canonicalCaselessSegmentKey(right);
}
