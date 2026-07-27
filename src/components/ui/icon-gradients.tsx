/**
 * Sage Vault icon gradient defs.
 *
 * Rendered ONCE near the root of the document. Every <Icon /> references these
 * by id (stroke="url(#sv-blue)"), so the gradients live in a single hidden SVG
 * rather than being duplicated into every icon instance.
 *
 * Category colours per the Sage Vault icon spec.
 */

export const ICON_GRADIENTS = {
  blue:    ["#60A5FA", "#2563EB"], // Learning, Daily Missions
  teal:    ["#2DD4BF", "#0F766E"], // Labs
  orange:  ["#FB923C", "#EA580C"], // Simulations
  crimson: ["#EF4444", "#B91C1C"], // Boss Fights, Red Team
  gold:    ["#FBBF24", "#D97706"], // Challenges, Leaderboard, XP
  amber:   ["#FCD34D", "#F59E0B"], // Achievements, Certificates
  purple:  ["#A855F7", "#7C3AED"], // Skills, AI Mentor
  emerald: ["#34D399", "#047857"], // Progress
  cyan:    ["#22D3EE", "#0891B2"], // Threat Intel, Network Maps
  slate:   ["#94A3B8", "#475569"], // Reports, Settings
} as const;

export type IconTone = keyof typeof ICON_GRADIENTS;

/**
 * Mount once, high in the tree (root layout). Renders no visible output.
 */
export function IconGradients() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {Object.entries(ICON_GRADIENTS).map(([name, [from, to]]) => (
          <linearGradient
            key={name}
            id={`sv-${name}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
