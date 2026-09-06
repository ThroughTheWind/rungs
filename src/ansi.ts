/**
 * The CLI's colour vocabulary, shared by `cli.ts` and the check runner so the
 * ejected runner prints byte-identical output. Deliberately not `NO_COLOR`
 * aware: the site's transcript gate matches captured lines, and the consumer
 * journey strips escapes itself.
 */
export const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};
