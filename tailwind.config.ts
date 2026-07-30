import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  "#f0fdf4",
          400: "#34d399",
          500: "#10b981",
          700: "#047857",
          900: "#064e3b",
        },
      },
      keyframes: {
        "fade-in":  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-up":  { "0%": { opacity: "0", transform: "translateY(24px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-down":{ "0%": { opacity: "0", transform: "translateY(-16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.92)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        float:      { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-14px)" } },
        "glow-pulse": { "0%,100%": { boxShadow: "0 0 0px 0px rgba(16,185,129,0)" }, "50%": { boxShadow: "0 0 32px 6px rgba(16,185,129,0.2)" } },
        shimmer:    { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "orb-drift":{ "0%,100%": { transform: "translate(0px,0px) scale(1)" }, "33%": { transform: "translate(30px,-20px) scale(1.05)" }, "66%": { transform: "translate(-20px,15px) scale(0.97)" } },
        "spin-slow":{ "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
        "slide-in": { "0%": { opacity: "0", transform: "translateX(16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
      animation: {
        "fade-in":       "fade-in 0.4s ease-out both",
        "fade-up":       "fade-up 0.5s ease-out both",
        "fade-up-slow":  "fade-up 0.7s ease-out both",
        "fade-down":     "fade-down 0.4s ease-out both",
        "scale-in":      "scale-in 0.3s ease-out both",
        float:           "float 6s ease-in-out infinite",
        "float-slow":    "float 9s ease-in-out infinite",
        "float-delayed": "float 7s ease-in-out 2s infinite",
        "glow-pulse":    "glow-pulse 2.5s ease-in-out infinite",
        shimmer:         "shimmer 2s linear infinite",
        "orb-drift":     "orb-drift 14s ease-in-out infinite",
        "orb-drift-2":   "orb-drift 18s ease-in-out 5s infinite",
        "orb-drift-3":   "orb-drift 22s ease-in-out 9s infinite",
        "spin-slow":     "spin-slow 24s linear infinite",
        "slide-in":      "slide-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
