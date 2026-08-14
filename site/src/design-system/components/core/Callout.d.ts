/** Margin-note callout: open gaps (redline), amendments (stamp), and plain notes. */
export interface CalloutProps {
  /** "gap" = open design gap, removed on resolution; "amended" = superseded-in-place record; "note" */
  kind?: "gap" | "amended" | "note";
  /** The register id or ADR the callout cites, e.g. "DF-012", "ADR-0001" */
  refId?: string;
  /** Absolute date for amendments, e.g. "2026-08-14" */
  date?: string;
  children?: React.ReactNode;
}
export declare function Callout(props: CalloutProps): JSX.Element;
