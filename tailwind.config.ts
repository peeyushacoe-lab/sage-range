import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f0fdf4",
          500: "#10b981",
          700: "#047857",
          900: "#064e3b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
