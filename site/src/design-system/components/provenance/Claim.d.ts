/**
 * The evidence/opinion binary, made visible. Evidence carries a citation; opinion is pencil italic with an Opinion lead; a Claim with no kind renders the loud unmarked state.
 */
export interface ClaimProps {
  /** "evidence" | "opinion" — omitting it is a defect and renders as one */
  kind?: "evidence" | "opinion";
  /** What the evidence traces to, e.g. "synthesis §5", "ADR-0006", a path or commit */
  cite?: string;
  children?: React.ReactNode;
}
export declare function Claim(props: ClaimProps): JSX.Element;
