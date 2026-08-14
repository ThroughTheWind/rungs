/**
 * The pattern-catalog table (id · pattern · src · rung), composed from SourceMark and RungBadge. Canonical mode adds the ¶ anchor that distinguishes a definition from a citation; counter-example rows tint redline. Collapses to a stacked list under 560px — §A must render at 390px without horizontal scroll.
 */
export interface PatternRow {
  /** Pattern id, e.g. "entry-point" — becomes the anchor target in canonical mode */
  id: string;
  pattern: React.ReactNode;
  /** SourceMark props: { converged } | { sources } | { counterExample } — {} renders UNSOURCED */
  src: { sources?: ("AM" | "HG" | "HT" | "RF")[]; converged?: boolean; counterExample?: string };
  /** 0–5; omit to render RUNG UNSTATED */
  rung?: 0 | 1 | 2 | 3 | 4 | 5;
}
export interface PatternTableProps {
  rows: PatternRow[];
  caption?: React.ReactNode;
  /** True only on the pattern catalog itself — the one place definitions live */
  canonical?: boolean;
}
export declare function PatternTable(props: PatternTableProps): JSX.Element;
