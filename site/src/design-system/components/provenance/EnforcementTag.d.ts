/**
 * Enforcement declaration for a rule: exactly two legal states. Any other value renders UNDECLARED in redline — the silent third category is the failure mode the product exists to fix.
 */
export interface EnforcementTagProps {
  /** "gated" | "review-only" — no default, no absent state */
  state: "gated" | "review-only";
}
export declare function EnforcementTag(props: EnforcementTagProps): JSX.Element;
