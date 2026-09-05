/**
 * A conservative, locale-independent key for names that may move between a
 * case-sensitive checkout, Windows, and default case-insensitive macOS APFS.
 *
 * NFKD exposes compatibility forms, while the lower/upper sequence expands
 * multi-code-point case forms such as sharp-S. The final normalization catches
 * decompositions introduced by case conversion itself.
 */
export function canonicalCaselessKey(value: string): string {
  return value.normalize('NFKD').toLowerCase().toUpperCase().normalize('NFKD');
}

export function canonicalCaselessEqual(left: string, right: string): boolean {
  return canonicalCaselessKey(left) === canonicalCaselessKey(right);
}
