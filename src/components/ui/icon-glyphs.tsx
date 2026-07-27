/**
 * Bespoke Sage Vault glyphs.
 *
 * Drawn on Lucide's exact grid — 24x24 viewBox, 2px rounded stroke, no fill —
 * so they sit beside Lucide icons without looking foreign. These three concepts
 * are the product's identity, so they are hand-drawn rather than assembled from
 * a stock pack.
 */

export type GlyphProps = {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  stroke?: string;
  style?: React.CSSProperties;
};

function glyphProps({ size = 24, strokeWidth = 2, stroke = "currentColor", className, style }: GlyphProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
  };
}

/** Sage Vault — an open book sealed inside a vault hexagon. Knowledge, kept. */
export function SageVaultGlyph(props: GlyphProps) {
  return (
    <svg {...glyphProps(props)}>
      <path d="M12 2.5 20.5 7.25 V16.75 L12 21.5 3.5 16.75 V7.25 Z" />
      <path d="M12 9.2 V15.9" />
      <path d="M12 9.2c-1.25-.95-2.6-1.15-4.05-.65v6.3c1.45-.5 2.8-.3 4.05.65" />
      <path d="M12 9.2c1.25-.95 2.6-1.15 4.05-.65v6.3c-1.45-.5-2.8-.3-4.05.65" />
    </svg>
  );
}

/** Boss Fight — crossed blades behind a shield. The set-piece encounter. */
export function BossFightGlyph(props: GlyphProps) {
  return (
    <svg {...glyphProps(props)}>
      <path d="M12 2.6 19.6 5.6 V11.4c0 5-3.2 8.6-7.6 10-4.4-1.4-7.6-5-7.6-10V5.6Z" />
      <path d="M9.1 9.1 14.9 14.9" />
      <path d="M14.9 9.1 9.1 14.9" />
      <path d="M7.7 10.5 10.5 7.7" />
      <path d="M16.3 10.5 13.5 7.7" />
    </svg>
  );
}

/** AI Mentor — a reasoning node with circuit traces and a spark of insight. */
export function AiMentorGlyph(props: GlyphProps) {
  return (
    <svg {...glyphProps(props)}>
      <path d="M11 4.4 17.6 8.2 V15.8 L11 19.6 4.4 15.8 V8.2 Z" />
      <circle cx="11" cy="12" r="1.7" />
      <path d="M11 10.3 V7.1" />
      <path d="M9.5 12.9 6.7 14.5" />
      <path d="M12.5 12.9 15.3 14.5" />
      <path d="M19.6 2.4 20.5 4.5 22.6 5.4 20.5 6.3 19.6 8.4 18.7 6.3 16.6 5.4 18.7 4.5 Z" />
    </svg>
  );
}

export const BESPOKE_GLYPHS = {
  sageVault: SageVaultGlyph,
  bossFight: BossFightGlyph,
  aiMentor: AiMentorGlyph,
} as const;

export type BespokeGlyphName = keyof typeof BESPOKE_GLYPHS;
