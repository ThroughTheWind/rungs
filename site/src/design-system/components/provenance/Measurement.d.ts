/**
 * A measured count with its date and the command that produced it. Both are required; omitting either renders the loud failure state — there is no quiet way to show an undated number.
 */
export interface MeasurementProps {
  /** The count/statement, e.g. "56 taken, 28 free" */
  value: React.ReactNode;
  /** Absolute date, e.g. "2026-08-14" */
  date?: string;
  /** The command that produced it, e.g. "npm view <name> version" */
  command?: string;
}
export declare function Measurement(props: MeasurementProps): JSX.Element;
