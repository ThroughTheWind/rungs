/** Decision-record chip: id, status, and the revisit trigger kept visible. */
export interface ADRChipProps {
  /** e.g. "ADR-0006" */
  id: string;
  status?: "accepted" | "proposed" | "superseded" | "rejected";
  /** The condition that reopens the decision, e.g. "npm name claimed" */
  revisit?: string;
  href?: string;
}
export declare function ADRChip(props: ADRChipProps): JSX.Element;
