/** Drafting title block — the page/section header motif. Every sheet says what it is, its status, and its date. */
export interface TitleBlockField { label: string; value: React.ReactNode; }
export interface TitleBlockProps {
  title: string;
  /** Small label above the title, e.g. "Sheet" or "Module" */
  kicker?: string;
  /** Right-hand cells, e.g. [{label:"Written", value:"2026-08-14"}, {label:"Status", value:"canonical"}] */
  fields?: TitleBlockField[];
}
export declare function TitleBlock(props: TitleBlockProps): JSX.Element;
