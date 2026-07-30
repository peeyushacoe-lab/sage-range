import type { Config } from "tailwindcss";

/**
 * Range — Sage Vault design tokens. v2.0.0-beta.
 *
 * A graphite workstation palette. Muted, SIEM-adjacent, deliberately calmer
 * than a console HUD: the product is professional security training, and the
 * chrome should not out-shout the data being analysed.
 *
 * Colours are semantic families, not a raw palette. The rule:
 *   accent   → interactive. Links, primary buttons, active nav, completion.
 *   ok       → success ONLY. A thing passed, resolved, or is secure.
 *   severity → how bad a finding is. Independent of status.
 *
 * `emerald-*` previously carried brand, success, and progress simultaneously,
 * which made "Active" and "Resolved" render identically. Do not reintroduce it
 * as a brand colour — use `accent`.
 *
 * Every value resolves to a CSS custom property declared in globals.css, so the
 * same tokens are available to plain CSS and a light theme can be added later
 * without touching component code.
 */

/**
 * Wraps a CSS custom property so Tailwind opacity modifiers (`bg-surface-2/50`)
 * work against it.
 *
 * Tailwind cannot compute alpha over a bare `var(--x)`: it has no channel values
 * to re-assemble. Without this, `ring-accent/25` is simply never generated —
 * which fails loudly inside `@apply` and, worse, fails *silently* in a className,
 * leaving the element unstyled. `color-mix` defers the blend to the browser, so
 * the variable stays a normal colour and themes remain swappable at runtime.
 */
const token = (cssVar: string) =>
  // Tailwind resolves colour functions at build time, but its `Config` type
  // models `colors` as strings only, so the function form has to be cast.
  ((({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `var(${cssVar})`
      : `color-mix(in srgb, var(${cssVar}) ${Number(opacityValue) * 100}%, transparent)`) as unknown) as string;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surfaces — elevation by lightness, not translucency ──────────
        surface: {
          DEFAULT: token("--surface-1"),
          0: token("--bg"),
          1: token("--surface-1"),
          2: token("--surface-2"),
          3: token("--surface-3"),
          inset: token("--surface-inset"),
        },

        // ── Text ────────────────────────────────────────────────────────
        ink: {
          DEFAULT: token("--text"),
          1: token("--text"),
          2: token("--text-2"),
          3: token("--text-3"),
        },

        // ── Borders ─────────────────────────────────────────────────────
        edge: {
          DEFAULT: token("--border"),
          subtle: token("--border-subtle"),
          strong: token("--border-strong"),
        },

        // ── Interactive ─────────────────────────────────────────────────
        accent: {
          DEFAULT: token("--accent"),
          fill: token("--accent-fill"),
          hover: token("--accent-hover"),
          wash: token("--accent-wash"),
        },

        // ── Status — what happened ──────────────────────────────────────
        ok:      { DEFAULT: token("--ok"),     wash: token("--ok-wash"),     edge: token("--ok-edge") },
        warn:    { DEFAULT: token("--warn"),   wash: token("--warn-wash"),   edge: token("--warn-edge") },
        danger:  { DEFAULT: token("--danger"), wash: token("--danger-wash"), edge: token("--danger-edge") },
        info:    { DEFAULT: token("--info"),   wash: token("--info-wash"),   edge: token("--info-edge") },

        // ── Severity — how bad it is. Ordered, never used for status ─────
        sev: {
          critical: { DEFAULT: token("--sev-critical"), wash: token("--sev-critical-wash"), edge: token("--sev-critical-edge") },
          high:     { DEFAULT: token("--sev-high"),     wash: token("--sev-high-wash"),     edge: token("--sev-high-edge") },
          medium:   { DEFAULT: token("--sev-medium"),   wash: token("--sev-medium-wash"),   edge: token("--sev-medium-edge") },
          low:      { DEFAULT: token("--sev-low"),      wash: token("--sev-low-wash"),      edge: token("--sev-low-edge") },
          info:     { DEFAULT: token("--sev-info"),     wash: token("--sev-info-wash"),     edge: token("--sev-info-edge") },
        },

        /** @deprecated Use `accent` for interactive, `ok` for success. */
        sage: {
          50:  "#f0fdf4",
          400: "#34d399",
          500: "#10b981",
          700: "#047857",
          900: "#064e3b",
        },
      },

      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },

      // Data screens are dense: 8px grid gap, 12px card padding, 36px rows.
      spacing: {
        row: "var(--table-row-height)",
        card: "var(--card-padding)",
      },

      transitionTimingFunction: { out: "var(--ease-out)" },
      transitionDuration: { fast: "120ms", slow: "260ms" },

      zIndex: { sticky: "20", overlay: "40", modal: "100", toast: "1000" },

      keyframes: {
        "fade-in":   { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-up":   { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-down": { "0%": { opacity: "0", transform: "translateY(-12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in":  { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:     { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        beacon:      { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },

        // Marketing-only decoration. Never use on data surfaces.
        "orb-drift":  { "0%,100%": { transform: "translate(0px,0px) scale(1)" }, "33%": { transform: "translate(30px,-20px) scale(1.05)" }, "66%": { transform: "translate(-20px,15px) scale(0.97)" } },
        "glow-pulse": { "0%,100%": { boxShadow: "0 0 0px 0px rgba(110,159,212,0)" }, "50%": { boxShadow: "0 0 32px 6px rgba(110,159,212,0.16)" } },
      },
      animation: {
        // Entrances are short and land once. 150-300ms, ease-out.
        "fade-in":   "fade-in 200ms var(--ease-out) both",
        "fade-up":   "fade-up 260ms var(--ease-out) both",
        "fade-down": "fade-down 200ms var(--ease-out) both",
        "scale-in":  "scale-in 180ms var(--ease-out) both",
        shimmer:     "shimmer 2s linear infinite",
        beacon:      "beacon 2s ease-in-out infinite",

        "orb-drift":   "orb-drift 14s ease-in-out infinite",
        "orb-drift-2": "orb-drift 18s ease-in-out 5s infinite",
        "orb-drift-3": "orb-drift 22s ease-in-out 9s infinite",
        "glow-pulse":  "glow-pulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
