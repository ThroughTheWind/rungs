/**
 * Normalize decoded repository text for semantic parsing only.
 *
 * Git may materialize tracked text as CRLF in a consumer even when the package
 * source is LF. Parsers should not change their verdict with that checkout
 * policy. Callers that compare ownership hashes or promise byte preservation
 * must continue reading the original bytes instead.
 */
export function semanticText(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}
