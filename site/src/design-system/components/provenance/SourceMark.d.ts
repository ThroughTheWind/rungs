/**
 * Source-strength mark. 4/4 (four repos converged) must read stronger than any single repo; a counter-example is a finding, not a gap; no source at all renders loud.
 */
export interface SourceMarkProps {
  /** Repo codes: "AM" | "HG" | "HT" | "RF" */
  sources?: ("AM" | "HG" | "HT" | "RF")[];
  /** Four independent repos converged — the strongest claim in the corpus */
  converged?: boolean;
  /** "None" as a real value, e.g. "RF counter-example at 1513" */
  counterExample?: string;
}
export declare function SourceMark(props: SourceMarkProps): JSX.Element;
