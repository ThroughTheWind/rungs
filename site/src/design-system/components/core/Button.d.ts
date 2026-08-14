/**
 * Command-weight action. Primary is ink-on-paper with a hard sheet shadow; press pushes it onto the page.
 */
export interface ButtonProps {
  /** "primary" | "secondary" | "ghost" */
  variant?: "primary" | "secondary" | "ghost";
  /** "md" (44px target) | "sm" (dense UI only) */
  size?: "md" | "sm";
  disabled?: boolean;
  /** Renders an <a> when set */
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
